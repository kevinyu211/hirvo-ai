import mammoth from "mammoth";
import { extractText } from "unpdf";

export interface ParseResult {
  text: string;
  pageCount: number;
}

/**
 * Parse a PDF buffer and extract text content and page count.
 * Uses unpdf library which wraps pdf.js without the test file bug that pdf-parse has.
 */
export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    // Convert Buffer to Uint8Array as required by unpdf
    const uint8Array = new Uint8Array(buffer);
    const { text, totalPages } = await extractText(uint8Array);

    return {
      text: text.join("\n").trim(),
      pageCount: totalPages,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
    throw new Error("Failed to parse PDF: unknown error");
  }
}

/**
 * Parse a DOCX buffer and extract plain text content.
 * Uses mammoth's extractRawText for clean text extraction.
 */
export async function parseDOCX(buffer: Buffer): Promise<ParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    if (result.messages.length > 0) {
      const errors = result.messages.filter((m) => m.type === "error");
      if (errors.length > 0) {
        throw new Error(
          `DOCX parsing errors: ${errors.map((e) => e.message).join("; ")}`
        );
      }
    }

    const text = result.value.trim();

    // DOCX doesn't have a native page count concept — estimate from content length
    // Average single-spaced page is ~3000 characters or ~500 words
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 500));

    return {
      text,
      pageCount: estimatedPages,
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("DOCX parsing")) {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
    throw new Error("Failed to parse DOCX: unknown error");
  }
}
