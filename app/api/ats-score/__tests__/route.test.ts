import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockUpdate = vi.fn();
const mockEq1 = vi.fn();
const mockEq2 = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: () => ({
      update: mockUpdate,
    }),
  }),
}));

// Mock ATS engine
vi.mock("@/lib/ats-engine", () => ({
  runATSAnalysis: vi.fn(),
}));

// Mock supplementary ATS analysis
vi.mock("@/lib/prompts/ats-prompts", () => ({
  runSupplementaryATSAnalysis: vi.fn(),
}));

import { POST } from "../route";
import { runATSAnalysis } from "@/lib/ats-engine";
import { runSupplementaryATSAnalysis } from "@/lib/prompts/ats-prompts";

const mockedRunATSAnalysis = vi.mocked(runATSAnalysis);
const mockedRunSupplementary = vi.mocked(runSupplementaryATSAnalysis);

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/ats-score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const authenticatedUser = {
  data: { user: { id: "user-123", email: "test@example.com" } },
  error: null,
};

const unauthenticated = {
  data: { user: null },
  error: { message: "Not authenticated" },
};

const sampleATSScore = {
  overall: 72,
  keywordMatchPct: 65,
  formattingScore: 85,
  sectionScore: 80,
  matchedKeywords: ["javascript", "react", "typescript"],
  missingKeywords: ["python", "aws", "docker"],
  issues: [
    {
      type: "missing_keyword" as const,
      severity: "critical" as const,
      message: 'Missing keyword: "python" — found in job description but not in your resume.',
      suggestion: 'Add "python" to a relevant section of your resume.',
    },
    {
      type: "missing_keyword" as const,
      severity: "critical" as const,
      message: 'Missing keyword: "aws" — found in job description but not in your resume.',
      suggestion: 'Add "aws" to a relevant section of your resume.',
    },
    {
      type: "missing_keyword" as const,
      severity: "critical" as const,
      message: 'Missing keyword: "docker" — found in job description but not in your resume.',
      suggestion: 'Add "docker" to a relevant section of your resume.',
    },
  ],
  passed: false,
};

const sampleSupplementary = {
  aliasMatches: [
    {
      original: "aws",
      aliasFoundInResume: "Amazon Web Services",
      reasoning: "AWS is the standard abbreviation for Amazon Web Services",
    },
  ],
  keywordPriorities: [
    {
      keyword: "javascript",
      priority: "critical" as const,
      reasoning: "Core requirement for this role",
    },
  ],
  weakUsages: [
    {
      keyword: "react",
      currentContext: "Skills: React",
      issue: "Only listed in skills section with no supporting experience",
      suggestedImprovement:
        "Add specific React achievements in your experience section",
    },
  ],
  additionalKeywords: ["node.js", "graphql"],
};

