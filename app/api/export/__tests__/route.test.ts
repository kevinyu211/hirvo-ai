import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase
const mockGetUser = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
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

// Mock docx module
const mockToBuffer = vi.fn();
vi.mock("docx", () => {
  // Use real function constructors so `new` works
  function MockDocument() { return {}; }
  function MockParagraph() { return {}; }
  function MockTextRun() { return {}; }
  return {
    Document: MockDocument,
    Packer: { toBuffer: (...args: unknown[]) => mockToBuffer(...args) },
    Paragraph: MockParagraph,
    TextRun: MockTextRun,
    HeadingLevel: { HEADING_2: "Heading2" },
    AlignmentType: { CENTER: "center" },
    BorderStyle: { SINGLE: "single" },
  };
});

// Mock @react-pdf/renderer
const mockRenderToBuffer = vi.fn();
vi.mock("@react-pdf/renderer", () => ({
  Document: "Document",
  Page: "Page",
  Text: "Text",
  View: "View",
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
  renderToBuffer: (...args: unknown[]) => mockRenderToBuffer(...args),
}));

// Mock react
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    createElement: vi.fn().mockReturnValue({}),
  };
});

import { POST } from "../route";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/export", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq2 });
    mockEq2.mockResolvedValue({ error: null });

    // Default mock: return a valid buffer
    const docxBuffer = Buffer.from("mock-docx-content");
    mockToBuffer.mockResolvedValue(docxBuffer);

    const pdfBuffer = Buffer.from("mock-pdf-content");
    mockRenderToBuffer.mockResolvedValue(pdfBuffer);
  });

  // --- Auth Tests ---
  describe("authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const req = createRequest({
        text: "Resume text",
        format: "pdf",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when auth returns error", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Token expired" },
      });

      const req = createRequest({
        text: "Resume text",
        format: "docx",
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });
  });

  // --- Validation Tests ---
  describe("validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = new NextRequest("http://localhost:3000/api/export", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid JSON body");
    });

    it("returns 400 when text is missing", async () => {
      const req = createRequest({ format: "pdf" });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
    });

    it("returns 400 when format is missing", async () => {
      const req = createRequest({ text: "Resume text" });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation failed");
    });

    it("returns 400 for invalid format value", async () => {
      const req = createRequest({
        text: "Resume text",
        format: "txt",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 for empty text", async () => {
      const req = createRequest({
        text: "",
        format: "pdf",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid analysisId format", async () => {
      const req = createRequest({
        text: "Resume text",
        format: "pdf",
        analysisId: "not-a-uuid",
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  // --- DOCX Export Tests ---
  describe("DOCX export", () => {
    it("returns DOCX binary response with correct headers", async () => {
      const req = createRequest({
        text: "John Doe\njohn@email.com\n\nExperience\nSoftware Engineer at Acme Inc",
        format: "docx",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      expect(res.headers.get("Content-Disposition")).toBe(
        'attachment; filename="resume.docx"'
      );
      expect(res.headers.get("Content-Length")).toBeTruthy();
    });

    it("calls Packer.toBuffer with a Document", async () => {
      const req = createRequest({
        text: "Simple resume text",
        format: "docx",
      });
      await POST(req);

      expect(mockToBuffer).toHaveBeenCalledTimes(1);
    });

    it("handles resume text with sections and bullets", async () => {
      const req = createRequest({
        text: "John Doe\n\nExperience\n- Built feature A\n- Led team B\n\nSkills\nJavaScript, Python",
        format: "docx",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockToBuffer).toHaveBeenCalledTimes(1);
    });
  });

  // --- PDF Export Tests ---
  describe("PDF export", () => {
    it("returns PDF binary response with correct headers", async () => {
      const req = createRequest({
        text: "John Doe\njohn@email.com\n\nExperience\nSoftware Engineer at Acme Inc",
        format: "pdf",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      expect(res.headers.get("Content-Disposition")).toBe(
        'attachment; filename="resume.pdf"'
      );
      expect(res.headers.get("Content-Length")).toBeTruthy();
    });

    it("calls renderToBuffer for PDF generation", async () => {
      const req = createRequest({
        text: "Simple resume text",
        format: "pdf",
      });
      await POST(req);

      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it("handles resume text with sections and bullets", async () => {
      const req = createRequest({
        text: "Jane Smith\n\nSummary\nExperienced developer\n\nSkills\n• React\n• Node.js",
        format: "pdf",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });
  });

  // --- Database Persistence ---
  describe("database persistence", () => {
    it("saves optimized text when analysisId is provided", async () => {
      const analysisId = "123e4567-e89b-12d3-a456-426614174000";
      const req = createRequest({
        text: "Updated resume text",
        format: "docx",
        analysisId,
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith({
        optimized_text: "Updated resume text",
      });
      expect(mockEq).toHaveBeenCalledWith("id", analysisId);
      expect(mockEq2).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("does not save when analysisId is not provided", async () => {
      const req = createRequest({
        text: "Resume text",
        format: "pdf",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("still returns file even if database save fails", async () => {
      mockEq2.mockRejectedValue(new Error("DB error"));

      const req = createRequest({
        text: "Resume text",
        format: "docx",
        analysisId: "123e4567-e89b-12d3-a456-426614174000",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
    });
  });

  // --- Error Handling ---
  describe("error handling", () => {
    it("returns 500 when DOCX generation fails", async () => {
      mockToBuffer.mockRejectedValue(new Error("DOCX generation failed"));

      const req = createRequest({
        text: "Resume text",
        format: "docx",
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Export generation failed. Please try again.");
    });

    it("returns 500 when PDF generation fails", async () => {
      mockRenderToBuffer.mockRejectedValue(
        new Error("PDF generation failed")
      );

      const req = createRequest({
        text: "Resume text",
        format: "pdf",
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Export generation failed. Please try again.");
    });
  });

  // --- Resume Text Parsing ---
  describe("resume text parsing", () => {
    it("handles plain text without sections", async () => {
      const req = createRequest({
        text: "Just a plain text resume with no recognizable sections",
        format: "docx",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("handles resume with multiple section types", async () => {
      const req = createRequest({
        text: [
          "John Doe",
          "john@example.com | 555-0123",
          "",
          "PROFESSIONAL SUMMARY",
          "Experienced software engineer with 5+ years",
          "",
          "EXPERIENCE",
          "Software Engineer at Acme Inc",
          "- Built scalable APIs",
          "- Led team of 5 engineers",
          "",
          "EDUCATION",
          "BS Computer Science, MIT",
          "",
          "SKILLS",
          "JavaScript, TypeScript, Python, React, Node.js",
          "",
          "CERTIFICATIONS",
          "AWS Solutions Architect",
        ].join("\n"),
        format: "pdf",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("handles resume with colon-style headings", async () => {
      const req = createRequest({
        text: "Skills:\nJavaScript, Python\n\nExperience:\nSoftware Engineer",
        format: "docx",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("handles bullet point variations", async () => {
      const req = createRequest({
        text: "Experience\n• Built feature A\n- Deployed service B\n* Created module C\n1. Managed project D",
        format: "docx",
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });
});
