/**
 * Template System Types
 *
 * Defines the interface for resume templates and their styling options.
 */

import type { StructuredResume, ResumeFormatId } from "@/lib/types";

/**
 * Template generator interface
 */
export interface ResumeTemplate {
  id: ResumeFormatId;
  name: string;
  description: string;

  /** Generate PDF buffer from structured resume */
  generatePDF: (resume: StructuredResume) => Promise<Buffer>;

  /** Generate DOCX buffer from structured resume */
  generateDOCX: (resume: StructuredResume) => Promise<Buffer>;
}

/**
 * Color scheme for templates
 */
export interface TemplateColors {
  primary: string;      // Main accent color (headers, highlights)
  secondary: string;    // Secondary accent
  text: string;         // Body text color
  heading: string;      // Heading text color
  muted: string;        // Muted/subtle text
  border: string;       // Border/divider color
  background: string;   // Background color
}

/**
 * Typography settings for templates
 */
export interface TemplateTypography {
  fontFamily: {
    heading: string;
    body: string;
  };
  fontSize: {
    name: number;        // Name at top
    sectionHeading: number;
    jobTitle: number;
    company: number;
    body: number;
    small: number;
  };
  lineHeight: number;
}

/**
 * Spacing settings for templates
 */
export interface TemplateSpacing {
  page: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  sectionGap: number;      // Space between sections
  entryGap: number;        // Space between entries (jobs, education)
  bulletIndent: number;    // Bullet point indentation
}

/**
 * Full template style configuration
 */
export interface TemplateStyle {
  colors: TemplateColors;
  typography: TemplateTypography;
  spacing: TemplateSpacing;
  features: {
    sectionDividers: boolean;      // Lines under section headers
    bulletStyle: "disc" | "dash" | "arrow" | "none";
    dateAlignment: "left" | "right" | "inline";
    nameCenter: boolean;           // Center the name
    contactCenter: boolean;        // Center contact info
    sectionUppercase: boolean;     // Uppercase section headers
  };
  // Convenience getters for one-page-fitter
  bodyFontSize: number;
  headingFontSize: number;
  sectionGap: number;
}

/**
 * Default style values
 */
export const DEFAULT_STYLE: TemplateStyle = {
  colors: {
    primary: "#2563eb",
    secondary: "#64748b",
    text: "#333333",
    heading: "#111111",
    muted: "#666666",
    border: "#999999",
    background: "#ffffff",
  },
  typography: {
    fontFamily: {
      heading: "Helvetica-Bold",
      body: "Helvetica",
    },
    fontSize: {
      name: 18,
      sectionHeading: 12,
      jobTitle: 11,
      company: 10,
      body: 10.5,
      small: 9,
    },
    lineHeight: 1.4,
  },
  spacing: {
    page: {
      top: 36,      // 0.5 inch
      bottom: 48,
      left: 54,     // 0.75 inch
      right: 54,
    },
    sectionGap: 14,
    entryGap: 10,
    bulletIndent: 12,
  },
  features: {
    sectionDividers: true,
    bulletStyle: "disc",
    dateAlignment: "right",
    nameCenter: true,
    contactCenter: true,
    sectionUppercase: true,
  },
  // Convenience properties
  bodyFontSize: 10.5,
  headingFontSize: 12,
  sectionGap: 14,
};

/**
 * Template-specific style overrides
 */
