import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Supabase mocks ────────────────────────────────────────────────────
const mockGetUser = vi.fn();
const mockUpdate = vi.fn();
const mockEq1 = vi.fn();
const mockEq2 = vi.fn();

// Service role client mocks (for reference resumes + embeddings storage)
const mockServiceFrom = vi.fn();
const mockServiceSelect = vi.fn();
const mockServiceLimit = vi.fn();
const mockServiceInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: () => ({
      update: mockUpdate,
    }),
  }),
  createServiceRoleClient: () => ({
    from: mockServiceFrom,
  }),
}));

// ── HR Engine mock (Layer 1) ──────────────────────────────────────────
vi.mock("@/lib/hr-engine", () => ({
  analyzeFormatting: vi.fn(),
  fetchReferenceResumes: vi.fn(),
}));

// ── Embeddings mock (Layer 2) ─────────────────────────────────────────
vi.mock("@/lib/embeddings", () => ({
  runSemanticAnalysis: vi.fn(),
}));

// ── HR Prompts mock (Layer 3) ─────────────────────────────────────────
vi.mock("@/lib/prompts/hr-prompts", () => ({
  runHRReview: vi.fn(),
}));

import { POST } from "../route";
import { analyzeFormatting, fetchReferenceResumes } from "@/lib/hr-engine";
import { runSemanticAnalysis } from "@/lib/embeddings";
import { runHRReview } from "@/lib/prompts/hr-prompts";

const mockedAnalyzeFormatting = vi.mocked(analyzeFormatting);
const mockedFetchReferenceResumes = vi.mocked(fetchReferenceResumes);
const mockedRunSemanticAnalysis = vi.mocked(runSemanticAnalysis);
const mockedRunHRReview = vi.mocked(runHRReview);

// ── Helpers ───────────────────────────────────────────────────────────

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/hr-score", {
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

// ── Sample data ───────────────────────────────────────────────────────

const sampleFormattingResult = {
  score: 78,
  suggestions: [
    {
      aspect: "summary_section",
      userValue: "No summary section",
      referenceValue: "Has summary section",
      percentageSupport: 75,
      message: "Your resume doesn't have a summary section.",
      severity: "warning" as const,
    },
  ],
  feedback: [
    {
      type: "formatting" as const,
      layer: 1 as const,
      severity: "warning" as const,
      message: "Your resume doesn't have a summary section.",
      suggestion:
        "Add a 2-3 sentence professional summary at the top of your resume.",
    },
  ],
  userPatterns: {
    pageCount: 1,
    sectionOrder: ["Contact", "Experience", "Education", "Skills"],
    bulletStyle: {
      types: ["dash"],
      totalBullets: 5,
      avgBulletsPerEntry: 5,
    },
    hasSummary: false,
    quantifiedMetrics: { count: 3, examples: ["40%", "$500K", "15"] },
    headingStyle: { styles: ["ALL_CAPS"], consistent: true },
    dateFormat: { formats: ["Month YYYY"], consistent: true },
    whiteSpaceRatio: 0.3,
    wordCount: 400,
    avgWordsPerLine: 8,
  },
  referenceCount: 0,
};

const sampleSemanticResult = {
  score: {
    overallScore: 72,
    sectionScores: [
      { section: "experience", score: 75 },
      { section: "skills", score: 80 },
      { section: "education", score: 55 },
      { section: "summary", score: 35 },
    ],
  },
  resumeEmbeddings: [
    {
      section: "experience",
      embedding: [0.1, 0.2, 0.3],
      content: "5 years of experience...",
    },
    {
      section: "skills",
      embedding: [0.4, 0.5, 0.6],
      content: "JavaScript, React...",
    },
  ],
  jdEmbedding: [0.7, 0.8, 0.9],
};

