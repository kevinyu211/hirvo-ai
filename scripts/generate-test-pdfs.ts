/**
 * Script to generate PDF test resumes
 * Run with: npx tsx scripts/generate-test-pdfs.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

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

const headingPatterns = [
  /^(professional\s*summary|summary|objective|profile)$/i,
  /^(experience|work\s*experience|professional\s*experience|employment)$/i,
  /^(education|academic)$/i,
  /^(skills|technical\s*skills|core\s*competencies)$/i,
  /^(certifications?|licenses?\s*(?:&|and)?\s*certifications?|credentials)$/i,
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
    if (trimmed === trimmed.toUpperCase() && !trimmed.includes("@") && !trimmed.includes("|")) {
      return true;
    }
  }

  for (const pattern of headingPatterns) {
    if (pattern.test(trimmed)) return true;
  }

  return false;
}

function parseResumeIntoSections(
  text: string
): { heading: string; content: string[] }[] {
  const lines = text.split("\n");
  const sections: { heading: string; content: string[] }[] = [];
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
    textAlign: "center",
    marginBottom: 4,
    color: "#111111",
  },
  headerContact: {
    fontSize: 10,
    textAlign: "center",
    color: "#555555",
    marginBottom: 2,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
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

async function generatePDF(text: string, outputPath: string): Promise<void> {
  const sections = parseResumeIntoSections(text);
  const elements: React.ReactElement[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (section.heading) {
      elements.push(
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
        line.startsWith("*");

      const cleanLine = isBullet
        ? line.replace(/^[•\-–*]\s*/, "")
        : line;

      if (!section.heading && i === 0) {
        const isFirstLine = j === 0;
        elements.push(
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
        elements.push(
          React.createElement(
            Text,
            { key: `bullet-${i}-${j}`, style: styles.bulletText },
            `•  ${cleanLine}`
          )
        );
      } else {
        elements.push(
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
    Document,
    null,
    React.createElement(
      Page,
      { size: "LETTER", style: styles.page },
      React.createElement(View, null, ...elements)
    )
  );

  const buffer = await renderToBuffer(doc);
  writeFileSync(outputPath, buffer);
}

async function main() {
  console.log("Generating PDF test documents...\n");

  for (const file of resumeFiles) {
    const inputPath = join(TEST_DATA_DIR, file);
    const baseName = file.replace(".txt", "");
    const pdfPath = join(OUTPUT_DIR, `${baseName}.pdf`);

    try {
      const text = readFileSync(inputPath, "utf-8");
      await generatePDF(text, pdfPath);
      console.log(`✓ Created: ${baseName}.pdf`);
    } catch (error) {
      console.error(`✗ Failed: ${file}`, error);
    }
  }

  console.log(`\nPDFs saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
