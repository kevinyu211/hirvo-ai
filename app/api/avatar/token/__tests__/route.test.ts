import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockSelectHead = vi.fn();
const mockEqUserId = vi.fn();
const mockGte = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: (table: string) => {
      if (table === "interview_sessions") {
        return {
          select: mockSelect,
          insert: mockInsert,
        };
      }
      return {};
    },
  }),
}));

// Mock global fetch for HeyGen API calls
const mockFetch = vi.fn();

import { POST } from "../route";

const MOCK_USER = { id: "user-123", email: "test@example.com" };
const MOCK_TOKEN = "heygen-access-token-abc123";

describe("POST /api/avatar/token", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up env
    process.env = {
      ...originalEnv,
      HEYGEN_API_KEY: "test-heygen-api-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    };

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    // Default: rate limit check returns 0 sessions today
    mockSelect.mockReturnValue({ count: "exact", head: true });
    mockSelectHead.mockReturnValue({ eq: mockEqUserId });
    mockEqUserId.mockReturnValue({ gte: mockGte });
    mockGte.mockResolvedValue({ count: 0, error: null });

    // Chain: .select("*", { count: "exact", head: true }).eq("user_id", ...).gte("created_at", ...)
    mockSelect.mockReturnValue({ eq: mockEqUserId });
    mockEqUserId.mockReturnValue({ gte: mockGte });
    mockGte.mockResolvedValue({ count: 0, error: null });

    // Default: insert succeeds
    mockInsert.mockResolvedValue({ error: null });

    // Default: HeyGen API returns a token
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: MOCK_TOKEN } }),
      text: async () => "",
    });

    // Replace global fetch
    global.fetch = mockFetch;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --- Auth Tests ---

  it("returns 401 if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 if getUser returns no user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  // --- Configuration Tests ---

  it("returns 503 if HEYGEN_API_KEY is not set", async () => {
    delete process.env.HEYGEN_API_KEY;

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error).toBe("Avatar service is not configured");
  });

  it("returns 503 if HEYGEN_API_KEY is empty string", async () => {
    process.env.HEYGEN_API_KEY = "";

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error).toBe("Avatar service is not configured");
  });

  // --- Rate Limiting Tests ---

  it("returns 429 when user has reached daily session limit", async () => {
    mockGte.mockResolvedValue({ count: 5, error: null });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.error).toBe("Daily session limit reached");
    expect(json.limit).toBe(5);
    expect(json.used).toBe(5);
    expect(json.message).toContain("5 avatar sessions per day");
  });

  it("returns 429 when user has exceeded daily session limit", async () => {
    mockGte.mockResolvedValue({ count: 10, error: null });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json.error).toBe("Daily session limit reached");
  });

  it("allows request when user has fewer than 5 sessions today", async () => {
    mockGte.mockResolvedValue({ count: 4, error: null });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.token).toBe(MOCK_TOKEN);
  });

  it("allows request when user has 0 sessions today", async () => {
    mockGte.mockResolvedValue({ count: 0, error: null });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.token).toBe(MOCK_TOKEN);
  });

  it("returns 500 when rate limit check fails", async () => {
    mockGte.mockResolvedValue({
      count: null,
      error: { message: "DB error" },
    });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Failed to check session limit");
  });

  it("queries interview_sessions with correct filters", async () => {
    await POST();

    // Verify select was called with count options
    expect(mockSelect).toHaveBeenCalledWith("*", {
      count: "exact",
      head: true,
    });

    // Verify eq was called with user_id
    expect(mockEqUserId).toHaveBeenCalledWith("user_id", MOCK_USER.id);

    // Verify gte was called with created_at and today's date
    const gteArgs = mockGte.mock.calls[0];
    expect(gteArgs[0]).toBe("created_at");
    // The date should be today at midnight in ISO format
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    expect(gteArgs[1]).toBe(todayStart.toISOString());
  });

  // --- HeyGen API Tests ---

  it("calls HeyGen API with correct URL and headers", async () => {
    await POST();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.heygen.com/v1/streaming.create_token",
      {
        method: "POST",
        headers: {
          "x-api-key": "test-heygen-api-key",
        },
      }
    );
  });

  it("returns token on successful HeyGen API response", async () => {
    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.token).toBe(MOCK_TOKEN);
  });

  it("returns 502 when HeyGen API returns non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "Forbidden",
    });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe("Failed to generate avatar token");
  });

  it("returns 502 when HeyGen API returns empty token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: "" } }),
    });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe("Failed to generate avatar token");
  });

  it("returns 502 when HeyGen API returns no data", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe("Failed to generate avatar token");
  });

  it("returns 502 when HeyGen API returns null token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { token: null } }),
    });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe("Failed to generate avatar token");
  });

  it("returns 502 when fetch throws a network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe("Failed to connect to avatar service");
  });

  // --- Session Recording Tests ---

  it("creates an interview_sessions record after successful token generation", async () => {
    await POST();

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: MOCK_USER.id,
      session_type: "avatar_token",
      transcript: null,
      feedback: null,
      duration_seconds: null,
    });
  });

  it("still returns token even if session recording fails", async () => {
    mockInsert.mockResolvedValue({
      error: { message: "Insert failed" },
    });

    const response = await POST();
    const json = await response.json();

    // Token should still be returned — recording is non-blocking
    expect(response.status).toBe(200);
    expect(json.token).toBe(MOCK_TOKEN);
  });

  it("does not create a session record if rate limit is exceeded", async () => {
    mockGte.mockResolvedValue({ count: 5, error: null });

    await POST();

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("does not create a session record if HeyGen API fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal server error",
    });

    await POST();

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("does not call HeyGen API if rate limit is exceeded", async () => {
    mockGte.mockResolvedValue({ count: 5, error: null });

    await POST();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not call HeyGen API if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await POST();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  // --- Handles null count from Supabase ---

  it("treats null count as 0 sessions (allows access)", async () => {
    mockGte.mockResolvedValue({ count: null, error: null });

    const response = await POST();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.token).toBe(MOCK_TOKEN);
  });
});
