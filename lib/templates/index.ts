/**
 * Template System - Export Template Registry
 *
 * Provides template-based PDF and DOCX generation for structured resumes.
 */

import type { StructuredResume, ResumeFormatId } from "@/lib/types";
import type { ResumeTemplate, TemplateStyle } from "./types";
import { getTemplateStyle } from "./types";
import { generatePDFWithStyle } from "./pdf-generator";
import { generateDOCXWithStyle } from "./docx-generator";

/**
 * Template registry - all available resume formats
 */
export const TEMPLATES: Record<ResumeFormatId, ResumeTemplate> = {
  classic: {
    id: "classic",
    name: "Classic",
    description: "Traditional serif fonts with underlined headers",
    generatePDF: (resume) => generatePDFWithStyle(resume, getTemplateStyle("classic")),
    generateDOCX: (resume) => generateDOCXWithStyle(resume, getTemplateStyle("classic")),
  },
  modern: {
    id: "modern",
    name: "Modern",
    description: "Clean sans-serif with subtle color accents",
    generatePDF: (resume) => generatePDFWithStyle(resume, getTemplateStyle("modern")),
    generateDOCX: (resume) => generateDOCXWithStyle(resume, getTemplateStyle("modern")),
  },
  minimalist: {
    id: "minimalist",
    name: "Minimalist",
    description: "Maximum whitespace with thin, elegant fonts",
    generatePDF: (resume) => generatePDFWithStyle(resume, getTemplateStyle("minimalist")),
    generateDOCX: (resume) => generateDOCXWithStyle(resume, getTemplateStyle("minimalist")),
  },
  technical: {
    id: "technical",
    name: "Technical",
    description: "Monospace code sections with skill badges",
    generatePDF: (resume) => generatePDFWithStyle(resume, getTemplateStyle("technical")),
    generateDOCX: (resume) => generateDOCXWithStyle(resume, getTemplateStyle("technical")),
  },
  executive: {
    id: "executive",
    name: "Executive",
    description: "Premium serif with understated elegance",
    generatePDF: (resume) => generatePDFWithStyle(resume, getTemplateStyle("executive")),
    generateDOCX: (resume) => generateDOCXWithStyle(resume, getTemplateStyle("executive")),
  },
};

/**
 * Get a template by ID
 */
export function getTemplate(templateId: ResumeFormatId): ResumeTemplate {
  return TEMPLATES[templateId] || TEMPLATES.modern;
}

/**
 * Generate export in specified format using template
 */
export async function generateExport(
  resume: StructuredResume,
  format: "pdf" | "docx",
  templateId: ResumeFormatId
): Promise<Buffer> {
  const template = getTemplate(templateId);

  if (format === "pdf") {
    return template.generatePDF(resume);
  } else {
    return template.generateDOCX(resume);
  }
}

// Re-export types
export type { ResumeTemplate, TemplateStyle } from "./types";
export { getTemplateStyle, TEMPLATE_STYLES, DEFAULT_STYLE } from "./types";
