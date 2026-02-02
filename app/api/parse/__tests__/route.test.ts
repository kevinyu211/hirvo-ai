import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

// Mock parsers
vi.mock("@/lib/parsers", () => ({
  parsePDF: vi.fn(),
  parseDOCX: vi.fn(),
}));

import { POST } from "../route";
import { parsePDF, parseDOCX } from "@/lib/parsers";

const mockedParsePDF = vi.mocked(parsePDF);
const mockedParseDOCX = vi.mocked(parseDOCX);

function createFileRequest(
  file: File,
): NextRequest {
  const formData = new FormData();
  formData.append("file", file);
  return new NextRequest("http://localhost:3000/api/parse", {
    method: "POST",
    body: formData,
  });
}

function createFile(
  content: Buffer | string,
  name: string,
  type: string,
): File {
  const data = typeof content === "string" ? content : new Uint8Array(content);
  const blob = new Blob([data], { type });
  return new File([blob], name, { type });
}

const authenticatedUser = {
  data: { user: { id: "user-123", email: "test@example.com" } },
  error: null,
};

const unauthenticated = {
  data: { user: null },
  error: { message: "Not authenticated" },
};

describe("POST /api/parse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(authenticatedUser);
  });

  describe("authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue(unauthenticated);

      const file = createFile("content", "resume.pdf", "application/pdf");
      const request = createFileRequest(file);
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("file validation", () => {
    it("returns 400 when no file is provided", async () => {
      const request = new NextRequest("http://localhost:3000/api/parse", {
        method: "POST",
        body: new FormData(), // empty form data
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("No file provided");
    });

    it("returns 400 for invalid file type", async () => {
      const file = createFile("content", "resume.txt", "text/plain");
      const request = createFileRequest(file);

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Invalid file type");
    });

    it("returns 400 when file exceeds 5MB", async () => {
      // Create a file that's over 5MB
      const largeContent = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const file = createFile(largeContent, "large.pdf", "application/pdf");
      const request = createFileRequest(file);

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("File too large");
    });

    it("accepts PDF files by MIME type", async () => {
      mockedParsePDF.mockResolvedValue({ text: "resume text", pageCount: 1 });

      const file = createFile("pdf-content", "resume.pdf", "application/pdf");
      const request = createFileRequest(file);

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockedParsePDF).toHaveBeenCalled();
    });

    it("accepts DOCX files by MIME type", async () => {
      mockedParseDOCX.mockResolvedValue({ text: "resume text", pageCount: 1 });

      const file = createFile(
        "docx-content",
        "resume.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      const request = createFileRequest(file);

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockedParseDOCX).toHaveBeenCalled();
    });

    it("accepts files by extension when MIME type is generic", async () => {
      mockedParseDOCX.mockResolvedValue({ text: "resume text", pageCount: 1 });

      // Some browsers report MIME as "application/octet-stream" for DOCX
      const file = createFile("content", "resume.docx", "application/octet-stream");
      const request = createFileRequest(file);

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockedParseDOCX).toHaveBeenCalled();
    });
  });

  describe("parsing", () => {
    it("returns parsed text and metadata for a PDF", async () => {
      mockedParsePDF.mockResolvedValue({
        text: "John Doe\njohn@example.com\nSoftware Engineer\nExperience\nWorked at Acme Corp\nEducation\nBS Computer Science\nSkills\nJavaScript, Python",
        pageCount: 2,
      });

      const file = createFile("pdf-content", "my-resume.pdf", "application/pdf");
      const request = createFileRequest(file);

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.text).toContain("John Doe");
      expect(body.pageCount).toBe(2);
      expect(body.wordCount).toBeGreaterThan(0);
      expect(body.metadata).toEqual({
        fileName: "my-resume.pdf",
        fileType: "pdf",
        fileSize: expect.any(Number),
      });
    });

    it("returns parsed text and metadata for a DOCX", async () => {
      mockedParseDOCX.mockResolvedValue({
        text: "Jane Smith\nProduct Manager\nExperience at BigCo",
        pageCount: 1,
      });

      const file = createFile(
        "docx-content",
        "resume.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      const request = createFileRequest(file);

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.text).toContain("Jane Smith");
      expect(body.pageCount).toBe(1);
      expect(body.metadata.fileType).toBe("docx");
    });

    it("returns 422 when parsing fails", async () => {
      mockedParsePDF.mockRejectedValue(new Error("Failed to parse PDF: corrupt file"));

      const file = createFile("bad-content", "corrupt.pdf", "application/pdf");
      const request = createFileRequest(file);

      const response = await POST(request);
      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toContain("Failed to parse file");
    });
  });

  describe("section detection", () => {
    it("detects standard resume sections", async () => {
      mockedParsePDF.mockResolvedValue({
        text: [
          "John Doe",
          "john@example.com",
          "(555) 123-4567",
          "",
          "Professional Summary",
          "Experienced software engineer with 5 years...",
          "",
          "Work Experience",
          "Software Engineer at Acme Corp",
          "",
          "Education",
          "BS Computer Science, MIT",
          "",
          "Technical Skills",
          "JavaScript, TypeScript, Python, React",
        ].join("\n"),
        pageCount: 1,
      });

      const file = createFile("content", "resume.pdf", "application/pdf");
      const request = createFileRequest(file);

      const response = await POST(request);
      const body = await response.json();

      expect(body.sections).toEqual(
        expect.arrayContaining([
          { name: "contact", found: true },
          { name: "summary", found: true },
          { name: "experience", found: true },
          { name: "education", found: true },
          { name: "skills", found: true },
        ])
      );
    });

    it("marks sections as not found when absent", async () => {
      mockedParsePDF.mockResolvedValue({
        text: "Just some random text without any resume structure",
        pageCount: 1,
      });

      const file = createFile("content", "resume.pdf", "application/pdf");
      const request = createFileRequest(file);

      const response = await POST(request);
      const body = await response.json();

      const summary = body.sections.find((s: { name: string }) => s.name === "summary");
      expect(summary?.found).toBe(false);

      const experience = body.sections.find((s: { name: string }) => s.name === "experience");
      expect(experience?.found).toBe(false);
    });
  });

  describe("word count", () => {
    it("correctly counts words in parsed text", async () => {
      mockedParseDOCX.mockResolvedValue({
        text: "One two three four five",
        pageCount: 1,
      });

      const file = createFile(
        "content",
        "resume.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      const request = createFileRequest(file);

      const response = await POST(request);
      const body = await response.json();
      expect(body.wordCount).toBe(5);
    });
  });
});
