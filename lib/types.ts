// Shared types for the application

export interface ATSIssue {
  type: "missing_keyword" | "weak_keyword" | "formatting" | "section";
  severity: "critical" | "warning" | "info";
  message: string;
  suggestion?: string;
  textRange?: { start: number; end: number };
}

export interface ATSScore {
  overall: number;
  keywordMatchPct: number;
  formattingScore: number;
  sectionScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  issues: ATSIssue[];
  passed: boolean;
}

export interface HRFeedback {
  type: "formatting" | "semantic" | "llm_review";
  layer: 1 | 2 | 3;
  severity: "critical" | "warning" | "info";
  message: string;
  suggestion?: string;
  textRange?: { start: number; end: number };
}

export interface HRScore {
  overall: number;
  formattingScore: number;
  semanticScore: number;
  llmScore: number;
  feedback: HRFeedback[];
}

export interface ParsedResume {
  text: string;
  pageCount: number;
  wordCount: number;
  sections: {
    name: string;
    found: boolean;
    content?: string;
  }[];
  metadata: {
    fileName: string;
    fileType: "pdf" | "docx";
    fileSize: number;
  };
  /** Warnings about the resume content (short, long, etc.) */
  warnings?: string[];
  /** Whether the text was truncated due to length */
  isTruncated?: boolean;
}

export interface UserContext {
  targetRole?: string;
  yearsExperience?: string;
  visaStatus?: string;
}

export interface Suggestion {
  id: string;
  type: "ats" | "hr";
  category: string;
  originalText: string;
  suggestedText: string;
  reasoning: string;
  textRange: { start: number; end: number };
  severity: "critical" | "warning" | "info";
}

export interface AnalysisResult {
  id: string;
  atsScore: ATSScore;
  hrScore: HRScore;
  suggestions: Suggestion[];
  resumeText: string;
  jobDescription: string;
  visaFlagged: boolean;
}

// =============================================================================
// Structured Resume Types
// =============================================================================

/**
 * Structured resume for clean display and editing
 */
export interface StructuredResume {
  contact: ContactInfo;
  summary?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillsSection;
  projects?: ProjectEntry[];
  certifications?: string[];
  sectionOrder: string[];
  rawText: string; // Keep original for analysis
}

export interface ContactInfo {
  fullName: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  location?: string;
  website?: string;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate: string | "Present";
  bullets: string[];
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  field?: string;
  endDate: string;
  gpa?: string;
  highlights: string[];
}

export interface SkillsSection {
  technical: string[];
  soft: string[];
  tools: string[];
  languages: string[];
}

export interface ProjectEntry {
  id: string;
  name: string;
  description?: string;
  technologies: string[];
  url?: string;
  bullets: string[];
}

// =============================================================================
// Format Recommendation Types
// =============================================================================

/**
 * Resume format/template identifiers
 */
export type ResumeFormatId =
  | "classic"
  | "modern"
  | "minimalist"
  | "technical"
  | "executive";

/**
 * Format recommendation from database matching
 */
export interface FormatRecommendation {
  formatId: ResumeFormatId;
  formatName: string;
  successRate: number; // % of positive outcomes with this format
  sampleCount: number; // How many examples in database
  reasoning: string; // Why this format works
  isRecommended: boolean; // Top recommendation
}

/**
 * Format metadata for display
 */
export interface FormatMetadata {
  id: ResumeFormatId;
  name: string;
  description: string;
  bestFor: string[];
  fontFamily: string;
  colorAccent?: string;
}

/**
 * Map of format IDs to their metadata
 */
// =============================================================================
// Section-Level Feedback Types
// =============================================================================

/**
 * Feedback categories for color coding in section dropdowns
 */
export type FeedbackCategory =
  | "keyword_match"
  | "keyword_missing"
  | "formatting"
  | "section_structure"
  | "semantic_match"
  | "narrative"
  | "achievement"
  | "relevance"
  | "red_flag";

/**
 * Unified feedback item for section dropdowns
 */
