/**
 * DOCX Generator for Templates
 *
 * Uses docx library to generate styled Word documents
 * from structured resume data.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TabStopPosition,
  TabStopType,
} from "docx";
import type { StructuredResume } from "@/lib/types";
import type { TemplateStyle } from "./types";

/**
 * Map PDF font names to DOCX font names
 */
const FONT_MAP: Record<string, string> = {
  Helvetica: "Calibri",
  "Helvetica-Bold": "Calibri",
  "Times-Roman": "Times New Roman",
  "Times-Bold": "Times New Roman",
  Courier: "Courier New",
  "Courier-Bold": "Courier New",
};

/**
 * Get DOCX font from style
 */
function getFont(fontName: string): string {
  return FONT_MAP[fontName] || fontName;
}

/**
 * Convert pt to half-points (DOCX uses half-points)
 */
function ptToHalfPt(pt: number): number {
  return Math.round(pt * 2);
}

/**
 * Convert pt to twips (1/20 of a point, used for spacing)
 */
function ptToTwip(pt: number): number {
  return Math.round(pt * 20);
}

/**
 * Get bullet character based on style
 */
function getBulletChar(bulletStyle: string): string {
  switch (bulletStyle) {
    case "arrow":
      return "\u2192";
    case "dash":
      return "-";
    case "none":
      return "";
    default:
      return "\u2022";
  }
}

/**
 * Generate DOCX with the specified template style
 */
