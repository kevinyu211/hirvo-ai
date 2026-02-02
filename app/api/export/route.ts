import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import React from "react";
import {
  Document as PDFDocument,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const exportRequestSchema = z.object({
  text: z.string().min(1, "Resume text is required"),
  format: z.enum(["pdf", "docx"], {
    error: 'Format must be "pdf" or "docx"',
  }),
  analysisId: z.string().uuid("Invalid analysis ID").optional(),
});

/**
 * Parses resume text into structured sections for template rendering.
 * Detects common section headings and splits content accordingly.
 */
function parseResumeIntoSections(
  text: string
): { heading: string; content: string[] }[] {
  const lines = text.split("\n");
  const sections: { heading: string; content: string[] }[] = [];

  // Patterns for detecting section headings
  const headingPatterns = [
    /^(contact\s*info(?:rmation)?|personal\s*info(?:rmation)?)$/i,
    /^(summary|professional\s*summary|executive\s*summary|objective|profile)$/i,
    /^(experience|work\s*experience|professional\s*experience|employment(?:\s*history)?)$/i,
    /^(education|academic\s*background|qualifications)$/i,
    /^(skills|technical\s*skills|core\s*competencies|competencies|key\s*skills)$/i,
    /^(projects|key\s*projects|selected\s*projects)$/i,
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

    // Check all-caps line (at least 3 chars, all letters are uppercase)
    const letters = trimmed.replace(/[^a-zA-Z]/g, "");
    if (letters.length >= 3 && letters === letters.toUpperCase()) {
      // Check against heading patterns
      for (const pattern of headingPatterns) {
        if (pattern.test(trimmed)) return true;
      }
    }

    // Check mixed-case heading patterns
    for (const pattern of headingPatterns) {
      if (pattern.test(trimmed)) return true;
    }

    // Check lines ending with colon (e.g., "Skills:")
    if (trimmed.endsWith(":")) {
      const withoutColon = trimmed.slice(0, -1).trim();
      for (const pattern of headingPatterns) {
        if (pattern.test(withoutColon)) return true;
      }
    }

    return false;
  }

  let currentSection: { heading: string; content: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (isHeading(trimmed)) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }
      // Clean heading text (remove trailing colon, normalize case)
      const cleanHeading = trimmed.replace(/:$/, "").trim();
      currentSection = { heading: cleanHeading, content: [] };
    } else if (trimmed) {
      if (currentSection) {
        currentSection.content.push(trimmed);
      } else {
        // Content before any heading — treat as a "header" section (name/contact)
        if (!sections.length || sections[0].heading !== "") {
          currentSection = { heading: "", content: [trimmed] };
        } else {
          sections[0].content.push(trimmed);
        }
      }
    }
  }

  // Push the last section
  if (currentSection) {
    sections.push(currentSection);
  }

  // If no sections detected, return the entire text as one block
  if (sections.length === 0) {
    return [{ heading: "", content: text.split("\n").filter((l) => l.trim()) }];
  }

  return sections;
}

/**
 * Generates a DOCX buffer from resume text.
 * Uses a clean, ATS-friendly single-column layout with standard fonts.
 */