export interface SectionFeedbackItem {
  id: string;
  source: "ats" | "hr";
  category: FeedbackCategory;
  severity: "critical" | "warning" | "info" | "success";
  message: string;
  detailedExplanation: string;
  suggestion?: string;
  /** Optional link to the specific field/bullet this feedback applies to */
  targetField?: string;
}

/**
 * Merged feedback per section for display in dropdowns
 */
export interface MergedSectionFeedback {
  sectionName: string;
  sectionKey: string; // "experience-1", "skills", "summary", etc.
  atsScore: number;
  hrScore: number;
  atsItems: SectionFeedbackItem[];
  hrItems: SectionFeedbackItem[];
}

/**
 * Template match score with breakdown
 */
export interface TemplateMatchScore {
  formatId: ResumeFormatId;
  matchPercentage: number; // 0-100 combined
  breakdown: {
    historicalSuccess: number;
    industryFit: number;
    roleLevelFit: number;
    contentDensityFit: number;
  };
  reasoning: string;
}

// =============================================================================
// Section Analysis Types (for split ATS/HR view)
// =============================================================================

/** Full analysis data for a single resume section */
export interface SectionAnalysis {
  sectionName: string;
  sectionKey: string;
  sectionContent: string;

  // ATS Analysis
  ats: {
    score: number;
    keywords: {
      matched: string[];
      missing: string[];
    };
    formatting: ATSIssue[];
    sections: { name: string; found: boolean }[];
  };

  // HR Analysis
  hr: {
    score: number;
    formatting: HRFeedback[]; // Layer 1
    semantic: {
      // Layer 2
      skills: number;
      experience: number;
      overall: number;
    };
    llmReview: HRFeedback[]; // Layer 3
  };
}

/** Grammarly-style fix suggestion */
export interface GrammarlyFix {
  id: string;
  originalText: string;
  suggestedText: string;
  textRange: { start: number; end: number };
  whyItHelpsATS?: string;
  whyItHelpsHR?: string;
  source: "ats" | "hr" | "both";
  category: string;
}

/** Score component breakdown for formula display */
export interface ScoreBreakdown {
  component: string;
  value: number;
  weight: number;
  contribution: number;
  description: string;
}

/** ATS category data for analysis panel */
export interface ATSCategoryData {
  id: string;
  title: string;
  icon: string;
  status: "pass" | "warning" | "fail";
  items: {
    id: string;
    label: string;
    status: "pass" | "warning" | "fail";
    value?: string | number;
    issue?: ATSIssue;
  }[];
}

/** HR category data for analysis panel */
export interface HRCategoryData {
  id: string;
  title: string;
  icon: string;
  status: "pass" | "warning" | "fail";
  items: {
    id: string;
    label: string;
    status: "pass" | "warning" | "fail";
    value?: string | number;
    feedback?: HRFeedback;
  }[];
}

export const FORMAT_METADATA: Record<ResumeFormatId, FormatMetadata> = {
  classic: {
    id: "classic",
    name: "Classic",
    description: "Traditional serif fonts with underlined headers",
    bestFor: ["Finance", "Law", "Healthcare", "Government"],
    fontFamily: "Times New Roman, serif",
  },
  modern: {
    id: "modern",
    name: "Modern",
    description: "Clean sans-serif with subtle color accents",
    bestFor: ["Tech", "Marketing", "Startups", "Design"],
    fontFamily: "Inter, system-ui, sans-serif",
    colorAccent: "#2563eb",
  },
  minimalist: {
    id: "minimalist",
    name: "Minimalist",
    description: "Maximum whitespace with thin, elegant fonts",
    bestFor: ["Design", "Creative", "UX/UI", "Architecture"],
    fontFamily: "Helvetica Neue, Helvetica, sans-serif",
  },
  technical: {
    id: "technical",
    name: "Technical",
    description: "Monospace code sections with skill badges",
    bestFor: ["Engineering", "DevOps", "Data Science", "Research"],
    fontFamily: "JetBrains Mono, monospace",
    colorAccent: "#10b981",
  },
  executive: {
    id: "executive",
    name: "Executive",
    description: "Premium serif with understated elegance",
    bestFor: ["C-Suite", "Directors", "VP-level", "Board positions"],
    fontFamily: "Garamond, Georgia, serif",
  },
};