export async function generateDOCXWithStyle(
  resume: StructuredResume,
  style: TemplateStyle
): Promise<Buffer> {
  const children: Paragraph[] = [];
  const bodyFont = getFont(style.typography.fontFamily.body);
  const headingFont = getFont(style.typography.fontFamily.heading);

  // Contact Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: resume.contact.fullName || "Your Name",
          bold: true,
          size: ptToHalfPt(style.typography.fontSize.name),
          font: headingFont,
          color: style.colors.heading.replace("#", ""),
        }),
      ],
      alignment: style.features.nameCenter
        ? AlignmentType.CENTER
        : AlignmentType.LEFT,
      spacing: { after: 80 },
    })
  );

  // Contact details
  const contactItems = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
  ].filter(Boolean);

  if (contactItems.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactItems.join(" | "),
            size: ptToHalfPt(style.typography.fontSize.small),
            font: bodyFont,
            color: style.colors.muted.replace("#", ""),
          }),
        ],
        alignment: style.features.contactCenter
          ? AlignmentType.CENTER
          : AlignmentType.LEFT,
        spacing: { after: 40 },
      })
    );
  }

  // Links
  const linkItems = [
    resume.contact.linkedin,
    resume.contact.github,
    resume.contact.website,
  ].filter(Boolean);

  if (linkItems.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: linkItems.join(" | "),
            size: ptToHalfPt(style.typography.fontSize.small),
            font: bodyFont,
            color: style.colors.secondary.replace("#", ""),
          }),
        ],
        alignment: style.features.contactCenter
          ? AlignmentType.CENTER
          : AlignmentType.LEFT,
        spacing: { after: ptToTwip(style.spacing.sectionGap) },
      })
    );
  }

  // Summary
  if (resume.summary) {
    children.push(createSectionHeading("Summary", style, headingFont));
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: resume.summary,
            size: ptToHalfPt(style.typography.fontSize.body),
            font: bodyFont,
            color: style.colors.text.replace("#", ""),
          }),
        ],
        spacing: { after: ptToTwip(style.spacing.entryGap) },
      })
    );
  }

  // Experience
  if (resume.experience.length > 0) {
    children.push(createSectionHeading("Experience", style, headingFont));

    for (const exp of resume.experience) {
      // Title and Dates on same line with tab stop
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.title,
              bold: true,
              size: ptToHalfPt(style.typography.fontSize.jobTitle),
              font: headingFont,
              color: style.colors.heading.replace("#", ""),
            }),
            new TextRun({
              text: "\t",
            }),
            new TextRun({
              text: `${exp.startDate} - ${exp.endDate}`,
              size: ptToHalfPt(style.typography.fontSize.small),
              font: bodyFont,
              color: style.colors.muted.replace("#", ""),
            }),
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          spacing: { after: 40 },
        })
      );

      // Company and Location
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.company + (exp.location ? ` | ${exp.location}` : ""),
              size: ptToHalfPt(style.typography.fontSize.company),
              font: bodyFont,
              color: style.colors.secondary.replace("#", ""),
            }),
          ],
          spacing: { after: 60 },
        })
      );

      // Bullets
      for (const bullet of exp.bullets) {
        children.push(createBulletParagraph(bullet, style, bodyFont));
      }

      // Entry spacing
      children.push(
        new Paragraph({
          spacing: { after: ptToTwip(style.spacing.entryGap) },
        })
      );
    }
  }

  // Education
  if (resume.education.length > 0) {
    children.push(createSectionHeading("Education", style, headingFont));

    for (const edu of resume.education) {
      // School and Date
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: edu.school,
              bold: true,
              size: ptToHalfPt(style.typography.fontSize.jobTitle),
              font: headingFont,
              color: style.colors.heading.replace("#", ""),
            }),
            new TextRun({
              text: "\t",
            }),
            new TextRun({
              text: edu.endDate,
              size: ptToHalfPt(style.typography.fontSize.small),
              font: bodyFont,
              color: style.colors.muted.replace("#", ""),
            }),
          ],
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          spacing: { after: 40 },
        })
      );

      // Degree
      const degreeText =
        edu.degree +
        (edu.field ? ` in ${edu.field}` : "") +
        (edu.gpa ? ` | GPA: ${edu.gpa}` : "");

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: degreeText,
              size: ptToHalfPt(style.typography.fontSize.company),
              font: bodyFont,
              color: style.colors.secondary.replace("#", ""),
            }),
          ],
          spacing: { after: 60 },
        })
      );

      // Highlights
      for (const highlight of edu.highlights) {
        children.push(createBulletParagraph(highlight, style, bodyFont));
      }

      children.push(
        new Paragraph({
          spacing: { after: ptToTwip(style.spacing.entryGap) },
        })
      );
    }
  }

  // Skills
  if (
    resume.skills.technical.length > 0 ||
    resume.skills.tools.length > 0 ||
    resume.skills.soft.length > 0 ||
    resume.skills.languages.length > 0
  ) {
    children.push(createSectionHeading("Skills", style, headingFont));

    if (resume.skills.technical.length > 0) {
      children.push(
        createSkillLine("Technical", resume.skills.technical, style, headingFont, bodyFont)
      );
    }
    if (resume.skills.tools.length > 0) {
      children.push(
        createSkillLine("Tools", resume.skills.tools, style, headingFont, bodyFont)
      );
    }
    if (resume.skills.soft.length > 0) {
      children.push(
        createSkillLine("Soft Skills", resume.skills.soft, style, headingFont, bodyFont)
      );
    }
    if (resume.skills.languages.length > 0) {
      children.push(
        createSkillLine("Languages", resume.skills.languages, style, headingFont, bodyFont)
      );
    }
  }

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    children.push(createSectionHeading("Projects", style, headingFont));

    for (const proj of resume.projects) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: proj.name + (proj.url ? ` (${proj.url})` : ""),
              bold: true,
              size: ptToHalfPt(style.typography.fontSize.jobTitle),
              font: headingFont,
              color: style.colors.heading.replace("#", ""),
            }),
          ],
          spacing: { after: 40 },
        })
      );

      if (proj.technologies.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Technologies: ${proj.technologies.join(", ")}`,
                size: ptToHalfPt(style.typography.fontSize.small),
                font: bodyFont,
                color: style.colors.muted.replace("#", ""),
              }),
            ],
            spacing: { after: 40 },
          })
        );
      }

      if (proj.description) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: proj.description,
                size: ptToHalfPt(style.typography.fontSize.body),
                font: bodyFont,
                color: style.colors.text.replace("#", ""),
              }),
            ],
            spacing: { after: 40 },
          })
        );
      }

      for (const bullet of proj.bullets) {
        children.push(createBulletParagraph(bullet, style, bodyFont));
      }

      children.push(
        new Paragraph({
          spacing: { after: ptToTwip(style.spacing.entryGap) },
        })
      );
    }
  }

  // Certifications
  if (resume.certifications && resume.certifications.length > 0) {
    children.push(createSectionHeading("Certifications", style, headingFont));

    for (const cert of resume.certifications) {
      children.push(createBulletParagraph(cert, style, bodyFont));
    }
  }

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: ptToTwip(style.spacing.page.top),
              bottom: ptToTwip(style.spacing.page.bottom),
              left: ptToTwip(style.spacing.page.left),
              right: ptToTwip(style.spacing.page.right),
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
 * Create section heading paragraph
 */
function createSectionHeading(
  title: string,
  style: TemplateStyle,
  font: string
): Paragraph {
  const displayTitle = style.features.sectionUppercase
    ? title.toUpperCase()
    : title;

  return new Paragraph({
    children: [
      new TextRun({
        text: displayTitle,
        bold: true,
        size: ptToHalfPt(style.typography.fontSize.sectionHeading),
        font,
        color: style.colors.heading.replace("#", ""),
      }),
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: ptToTwip(style.spacing.sectionGap), after: 80 },
    border: style.features.sectionDividers
      ? {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 1,
            color: style.colors.border.replace("#", ""),
          },
        }
      : undefined,
  });
}

/**
 * Create bullet point paragraph
 */
function createBulletParagraph(
  text: string,
  style: TemplateStyle,
  font: string
): Paragraph {
  const bulletChar = getBulletChar(style.features.bulletStyle);
  const prefix = bulletChar ? `${bulletChar} ` : "";

  return new Paragraph({
    children: [
      new TextRun({
        text: prefix + text,
        size: ptToHalfPt(style.typography.fontSize.body),
        font,
        color: style.colors.text.replace("#", ""),
      }),
    ],
    indent: { left: ptToTwip(style.spacing.bulletIndent) },
    spacing: { after: 40 },
  });
}

/**
 * Create skill line paragraph
 */
function createSkillLine(
  label: string,
  skills: string[],
  style: TemplateStyle,
  headingFont: string,
  bodyFont: string
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: ptToHalfPt(style.typography.fontSize.body),
        font: headingFont,
        color: style.colors.text.replace("#", ""),
      }),
      new TextRun({
        text: skills.join(", "),
        size: ptToHalfPt(style.typography.fontSize.body),
        font: bodyFont,
        color: style.colors.text.replace("#", ""),
      }),
    ],
    spacing: { after: 60 },
  });
}
