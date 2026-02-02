import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase - using vi.hoisted to ensure mocks are available at mock evaluation time
const {
  mockGetUser,
  mockSelectSingle,
  mockEqId,
  mockEqUserId,
  mockInsert,
  mockUpdate,
  mockUpdateEq,
  mockOpenAICreate
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

// Mock OpenAI
vi.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  },
}));

import { POST } from "../route";
import { VISA_QA_SYSTEM_PROMPT } from "@/lib/prompts/visa-qa-prompts";

const MOCK_USER = { id: "user-123", email: "test@example.com" };
const MOCK_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";
const MOCK_ANALYSIS_ID = "660e8400-e29b-41d4-a716-446655440000";

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/avatar/visa-qa", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/avatar/visa-qa", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

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

    // Default: OpenAI returns a valid response
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "That's a great question about H-1B visas. Let me explain...",
          },
        },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // --- Auth Tests ---

  it("returns 401 if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const request = createRequest({ question: "What is H-1B?" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 if getUser returns no user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createRequest({ question: "What is H-1B?" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  // --- Validation Tests ---

  it("returns 400 if question is missing", async () => {
    const request = createRequest({});
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid request");
    expect(json.details.fieldErrors.question).toBeDefined();
  });

  it("returns 400 if question is empty string", async () => {
    const request = createRequest({ question: "" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid request");
  });

  it("returns 400 if sessionId is not a valid UUID", async () => {
    const request = createRequest({ question: "Test", sessionId: "not-a-uuid" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid request");
  });

  it("returns 400 if analysisId is not a valid UUID", async () => {
    const request = createRequest({ question: "Test", analysisId: "invalid" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid request");
  });

  it("returns 400 for invalid JSON body", async () => {
    const request = new NextRequest("http://localhost:3000/api/avatar/visa-qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid JSON in request body");
  });

  // --- New Session Creation ---

  it("creates a new session when sessionId is not provided", async () => {
    const request = createRequest({ question: "What is OPT?" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sessionId).toBe(MOCK_SESSION_ID);
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: MOCK_USER.id,
      session_type: "visa_qa",
      analysis_id: null,
      transcript: [],
      feedback: null,
      duration_seconds: null,
    });
  });

  it("links analysis_id when creating a new session", async () => {
    const request = createRequest({
      question: "What is OPT?",
      analysisId: MOCK_ANALYSIS_ID,
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        analysis_id: MOCK_ANALYSIS_ID,
      })
    );
  });

  it("returns 500 if session creation fails", async () => {
    mockInsert.mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: null,
            error: { message: "Insert failed" },
          }),
      }),
    });

    const request = createRequest({ question: "Test" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Failed to create session");
  });

  // --- Existing Session Loading ---

  it("loads existing session when sessionId is provided", async () => {
    const existingTranscript = [
      { role: "user", message: "Previous question", timestamp: "2024-01-01T00:00:00Z" },
      { role: "assistant", message: "Previous answer", timestamp: "2024-01-01T00:00:01Z" },
    ];

    mockSelectSingle.mockResolvedValue({
      data: {
        id: MOCK_SESSION_ID,
        user_id: MOCK_USER.id,
        session_type: "visa_qa",
        transcript: existingTranscript,
      },
      error: null,
    });

    const request = createRequest({
      question: "Follow up question",
      sessionId: MOCK_SESSION_ID,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.sessionId).toBe(MOCK_SESSION_ID);
    // 2 existing + 1 new user + 1 new assistant = 4
    expect(json.transcriptLength).toBe(4);
  });

  it("returns 404 if session not found", async () => {
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const request = createRequest({
      question: "Test",
      sessionId: MOCK_SESSION_ID,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Session not found or access denied");
  });

  it("returns 404 if session belongs to different user", async () => {
    // The eq chain will return null when user_id doesn't match
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const request = createRequest({
      question: "Test",
      sessionId: MOCK_SESSION_ID,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Session not found or access denied");
  });

  it("returns 400 if session is not visa_qa type", async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id: MOCK_SESSION_ID,
        user_id: MOCK_USER.id,
        session_type: "hr_interview", // Wrong type
        transcript: [],
      },
      error: null,
    });

    const request = createRequest({
      question: "Test",
      sessionId: MOCK_SESSION_ID,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid session type for visa Q&A");
  });

  // --- OpenAI Integration ---

  it("calls OpenAI with correct parameters", async () => {
    const request = createRequest({ question: "What is H-1B?" });
    await POST(request);

    expect(mockOpenAICreate).toHaveBeenCalledWith({
      model: "gpt-4o",
      messages: expect.arrayContaining([
        { role: "system", content: VISA_QA_SYSTEM_PROMPT },
        { role: "user", content: "What is H-1B?" },
      ]),
      temperature: 0.7,
      max_tokens: 500,
    });
  });

  it("includes visa status context in messages when provided", async () => {
    const request = createRequest({
      question: "What is H-1B?",
      visaStatus: "h1b",
    });
    await POST(request);

    const callArgs = mockOpenAICreate.mock.calls[0][0];
    const contextMessage = callArgs.messages.find(
      (m: { role: string; content: string }) =>
        m.role === "user" && m.content.includes("[Context for this conversation]")
    );

    expect(contextMessage).toBeDefined();
    expect(contextMessage.content).toContain("User's visa status: h1b");
  });

  it("includes target role context when provided", async () => {
    const request = createRequest({
      question: "What is H-1B?",
      targetRole: "Software Engineer",
    });
    await POST(request);

    const callArgs = mockOpenAICreate.mock.calls[0][0];
    const contextMessage = callArgs.messages.find(
      (m: { role: string; content: string }) =>
        m.role === "user" && m.content.includes("[Context for this conversation]")
    );

    expect(contextMessage).toBeDefined();
    expect(contextMessage.content).toContain("Target job role: Software Engineer");
  });

  it("truncates long job descriptions in context", async () => {
    const longJD = "A".repeat(2000);
    const request = createRequest({
      question: "What is H-1B?",
      jobDescription: longJD,
    });
    await POST(request);

    const callArgs = mockOpenAICreate.mock.calls[0][0];
    const contextMessage = callArgs.messages.find(
      (m: { role: string; content: string }) =>
        m.role === "user" && m.content.includes("Job description summary")
    );

    expect(contextMessage).toBeDefined();
    expect(contextMessage.content).toContain("...");
    // First 1000 chars + "..."
    expect(contextMessage.content.length).toBeLessThan(longJD.length);
  });

  it("does not include prefer_not_to_say visa status in context", async () => {
    const request = createRequest({
      question: "What is H-1B?",
      visaStatus: "prefer_not_to_say",
    });
    await POST(request);

    const callArgs = mockOpenAICreate.mock.calls[0][0];
    const hasContextMessage = callArgs.messages.some(
      (m: { role: string; content: string }) =>
        m.role === "user" && m.content.includes("User's visa status")
    );

    expect(hasContextMessage).toBe(false);
  });

  it("returns 502 when OpenAI call fails", async () => {
    mockOpenAICreate.mockRejectedValue(new Error("OpenAI error"));

    const request = createRequest({ question: "What is H-1B?" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe("Failed to generate response");
  });

  it("returns 502 when OpenAI returns no content", async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const request = createRequest({ question: "What is H-1B?" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe("Failed to generate response");
  });

  it("returns 502 when OpenAI returns empty choices", async () => {
    mockOpenAICreate.mockResolvedValue({ choices: [] });

    const request = createRequest({ question: "What is H-1B?" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe("Failed to generate response");
  });

  // --- Response and Transcript ---

  it("returns AI response and session info on success", async () => {
    const request = createRequest({ question: "What is H-1B?" });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.response).toBe("That's a great question about H-1B visas. Let me explain...");
    expect(json.sessionId).toBe(MOCK_SESSION_ID);
    expect(json.transcriptLength).toBe(2); // 1 user + 1 assistant
  });

  it("saves transcript to database after response", async () => {
    const request = createRequest({ question: "What is H-1B?" });
    await POST(request);

    expect(mockUpdate).toHaveBeenCalledWith({
      transcript: expect.arrayContaining([
        expect.objectContaining({ role: "user", message: "What is H-1B?" }),
        expect.objectContaining({
          role: "assistant",
          message: "That's a great question about H-1B visas. Let me explain...",
        }),
      ]),
    });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", MOCK_SESSION_ID);
  });

  it("still returns response even if transcript save fails", async () => {
    mockUpdateEq.mockResolvedValue({ error: { message: "Update failed" } });

    const request = createRequest({ question: "What is H-1B?" });
    const response = await POST(request);
    const json = await response.json();

    // Response should still be successful
    expect(response.status).toBe(200);
    expect(json.response).toBeDefined();
  });

  // --- Conversation History ---

  it("includes conversation history in OpenAI messages", async () => {
    const existingTranscript = [
      { role: "user", message: "What is H-1B?", timestamp: "2024-01-01T00:00:00Z" },
      { role: "assistant", message: "H-1B is a work visa...", timestamp: "2024-01-01T00:00:01Z" },
    ];

    mockSelectSingle.mockResolvedValue({
      data: {
        id: MOCK_SESSION_ID,
        user_id: MOCK_USER.id,
        session_type: "visa_qa",
        transcript: existingTranscript,
      },
      error: null,
    });

    const request = createRequest({
      question: "How long does it last?",
      sessionId: MOCK_SESSION_ID,
    });
    await POST(request);

    const callArgs = mockOpenAICreate.mock.calls[0][0];
    const messages = callArgs.messages;

    // Should include history + new question
    expect(messages).toContainEqual({
      role: "user",
      content: "What is H-1B?",
    });
    expect(messages).toContainEqual({
      role: "assistant",
      content: "H-1B is a work visa...",
    });
    // New question should be last
    expect(messages[messages.length - 1]).toEqual({
      role: "user",
      content: "How long does it last?",
    });
  });

  // --- System Prompt Tests ---

  it("exports VISA_QA_SYSTEM_PROMPT with correct content", () => {
    expect(VISA_QA_SYSTEM_PROMPT).toContain("immigration advisor");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("H-1B");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("OPT");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("work authorization");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("Be Conversational");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("Do NOT provide specific legal advice");
  });

  it("system prompt includes key visa types", () => {
    expect(VISA_QA_SYSTEM_PROMPT).toContain("F-1 OPT/CPT");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("STEM OPT");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("L-1");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("O-1");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("TN visa");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("EAD");
    expect(VISA_QA_SYSTEM_PROMPT).toContain("Green card");
  });

  // --- Edge Cases ---

  it("handles null transcript in existing session", async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id: MOCK_SESSION_ID,
        user_id: MOCK_USER.id,
        session_type: "visa_qa",
        transcript: null,
      },
      error: null,
    });

    const request = createRequest({
      question: "First question",
      sessionId: MOCK_SESSION_ID,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.transcriptLength).toBe(2); // 1 user + 1 assistant
  });

  it("accepts valid optional parameters", async () => {
    const request = createRequest({
      question: "What is H-1B?",
      visaStatus: "opt_cpt",
      targetRole: "Data Scientist",
      jobDescription: "We are looking for a data scientist...",
      analysisId: MOCK_ANALYSIS_ID,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.response).toBeDefined();
  });
});