const sampleHRReview = {
  overallScore: 68,
  firstImpression:
    "The resume is well-organized but lacks quantified impact statements.",
  careerNarrative: {
    score: 70,
    assessment: "Logical career progression from junior to mid-level.",
    suggestion: "Highlight leadership progression more clearly.",
  },
  achievementStrength: {
    score: 50,
    assessment: "Achievements are mostly duty-based rather than impact-focused.",
    suggestion: "Rewrite bullets using the CAR format with specific metrics.",
  },
  roleRelevance: {
    score: 75,
    assessment: "Good alignment with the core requirements.",
    suggestion: "Highlight experience with the specific tech stack mentioned.",
  },
  redFlags: [
    {
      type: "vague_description" as const,
      description: "Several bullet points describe duties without measurable outcomes.",
      severity: "warning" as const,
      mitigation: "Quantify your achievements with specific numbers.",
    },
  ],
  sectionComments: [
    {
      section: "Experience",
      comment: "Solid experience section with relevant roles.",
      suggestion: "Add more metrics to strengthen each bullet point.",
      score: 72,
    },
    {
      section: "Skills",
      comment: "Good skill set but lacks context.",
      suggestion: "Group skills by category and indicate proficiency levels.",
      score: 65,
    },
  ],
  callbackDecision: {
    decision: "maybe" as const,
    reasoning:
      "The candidate has relevant experience but needs stronger impact statements.",
  },
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("POST /api/hr-score", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(authenticatedUser);

    // Layer 1: Formatting
    mockedFetchReferenceResumes.mockResolvedValue([]);
    mockedAnalyzeFormatting.mockReturnValue(sampleFormattingResult);

    // Layer 2: Semantic
    mockedRunSemanticAnalysis.mockResolvedValue(sampleSemanticResult);

    // Layer 3: LLM
    mockedRunHRReview.mockResolvedValue(sampleHRReview);

    // Supabase update chain
    mockEq2.mockResolvedValue({ error: null });
    mockEq1.mockReturnValue({ eq: mockEq2 });
    mockUpdate.mockReturnValue({ eq: mockEq1 });

    // Service role client — reference resume queries
    mockServiceLimit.mockResolvedValue({ data: [], error: null });
    mockServiceSelect.mockReturnValue({ limit: mockServiceLimit });
    mockServiceFrom.mockReturnValue({
      select: mockServiceSelect,
      insert: mockServiceInsert,
    });
    mockServiceInsert.mockResolvedValue({ error: null });
  });

  // ── Authentication ──────────────────────────────────────────────────

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

    it("returns 401 when auth error occurs", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Token expired" },
      });

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  // ── Validation ──────────────────────────────────────────────────────

  describe("validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      const request = new NextRequest("http://localhost:3000/api/hr-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid JSON body");
    });

    it("returns 400 when resumeText is missing", async () => {
      const request = createJsonRequest({ jobDescription: "A job" });
      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("returns 400 when jobDescription is missing", async () => {
      const request = createJsonRequest({ resumeText: "My resume" });
      const response = await POST(request);
      expect(response.status).toBe(400);
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

  // ── HR Scoring Pipeline ─────────────────────────────────────────────

  describe("HR scoring pipeline", () => {
    it("calls all three layers and returns combined score", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();

      // Combined HR score should exist
      expect(body.score).toBeDefined();
      expect(body.score.overall).toBeTypeOf("number");
      expect(body.score.formattingScore).toBe(78);
      expect(body.score.semanticScore).toBe(72);
      expect(body.score.llmScore).toBe(68);
      expect(body.score.feedback).toBeInstanceOf(Array);

      // Per-layer details should exist
      expect(body.layers).toBeDefined();
      expect(body.layers.formatting.score).toBe(78);
      expect(body.layers.semantic.score).toBe(72);
      expect(body.layers.llmReview.score).toBe(68);
    });

    it("computes combined score with standard weights (20/40/40)", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      // Expected: 78 * 0.2 + 72 * 0.4 + 68 * 0.4 = 15.6 + 28.8 + 27.2 = 71.6 → 72
      expect(body.score.overall).toBe(72);
    });

    it("calls analyzeFormatting with resume text and metadata", async () => {
      const request = createJsonRequest({
        resumeText: "My resume text here",
        jobDescription: "A job",
        metadata: { pageCount: 2 },
      });

      await POST(request);

      expect(mockedAnalyzeFormatting).toHaveBeenCalledWith(
        "My resume text here",
        { pageCount: 2 },
        expect.any(Array) // reference resumes
      );
    });

    it("calls runSemanticAnalysis with resume text and job description", async () => {
      const request = createJsonRequest({
        resumeText: "My resume text",
        jobDescription: "Looking for engineers",
      });

      await POST(request);

      expect(mockedRunSemanticAnalysis).toHaveBeenCalledWith(
        "My resume text",
        "Looking for engineers"
      );
    });

    it("calls runHRReview with resume text, job description, and user context", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
        userContext: {
          targetRole: "Software Engineer",
          yearsExperience: "3-5",
          visaStatus: "h1b",
        },
      });

      await POST(request);

      expect(mockedRunHRReview).toHaveBeenCalledWith({
        resumeText: "My resume",
        jobDescription: "A job",
        targetRole: "Software Engineer",
        yearsExperience: "3-5",
        visaStatus: "h1b",
      });
    });
  });

  // ── Graceful Degradation ────────────────────────────────────────────

  describe("graceful degradation", () => {
    it("proceeds with zero semantic score when embeddings fail", async () => {
      mockedRunSemanticAnalysis.mockRejectedValue(
        new Error("OpenAI API error")
      );

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.score.semanticScore).toBe(0);
      expect(body.layers.semantic.score).toBe(0);
    });

    it("proceeds without LLM review when GPT-4o fails", async () => {
      mockedRunHRReview.mockRejectedValue(new Error("OpenAI API error"));

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.score.llmScore).toBe(0);
      expect(body.layers.llmReview).toBeNull();
    });

    it("uses fallback weights (30/70) when LLM review is unavailable", async () => {
      mockedRunHRReview.mockRejectedValue(new Error("OpenAI API error"));

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      // Expected: 78 * 0.3 + 72 * 0.7 = 23.4 + 50.4 = 73.8 → 74
      expect(body.score.overall).toBe(74);
    });

    it("falls back to standalone formatting analysis when reference resumes fail", async () => {
      // Make fetchReferenceResumes throw — this triggers the catch block
      // which calls analyzeFormatting with empty refs (standalone mode)
      mockedFetchReferenceResumes.mockRejectedValue(
        new Error("Supabase error")
      );

      // analyzeFormatting should succeed on its first call (the fallback)
      mockedAnalyzeFormatting.mockReturnValue(sampleFormattingResult);

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Should be called once — only in the catch fallback (since fetchReferenceResumes throws before analyzeFormatting is called in the try block)
      expect(mockedAnalyzeFormatting).toHaveBeenCalledTimes(1);
      expect(mockedAnalyzeFormatting).toHaveBeenCalledWith(
        "My resume",
        undefined,
        []
      );
    });

    it("returns 500 when all layers fail catastrophically", async () => {
      mockedAnalyzeFormatting.mockImplementation(() => {
        throw new Error("Layer 1 crash");
      });

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toContain("HR scoring failed");
    });
  });

  // ── Feedback Generation ─────────────────────────────────────────────

  describe("feedback generation", () => {
    it("includes formatting feedback from Layer 1", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      const formattingFeedback = body.score.feedback.filter(
        (f: { layer: number }) => f.layer === 1
      );
      expect(formattingFeedback.length).toBeGreaterThan(0);
      expect(formattingFeedback[0].type).toBe("formatting");
    });

    it("includes semantic feedback for weak sections from Layer 2", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      const semanticFeedback = body.score.feedback.filter(
        (f: { layer: number }) => f.layer === 2
      );
      // summary section (score 35) should generate critical feedback
      // education section (score 55) should generate warning feedback
      expect(semanticFeedback.length).toBe(2);

      const criticalSemantic = semanticFeedback.filter(
        (f: { severity: string }) => f.severity === "critical"
      );
      expect(criticalSemantic.length).toBe(1);
      expect(criticalSemantic[0].message).toContain("summary");
    });

    it("includes LLM review feedback from Layer 3", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      const llmFeedback = body.score.feedback.filter(
        (f: { layer: number }) => f.layer === 3
      );
      // Should include: red flag, achievement strength (<60), callback decision (maybe)
      expect(llmFeedback.length).toBeGreaterThan(0);

      // Check red flag feedback
      const redFlagFeedback = llmFeedback.filter((f: { message: string }) =>
        f.message.includes("Red flag")
      );
      expect(redFlagFeedback.length).toBe(1);

      // Check callback decision feedback
      const callbackFeedback = llmFeedback.filter((f: { message: string }) =>
        f.message.includes("HR verdict")
      );
      expect(callbackFeedback.length).toBe(1);
      expect(callbackFeedback[0].severity).toBe("warning");
    });

    it("generates critical feedback for sections with very low scores", async () => {
      // Override with low-scoring HR review
      mockedRunHRReview.mockResolvedValue({
        ...sampleHRReview,
        achievementStrength: {
          score: 25,
          assessment: "Very weak achievements",
          suggestion: "Completely rewrite using CAR format",
        },
        roleRelevance: {
          score: 30,
          assessment: "Poor alignment with the role",
          suggestion: "Tailor your experience to this specific role",
        },
        sectionComments: [
          {
            section: "Experience",
            comment: "Needs major overhaul",
            suggestion: "Rewrite all bullets",
            score: 30,
          },
        ],
        callbackDecision: {
          decision: "no" as const,
          reasoning: "Does not meet the requirements.",
        },
      });

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      const criticalFeedback = body.score.feedback.filter(
        (f: { severity: string; layer: number }) =>
          f.severity === "critical" && f.layer === 3
      );
      // Should have: achievement critical, role relevance critical, section comment critical, callback no
      expect(criticalFeedback.length).toBeGreaterThanOrEqual(3);
    });

    it("does not include LLM feedback when LLM review fails", async () => {
      mockedRunHRReview.mockRejectedValue(new Error("OpenAI error"));

      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      const llmFeedback = body.score.feedback.filter(
        (f: { layer: number }) => f.layer === 3
      );
      expect(llmFeedback.length).toBe(0);
    });
  });

  // ── Database Persistence ────────────────────────────────────────────

  describe("database persistence", () => {
    it("saves HR scores to Supabase when analysisId is provided", async () => {
      const analysisId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
        analysisId,
      });

      await POST(request);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          hr_formatting_score: 78,
          hr_semantic_score: 72,
          hr_llm_score: 68,
          hr_overall_score: expect.any(Number),
          hr_feedback: expect.any(Array),
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

  // ── Response Structure ──────────────────────────────────────────────

  describe("response structure", () => {
    it("returns complete layer breakdown in response", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      // Formatting layer
      expect(body.layers.formatting).toEqual({
        score: 78,
        suggestions: sampleFormattingResult.suggestions,
        referenceCount: 0,
      });

      // Semantic layer
      expect(body.layers.semantic).toEqual({
        score: 72,
        sectionScores: sampleSemanticResult.score.sectionScores,
      });

      // LLM review layer
      expect(body.layers.llmReview.score).toBe(68);
      expect(body.layers.llmReview.firstImpression).toBe(
        sampleHRReview.firstImpression
      );
      expect(body.layers.llmReview.callbackDecision).toEqual(
        sampleHRReview.callbackDecision
      );
      expect(body.layers.llmReview.redFlags).toEqual(sampleHRReview.redFlags);
    });

    it("returns proper HRScore shape in score field", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body.score).toHaveProperty("overall");
      expect(body.score).toHaveProperty("formattingScore");
      expect(body.score).toHaveProperty("semanticScore");
      expect(body.score).toHaveProperty("llmScore");
      expect(body.score).toHaveProperty("feedback");
      expect(body.score.overall).toBeGreaterThanOrEqual(0);
      expect(body.score.overall).toBeLessThanOrEqual(100);
    });
  });

  // ── Optional Fields ─────────────────────────────────────────────────

  describe("optional fields", () => {
    it("accepts request with only required fields", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("passes userContext to LLM review when provided", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
        userContext: {
          targetRole: "Data Scientist",
          yearsExperience: "6-10",
          visaStatus: "opt_cpt",
        },
      });

      await POST(request);

      expect(mockedRunHRReview).toHaveBeenCalledWith(
        expect.objectContaining({
          targetRole: "Data Scientist",
          yearsExperience: "6-10",
          visaStatus: "opt_cpt",
        })
      );
    });

    it("passes undefined context fields when userContext is not provided", async () => {
      const request = createJsonRequest({
        resumeText: "My resume",
        jobDescription: "A job",
      });

      await POST(request);

      expect(mockedRunHRReview).toHaveBeenCalledWith(
        expect.objectContaining({
          targetRole: undefined,
          yearsExperience: undefined,
          visaStatus: undefined,
        })
      );
    });
  });
});
