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
