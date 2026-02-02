/**
 * ATS-Compliant DOCX Generator
 *
 * Generates DOCX files that are optimized for ATS (Applicant Tracking System)
 * parsing. Key principles:
 *
 * 1. Single-column layout (no tables, columns, or text boxes)
 * 2. Standard fonts (Calibri, Arial, Times New Roman)
 * 3. Simple formatting (bold, italic, underline only)
 * 4. Clear section headings
 * 5. No headers/footers with important content
 * 6. No images or graphics
 * 7. Standard bullet characters
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  IRunOptions,
  IParagraphOptions,
} from "docx";

interface ResumeSection {
  heading: string;
  content: ContentLine[];
}

interface ContentLine {
  text: string;
  type: "normal" | "bullet" | "sub-heading" | "date-range";
  bold?: boolean;
  italic?: boolean;
}

/**
 * Parse resume text into structured sections for ATS-friendly export
 */
export function parseResumeForATS(text: string): ResumeSection[] {
  const lines = text.split("\n");
  const sections: ResumeSection[] = [];

  const headingPatterns = [
    /^(contact\s*info(?:rmation)?|personal\s*info(?:rmation)?)$/i,
    /^(summary|professional\s*summary|executive\s*summary|objective|profile|about)$/i,
    /^(experience|work\s*experience|professional\s*experience|employment(?:\s*history)?)$/i,
    /^(education|academic\s*background|qualifications)$/i,
    /^(skills|technical\s*skills|core\s*competencies|competencies|key\s*skills)$/i,
    /^(projects|key\s*projects|selected\s*projects|personal\s*projects)$/i,
    /^(certifications?|licenses?\s*(?:&|and)\s*certifications?|credentials)$/i,
    /^(awards?(?:\s*(?:&|and)\s*honors?)?|honors?|achievements?)$/i,
    /^(publications?|research)$/i,
    /^(volunteer(?:ing)?(?:\s*experience)?|community\s*service)$/i,
    /^(languages?|additional\s*info(?:rmation)?)$/i,
    /^(references?)$/i,
  ];

  function isHeading(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 60) return false;

    // Check for all-caps
    const letters = trimmed.replace(/[^a-zA-Z]/g, "");
    if (letters.length >= 3 && letters === letters.toUpperCase()) {
      for (const pattern of headingPatterns) {
        if (pattern.test(trimmed.replace(/:$/, ""))) return true;
      }
    }

    // Check mixed-case
    for (const pattern of headingPatterns) {
      if (pattern.test(trimmed.replace(/:$/, ""))) return true;
    }

    return false;
  }

  function isBullet(line: string): boolean {
    return (
      /^[•\-–—*►▸→➤»]\s+/.test(line) ||
      /^\d+[.)]\s+/.test(line)
    );
  }

  function isDateRange(line: string): boolean {
    // Detect date ranges like "Jan 2020 - Present" or "2019 - 2021"
    return /(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b\s*\d{4}|\d{4})\s*[-–—]\s*(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b\s*\d{4}|\d{4}|Present|Current)/i.test(
      line
    );
  }

  function cleanBulletText(line: string): string {
    return line.replace(/^[•\-–—*►▸→➤»]\s*/, "").replace(/^\d+[.)]\s*/, "");
  }

  let currentSection: ResumeSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isHeading(trimmed)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: trimmed.replace(/:$/, "").trim(),
        content: [],
      };
    } else {
      const contentLine: ContentLine = {
        text: trimmed,
        type: "normal",
      };

      if (isBullet(trimmed)) {
        contentLine.text = cleanBulletText(trimmed);
        contentLine.type = "bullet";
      } else if (isDateRange(trimmed)) {
        contentLine.type = "date-range";
        contentLine.italic = true;
      }

      if (currentSection) {
        currentSection.content.push(contentLine);
      } else {
        // Content before any heading - create header section
        if (!sections.length || sections[0].heading !== "") {
          currentSection = { heading: "", content: [contentLine] };
        } else {
          sections[0].content.push(contentLine);
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
 * Generate an ATS-compliant DOCX document
 */
export async function generateATSCompliantDOCX(resumeText: string): Promise<Buffer> {
  const sections = parseResumeForATS(resumeText);
  const children: Paragraph[] = [];

  // ATS-friendly styling constants
  const FONT = "Calibri";
  const HEADING_SIZE = 24; // 12pt
  const BODY_SIZE = 22; // 11pt
  const NAME_SIZE = 32; // 16pt

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    const isHeaderSection = section.heading === "" && sectionIndex === 0;

    // Add section heading (if not header section)
    if (section.heading) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.heading.toUpperCase(),
              bold: true,
              size: HEADING_SIZE,
              font: FONT,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 80 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "666666",
            },
          },
        })
      );
    }

    // Add content
    for (let lineIndex = 0; lineIndex < section.content.length; lineIndex++) {
      const line = section.content[lineIndex];
      const isFirstLineOfHeader = isHeaderSection && lineIndex === 0;

      const runOptions: IRunOptions = {
        text: line.text,
        size: isFirstLineOfHeader ? NAME_SIZE : BODY_SIZE,
        font: FONT,
        bold: line.bold || isFirstLineOfHeader,
        italics: line.italic,
      };

      const paragraphOptions: IParagraphOptions = {
        children: [new TextRun(runOptions)],
        spacing: { after: line.type === "bullet" ? 40 : 60 },
        alignment: isHeaderSection ? AlignmentType.CENTER : undefined,
        bullet: line.type === "bullet" ? { level: 0 } : undefined,
      };

      children.push(new Paragraph(paragraphOptions));
    }
  }

  // Create document with ATS-friendly settings
  const doc = new Document({
    creator: "Hirvo.AI",
    description: "ATS-Optimized Resume",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              bottom: 720,
              left: 1080, // 0.75 inch
              right: 1080,
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

/**
 * Validate that resume text is ATS-friendly
 */
export function validateATSCompliance(text: string): {
  isCompliant: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for common ATS issues
  if (text.includes("│") || text.includes("─") || text.includes("┌")) {
    issues.push("Contains table/box characters that may confuse ATS");
  }

  if (/\t{2,}/.test(text)) {
    warnings.push("Multiple consecutive tabs detected - may cause parsing issues");
  }

  if (text.length < 500) {
    warnings.push("Resume content seems too short - consider adding more detail");
  }

  if (text.length > 10000) {
    warnings.push("Resume content is very long - consider condensing to 1-2 pages");
  }

  // Check for missing common sections
  const lowerText = text.toLowerCase();
  if (!lowerText.includes("experience") && !lowerText.includes("employment")) {
    warnings.push("No 'Experience' section detected");
  }
  if (!lowerText.includes("education")) {
    warnings.push("No 'Education' section detected");
  }
  if (!lowerText.includes("skill")) {
    warnings.push("No 'Skills' section detected");
  }

  // Check for email and phone
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text);

  if (!hasEmail) {
    warnings.push("No email address detected");
  }
  if (!hasPhone) {
    warnings.push("No phone number detected");
  }

  return {
    isCompliant: issues.length === 0,
    issues,
    warnings,
  };
}
