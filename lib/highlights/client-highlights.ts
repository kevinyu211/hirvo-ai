/**
 * Client-side Highlight Generation
 *
 * Converts MergedSectionFeedback items into Highlight[] format for IssuePanel compatibility.
 * This bridges the existing section feedback system with the Grammarly-style issue panel.
 */

import type {
  ATSScore,
  HRScore,
  ATSIssue,
  HRFeedback,
  StructuredResume,
  MergedSectionFeedback,
  SectionFeedbackItem,
  Suggestion,
} from "@/lib/types";
import type {
  Highlight,
  HighlightAffects,
  HighlightSeverity,
} from "@/lib/types/resume-doc";
import { getDetailedExplanation } from "@/lib/feedback-explanations";

// =============================================================================
// Suggestion to Highlight Conversion
// =============================================================================

/**
 * Truncate text for display, adding ellipsis if needed
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Convert Suggestion[] from /api/optimize into Highlight[] format.
 * These suggestions have CORRECT character positions from the API.
 *
 * @param suggestions - Array of suggestions from /api/optimize endpoint
 * @returns Array of Highlight objects with proper positions for visual highlighting
 */
export function suggestionsToHighlights(suggestions: Suggestion[]): Highlight[] {
  const now = new Date().toISOString();

  // Don't filter by textRange - suggestions have originalText which is used for inline matching
  // in getHighlightsForField(). The textRange is only used for the fix_action positioning.
  return suggestions.map((s, index) => {
      // Determine the affects category based on suggestion type
      const affects: HighlightAffects =
        s.type === "ats" ? "ATS" : "HR_APPEAL";

      // Create fix action for exact replacement
      const fixAction = s.suggestedText
        ? {
            type: "replace_text" as const,
            block_id: `suggestion-${s.id}`, // Will be resolved to actual block on apply
            start: s.textRange.start,
            end: s.textRange.end,
            new_text: s.suggestedText,
          }
        : undefined;

      // Generate a better issue title for semantic matches
      const issueTitle = s.semanticMatch && s.targetKeyword
        ? `Expand "${s.matchedSynonym || s.originalText}" to "${s.targetKeyword}"`
        : `${formatCategory(s.category)}: "${truncateText(s.originalText, 40)}"`;

      // Generate default impact explanations if not provided
      const defaultAtsImpact = s.semanticMatch && s.targetKeyword
        ? `ATS keyword matching requires exact phrase "${s.targetKeyword}" - abbreviation will not be indexed`
        : s.type === "ats"
          ? "Fixing this will improve your ATS keyword match score"
          : "This change may also improve ATS parsing";

      const defaultHrImpact = s.semanticMatch && s.targetKeyword
        ? `Standard terminology "${s.targetKeyword}" is clearer for recruiters scanning resumes quickly`
        : s.type === "hr"
          ? "Fixing this will improve how recruiters perceive your resume"
          : "Clearer terminology helps recruiters identify relevant skills";

      return {
        id: `suggestion-${s.id}`,
        version_id: "client-generated",
        block_id: `block-${s.category}-${index}`, // Generic block ID
        char_start: s.textRange.start, // CORRECT positions from API
        char_end: s.textRange.end,
        rule_id: `${s.type.toUpperCase()}_${s.category.toUpperCase().replace(/\s+/g, "_")}`,
        status: "OPEN" as const,
        severity: s.severity,
        affects,
        source: s.type,
        issue_title: issueTitle,
        issue_description: s.reasoning,
        impact_explanation:
          s.type === "ats"
            ? "Fixing this will improve your ATS keyword match score."
            : "Fixing this will improve how recruiters perceive your resume.",
        suggested_fix_text: s.suggestedText, // EXACT replacement text
        original_text: s.originalText, // Store original for before/after display
        fix_action: fixAction,
        // Semantic matching fields
        semantic_match: s.semanticMatch,
        target_keyword: s.targetKeyword,
        matched_synonym: s.matchedSynonym,
        // Impact explanations - use API-provided values or generate defaults
        ats_impact: s.atsImpact || defaultAtsImpact,
        hr_impact: s.hrImpact || defaultHrImpact,
        fit_impact: s.targetKeyword
          ? `Better alignment with job requirement for "${s.targetKeyword}"`
          : "Improved alignment with job description requirements",
        priority_order: s.severity === "critical" ? 0 : s.severity === "warning" ? 100 : 200,
        created_at: now,
        updated_at: now,
      };
    });
}

/**
 * Format category name for display
 */
