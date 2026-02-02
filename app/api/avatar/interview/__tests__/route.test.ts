/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ============================================================================
// Mocks (using vi.hoisted for mock variables)
// ============================================================================

const {
  mockGetUser,
  mockSelectSingle,
  mockEqId,
  mockEqUserId,
  mockInsert,
  mockUpdate,
  mockUpdateEq,
  mockOpenAICreate,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSelectSingle: vi.fn(),
  mockEqId: vi.fn(),
  mockEqUserId: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockOpenAICreate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: () => ({
      select: () => ({
        eq: mockEqId,
      }),
      insert: mockInsert,
      update: mockUpdate,
    }),
  }),
}));

vi.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  },
}));

// Import after mocks are set up
import { POST } from "../route";

// ============================================================================
// Helpers
// ============================================================================

const MOCK_USER = { id: "user-123", email: "test@example.com" };
const MOCK_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";
const MOCK_ANALYSIS_ID = "660e8400-e29b-41d4-a716-446655440000";

function createMockRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

// ============================================================================
// Test Setup
// ============================================================================

describe("POST /api/avatar/interview", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });

    // Default: session lookup chains
    mockEqId.mockReturnValue({ eq: mockEqUserId });
    mockEqUserId.mockReturnValue({ single: mockSelectSingle });
    mockSelectSingle.mockResolvedValue({ data: null, error: { message: "Not found" } });

    // Default: insert succeeds and returns new session ID
    mockInsert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: { id: MOCK_SESSION_ID },
            error: null,
          }),
      }),
    });

    // Default: update succeeds
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockUpdateEq.mockResolvedValue({ error: null });

    // Default OpenAI response
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: "Hello! Let's begin your interview. Tell me about yourself." } }],
    });
  });

  // ── Auth Tests ────────────────────────────────────────────────────────────

  describe("authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const req = createMockRequest({ userMessage: "Hello" });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("should return 401 if auth throws error", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Auth failed"),
      });

      const req = createMockRequest({ userMessage: "Hello" });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  // ── Validation Tests ──────────────────────────────────────────────────────

  describe("request validation", () => {
    it("should return 400 for invalid JSON", async () => {
      const req = {
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as unknown as NextRequest;

      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON in request body");
    });

    it("should return 400 if userMessage is missing", async () => {
      const req = createMockRequest({});
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid request");
      expect(json.details).toBeDefined();
    });

    it("should return 400 if userMessage is empty", async () => {
      const req = createMockRequest({ userMessage: "" });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 if sessionId is not a valid UUID", async () => {
      const req = createMockRequest({
        userMessage: "Hello",
        sessionId: "not-a-uuid",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("should return 400 if analysisId is not a valid UUID", async () => {
      const req = createMockRequest({
        userMessage: "Hello",
        analysisId: "invalid-uuid",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  // ── Session Creation Tests ────────────────────────────────────────────────

  describe("new session creation", () => {
    it("should create a new session when sessionId is not provided", async () => {
      const req = createMockRequest({ userMessage: "Hello" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sessionId).toBe(MOCK_SESSION_ID);

      // Verify insert was called with correct session_type
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: MOCK_USER.id,
          session_type: "hr_interview",
        })
      );
    });

    it("should link session to analysisId when provided", async () => {
      const req = createMockRequest({
        userMessage: "Hello",
        analysisId: MOCK_ANALYSIS_ID,
      });
      await POST(req);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          analysis_id: MOCK_ANALYSIS_ID,
        })
      );
    });

    it("should return 500 if session creation fails", async () => {
      mockInsert.mockReturnValue({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: null,
              error: new Error("DB insert failed"),
            }),
        }),
      });

      const req = createMockRequest({ userMessage: "Hello" });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Failed to create session");
    });
  });

  // ── Session Loading Tests ─────────────────────────────────────────────────

  describe("existing session loading", () => {
    it("should load existing session when sessionId is provided", async () => {
      mockSelectSingle.mockResolvedValue({
        data: {
          id: MOCK_SESSION_ID,
          user_id: MOCK_USER.id,
          session_type: "hr_interview",
          transcript: [{ role: "assistant", message: "Previous greeting", timestamp: "2024-01-01T00:00:00Z" }],
        },
        error: null,
      });

      const req = createMockRequest({
        userMessage: "Hello again",
        sessionId: MOCK_SESSION_ID,
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sessionId).toBe(MOCK_SESSION_ID);
    });

    it("should return 404 if session not found", async () => {
      // mockSelectSingle defaults to { data: null, error: { message: "Not found" } }

      const req = createMockRequest({
        userMessage: "Hello",
        sessionId: MOCK_SESSION_ID,
      });
      const res = await POST(req);

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Session not found or access denied");
    });

    it("should return 400 if session is not hr_interview type", async () => {
      mockSelectSingle.mockResolvedValue({
        data: {
          id: MOCK_SESSION_ID,
          user_id: MOCK_USER.id,
          session_type: "visa_qa", // Wrong type
          transcript: [],
        },
        error: null,
      });

      const req = createMockRequest({
        userMessage: "Hello",
        sessionId: MOCK_SESSION_ID,
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid session type for HR interview");
    });
  });

  // ── OpenAI Integration Tests ──────────────────────────────────────────────

  describe("OpenAI integration", () => {
    it("should call GPT-4o with HR interview system prompt", async () => {
      const req = createMockRequest({ userMessage: "Hello" });
      await POST(req);

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o",
          temperature: 0.7,
          max_tokens: 600,
        })
      );

      // Check system prompt contains HR interview content
      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const systemMessage = callArgs.messages.find(
        (m: { role: string }) => m.role === "system"
      );
      expect(systemMessage.content).toContain("HR interviewer");
      expect(systemMessage.content).toContain("mock interview");
    });

    it("should include job description context in messages", async () => {
      const jobDescription = "We are looking for a Senior Software Engineer with 5+ years of experience...";

      const req = createMockRequest({
        userMessage: "Hello",
        jobDescription,
      });
      await POST(req);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const contextMessage = callArgs.messages.find(
        (m: { content: string }) => m.content.includes("Interview Context")
      );
      expect(contextMessage).toBeDefined();
      expect(contextMessage.content).toContain("Senior Software Engineer");
    });

    it("should truncate long job descriptions", async () => {
      const longJD = "A".repeat(2000);

      const req = createMockRequest({
        userMessage: "Hello",
        jobDescription: longJD,
      });
      await POST(req);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const contextMessage = callArgs.messages.find(
        (m: { content: string }) => m.content.includes("Interview Context")
      );
      // Should be truncated to 1500 chars + "..."
      expect(contextMessage.content).not.toContain("A".repeat(2000));
      expect(contextMessage.content).toContain("...");
    });

    it("should include resume context in messages", async () => {
      const resumeText = "Experienced software engineer with expertise in React...";

      const req = createMockRequest({
        userMessage: "Hello",
        resumeText,
      });
      await POST(req);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const contextMessage = callArgs.messages.find(
        (m: { content: string }) => m.content.includes("Candidate Resume")
      );
      expect(contextMessage).toBeDefined();
      expect(contextMessage.content).toContain("React");
    });

    it("should include target role and experience in context", async () => {
      const req = createMockRequest({
        userMessage: "Hello",
        targetRole: "Senior Software Engineer",
        yearsExperience: "5-7 years",
      });
      await POST(req);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const contextMessage = callArgs.messages.find(
        (m: { content: string }) => m.content.includes("Target Role")
      );
      expect(contextMessage).toBeDefined();
      expect(contextMessage.content).toContain("Senior Software Engineer");
      expect(contextMessage.content).toContain("5-7 years");
    });

    it("should return 502 if OpenAI call fails", async () => {
      mockOpenAICreate.mockRejectedValue(new Error("OpenAI error"));

      const req = createMockRequest({ userMessage: "Hello" });
      const res = await POST(req);

      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.error).toBe("Failed to generate response");
    });

    it("should return 502 if OpenAI returns no content", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const req = createMockRequest({ userMessage: "Hello" });
      const res = await POST(req);

      expect(res.status).toBe(502);
    });
  });

  // ── Response & Transcript Tests ───────────────────────────────────────────

  describe("response and transcript handling", () => {
    it("should return AI response and session info", async () => {
      const expectedResponse = "Great question! Tell me about your experience with React.";
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: expectedResponse } }],
      });

      const req = createMockRequest({ userMessage: "I want to discuss my frontend skills" });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.response).toBe(expectedResponse);
      expect(json.sessionId).toBeDefined();
      expect(json.transcriptLength).toBe(2); // User + Assistant
    });

    it("should save transcript to database", async () => {
      const req = createMockRequest({ userMessage: "Test message" });
      await POST(req);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it("should continue even if transcript save fails", async () => {
      mockUpdateEq.mockResolvedValue({ error: new Error("Update failed") });

      const req = createMockRequest({ userMessage: "Test" });
      const res = await POST(req);

      // Should still return 200 with the response
      expect(res.status).toBe(200);
    });
  });

  // ── End Session Tests ─────────────────────────────────────────────────────

  describe("end session with feedback", () => {
    beforeEach(() => {
      // Mock existing session with transcript
      mockSelectSingle.mockResolvedValue({
        data: {
          id: MOCK_SESSION_ID,
          user_id: MOCK_USER.id,
          session_type: "hr_interview",
          transcript: [
            { role: "assistant", message: "Tell me about yourself", timestamp: "2024-01-01T00:00:00Z" },
            { role: "user", message: "I am a software engineer...", timestamp: "2024-01-01T00:00:30Z" },
          ],
        },
        error: null,
      });
    });

    it("should generate feedback when endSession is true", async () => {
      const feedbackResponse = JSON.stringify({
        overallScore: 75,
        strengths: ["Good communication"],
        areasForImprovement: ["Use more examples"],
        questionBreakdown: [{ question: "Tell me about yourself", score: 80, assessment: "Good" }],
        recommendations: ["Practice STAR method"],
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: feedbackResponse } }],
      });

      const req = createMockRequest({
        userMessage: "Thank you for the interview",
        sessionId: MOCK_SESSION_ID,
        endSession: true,
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sessionEnded).toBe(true);
      expect(json.feedback).toBeDefined();
      expect(json.feedback.overallScore).toBe(75);
    });

    it("should return closing response when ending session", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ overallScore: 70 }) } }],
      });

      const req = createMockRequest({
        userMessage: "Goodbye",
        sessionId: MOCK_SESSION_ID,
        endSession: true,
      });
      const res = await POST(req);

      const json = await res.json();
      expect(json.response).toContain("Thank you");
      expect(json.response).toContain("practice");
    });

    it("should call GPT-4o with JSON response format for feedback", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify({ overallScore: 70 }) } }],
      });

      const req = createMockRequest({
        userMessage: "End",
        sessionId: MOCK_SESSION_ID,
        endSession: true,
      });
      await POST(req);

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: "json_object" },
        })
      );
    });

    it("should handle feedback generation failure gracefully", async () => {
      mockOpenAICreate.mockRejectedValue(new Error("OpenAI error"));

      const req = createMockRequest({
        userMessage: "End",
        sessionId: MOCK_SESSION_ID,
        endSession: true,
      });
      const res = await POST(req);

      // Should still return success with null feedback
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sessionEnded).toBe(true);
      expect(json.feedback).toBeNull();
    });
  });

  // ── Conversation History Tests ────────────────────────────────────────────

  describe("conversation history", () => {
    it("should include previous messages in conversation history", async () => {
      mockSelectSingle.mockResolvedValue({
        data: {
          id: MOCK_SESSION_ID,
          user_id: MOCK_USER.id,
          session_type: "hr_interview",
          transcript: [
            { role: "assistant", message: "Welcome! Tell me about yourself.", timestamp: "2024-01-01T00:00:00Z" },
            { role: "user", message: "I'm a software engineer.", timestamp: "2024-01-01T00:00:30Z" },
            { role: "assistant", message: "Great! What interests you about this role?", timestamp: "2024-01-01T00:01:00Z" },
          ],
        },
        error: null,
      });

      const req = createMockRequest({
        userMessage: "I want to grow my career",
        sessionId: MOCK_SESSION_ID,
      });
      await POST(req);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      const userMessages = callArgs.messages.filter(
        (m: { role: string }) => m.role === "user"
      );
      const assistantMessages = callArgs.messages.filter(
        (m: { role: string }) => m.role === "assistant"
      );

      // Should include history + current message
      expect(userMessages.some((m: { content: string }) => m.content === "I'm a software engineer.")).toBe(true);
      expect(userMessages.some((m: { content: string }) => m.content === "I want to grow my career")).toBe(true);
      expect(assistantMessages.some((m: { content: string }) => m.content.includes("Tell me about yourself"))).toBe(true);
    });

    it("should handle null transcript as empty array", async () => {
      mockSelectSingle.mockResolvedValue({
        data: {
          id: MOCK_SESSION_ID,
          user_id: MOCK_USER.id,
          session_type: "hr_interview",
          transcript: null,
        },
        error: null,
      });

      const req = createMockRequest({
        userMessage: "Hello",
        sessionId: MOCK_SESSION_ID,
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.transcriptLength).toBe(2); // New user message + AI response
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("should accept minimal valid request", async () => {
      const req = createMockRequest({ userMessage: "Hello" });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("should handle very long user messages", async () => {
      const longMessage = "A".repeat(5000);
      const req = createMockRequest({ userMessage: longMessage });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("should skip context if no context fields provided", async () => {
      const req = createMockRequest({ userMessage: "Hello" });
      await POST(req);

      const callArgs = mockOpenAICreate.mock.calls[0][0];
      // Should only have system + user message, no context exchange
      const nonSystemMessages = callArgs.messages.filter(
        (m: { role: string }) => m.role !== "system"
      );
      expect(nonSystemMessages.length).toBe(1); // Just the user message
    });
  });
});
