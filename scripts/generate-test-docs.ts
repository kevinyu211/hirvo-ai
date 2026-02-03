/**
 * Script to generate PDF and DOCX test resumes
 * Run with: npx tsx scripts/generate-test-docs.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

const TEST_DATA_DIR = join(process.cwd(), "test-data");
const OUTPUT_DIR = join(TEST_DATA_DIR, "documents");

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

const resumeFiles = [
  "resume-1-marketing-positive.txt",
  "resume-2-data-scientist-positive.txt",
  "resume-3-junior-dev-negative.txt",
  "resume-4-product-manager-positive.txt",
  "resume-5-nurse-positive.txt",
];

/**
 * Parse resume text into sections
 */
function parseResumeIntoSections(
  text: string
): { heading: string; content: string[] }[] {
  const lines = text.split("\n");
  const sections: { heading: string; content: string[] }[] = [];

  const headingPatterns = [
    /^(professional\s*summary|summary|objective|profile)$/i,
    /^(experience|work\s*experience|professional\s*experience|employment)$/i,
    /^(education|academic)$/i,
    /^(skills|technical\s*skills|core\s*competencies)$/i,
    /^(certifications?|licenses?)$/i,
    /^(projects|publications?)$/i,
    /^(professional\s*memberships?|memberships?)$/i,
    /^(interests?)$/i,
  ];

  function isHeading(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 50) return false;

    const letters = trimmed.replace(/[^a-zA-Z\s]/g, "");
    if (letters.length >= 3 && letters === letters.toUpperCase()) {
      for (const pattern of headingPatterns) {
        if (pattern.test(trimmed)) return true;
      }
      // Check if it's an all-caps line that looks like a section header
      if (trimmed === trimmed.toUpperCase() && !trimmed.includes("@") && !trimmed.includes("|")) {
        return true;
      }
    }

    for (const pattern of headingPatterns) {
      if (pattern.test(trimmed)) return true;
    }

    return false;
  }

  let currentSection: { heading: string; content: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (isHeading(trimmed)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { heading: trimmed, content: [] };
    } else if (trimmed) {
      if (currentSection) {
        currentSection.content.push(trimmed);
      } else {
        // Content before any heading (name/contact)
        if (!sections.length || sections[0].heading !== "") {
          currentSection = { heading: "", content: [trimmed] };
        } else {
          sections[0].content.push(trimmed);
        }
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Generate DOCX from resume text
 */
async function generateDOCX(text: string, outputPath: string): Promise<void> {
  const sections = parseResumeIntoSections(text);
  const children: Paragraph[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (section.heading) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.heading.toUpperCase(),
              bold: true,
              size: 24,
              font: "Calibri",
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "999999",
            },
          },
        })
      );
    }

    for (let j = 0; j < section.content.length; j++) {
      const line = section.content[j];
      const isBullet =
        line.startsWith("•") ||
        line.startsWith("-") ||
        line.startsWith("–") ||
        line.startsWith("*");

      const cleanLine = isBullet
        ? line.replace(/^[•\-–*]\s*/, "")
        : line;

      if (isBullet) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanLine,
                size: 22,
                font: "Calibri",
              }),
            ],
            bullet: { level: 0 },
            spacing: { after: 40 },
          })
        );
      } else if (!section.heading && i === 0) {
        // Header section (name + contact)
        const isFirstLine = j === 0;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: isFirstLine,
                size: isFirstLine ? 32 : 22,
                font: "Calibri",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: isFirstLine ? 40 : 20 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 22,
                font: "Calibri",
              }),
            ],
            spacing: { after: 60 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 1080,
              right: 1080,
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputPath, buffer);
}

/**
 * Main function
 */
async function main() {
  console.log("Generating test documents...\n");

  for (const file of resumeFiles) {
    const inputPath = join(TEST_DATA_DIR, file);
    const baseName = file.replace(".txt", "");
    const docxPath = join(OUTPUT_DIR, `${baseName}.docx`);

    try {
      const text = readFileSync(inputPath, "utf-8");

      // Generate DOCX
      await generateDOCX(text, docxPath);
      console.log(`✓ Created: ${baseName}.docx`);
    } catch (error) {
      console.error(`✗ Failed: ${file}`, error);
    }
  }

  console.log(`\nDocuments saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
