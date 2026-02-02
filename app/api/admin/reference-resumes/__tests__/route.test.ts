import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
  createServiceRoleClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

// Mock parsers
vi.mock("@/lib/parsers", () => ({
  parsePDF: vi.fn().mockResolvedValue({ text: "Parsed PDF text\njohn@example.com\n\nExperience\nSoftware Engineer", pageCount: 1 }),
  parseDOCX: vi.fn().mockResolvedValue({ text: "Parsed DOCX text\njohn@example.com\n\nExperience\nSoftware Engineer", pageCount: 1 }),
}));

// Mock OpenAI
vi.mock("@/lib/openai", () => ({
  openai: {
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  },
}));

// Mock formatting patterns
vi.mock("@/lib/formatting-patterns", () => ({
  extractFormattingPatterns: vi.fn().mockReturnValue({
    pageCount: 1,
    sectionOrder: ["Contact", "Experience"],
    bulletStyle: { types: ["dash"], avgBulletsPerEntry: 3, totalBullets: 6 },
    hasSummary: false,
    quantifiedMetrics: { count: 0, examples: [] },
    headingStyle: { consistent: true, styles: ["Title Case"] },
    whiteSpaceRatio: 0.1,
    dateFormat: { formats: ["Month YYYY"], consistent: true },
    wordCount: 150,
    avgWordsPerLine: 8,
  }),
}));

const mockUser = { id: "user-123", email: "admin@example.com" };

function createJsonRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/reference-resumes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createFormDataRequest(fields: Record<string, string>, file?: File): NextRequest {
  const formData = new FormData();
  for (const [key, val] of Object.entries(fields)) {
    formData.append(key, val);
  }
  if (file) {
    formData.append("file", file);
  }
  return new NextRequest("http://localhost:3000/api/admin/reference-resumes", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/admin/reference-resumes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({
      data: { id: "ref-123", title: "Test Resume" },
      error: null,
    });
  });

  // ---- Auth tests ----
  it("should return 401 if not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const req = createJsonRequest({
      title: "Test",
      original_text: "Resume text",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  // ---- JSON body tests ----
  it("should accept JSON body and create reference resume", async () => {
    const req = createJsonRequest({
      title: "Senior Engineer Resume",
      industry: "Technology",
      role_level: "senior",
      original_text: "John Doe\njohn@example.com\n\nExperience\nSenior Software Engineer at Acme Corp",
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.formattingPatterns).toBeDefined();
    expect(json.embeddingGenerated).toBe(true);
  });

  it("should validate title is required in JSON body", async () => {
    const req = createJsonRequest({
      original_text: "Resume text",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
  });

  it("should validate original_text is required in JSON body", async () => {
    const req = createJsonRequest({
      title: "Test Resume",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should validate role_level enum in JSON body", async () => {
    const req = createJsonRequest({
      title: "Test",
      original_text: "Resume text",
      role_level: "invalid_level",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should skip embedding when generate_embedding is false", async () => {
    const { openai } = await import("@/lib/openai");

    const req = createJsonRequest({
      title: "Test Resume",
      original_text: "Resume text with content\njohn@example.com",
      generate_embedding: false,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.embeddingGenerated).toBe(false);
    expect(openai.embeddings.create).not.toHaveBeenCalled();
  });

  // ---- Multipart form data tests ----
  it("should accept file upload (DOCX)", async () => {
    const file = new File(["docx content"], "resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const req = createFormDataRequest(
      { title: "Engineer Resume", industry: "Tech", role_level: "mid" },
      file
    );

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.formattingPatterns).toBeDefined();
  });

  it("should accept file upload (PDF)", async () => {
    const file = new File(["pdf content"], "resume.pdf", {
      type: "application/pdf",
    });

    const req = createFormDataRequest(
      { title: "Manager Resume", role_level: "senior" },
      file
    );

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("should reject non-PDF/DOCX files", async () => {
    const file = new File(["text content"], "resume.txt", {
      type: "text/plain",
    });

    const req = createFormDataRequest(
      { title: "Test Resume" },
      file
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("File must be PDF or DOCX");
  });

  it("should reject files over 5MB", async () => {
    // Create a file > 5MB
    const largeContent = new Uint8Array(6 * 1024 * 1024);
    const file = new File([largeContent], "resume.pdf", {
      type: "application/pdf",
    });

    const req = createFormDataRequest(
      { title: "Test Resume" },
      file
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("File must be under 5MB");
  });

  it("should require file in multipart upload", async () => {
    const req = createFormDataRequest({ title: "Test Resume" });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("File is required for multipart upload");
  });

  it("should require title in multipart upload", async () => {
    const file = new File(["content"], "resume.pdf", { type: "application/pdf" });
    const req = createFormDataRequest({}, file);

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Validation failed");
  });

  it("should validate role_level in multipart upload", async () => {
    const file = new File(["content"], "resume.pdf", { type: "application/pdf" });
    const req = createFormDataRequest(
      { title: "Test", role_level: "invalid" },
      file
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ---- Database error handling ----
  it("should return 500 on database insert failure", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "Database error" },
    });

    const req = createJsonRequest({
      title: "Test Resume",
      original_text: "Resume content\njohn@example.com",
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Failed to save reference resume");
  });

  // ---- Embedding failure handling ----
  it("should succeed even if embedding generation fails", async () => {
    const { openai } = await import("@/lib/openai");
    vi.mocked(openai.embeddings.create).mockRejectedValueOnce(
      new Error("OpenAI rate limit")
    );

    const req = createJsonRequest({
      title: "Test Resume",
      original_text: "Resume content\njohn@example.com",
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.embeddingGenerated).toBe(false);
  });

  // ---- Formatting patterns extraction ----
  it("should return formatting patterns in response", async () => {
    const req = createJsonRequest({
      title: "Test Resume",
      original_text: "John Doe\njohn@example.com\n\nExperience\nBuilt software systems",
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.formattingPatterns).toEqual(
      expect.objectContaining({
        pageCount: expect.any(Number),
        sectionOrder: expect.any(Array),
        bulletStyle: expect.any(Object),
        hasSummary: expect.any(Boolean),
        wordCount: expect.any(Number),
      })
    );
  });

  it("should store the uploaded_by user id", async () => {
    const req = createJsonRequest({
      title: "Test Resume",
      original_text: "Resume content here",
    });

    await POST(req);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        uploaded_by: "user-123",
      })
    );
  });

  it("should handle empty text after parsing", async () => {
    const req = createJsonRequest({
      title: "Test Resume",
      original_text: "   ",
    });

    const res = await POST(req);
    // Zod min(1) validation will catch empty string, but whitespace-only should be caught after trim
    expect(res.status).toBe(400);
  });
});
