import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/optimize/route";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockEq2 = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      update: mockUpdate,
    }),
  }),
}));

// Chain the update calls
mockUpdate.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ eq: mockEq2 });
mockEq2.mockResolvedValue({ error: null });

const mockRunOptimization = vi.fn();

vi.mock("@/lib/prompts/optimization-prompts", () => ({
  runOptimizationAnalysis: (...args: unknown[]) =>
    mockRunOptimization(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const SAMPLE_RESUME = `John Doe
john@example.com

Summary
Experienced software engineer with 5 years of experience.

Experience
Software Engineer at TechCorp (2020-2024)
- Built React applications for enterprise clients
- Managed CI/CD pipelines using Jenkins

Skills
JavaScript, React, Node.js, Python, SQL`;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides?: Record<string, unknown>) {
  return {
    resumeText: SAMPLE_RESUME,
    jobDescription: "Senior Frontend Engineer requiring React and TypeScript",
    atsIssues: [
      {
        type: "missing_keyword",
        severity: "critical",
        message: 'Missing keyword: "TypeScript"',
        suggestion: "Add TypeScript to your skills.",
      },
    ],
    hrFeedback: [
      {
        type: "semantic",
        layer: 2,
        severity: "warning",
        message: "Your experience section has moderate semantic match.",
        suggestion: "Strengthen alignment with the job description.",
      },
    ],
    ...overrides,
  };
}

const MOCK_USER = {
  id: "user-123",
  email: "test@example.com",
  aud: "authenticated",
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("POST /api/optimize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq2 });
    mockEq2.mockResolvedValue({ error: null });
    mockRunOptimization.mockResolvedValue({
      suggestions: [
        {
          originalText: "JavaScript, React, Node.js, Python, SQL",
          suggestedText:
            "JavaScript, TypeScript, React, Next.js, Node.js, Python, SQL",
          category: "missing_keyword",
          reasoning: "Adding TypeScript and Next.js from the JD",
          severity: "critical",
          type: "ats",
        },
        {
          originalText: "Built React applications for enterprise clients",
          suggestedText:
            "Built React and TypeScript applications serving 50K+ enterprise users",
          category: "weak_keyword",
          reasoning: "Strengthen keyword usage with quantified impact",
          severity: "warning",
          type: "ats",
        },
      ],
    });
  });

  // ── Auth ──

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const response = await POST(makeRequest(validBody()));
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 when auth error occurs", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const response = await POST(makeRequest(validBody()));
    expect(response.status).toBe(401);
  });

  // ── Validation ──

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 400 when resumeText is missing", async () => {
    const response = await POST(
      makeRequest(validBody({ resumeText: "" }))
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 when jobDescription is missing", async () => {
    const response = await POST(
      makeRequest(validBody({ jobDescription: "" }))
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when atsIssues is missing", async () => {
    const body = validBody();
    delete (body as Record<string, unknown>).atsIssues;
    const response = await POST(makeRequest(body));
    expect(response.status).toBe(400);
  });

  it("returns 400 when hrFeedback is missing", async () => {
    const body = validBody();
    delete (body as Record<string, unknown>).hrFeedback;
    const response = await POST(makeRequest(body));
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid atsIssues type enum", async () => {
    const response = await POST(
      makeRequest(
        validBody({
          atsIssues: [
            {
              type: "invalid_type",
              severity: "critical",
              message: "Test",
            },
          ],
        })
      )
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid hrFeedback type enum", async () => {
    const response = await POST(
      makeRequest(
        validBody({
          hrFeedback: [
            {
              type: "invalid_type",
              layer: 1,
              severity: "critical",
              message: "Test",
            },
          ],
        })
      )
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid analysisId format", async () => {
    const response = await POST(
      makeRequest(validBody({ analysisId: "not-a-uuid" }))
    );
    expect(response.status).toBe(400);
  });

  // ── Success flow ──

  it("returns suggestions on success", async () => {
    const response = await POST(makeRequest(validBody()));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.suggestions).toHaveLength(2);
    expect(data.count).toBe(2);
  });

  it("suggestions have IDs, text ranges, and all required fields", async () => {
    const response = await POST(makeRequest(validBody()));
    const data = await response.json();

    const suggestion = data.suggestions[0];
    expect(suggestion.id).toBeDefined();
    expect(suggestion.id).toMatch(/^suggestion-0-/);
    expect(suggestion.type).toBe("ats");
    expect(suggestion.category).toBe("missing_keyword");
    expect(suggestion.originalText).toBe(
      "JavaScript, React, Node.js, Python, SQL"
    );
    expect(suggestion.suggestedText).toContain("TypeScript");
    expect(suggestion.reasoning).toBeDefined();
    expect(suggestion.severity).toBe("critical");
    expect(suggestion.textRange).toBeDefined();
    expect(typeof suggestion.textRange.start).toBe("number");
    expect(typeof suggestion.textRange.end).toBe("number");
  });

  it("text range points to the correct position in resume text", async () => {
    const response = await POST(makeRequest(validBody()));
    const data = await response.json();

    const suggestion = data.suggestions[0];
    const expectedStart = SAMPLE_RESUME.indexOf(
      "JavaScript, React, Node.js, Python, SQL"
    );
    expect(suggestion.textRange.start).toBe(expectedStart);
    expect(suggestion.textRange.end).toBe(
      expectedStart + "JavaScript, React, Node.js, Python, SQL".length
    );
  });

  it("passes ATS issues and HR feedback to the optimization engine", async () => {
    const body = validBody();
    await POST(makeRequest(body));

    expect(mockRunOptimization).toHaveBeenCalledOnce();
    const callArgs = mockRunOptimization.mock.calls[0][0];
    expect(callArgs.resumeText).toBe(SAMPLE_RESUME);
    expect(callArgs.jobDescription).toBe(body.jobDescription);
    expect(callArgs.atsIssues).toHaveLength(1);
    expect(callArgs.hrFeedback).toHaveLength(1);
  });

  it("works with empty issues arrays", async () => {
    mockRunOptimization.mockResolvedValueOnce({ suggestions: [] });

    const response = await POST(
      makeRequest(validBody({ atsIssues: [], hrFeedback: [] }))
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.suggestions).toEqual([]);
    expect(data.count).toBe(0);
  });

  // ── Database persistence ──

  it("saves optimized text to database when analysisId is provided", async () => {
    const analysisId = "550e8400-e29b-41d4-a716-446655440000";
    const response = await POST(
      makeRequest(validBody({ analysisId }))
    );
    expect(response.status).toBe(200);

    expect(mockUpdate).toHaveBeenCalledWith({
      optimized_text: SAMPLE_RESUME,
    });
    expect(mockEq).toHaveBeenCalledWith("id", analysisId);
    expect(mockEq2).toHaveBeenCalledWith("user_id", MOCK_USER.id);
  });

  it("does not save to database when analysisId is not provided", async () => {
    const response = await POST(makeRequest(validBody()));
    expect(response.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns suggestions even if database save fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockEq2.mockRejectedValueOnce(new Error("DB error"));

    const analysisId = "550e8400-e29b-41d4-a716-446655440000";
    const response = await POST(
      makeRequest(validBody({ analysisId }))
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.suggestions).toHaveLength(2);

    consoleSpy.mockRestore();
  });

  // ── Error handling ──

  it("returns 500 when optimization engine throws", async () => {
    mockRunOptimization.mockRejectedValueOnce(new Error("OpenAI failed"));

    const response = await POST(makeRequest(validBody()));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Optimization failed. Please try again.");
  });

  // ── Edge cases ──

  it("accepts optional textRange in atsIssues", async () => {
    const response = await POST(
      makeRequest(
        validBody({
          atsIssues: [
            {
              type: "missing_keyword",
              severity: "critical",
              message: "Missing keyword",
              textRange: { start: 0, end: 10 },
            },
          ],
        })
      )
    );
    expect(response.status).toBe(200);
  });

  it("accepts optional textRange in hrFeedback", async () => {
    const response = await POST(
      makeRequest(
        validBody({
          hrFeedback: [
            {
              type: "formatting",
              layer: 1,
              severity: "info",
              message: "Some formatting feedback",
              textRange: { start: 5, end: 15 },
            },
          ],
        })
      )
    );
    expect(response.status).toBe(200);
  });

  it("accepts valid analysisId UUID", async () => {
    const response = await POST(
      makeRequest(
        validBody({
          analysisId: "550e8400-e29b-41d4-a716-446655440000",
        })
      )
    );
    expect(response.status).toBe(200);
  });
});