function formatCategory(category: string): string {
  const categoryNames: Record<string, string> = {
    missing_keyword: "Missing Keyword",
    weak_keyword: "Weak Keyword",
    formatting: "Formatting",
    section: "Section Issue",
    semantic: "Semantic",
    llm_review: "HR Review",
  };
  return categoryNames[category] || category.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a unique client-side highlight ID
 */
function generateClientHighlightId(
  source: "ats" | "hr",
  sectionKey: string,
  index: number
): string {
  return `client-${source}-${sectionKey}-${index}`;
}

/**
 * Generate a block ID from section key and item index
 */
function generateBlockIdFromSection(
  sectionKey: string,
  itemIndex: number
): string {
  // Convert section key to block-style ID
  // e.g., "experience-section-exp-0" -> "block-exp-0-bullet-0"
  if (sectionKey.startsWith("experience-")) {
    const expId = sectionKey.replace("experience-", "");
    return `block-exp-${expId}-bullet-${itemIndex}`;
  }
  if (sectionKey === "summary") {
    return "block-summary-0-paragraph-0";
  }
  if (sectionKey === "skills") {
    return `block-skills-0-group-${itemIndex}`;
  }
  if (sectionKey === "education") {
    return `block-edu-0-bullet-${itemIndex}`;
  }
  if (sectionKey === "contact") {
    return `block-contact-0-field-${itemIndex}`;
  }
  // Default
  return `block-${sectionKey}-0-item-${itemIndex}`;
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Map SectionFeedbackItem source to HighlightAffects
 */
function sourceToAffects(item: SectionFeedbackItem): HighlightAffects {
  if (item.source === "ats") {
    // ATS issues primarily affect ATS searchability
    if (item.category === "formatting" || item.category === "section_structure") {
      return "FORMAT";
    }
    return "ATS";
  } else {
    // HR issues affect human appeal or content
    if (item.category === "red_flag") {
      return "ELIGIBILITY";
    }
    if (item.category === "semantic_match") {
      return "SEMANTIC";
    }
    return "HR_APPEAL";
  }
}

/**
 * Convert severity from SectionFeedbackItem to HighlightSeverity
 */
function convertSeverity(
  severity: SectionFeedbackItem["severity"]
): HighlightSeverity {
  if (severity === "success") {
    return "info"; // Success items don't really need highlighting
  }
  return severity;
}

/**
 * Generate a concise impact explanation
 */
function generateImpactExplanation(item: SectionFeedbackItem): string {
  if (item.source === "ats") {
    switch (item.category) {
      case "keyword_missing":
        return "ATS systems scan for exact keyword matches. Missing this keyword reduces your visibility.";
      case "keyword_match":
        return "Weak keyword placement. Keywords in experience bullets carry more weight than skills lists.";
      case "formatting":
        return "Formatting issues can cause ATS parsers to misread or skip content.";
      case "section_structure":
        return "ATS systems expect standard section headers for proper categorization.";
      default:
        return "This affects how ATS systems process your resume.";
    }
  } else {
    switch (item.category) {
      case "achievement":
        return "Quantified achievements catch recruiter attention 40% faster than generic descriptions.";
      case "narrative":
        return "A clear career narrative helps recruiters understand your trajectory.";
      case "relevance":
        return "Content relevance directly impacts whether recruiters continue reading.";
      case "red_flag":
        return "This may raise concerns during human review.";
      case "semantic_match":
        return "Your content may not semantically align with job requirements.";
      default:
        return "This affects how recruiters perceive your resume.";
    }
  }
}

/**
 * Generate actionable suggested fix text
 * This converts generic advice into specific action items
 */
function generateActionableFix(item: SectionFeedbackItem): string | undefined {
  const { category, message, suggestion } = item;

  // If there's already a specific suggestion, use it
  if (suggestion && !suggestion.toLowerCase().includes("add") && suggestion.length < 100) {
    return suggestion;
  }

  // Extract keyword from message if it's a keyword issue
  const keywordMatch = message.match(/keyword[:\s]+["']?([^"'\.,]+)["']?/i) ||
                       message.match(/missing[:\s]+["']?([^"'\.,]+)["']?/i) ||
                       message.match(/"([^"]+)"/);
  const keyword = keywordMatch?.[1]?.trim();

  if (item.source === "ats") {
    switch (category) {
      case "keyword_missing":
        if (keyword) {
          return `Add "${keyword}" to your experience section with context showing how you've used it. Example: "Utilized ${keyword} to..."`;
        }
        return suggestion || "Add the missing keyword to your experience bullets with context.";

      case "keyword_match":
        if (keyword) {
          return `Move "${keyword}" from skills to an experience bullet showing practical application.`;
        }
        return "Demonstrate this skill in your experience section, not just skills list.";

      case "formatting":
        if (message.toLowerCase().includes("email")) {
          return "Add your email address at the top: yourname@email.com";
        }
        if (message.toLowerCase().includes("phone")) {
          return "Add your phone number: (555) 123-4567";
        }
        if (message.toLowerCase().includes("date")) {
          return "Use consistent date format throughout: 'Month YYYY' (e.g., January 2024)";
        }
        return suggestion || "Fix the formatting issue for better ATS parsing.";

      case "section_structure":
        return suggestion || "Add a clearly labeled section header.";

      default:
        return suggestion;
    }
  } else {
    switch (category) {
      case "achievement":
        return "Add specific metrics: numbers, percentages, or dollar amounts. Example: 'Increased X by 25%' or 'Managed team of 5'";

      case "narrative":
        return "Show career progression with clear role transitions and growth.";

      case "relevance":
        return "Highlight experience that directly relates to the target role requirements.";

      case "red_flag":
        return suggestion || "Address this concern by providing context or explanation.";

      case "semantic_match":
        return suggestion || "Align your language with the job description terminology.";

      default:
        return suggestion;
    }
  }
}

/**
 * Convert a single SectionFeedbackItem to a Highlight
 */
function feedbackItemToHighlight(
  item: SectionFeedbackItem,
  sectionKey: string,
  index: number
): Highlight {
  const now = new Date().toISOString();

  // Generate actionable fix text
  const actionableFix = generateActionableFix(item);

  return {
    id: generateClientHighlightId(item.source, sectionKey, index),
    version_id: "client-generated", // Client-side highlights don't have real version IDs
    block_id: generateBlockIdFromSection(sectionKey, index),
    char_start: 0, // Client-side highlights don't have precise positions
    char_end: 0,
    rule_id: `${item.source.toUpperCase()}_${item.category.toUpperCase()}`,
    status: "OPEN",
    severity: convertSeverity(item.severity),
    affects: sourceToAffects(item),
    source: item.source,
    issue_title: item.message,
    issue_description: item.detailedExplanation || item.message,
    impact_explanation: generateImpactExplanation(item),
    suggested_fix_text: actionableFix,
    priority_order: item.severity === "critical" ? 0 : item.severity === "warning" ? 100 : 200,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Convert all section feedback into Highlight[] format
 * This is the main function used to bridge section feedback to IssuePanel
 */
export function feedbackToHighlights(
  sectionFeedback: Map<string, MergedSectionFeedback>
): Highlight[] {
  const highlights: Highlight[] = [];
  let globalIndex = 0;

  sectionFeedback.forEach((section, sectionKey) => {
    // Convert ATS items
    section.atsItems.forEach((item, itemIndex) => {
      highlights.push(
        feedbackItemToHighlight(item, sectionKey, globalIndex++)
      );
    });

    // Convert HR items
    section.hrItems.forEach((item, itemIndex) => {
      highlights.push(
        feedbackItemToHighlight(item, sectionKey, globalIndex++)
      );
    });
  });

  // Sort by priority (critical first)
  return highlights.sort((a, b) => a.priority_order - b.priority_order);
}

/**
 * Create a Highlight from an ATSIssue directly
 */
export function atsIssueToHighlight(
  issue: ATSIssue,
  sectionKey: string,
  index: number
): Highlight {
  const now = new Date().toISOString();

  const category = issue.type === "missing_keyword" ? "keyword_missing" :
                   issue.type === "weak_keyword" ? "keyword_match" :
                   issue.type === "formatting" ? "formatting" : "section_structure";

  // Create a SectionFeedbackItem-like object to get actionable fix
  const feedbackItem: SectionFeedbackItem = {
    id: `ats-${index}`,
    source: "ats",
    category,
    severity: issue.severity,
    message: issue.message,
    detailedExplanation: "",
    suggestion: issue.suggestion,
  };

  const actionableFix = generateActionableFix(feedbackItem);

  return {
    id: generateClientHighlightId("ats", sectionKey, index),
    version_id: "client-generated",
    block_id: generateBlockIdFromSection(sectionKey, index),
    char_start: issue.textRange?.start ?? 0,
    char_end: issue.textRange?.end ?? 0,
    rule_id: `ATS_${issue.type.toUpperCase()}`,
    status: "OPEN",
    severity: issue.severity,
    affects: issue.type === "formatting" ? "FORMAT" : "ATS",
    source: "ats",
    issue_title: issue.message,
    issue_description: getDetailedExplanation(
      category,
      issue.message,
      { source: "ats", suggestion: issue.suggestion }
    ),
    impact_explanation: generateImpactExplanation(feedbackItem),
    suggested_fix_text: actionableFix,
    priority_order: issue.severity === "critical" ? 0 : issue.severity === "warning" ? 100 : 200,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Create a Highlight from an HRFeedback directly
 */
export function hrFeedbackToHighlight(
  feedback: HRFeedback,
  sectionKey: string,
  index: number
): Highlight {
  const now = new Date().toISOString();

  // Map HR feedback type to category
  const category = feedback.type === "formatting" ? "formatting" :
                   feedback.type === "semantic" ? "semantic_match" : "narrative";

  // Determine the proper FeedbackCategory for the function
  const feedbackCategory = feedback.message.toLowerCase().includes("quantif") ||
                           feedback.message.toLowerCase().includes("metric") ? "achievement" :
                           feedback.message.toLowerCase().includes("red flag") ? "red_flag" :
                           feedback.message.toLowerCase().includes("relevan") ? "relevance" :
                           category as "narrative" | "semantic_match" | "formatting";

  // Create a SectionFeedbackItem-like object to get actionable fix
  const feedbackItem: SectionFeedbackItem = {
    id: `hr-${index}`,
    source: "hr",
    category: feedbackCategory,
    severity: feedback.severity,
    message: feedback.message,
    detailedExplanation: "",
    suggestion: feedback.suggestion,
  };

  const actionableFix = generateActionableFix(feedbackItem);

  return {
    id: generateClientHighlightId("hr", sectionKey, index),
    version_id: "client-generated",
    block_id: generateBlockIdFromSection(sectionKey, index),
    char_start: feedback.textRange?.start ?? 0,
    char_end: feedback.textRange?.end ?? 0,
    rule_id: `HR_${feedback.type.toUpperCase()}_L${feedback.layer}`,
    status: "OPEN",
    severity: feedback.severity,
    affects: feedback.message.toLowerCase().includes("red flag") ? "ELIGIBILITY" :
             feedback.type === "semantic" ? "SEMANTIC" : "HR_APPEAL",
    source: "hr",
    issue_title: feedback.message,
    issue_description: getDetailedExplanation(
      category,
      feedback.message,
      { source: "hr", layer: feedback.layer, suggestion: feedback.suggestion }
    ),
    impact_explanation: generateImpactExplanation(feedbackItem),
    suggested_fix_text: actionableFix,
    priority_order: feedback.severity === "critical" ? 0 : feedback.severity === "warning" ? 100 : 200,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Convert ATSScore and HRScore directly to highlights
 * Alternative to feedbackToHighlights when you have raw scores
 */
export function scoresToHighlights(
  atsScore: ATSScore | null,
  hrScore: HRScore | null
): Highlight[] {
  const highlights: Highlight[] = [];
  let index = 0;

  // Convert ATS issues
  if (atsScore?.issues) {
    atsScore.issues.forEach((issue) => {
      // Determine section based on issue type/message
      let sectionKey = "general";
      const msg = issue.message.toLowerCase();
      if (msg.includes("experience") || msg.includes("bullet")) {
        sectionKey = "experience";
      } else if (msg.includes("skill")) {
        sectionKey = "skills";
      } else if (msg.includes("summary")) {
        sectionKey = "summary";
      } else if (msg.includes("education")) {
        sectionKey = "education";
      } else if (msg.includes("contact") || msg.includes("email") || msg.includes("phone")) {
        sectionKey = "contact";
      }

      highlights.push(atsIssueToHighlight(issue, sectionKey, index++));
    });
  }

  // Convert HR feedback
  if (hrScore?.feedback) {
    hrScore.feedback.forEach((feedback) => {
      let sectionKey = "general";
      const msg = feedback.message.toLowerCase();
      if (msg.includes("experience") || msg.includes("achievement") || msg.includes("bullet")) {
        sectionKey = "experience";
      } else if (msg.includes("skill")) {
        sectionKey = "skills";
      } else if (msg.includes("summary")) {
        sectionKey = "summary";
      } else if (msg.includes("education")) {
        sectionKey = "education";
      }

      highlights.push(hrFeedbackToHighlight(feedback, sectionKey, index++));
    });
  }

  // Sort by priority
  return highlights.sort((a, b) => a.priority_order - b.priority_order);
}

/**
 * Find a highlight by its ID
 */
export function findHighlightById(
  highlights: Highlight[],
  id: string
): Highlight | null {
  return highlights.find((h) => h.id === id) || null;
}

/**
 * Get the section feedback item ID from a highlight ID
 * Returns the original item ID if the highlight was generated from feedback
 */
export function highlightToFeedbackId(highlightId: string): string | null {
  // Client highlight IDs are formatted as: client-{source}-{sectionKey}-{index}
  const match = highlightId.match(/^client-(ats|hr)-(.+)-(\d+)$/);
  if (match) {
    const [, source, , index] = match;
    return `${source}-${index}`;
  }
  return null;
}