async function generateDOCX(text: string): Promise<Buffer> {
  const sections = parseResumeIntoSections(text);
  const children: Paragraph[] = [];

  for (const section of sections) {
    if (section.heading) {
      // Section heading with bottom border
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.heading.toUpperCase(),
              bold: true,
              size: 24, // 12pt
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

    for (const line of section.content) {
      const isBullet =
        line.startsWith("•") ||
        line.startsWith("-") ||
        line.startsWith("–") ||
        line.startsWith("*") ||
        /^\d+[.)]\s/.test(line);

      const cleanLine = isBullet
        ? line.replace(/^[•\-–*]\s*/, "").replace(/^\d+[.)]\s*/, "")
        : line;

      if (isBullet) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cleanLine,
                size: 22, // 11pt
                font: "Calibri",
              }),
            ],
            bullet: { level: 0 },
            spacing: { after: 40 },
          })
        );
      } else if (!section.heading && sections.indexOf(section) === 0) {
        // First section without heading = name/contact info
        const isFirstLine = section.content.indexOf(line) === 0;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                bold: isFirstLine,
                size: isFirstLine ? 32 : 22, // 16pt name, 11pt contact
                font: "Calibri",
              }),
            ],
            alignment: isFirstLine
              ? AlignmentType.CENTER
              : AlignmentType.CENTER,
            spacing: { after: isFirstLine ? 40 : 20 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 22, // 11pt
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
 * Generates a PDF buffer from resume text.
 * Uses @react-pdf/renderer with a clean, ATS-friendly template.
 */
async function generatePDF(text: string): Promise<Buffer> {
  const sections = parseResumeIntoSections(text);

  const styles = StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 48,
      paddingHorizontal: 54,
      fontFamily: "Helvetica",
      fontSize: 11,
      lineHeight: 1.4,
      color: "#333333",
    },
    headerName: {
      fontSize: 18,
      fontFamily: "Helvetica-Bold",
      textAlign: "center" as const,
      marginBottom: 4,
      color: "#111111",
    },
    headerContact: {
      fontSize: 10,
      textAlign: "center" as const,
      color: "#555555",
      marginBottom: 2,
    },
    sectionHeading: {
      fontSize: 12,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase" as const,
      marginTop: 14,
      marginBottom: 4,
      paddingBottom: 2,
      borderBottomWidth: 0.5,
      borderBottomColor: "#999999",
      color: "#222222",
    },
    bodyText: {
      fontSize: 10.5,
      marginBottom: 3,
      color: "#333333",
    },
    bulletText: {
      fontSize: 10.5,
      marginBottom: 2,
      paddingLeft: 12,
      color: "#333333",
    },
  });

  const documentElements: React.ReactElement[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (section.heading) {
      documentElements.push(
        React.createElement(
          Text,
          { key: `heading-${i}`, style: styles.sectionHeading },
          section.heading.toUpperCase()
        )
      );
    }

    for (let j = 0; j < section.content.length; j++) {
      const line = section.content[j];
      const isBullet =
        line.startsWith("•") ||
        line.startsWith("-") ||
        line.startsWith("–") ||
        line.startsWith("*") ||
        /^\d+[.)]\s/.test(line);

      const cleanLine = isBullet
        ? line.replace(/^[•\-–*]\s*/, "").replace(/^\d+[.)]\s*/, "")
        : line;

      if (!section.heading && i === 0) {
        // Header section (name + contact)
        const isFirstLine = j === 0;
        documentElements.push(
          React.createElement(
            Text,
            {
              key: `header-${i}-${j}`,
              style: isFirstLine ? styles.headerName : styles.headerContact,
            },
            line
          )
        );
      } else if (isBullet) {
        documentElements.push(
          React.createElement(
            Text,
            { key: `bullet-${i}-${j}`, style: styles.bulletText },
            `\u2022  ${cleanLine}`
          )
        );
      } else {
        documentElements.push(
          React.createElement(
            Text,
            { key: `body-${i}-${j}`, style: styles.bodyText },
            line
          )
        );
      }
    }
  }

  const doc = React.createElement(
    PDFDocument,
    null,
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      React.createElement(View, null, ...documentElements)
    )
  );

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}

export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = exportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { text, format, analysisId } = parsed.data;

  try {
    let buffer: Buffer;
    let contentType: string;
    let fileName: string;

    if (format === "docx") {
      buffer = await generateDOCX(text);
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      fileName = "resume.docx";
    } else {
      buffer = await generatePDF(text);
      contentType = "application/pdf";
      fileName = "resume.pdf";
    }

    // Save export event to database if analysisId provided
    if (analysisId) {
      try {
        await supabase
          .from("resume_analyses")
          .update({
            optimized_text: text,
          })
          .eq("id", analysisId)
          .eq("user_id", user.id);
      } catch {
        // Log but don't fail the export
        console.error("Failed to save export event to database");
      }
    }

    // Return the file as a binary download
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Export generation failed:", error);
    return NextResponse.json(
      { error: "Export generation failed. Please try again." },
      { status: 500 }
    );
  }
}
