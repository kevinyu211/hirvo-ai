import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { SectionEmbedding, SemanticScore } from "@/lib/embeddings";

// --- Mocks ---

const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
}));

const mockRunSemanticAnalysis = vi.fn();

vi.mock("@/lib/embeddings", () => ({
  runSemanticAnalysis: (...args: unknown[]) => mockRunSemanticAnalysis(...args),
}));

// --- Helpers ---

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  resumeText: "John Doe\nSoftware Engineer with 5 years experience",
  jobDescription: "Looking for a senior software engineer with React and Node.js",
  analysisId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
};

const mockUser = { id: "user-123", email: "test@example.com" };

const mockResumeEmbeddings: SectionEmbedding[] = [
  {
    section: "experience",
    embedding: [0.1, 0.2, 0.3],
    content: "Software Engineer with 5 years experience",
  },
  {
    section: "skills",
    embedding: [0.4, 0.5, 0.6],
    content: "React, Node.js, TypeScript",
  },
];

const mockJdEmbedding = [0.7, 0.8, 0.9];

const mockSemanticScore: SemanticScore = {
  overallScore: 72,
  sectionScores: [
    { section: "experience", score: 78 },
    { section: "skills", score: 65 },
  ],
};

// --- Tests ---

describe("POST /api/embeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
    mockRunSemanticAnalysis.mockResolvedValue({
      score: mockSemanticScore,
      resumeEmbeddings: mockResumeEmbeddings,
      jdEmbedding: mockJdEmbedding,
    });
    mockFrom.mockReturnValue({ insert: mockInsert });
    mockInsert.mockResolvedValue({ error: null });
  });

  // --- Auth tests ---

  it("returns 401 if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "No session" } });

    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 if getUser returns error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Token expired" } });

    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(401);
  });

  // --- Validation tests ---

  it("returns 400 for invalid JSON body", async () => {
    const request = new NextRequest("http://localhost:3000/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json{{{",
    });

    const { POST } = await import("../route");
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("returns 400 if resumeText is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        jobDescription: "Some JD",
        analysisId: validBody.analysisId,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  it("returns 400 if jobDescription is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        resumeText: "Some resume text",
        analysisId: validBody.analysisId,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 if analysisId is missing", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        resumeText: "Some resume text",
        jobDescription: "Some JD",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 if analysisId is not a valid UUID", async () => {
    const { POST } = await import("../route");
    const response = await POST(
      makeRequest({
        resumeText: "Some resume text",
        jobDescription: "Some JD",
        analysisId: "not-a-uuid",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  // --- Success flow ---

  it("runs semantic analysis and returns scores", async () => {
    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.score).toEqual(mockSemanticScore);
    expect(data.embeddingsStored).toBe(3); // 2 resume sections + 1 JD
  });

  it("calls runSemanticAnalysis with resume text and job description", async () => {
    const { POST } = await import("../route");
    await POST(makeRequest(validBody));

    expect(mockRunSemanticAnalysis).toHaveBeenCalledWith(
      validBody.resumeText,
      validBody.jobDescription
    );
  });

  it("stores embeddings in the resume_embeddings table via service role client", async () => {
    const { POST } = await import("../route");
    await POST(makeRequest(validBody));

    expect(mockFrom).toHaveBeenCalledWith("resume_embeddings");
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const insertedRecords = mockInsert.mock.calls[0][0];
    expect(insertedRecords).toHaveLength(3); // 2 resume sections + 1 JD

    // Check resume section embeddings
    expect(insertedRecords[0]).toEqual({
      analysis_id: validBody.analysisId,
      content_type: "resume_section",
      section_name: "experience",
      content_text: "Software Engineer with 5 years experience",
      embedding: [0.1, 0.2, 0.3],
    });

    expect(insertedRecords[1]).toEqual({
      analysis_id: validBody.analysisId,
      content_type: "resume_section",
      section_name: "skills",
      content_text: "React, Node.js, TypeScript",
      embedding: [0.4, 0.5, 0.6],
    });

    // Check JD embedding
    expect(insertedRecords[2]).toEqual({
      analysis_id: validBody.analysisId,
      content_type: "job_description",
      section_name: null,
      content_text: validBody.jobDescription,
      embedding: [0.7, 0.8, 0.9],
    });
  });

  it("stores 'full' section as resume_full content type with null section_name", async () => {
    mockRunSemanticAnalysis.mockResolvedValue({
      score: { overallScore: 60, sectionScores: [{ section: "full", score: 60 }] },
      resumeEmbeddings: [
        { section: "full", embedding: [0.1, 0.2], content: "Full resume text" },
      ],
      jdEmbedding: [0.3, 0.4],
    });

    const { POST } = await import("../route");
    await POST(makeRequest(validBody));

    const insertedRecords = mockInsert.mock.calls[0][0];
    expect(insertedRecords[0]).toEqual({
      analysis_id: validBody.analysisId,
      content_type: "resume_full",
      section_name: null,
      content_text: "Full resume text",
      embedding: [0.1, 0.2],
    });
  });

  // --- Error handling ---

  it("returns scores even if embedding storage fails", async () => {
    mockInsert.mockResolvedValue({ error: { message: "DB write error" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.score).toEqual(mockSemanticScore);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to store embeddings:",
      expect.objectContaining({ message: "DB write error" })
    );

    consoleSpy.mockRestore();
  });

  it("returns 500 if semantic analysis crashes", async () => {
    mockRunSemanticAnalysis.mockRejectedValue(new Error("OpenAI API failure"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Embeddings generation failed. Please try again.");

    consoleSpy.mockRestore();
  });

  it("returns 500 if embedding generation fails with empty text error", async () => {
    mockRunSemanticAnalysis.mockRejectedValue(
      new Error("Cannot generate embedding for empty text")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });

  // --- Edge cases ---

  it("handles empty resume embeddings array (all sections too short)", async () => {
    // runSemanticAnalysis would throw if all sections are too short,
    // but if it somehow returns empty, we should handle gracefully
    mockRunSemanticAnalysis.mockResolvedValue({
      score: { overallScore: 0, sectionScores: [] },
      resumeEmbeddings: [],
      jdEmbedding: [0.1, 0.2],
    });

    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.embeddingsStored).toBe(1); // Only JD embedding
  });

  it("handles many resume sections", async () => {
    const manySections: SectionEmbedding[] = [
      { section: "header", embedding: [0.1], content: "Contact info here" },
      { section: "summary", embedding: [0.2], content: "Summary text here" },
      { section: "experience", embedding: [0.3], content: "Experience details here" },
      { section: "education", embedding: [0.4], content: "Education details here" },
      { section: "skills", embedding: [0.5], content: "Skills listed here" },
      { section: "projects", embedding: [0.6], content: "Projects described here" },
    ];

    mockRunSemanticAnalysis.mockResolvedValue({
      score: { overallScore: 80, sectionScores: manySections.map((s) => ({ section: s.section, score: 80 })) },
      resumeEmbeddings: manySections,
      jdEmbedding: [0.7],
    });

    const { POST } = await import("../route");
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.embeddingsStored).toBe(7); // 6 resume sections + 1 JD

    const insertedRecords = mockInsert.mock.calls[0][0];
    expect(insertedRecords).toHaveLength(7);
    // All should be resume_section (no "full" section here)
    const sectionTypes = insertedRecords.slice(0, 6).map((r: { content_type: string }) => r.content_type);
    expect(sectionTypes).toEqual([
      "resume_section",
      "resume_section",
      "resume_section",
      "resume_section",
      "resume_section",
      "resume_section",
    ]);
  });
});