describe("POST /api/ats-score", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(authenticatedUser);
    mockedRunATSAnalysis.mockReturnValue(sampleATSScore);
    mockedRunSupplementary.mockResolvedValue(sampleSupplementary);

    // Setup the update chain: .update() → .eq("id", ...) → .eq("user_id", ...)
    mockEq2.mockResolvedValue({ error: null });
    mockEq1.mockReturnValue({ eq: mockEq2 });
    mockUpdate.mockReturnValue({ eq: mockEq1 });
  });

  describe("authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue(unauthenticated);

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/ats-score",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not-json",
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid JSON body");
    });

    it("returns 400 when resumeText is missing", async () => {
      const request = createJsonRequest({
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("returns 400 when jobDescription is missing", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("returns 400 when resumeText is empty", async () => {
      const request = createJsonRequest({
        resumeText: "",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("returns 400 when analysisId is not a valid UUID", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
        analysisId: "not-a-uuid",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("ATS scoring", () => {
    it("runs deterministic ATS engine with resume text and job description", async () => {
      const request = createJsonRequest({
        resumeText: "My resume text",
        jobDescription: "Looking for a Python developer",
      });

      await POST(request);

      expect(mockedRunATSAnalysis).toHaveBeenCalledWith(
        "My resume text",
        "Looking for a Python developer",
        undefined
      );
    });

    it("passes metadata to ATS engine when provided", async () => {
      const request = createJsonRequest({
        resumeText: "My resume text",
        jobDescription: "A job",
        metadata: { pageCount: 2 },
      });

      await POST(request);

      expect(mockedRunATSAnalysis).toHaveBeenCalledWith(
        "My resume text",
        "A job",
        { pageCount: 2 }
      );
    });

    it("runs supplementary GPT-4o analysis with deterministic results", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      await POST(request);

      expect(mockedRunSupplementary).toHaveBeenCalledWith({
        resumeText: "My resume",
        jobDescription: "A job",
        matchedKeywords: sampleATSScore.matchedKeywords,
        missingKeywords: sampleATSScore.missingKeywords,
        matchPct: sampleATSScore.keywordMatchPct,
      });
    });

    it("returns combined score with supplementary analysis", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.score).toBeDefined();
      expect(body.supplementary).toBeDefined();
      expect(body.supplementary.aliasMatches).toEqual(
        sampleSupplementary.aliasMatches
      );
    });

    it("recovers alias matches — moves them from missing to matched", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      // "aws" was recovered by alias, so it should be in matched, not missing
      expect(body.score.matchedKeywords).toContain("aws");
      expect(body.score.missingKeywords).not.toContain("aws");
      // "python" and "docker" are still missing
      expect(body.score.missingKeywords).toContain("python");
      expect(body.score.missingKeywords).toContain("docker");
    });

    it("recalculates keyword match percentage after alias recovery", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      // Originally 3 matched / 6 total = 50% (the sample had 65% but we recalc)
      // After alias recovery: 4 matched / 6 total = 67%
      expect(body.score.keywordMatchPct).toBe(67);
    });

    it("adds weak usage warnings from supplementary analysis", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      const weakIssues = body.score.issues.filter(
        (i: { type: string }) => i.type === "weak_keyword"
      );
      expect(weakIssues.length).toBe(1);
      expect(weakIssues[0].message).toContain("react");
    });

    it("adds additional keyword suggestions from supplementary analysis", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      const additionalIssues = body.score.issues.filter(
        (i: { type: string; severity: string }) =>
          i.type === "missing_keyword" && i.severity === "info"
      );
      expect(additionalIssues.length).toBe(2);
      expect(additionalIssues[0].message).toContain("node.js");
      expect(additionalIssues[1].message).toContain("graphql");
    });

    it("proceeds with deterministic-only results when GPT-4o fails", async () => {
      mockedRunSupplementary.mockRejectedValue(new Error("OpenAI API error"));

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      // Should return the deterministic score unchanged
      expect(body.score.overall).toBe(sampleATSScore.overall);
      expect(body.score.keywordMatchPct).toBe(sampleATSScore.keywordMatchPct);
      expect(body.supplementary).toBeUndefined();
    });

    it("returns 500 when deterministic engine throws", async () => {
      mockedRunATSAnalysis.mockImplementation(() => {
        throw new Error("Engine crashed");
      });

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain("ATS scoring failed");
    });
  });

  describe("database persistence", () => {
    it("saves scores to Supabase when analysisId is provided", async () => {
      const analysisId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
        analysisId,
      });

      await POST(request);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          ats_overall_score: expect.any(Number),
          ats_keyword_match_pct: expect.any(Number),
          ats_formatting_score: expect.any(Number),
          ats_section_score: expect.any(Number),
          ats_issues: expect.any(Array),
        })
      );
      expect(mockEq1).toHaveBeenCalledWith("id", analysisId);
      expect(mockEq2).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("does not save to database when no analysisId is provided", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      await POST(request);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("still returns scores even if database save fails", async () => {
      mockEq2.mockResolvedValue({
        error: { message: "Database error" },
      });

      const analysisId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
        analysisId,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.score).toBeDefined();
    });
  });

  describe("optional fields", () => {
    it("accepts request with metadata and userContext", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
        metadata: { pageCount: 1 },
        userContext: {
          targetRole: "Software Engineer",
          yearsExperience: "3-5",
          visaStatus: "us_citizen",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("accepts request with only required fields", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});