export const TEMPLATE_STYLES: Record<ResumeFormatId, Partial<TemplateStyle>> = {
  classic: {
    colors: {
      primary: "#1a1a1a",
      secondary: "#4a4a4a",
      text: "#333333",
      heading: "#000000",
      muted: "#555555",
      border: "#666666",
      background: "#ffffff",
    },
    typography: {
      fontFamily: {
        heading: "Times-Bold",
        body: "Times-Roman",
      },
      fontSize: {
        name: 18,
        sectionHeading: 12,
        jobTitle: 11,
        company: 10,
        body: 10.5,
        small: 9,
      },
      lineHeight: 1.35,
    },
    features: {
      sectionDividers: true,
      bulletStyle: "disc",
      dateAlignment: "right",
      nameCenter: true,
      contactCenter: true,
      sectionUppercase: true,
    },
  },
  modern: {
    colors: {
      primary: "#2563eb",
      secondary: "#64748b",
      text: "#374151",
      heading: "#111827",
      muted: "#6b7280",
      border: "#e5e7eb",
      background: "#ffffff",
    },
    typography: {
      fontFamily: {
        heading: "Helvetica-Bold",
        body: "Helvetica",
      },
      fontSize: {
        name: 20,
        sectionHeading: 11,
        jobTitle: 11,
        company: 10,
        body: 10,
        small: 9,
      },
      lineHeight: 1.4,
    },
    features: {
      sectionDividers: false,
      bulletStyle: "disc",
      dateAlignment: "right",
      nameCenter: true,
      contactCenter: true,
      sectionUppercase: true,
    },
  },
  minimalist: {
    colors: {
      primary: "#525252",
      secondary: "#737373",
      text: "#404040",
      heading: "#262626",
      muted: "#a3a3a3",
      border: "#d4d4d4",
      background: "#ffffff",
    },
    typography: {
      fontFamily: {
        heading: "Helvetica",
        body: "Helvetica",
      },
      fontSize: {
        name: 16,
        sectionHeading: 9,
        jobTitle: 10,
        company: 9,
        body: 9.5,
        small: 8,
      },
      lineHeight: 1.5,
    },
    spacing: {
      page: {
        top: 48,
        bottom: 48,
        left: 72,
        right: 72,
      },
      sectionGap: 18,
      entryGap: 12,
      bulletIndent: 10,
    },
    features: {
      sectionDividers: false,
      bulletStyle: "dash",
      dateAlignment: "right",
      nameCenter: false,
      contactCenter: false,
      sectionUppercase: true,
    },
  },
  technical: {
    colors: {
      primary: "#059669",
      secondary: "#0d9488",
      text: "#374151",
      heading: "#064e3b",
      muted: "#6b7280",
      border: "#d1d5db",
      background: "#ffffff",
    },
    typography: {
      fontFamily: {
        heading: "Courier-Bold",
        body: "Courier",
      },
      fontSize: {
        name: 16,
        sectionHeading: 11,
        jobTitle: 10,
        company: 9,
        body: 9.5,
        small: 8.5,
      },
      lineHeight: 1.35,
    },
    features: {
      sectionDividers: true,
      bulletStyle: "arrow",
      dateAlignment: "right",
      nameCenter: true,
      contactCenter: true,
      sectionUppercase: false,
    },
  },
  executive: {
    colors: {
      primary: "#44403c",
      secondary: "#78716c",
      text: "#292524",
      heading: "#1c1917",
      muted: "#a8a29e",
      border: "#d6d3d1",
      background: "#ffffff",
    },
    typography: {
      fontFamily: {
        heading: "Times-Bold",
        body: "Times-Roman",
      },
      fontSize: {
        name: 22,
        sectionHeading: 11,
        jobTitle: 11,
        company: 10,
        body: 10.5,
        small: 9,
      },
      lineHeight: 1.4,
    },
    spacing: {
      page: {
        top: 54,
        bottom: 54,
        left: 72,
        right: 72,
      },
      sectionGap: 16,
      entryGap: 12,
      bulletIndent: 14,
    },
    features: {
      sectionDividers: true,
      bulletStyle: "disc",
      dateAlignment: "right",
      nameCenter: true,
      contactCenter: true,
      sectionUppercase: true,
    },
  },
};

/**
 * Merge default style with template-specific overrides
 */
export function getTemplateStyle(templateId: ResumeFormatId): TemplateStyle {
  const overrides = TEMPLATE_STYLES[templateId] || {};

  const typography = {
    fontFamily: {
      ...DEFAULT_STYLE.typography.fontFamily,
      ...overrides.typography?.fontFamily,
    },
    fontSize: {
      ...DEFAULT_STYLE.typography.fontSize,
      ...overrides.typography?.fontSize,
    },
    lineHeight: overrides.typography?.lineHeight ?? DEFAULT_STYLE.typography.lineHeight,
  };

  const spacing = {
    page: { ...DEFAULT_STYLE.spacing.page, ...overrides.spacing?.page },
    sectionGap: overrides.spacing?.sectionGap ?? DEFAULT_STYLE.spacing.sectionGap,
    entryGap: overrides.spacing?.entryGap ?? DEFAULT_STYLE.spacing.entryGap,
    bulletIndent: overrides.spacing?.bulletIndent ?? DEFAULT_STYLE.spacing.bulletIndent,
  };

  return {
    colors: { ...DEFAULT_STYLE.colors, ...overrides.colors },
    typography,
    spacing,
    features: { ...DEFAULT_STYLE.features, ...overrides.features },
    // Convenience properties for one-page-fitter
    bodyFontSize: typography.fontSize.body,
    headingFontSize: typography.fontSize.sectionHeading,
    sectionGap: spacing.sectionGap,
  };
}
