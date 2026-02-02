/**
 * @vitest-environment jsdom
 *
 * Integration tests for API routes
 * Tests the scoring/optimization flow: ats-score → hr-score → optimize
 * with mocked OpenAI responses and mocked Supabase
 *
 * Note: Parse route tests are in app/api/parse/__tests__/route.test.ts
 * and are not duplicated here since FormData handling in jsdom is brittle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// Mock Setup - Must be hoisted for use in vi.mock factories
// ============================================================================

// Hoisted mocks for Supabase
const {
  mockGetUser,
  mockSupabaseFrom,
  mockSupabaseUpdate,
  mockSupabaseEq,
  mockSupabaseSelect,
  mockSupabaseInsert,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSupabaseFrom: vi.fn(),
  mockSupabaseUpdate: vi.fn(),
  mockSupabaseEq: vi.fn(),
  mockSupabaseSelect: vi.fn(),
  mockSupabaseInsert: vi.fn(),
}));

// Hoisted mocks for OpenAI
const { mockOpenAICreate, mockEmbeddingsCreate } = vi.hoisted(() => ({
  mockOpenAICreate: vi.fn(),
  mockEmbeddingsCreate: vi.fn(),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockSupabaseFrom,
  }),
  createServiceRoleClient: () => ({
    from: mockSupabaseFrom,
  }),
}));

// Mock OpenAI
vi.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
    embeddings: {
      create: mockEmbeddingsCreate,
    },
  },
}));

// Import route handlers after mocks
import { POST as atsScoreRoute } from "../ats-score/route";
import { POST as hrScoreRoute } from "../hr-score/route";
import { POST as optimizeRoute } from "../optimize/route";

// ============================================================================
// Test Data
// ============================================================================

const authenticatedUser = {
  data: { user: { id: "user-123", email: "test@example.com" } },
  error: null,
};

const unauthenticatedUser = {
  data: { user: null },
  error: { message: "Not authenticated" },
};

const sampleResumeText = `John Doe
john.doe@email.com
(555) 123-4567
linkedin.com/in/johndoe

Professional Summary
Experienced Software Engineer with 5 years of experience in full-stack development.
Proficient in JavaScript, TypeScript, Python, and cloud technologies.

Work Experience
Senior Software Engineer
Acme Corp, San Francisco, CA
January 2020 - Present
• Led development of microservices architecture serving 1M+ users
• Reduced API response times by 40% through optimization
• Mentored team of 5 junior developers

Software Engineer
TechStart Inc, Palo Alto, CA
June 2018 - December 2019
• Built React applications for enterprise clients
• Implemented CI/CD pipelines using GitHub Actions
• Collaborated with product team on feature specifications

Education
Bachelor of Science in Computer Science
Stanford University, 2018
GPA: 3.8/4.0

Technical Skills
Languages: JavaScript, TypeScript, Python, Java, SQL
Frameworks: React, Node.js, Express, Next.js, Django
Cloud: AWS (EC2, S3, Lambda), Google Cloud Platform
Tools: Git, Docker, Kubernetes, Jenkins, JIRA`;

const sampleJobDescription = `Senior Software Engineer - Full Stack

About the Role:
We are looking for a Senior Software Engineer to join our team and help build scalable web applications.

Requirements:
- 5+ years of experience in software development
- Strong proficiency in JavaScript/TypeScript and Python
- Experience with React and Node.js
- Familiarity with cloud services (AWS, GCP)
- Experience with microservices architecture
- Strong communication and collaboration skills

Responsibilities:
- Design and implement new features
- Lead technical discussions and code reviews
- Mentor junior engineers
- Optimize application performance
- Collaborate with product managers and designers

Nice to have:
- Experience with Kubernetes and Docker
- Knowledge of CI/CD best practices
- Experience with agile methodologies`;

const weakResumeText = "John Smith\nI am a worker.\nI worked at a company.";

// ============================================================================
// Helper Functions
// ============================================================================

function createJsonRequest(url: string, body: object): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupSupabaseMocks() {
  // Default mock for update chain
  mockSupabaseEq.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  mockSupabaseUpdate.mockReturnValue({
    eq: mockSupabaseEq,
  });

  // Default mock for select chain (reference resumes)
  mockSupabaseSelect.mockResolvedValue({
    data: [],
    error: null,
  });

  // Default mock for insert
  mockSupabaseInsert.mockResolvedValue({ error: null });

  // Setup from() to return appropriate mock based on table
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === "resume_analyses") {
      return {
        update: mockSupabaseUpdate,
        insert: mockSupabaseInsert,
      };
    }
    if (table === "reference_resumes") {
      return {
        select: () => ({
          eq: () => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    }
    if (table === "resume_embeddings") {
      return {
        insert: mockSupabaseInsert,
      };
    }
    return {
      update: mockSupabaseUpdate,
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
    };
  });
}

function setupOpenAIMocks() {
  // Default mock for embeddings
  mockEmbeddingsCreate.mockResolvedValue({
    data: [{ embedding: Array(1536).fill(0.1), index: 0, object: "embedding" }],
    model: "text-embedding-3-small",
    object: "list",
    usage: { prompt_tokens: 10, total_tokens: 10 },
  });

  // Default mock for chat completions (returns structured JSON)
  mockOpenAICreate.mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          // ATS supplementary fields
          aliasMatches: [],
          keywordPriorities: [
            { keyword: "JavaScript", priority: "high", reason: "Core skill" },
          ],
          weakUsages: [],
          additionalKeywords: [],
          // HR review fields
          overallScore: 75,
          firstImpression: {
            score: 80,
            assessment: "Strong resume with clear structure",
          },
          careerNarrative: {
            score: 78,
            assessment: "Clear career progression",
            suggestion: "Consider adding more quantified achievements",
          },
          achievementStrength: {
            score: 82,
            assessment: "Good use of metrics",
          },
          roleRelevance: {
            score: 85,
            assessment: "Highly relevant experience",
          },
          redFlags: [],
          sectionComments: [],
          callbackDecision: {
            decision: "yes",
            reasoning: "Strong candidate with relevant experience",
          },
          // Optimization fields
          suggestions: [
            {
              originalText: "5 years of experience",
              suggestedText: "5+ years of experience in full-stack development",
              category: "weak_keyword",
              type: "ats",
              severity: "warning",
              reasoning: "Add more specific context to experience",
            },
          ],
        }),
      },
    }],
  });
}

// ============================================================================
// Test Suites
// ============================================================================

describe("API Route Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(authenticatedUser);
    setupSupabaseMocks();
    setupOpenAIMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================
  describe("Authentication Enforcement", () => {
    it("returns 401 for /api/ats-score when not authenticated", async () => {
      mockGetUser.mockResolvedValue(unauthenticatedUser);

      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await atsScoreRoute(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 for /api/hr-score when not authenticated", async () => {
      mockGetUser.mockResolvedValue(unauthenticatedUser);

      const request = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await hrScoreRoute(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 for /api/optimize when not authenticated", async () => {
      mockGetUser.mockResolvedValue(unauthenticatedUser);

      const request = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        atsIssues: [],
        hrFeedback: [],
      });
      const response = await optimizeRoute(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  // ==========================================================================
  // ATS Score Route Tests
  // ==========================================================================
  describe("/api/ats-score Integration", () => {
    it("returns ATS score with keyword analysis", async () => {
      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await atsScoreRoute(request);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.score).toBeDefined();
      expect(body.score.overall).toBeGreaterThanOrEqual(0);
      expect(body.score.overall).toBeLessThanOrEqual(100);
      expect(body.score.keywordMatchPct).toBeDefined();
      expect(body.score.formattingScore).toBeDefined();
      expect(body.score.sectionScore).toBeDefined();
    });

    it("includes keyword match details", async () => {
      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await atsScoreRoute(request);

      const body = await response.json();
      expect(body.score.matchedKeywords).toBeInstanceOf(Array);
      expect(body.score.missingKeywords).toBeInstanceOf(Array);
      expect(body.score.issues).toBeInstanceOf(Array);
    });

    it("validates required fields", async () => {
      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        // missing jobDescription
      });
      const response = await atsScoreRoute(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("persists scores to database when analysisId provided", async () => {
      const analysisId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        analysisId,
      });

      await atsScoreRoute(request);

      expect(mockSupabaseFrom).toHaveBeenCalledWith("resume_analyses");
      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });

    it("returns pass/fail based on threshold", async () => {
      // Strong resume should pass
      const strongRequest = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const strongResponse = await atsScoreRoute(strongRequest);
      const strongBody = await strongResponse.json();
      expect(typeof strongBody.score.passed).toBe("boolean");
    });

    it("handles weak resumes with low scores", async () => {
      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: weakResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await atsScoreRoute(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.score.passed).toBe(false);
      expect(body.score.overall).toBeLessThan(75);
    });
  });

  // ==========================================================================
  // HR Score Route Tests
  // ==========================================================================
  describe("/api/hr-score Integration", () => {
    it("returns HR score with three-layer breakdown", async () => {
      const request = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await hrScoreRoute(request);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.score).toBeDefined();
      expect(body.score.overall).toBeGreaterThanOrEqual(0);
      expect(body.score.overall).toBeLessThanOrEqual(100);
    });

    it("includes HR layers breakdown", async () => {
      const request = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await hrScoreRoute(request);

      const body = await response.json();
      expect(body.layers).toBeDefined();
      expect(body.layers.formatting).toBeDefined();
      expect(body.layers.semantic).toBeDefined();
    });

    it("validates required fields", async () => {
      const request = createJsonRequest("http://localhost:3000/api/hr-score", {
        // missing both resumeText and jobDescription
      });
      const response = await hrScoreRoute(request);

      expect(response.status).toBe(400);
    });

    it("handles optional user context", async () => {
      const request = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        userContext: {
          targetRole: "Senior Software Engineer",
          yearsExperience: "6-10",
          visaStatus: "us_citizen",
        },
      });
      const response = await hrScoreRoute(request);

      expect(response.status).toBe(200);
    });

    it("returns semantic similarity scores", async () => {
      const request = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await hrScoreRoute(request);

      const body = await response.json();
      expect(body.layers.semantic).toBeDefined();
      expect(body.layers.semantic.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Optimize Route Tests
  // ==========================================================================
  describe("/api/optimize Integration", () => {
    it("generates optimization suggestions", async () => {
      const request = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        atsIssues: [
          {
            type: "missing_keyword",
            message: "Missing keyword: agile",
            severity: "warning",
          },
        ],
        hrFeedback: [
          {
            type: "formatting",
            layer: 1,
            message: "Consider using more bullet points",
            severity: "info",
          },
        ],
      });
      const response = await optimizeRoute(request);

      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.suggestions).toBeInstanceOf(Array);
      expect(body.count).toBeGreaterThanOrEqual(0);
    });

    it("validates required atsIssues and hrFeedback arrays", async () => {
      const request = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        // missing atsIssues and hrFeedback
      });
      const response = await optimizeRoute(request);

      expect(response.status).toBe(400);
    });

    it("handles visa-flagged resumes", async () => {
      const request = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText + "\n\nWork Authorization: H-1B Visa",
        jobDescription: sampleJobDescription,
        atsIssues: [],
        hrFeedback: [],
        visaFlagged: true,
        visaSignals: ["H-1B Visa"],
      });
      const response = await optimizeRoute(request);

      expect(response.status).toBe(200);
    });

    it("accepts empty arrays for issues and feedback", async () => {
      const request = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        atsIssues: [],
        hrFeedback: [],
      });
      const response = await optimizeRoute(request);

      expect(response.status).toBe(200);
    });

    it("handles invalid ATS issue types", async () => {
      const request = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        atsIssues: [
          {
            type: "invalid_type", // Not a valid ATS issue type
            message: "Test",
            severity: "warning",
          },
        ],
        hrFeedback: [],
      });
      const response = await optimizeRoute(request);

      expect(response.status).toBe(400);
    });
  });

  // ==========================================================================
  // Full Pipeline Integration Test
  // ==========================================================================
  describe("Full Analysis Pipeline", () => {
    it("processes a resume through ats-score → hr-score → optimize", async () => {
      // Step 1: Get ATS score
      const atsRequest = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const atsResponse = await atsScoreRoute(atsRequest);

      expect(atsResponse.status).toBe(200);
      const atsBody = await atsResponse.json();
      expect(atsBody.score.overall).toBeDefined();
      expect(atsBody.score.issues).toBeInstanceOf(Array);

      // Step 2: Get HR score
      const hrRequest = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const hrResponse = await hrScoreRoute(hrRequest);

      expect(hrResponse.status).toBe(200);
      const hrBody = await hrResponse.json();
      expect(hrBody.score.overall).toBeDefined();

      // Step 3: Get optimization suggestions using the issues from scoring
      const optimizeRequest = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        atsIssues: atsBody.score.issues || [],
        hrFeedback: hrBody.score.feedback || [],
      });
      const optimizeResponse = await optimizeRoute(optimizeRequest);

      expect(optimizeResponse.status).toBe(200);
      const optimizeBody = await optimizeResponse.json();
      expect(optimizeBody.suggestions).toBeDefined();
    });

    it("handles pipeline with a weak resume", async () => {
      // Step 1: ATS score should be low for weak resume
      const atsRequest = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: weakResumeText,
        jobDescription: sampleJobDescription,
      });
      const atsResponse = await atsScoreRoute(atsRequest);

      expect(atsResponse.status).toBe(200);
      const atsBody = await atsResponse.json();
      expect(atsBody.score.passed).toBe(false);
      expect(atsBody.score.overall).toBeLessThan(75);
      // Weak resume should have many missing keywords
      expect(atsBody.score.missingKeywords.length).toBeGreaterThan(0);

      // Step 2: HR score should also be low
      const hrRequest = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: weakResumeText,
        jobDescription: sampleJobDescription,
      });
      const hrResponse = await hrScoreRoute(hrRequest);

      expect(hrResponse.status).toBe(200);

      // Step 3: Should be able to generate suggestions for weak resume
      const optimizeRequest = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: weakResumeText,
        jobDescription: sampleJobDescription,
        atsIssues: atsBody.score.issues || [],
        hrFeedback: [],
      });
      const optimizeResponse = await optimizeRoute(optimizeRequest);

      expect(optimizeResponse.status).toBe(200);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================
  describe("Error Handling", () => {
    it("handles OpenAI API failures gracefully in ats-score", async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error("OpenAI API error"));

      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await atsScoreRoute(request);

      // Should still return 200 with deterministic-only results
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.score).toBeDefined();
      // Supplementary should be undefined when GPT-4o fails
      expect(body.supplementary).toBeUndefined();
    });

    it("handles database save failures gracefully", async () => {
      mockSupabaseEq.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
      });

      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        analysisId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      });
      const response = await atsScoreRoute(request);

      // Should still return 200 even if DB save fails
      expect(response.status).toBe(200);
    });

    it("handles malformed JSON in request body", async () => {
      const request = new NextRequest("http://localhost:3000/api/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }",
      });

      const response = await atsScoreRoute(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Invalid JSON");
    });

    it("handles embeddings API failures gracefully in hr-score", async () => {
      mockEmbeddingsCreate.mockRejectedValueOnce(new Error("Embeddings API error"));

      const request = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const response = await hrScoreRoute(request);

      // Should still return 200 with available scores (semantic may be zero)
      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Input Validation Tests
  // ==========================================================================
  describe("Input Validation", () => {
    it("rejects empty resume text in ats-score", async () => {
      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: "",
        jobDescription: sampleJobDescription,
      });
      const response = await atsScoreRoute(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("rejects empty job description in ats-score", async () => {
      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: "",
      });
      const response = await atsScoreRoute(request);

      expect(response.status).toBe(400);
    });

    it("rejects empty resume text in hr-score", async () => {
      const request = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: "",
        jobDescription: sampleJobDescription,
      });
      const response = await hrScoreRoute(request);

      expect(response.status).toBe(400);
    });

    it("rejects empty job description in hr-score", async () => {
      const request = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: sampleResumeText,
        jobDescription: "",
      });
      const response = await hrScoreRoute(request);

      expect(response.status).toBe(400);
    });

    it("validates analysisId format in ats-score", async () => {
      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        analysisId: "not-a-uuid",
      });
      const response = await atsScoreRoute(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("accepts valid UUID for analysisId", async () => {
      const request = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        analysisId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      });
      const response = await atsScoreRoute(request);

      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Cross-Route Data Flow Tests
  // ==========================================================================
  describe("Cross-Route Data Flow", () => {
    it("ATS issues can be passed to optimize route", async () => {
      // Get ATS issues
      const atsRequest = createJsonRequest("http://localhost:3000/api/ats-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const atsResponse = await atsScoreRoute(atsRequest);
      const atsBody = await atsResponse.json();

      // Pass issues to optimize
      const optimizeRequest = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        atsIssues: atsBody.score.issues,
        hrFeedback: [],
      });
      const optimizeResponse = await optimizeRoute(optimizeRequest);

      expect(optimizeResponse.status).toBe(200);
    });

    it("HR feedback can be passed to optimize route", async () => {
      // Get HR feedback
      const hrRequest = createJsonRequest("http://localhost:3000/api/hr-score", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
      });
      const hrResponse = await hrScoreRoute(hrRequest);
      const hrBody = await hrResponse.json();

      // Pass feedback to optimize
      const optimizeRequest = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        atsIssues: [],
        hrFeedback: hrBody.score.feedback || [],
      });
      const optimizeResponse = await optimizeRoute(optimizeRequest);

      expect(optimizeResponse.status).toBe(200);
    });

    it("both ATS and HR data can be combined for optimization", async () => {
      // Get both scores
      const [atsResponse, hrResponse] = await Promise.all([
        atsScoreRoute(createJsonRequest("http://localhost:3000/api/ats-score", {
          resumeText: sampleResumeText,
          jobDescription: sampleJobDescription,
        })),
        hrScoreRoute(createJsonRequest("http://localhost:3000/api/hr-score", {
          resumeText: sampleResumeText,
          jobDescription: sampleJobDescription,
        })),
      ]);

      const atsBody = await atsResponse.json();
      const hrBody = await hrResponse.json();

      // Combine for optimization
      const optimizeRequest = createJsonRequest("http://localhost:3000/api/optimize", {
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        atsIssues: atsBody.score.issues,
        hrFeedback: hrBody.score.feedback || [],
      });
      const optimizeResponse = await optimizeRoute(optimizeRequest);

      expect(optimizeResponse.status).toBe(200);
      const optimizeBody = await optimizeResponse.json();
      expect(optimizeBody.suggestions).toBeDefined();
    });
  });
});
