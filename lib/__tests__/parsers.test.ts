import { describe, it, expect } from "vitest";
import { parsePDF, parseDOCX } from "@/lib/parsers";
import { Document, Packer, Paragraph, TextRun } from "docx";

// Helper: create a minimal valid DOCX buffer using the `docx` npm package
async function createTestDocx(text: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: text.split("\n").map(
          (line) =>
            new Paragraph({
              children: [new TextRun(line)],
            })
        ),
      },
    ],
  });
  const arrayBuffer = await Packer.toBuffer(doc);
  return Buffer.from(arrayBuffer);
}

describe("parseDOCX", () => {
  it("extracts text from a DOCX buffer", async () => {
    const content = "John Doe\nSoftware Engineer\nExperience at Acme Corp";
    const buffer = await createTestDocx(content);
    const result = await parseDOCX(buffer);

    expect(result.text).toContain("John Doe");
    expect(result.text).toContain("Software Engineer");
    expect(result.text).toContain("Experience at Acme Corp");
  });

  it("returns a page count estimate of at least 1", async () => {
    const buffer = await createTestDocx("Short resume");
    const result = await parseDOCX(buffer);

    expect(result.pageCount).toBeGreaterThanOrEqual(1);
  });

  it("estimates higher page count for longer content", async () => {
    // Create content with ~600 words (should be > 1 page)
    const words = Array.from({ length: 600 }, (_, i) => `word${i}`).join(" ");
    const buffer = await createTestDocx(words);
    const result = await parseDOCX(buffer);

    expect(result.pageCount).toBeGreaterThan(1);
  });

  it("throws a descriptive error for corrupt DOCX data", async () => {
    const corruptBuffer = Buffer.from("not a valid docx file");
    await expect(parseDOCX(corruptBuffer)).rejects.toThrow(
      /Failed to parse DOCX/
    );
  });

  it("returns trimmed text without leading/trailing whitespace", async () => {
    const buffer = await createTestDocx("  Hello World  ");
    const result = await parseDOCX(buffer);

    expect(result.text).not.toMatch(/^\s/);
    expect(result.text).not.toMatch(/\s$/);
  });
});

describe("parsePDF", () => {
  it("throws a descriptive error for corrupt PDF data", async () => {
    const corruptBuffer = Buffer.from("not a valid pdf file");
    await expect(parsePDF(corruptBuffer)).rejects.toThrow(
      /Failed to parse PDF/
    );
  });

  it("throws a descriptive error for empty buffer", async () => {
    const emptyBuffer = Buffer.alloc(0);
    await expect(parsePDF(emptyBuffer)).rejects.toThrow(/Failed to parse PDF/);
  });
});
