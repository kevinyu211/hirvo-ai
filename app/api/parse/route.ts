import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parsePDF, parseDOCX } from "@/lib/parsers";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_WORD_COUNT = 50; // Minimum words for a valid resume
const MAX_PAGE_COUNT = 5; // Maximum pages before warning
const MAX_CHARS_FOR_ANALYSIS = 50000; // ~12,500 tokens for GPT-4

const ALLOWED_TYPES = new Map([
  ["application/pdf", "pdf" as const],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx" as const],
]);

/** Standard resume sections to detect */
const SECTION_PATTERNS: { name: string; patterns: RegExp[] }[] = [
  {
    name: "contact",
    patterns: [
      /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, // email
      /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // phone
      /linkedin\.com/i,
    ],
  },
  {
    name: "summary",
    patterns: [
      /\b(summary|objective|profile|about\s+me|professional\s+summary)\b/i,
    ],
  },
  {
    name: "experience",
    patterns: [
      /\b(experience|work\s+history|employment|professional\s+experience|work\s+experience)\b/i,
    ],
  },
  {
    name: "education",
    patterns: [
      /\b(education|academic|degree|university|college|school)\b/i,
    ],
  },
  {
    name: "skills",
    patterns: [
      /\b(skills|technical\s+skills|core\s+competencies|technologies|proficiencies)\b/i,
    ],
  },
];

function detectSections(text: string): { name: string; found: boolean }[] {
  return SECTION_PATTERNS.map(({ name, patterns }) => ({
    name,
    found: patterns.some((pattern) => pattern.test(text)),
  }));
}

function detectFileType(file: File): "pdf" | "docx" | null {
  // Check MIME type first
  const mimeType = ALLOWED_TYPES.get(file.type);
  if (mimeType) return mimeType;

  // Fall back to extension check
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";

  return null;
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data. Send a multipart/form-data request with a 'file' field." },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided. Include a 'file' field in the form data." },
      { status: 400 }
    );
  }

  // Validate file type
  const fileType = detectFileType(file);
  if (!fileType) {
    return NextResponse.json(
      { error: "Invalid file type. Only PDF and DOCX files are accepted." },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      {
        error: `File too large. Maximum size is 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
      },
      { status: 400 }
    );
  }

  // Read file buffer
  let buffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json(
      { error: "Failed to read file data." },
      { status: 400 }
    );
  }

  // Parse the file
  let text: string;
  let pageCount: number;
  try {
    if (fileType === "pdf") {
      const result = await parsePDF(buffer);
      text = result.text;
      pageCount = result.pageCount;
    } else {
      const result = await parseDOCX(buffer);
      text = result.text;
      pageCount = result.pageCount;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parsing error";
    return NextResponse.json(
      { error: `Failed to parse file: ${message}` },
      { status: 422 }
    );
  }

  // Extract metadata
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const sections = detectSections(text);

  // Edge case warnings
  const warnings: string[] = [];
  let processedText = text;

  // Check for scanned/image-only PDF (no extractable text)
  if (!text || text.trim().length === 0) {
    return NextResponse.json(
      {
        error: "Unable to extract text from this file. It may be a scanned image PDF. Please upload a text-based PDF or DOCX file, or use OCR software to convert your scanned resume first.",
        isScannedPdf: true,
      },
      { status: 422 }
    );
  }

  // Check for extremely short resume (<50 words)
  if (wordCount < MIN_WORD_COUNT) {
    warnings.push(
      `Your resume appears very short (${wordCount} words). Most effective resumes have at least 200-400 words. The analysis will proceed, but results may be limited.`
    );
  }

  // Check for very long resume (>5 pages)
  if (pageCount > MAX_PAGE_COUNT) {
    warnings.push(
      `Your resume is ${pageCount} pages. For ATS optimization, we recommend keeping it to 1-2 pages. The content will be truncated for analysis to avoid token limits.`
    );
    // Truncate the text for analysis (but return warning)
    if (processedText.length > MAX_CHARS_FOR_ANALYSIS) {
      processedText = processedText.slice(0, MAX_CHARS_FOR_ANALYSIS);
      warnings.push(
        `Due to length, only the first ~${Math.round(MAX_CHARS_FOR_ANALYSIS / 4)} words will be analyzed.`
      );
    }
  }

  return NextResponse.json({
    text: processedText,
    originalText: text !== processedText ? text : undefined, // Only include if truncated
    pageCount,
    wordCount,
    sections,
    metadata: {
      fileName: file.name,
      fileType,
      fileSize: file.size,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
    isTruncated: text !== processedText,
  });
}
