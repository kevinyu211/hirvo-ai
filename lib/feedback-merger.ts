/**
 * Feedback Merger
 *
 * Merges ATS issues and HR feedback into section-specific feedback
 * for display in the new section-level feedback dropdowns.
 */

import type {
  ATSScore,
  ATSIssue,
  HRScore,
  HRFeedback,
  StructuredResume,
  FeedbackCategory,
  SectionFeedbackItem,
  MergedSectionFeedback,
  SectionAnalysis,
  GrammarlyFix,
  ATSCategoryData,
  HRCategoryData,
} from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import { getDetailedExplanation, getATSWhyItHelps, getHRWhyItHelps } from "./feedback-explanations";

/**
 * Section mapping for ATS issues based on type and content
 */
function mapATSIssueToSection(issue: ATSIssue): string {
  switch (issue.type) {
    case "formatting":
      // Formatting issues typically apply to contact or overall structure
      if (
        issue.message.toLowerCase().includes("email") ||
        issue.message.toLowerCase().includes("phone") ||
        issue.message.toLowerCase().includes("linkedin")
      ) {
        return "contact";
      }
      return "general";

    case "section":
      // Section issues might be about missing sections
      if (issue.message.toLowerCase().includes("summary")) {
        return "summary";
      }
      if (issue.message.toLowerCase().includes("experience")) {
        return "experience";
      }
      if (issue.message.toLowerCase().includes("education")) {
        return "education";
      }
      if (issue.message.toLowerCase().includes("skill")) {
        return "skills";
      }
      return "general";

    case "missing_keyword":
    case "weak_keyword":
      // Keyword issues typically relate to skills or experience
      if (
        issue.message.toLowerCase().includes("skill") ||
        issue.message.toLowerCase().includes("technical")
      ) {
        return "skills";
      }
      return "experience";

    default:
      return "general";
  }
}

/**
 * Map HR feedback to sections based on layer and content
 */
function mapHRFeedbackToSection(feedback: HRFeedback): string {
  const msg = feedback.message.toLowerCase();

  // Summary-related
  if (
    msg.includes("summary") ||
    msg.includes("objective") ||
    msg.includes("profile")
  ) {
    return "summary";
  }

  // Experience-related
  if (
    msg.includes("experience") ||
    msg.includes("achievement") ||
    msg.includes("bullet") ||
    msg.includes("quantif") ||
    msg.includes("metric") ||
    msg.includes("impact")
  ) {
    return "experience";
  }

  // Skills-related
  if (msg.includes("skill") || msg.includes("competenc")) {
    return "skills";
  }

  // Education-related
  if (
    msg.includes("education") ||
    msg.includes("degree") ||
    msg.includes("certif")
  ) {
    return "education";
  }

  // Contact-related
  if (
    msg.includes("contact") ||
    msg.includes("email") ||
    msg.includes("phone")
  ) {
    return "contact";
  }

  // Default based on layer
  switch (feedback.layer) {
    case 1: // Formatting layer
      return "general";
    case 2: // Semantic layer
      return "experience";
    case 3: // LLM review
      return "general";
    default:
      return "general";
  }
}

/**
 * Convert ATS issue type to feedback category
 */
function atsIssueToCategory(issue: ATSIssue): FeedbackCategory {
  switch (issue.type) {
    case "missing_keyword":
      return "keyword_missing";
    case "weak_keyword":
      return "keyword_match";
    case "formatting":
      return "formatting";
    case "section":
      return "section_structure";
    default:
      return "formatting";
  }
}

/**
 * Convert HR feedback type to feedback category
 */
function hrFeedbackToCategory(feedback: HRFeedback): FeedbackCategory {
  const msg = feedback.message.toLowerCase();

  // Check for specific content patterns
  if (msg.includes("quantif") || msg.includes("metric") || msg.includes("number")) {
    return "achievement";
  }
  if (msg.includes("narrative") || msg.includes("story") || msg.includes("flow")) {
    return "narrative";
  }
  if (msg.includes("relevant") || msg.includes("match") || msg.includes("align")) {
    return "relevance";
  }
  if (msg.includes("red flag") || msg.includes("gap") || msg.includes("concern")) {
    return "red_flag";
  }
  if (msg.includes("keyword") || msg.includes("skill")) {
    return "semantic_match";
  }

  // Default based on type
  switch (feedback.type) {
    case "formatting":
      return "formatting";
    case "semantic":
      return "semantic_match";
    case "llm_review":
      return "narrative";
    default:
      return "relevance";
  }
}

/**
 * Convert ATS issue to SectionFeedbackItem
 */
function convertATSIssue(issue: ATSIssue, index: number): SectionFeedbackItem {
  const category = atsIssueToCategory(issue);

  return {
    id: `ats-${index}`,
    source: "ats",
    category,
    severity: issue.severity,
    message: issue.message,
    detailedExplanation: getDetailedExplanation(category, issue.message, {
      source: "ats",
      suggestion: issue.suggestion,
    }),
    suggestion: issue.suggestion,
  };
}

/**
 * Convert HR feedback to SectionFeedbackItem
 */
function convertHRFeedback(
  feedback: HRFeedback,
  index: number
): SectionFeedbackItem {
  const category = hrFeedbackToCategory(feedback);

  return {
    id: `hr-${index}`,
    source: "hr",
    category,
    severity: feedback.severity,
    message: feedback.message,
    detailedExplanation: getDetailedExplanation(category, feedback.message, {
      source: "hr",
      layer: feedback.layer,
      suggestion: feedback.suggestion,
    }),
    suggestion: feedback.suggestion,
  };
}

/**
 * Derive section-level ATS score from issues
 */
function deriveATSSectionScore(
  sectionKey: string,
  issues: SectionFeedbackItem[],
  overallScore: number
): number {
  if (issues.length === 0) {
    return Math.min(100, overallScore + 10);
  }

  // Calculate penalty based on issue severity
  let penalty = 0;
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical":
        penalty += 15;
        break;
      case "warning":
        penalty += 8;
        break;
      case "info":
        penalty += 3;
        break;
    }
  }

  return Math.max(0, Math.min(100, overallScore - penalty + 5));
}

/**
 * Derive section-level HR score from feedback
 */
function deriveHRSectionScore(
  sectionKey: string,
  feedback: SectionFeedbackItem[],
  overallScore: number
): number {
  if (feedback.length === 0) {
    return Math.min(100, overallScore + 10);
  }

  // Calculate penalty based on feedback severity
  let penalty = 0;
  for (const item of feedback) {
    switch (item.severity) {
      case "critical":
        penalty += 12;
        break;
      case "warning":
        penalty += 6;
        break;
      case "info":
        penalty += 2;
        break;
    }
  }

  return Math.max(0, Math.min(100, overallScore - penalty + 5));
}

/**
 * Main function to merge ATS and HR feedback into section-level feedback
 */
export function mergeSectionFeedback(
  resume: StructuredResume | null,
  atsScore: ATSScore | null,
  hrScore: HRScore | null,
  hrLayers?: HRLayerData
): Map<string, MergedSectionFeedback> {
  const feedbackMap = new Map<string, MergedSectionFeedback>();

  // Initialize sections based on resume structure
  const sectionKeys = [
    "contact",
    "summary",
    "skills",
    "education",
    "general",
  ];

  // Add experience entries as separate sections
  if (resume?.experience) {
    for (const exp of resume.experience) {
      sectionKeys.push(`experience-${exp.id}`);
    }
  } else {
    sectionKeys.push("experience");
  }

  // Initialize empty feedback for all sections
  for (const key of sectionKeys) {
    const sectionName = key.startsWith("experience-")
      ? `Experience`
      : key.charAt(0).toUpperCase() + key.slice(1);

    feedbackMap.set(key, {
      sectionName,
      sectionKey: key,
      atsScore: atsScore?.overall ?? 0,
      hrScore: hrScore?.overall ?? 0,
      atsItems: [],
      hrItems: [],
    });
  }

  // Map ATS issues to sections
  if (atsScore?.issues) {
    for (let i = 0; i < atsScore.issues.length; i++) {
      const issue = atsScore.issues[i];
      let sectionKey = mapATSIssueToSection(issue);

      // If it's an experience issue and we have structured resume, try to map to specific entry
      if (sectionKey === "experience" && resume?.experience?.length) {
        // Default to first experience entry for now
        sectionKey = `experience-${resume.experience[0].id}`;
      }

      const section = feedbackMap.get(sectionKey);
      if (section) {
        section.atsItems.push(convertATSIssue(issue, i));
      } else {
        // Fall back to general section
        const general = feedbackMap.get("general");
        if (general) {
          general.atsItems.push(convertATSIssue(issue, i));
        }
      }
    }
  }

  // Map HR feedback to sections
  if (hrScore?.feedback) {
    for (let i = 0; i < hrScore.feedback.length; i++) {
      const feedback = hrScore.feedback[i];
      let sectionKey = mapHRFeedbackToSection(feedback);

      // If it's an experience issue and we have structured resume, try to map to specific entry
      if (sectionKey === "experience" && resume?.experience?.length) {
        // Default to first experience entry for now
        sectionKey = `experience-${resume.experience[0].id}`;
      }

      const section = feedbackMap.get(sectionKey);
      if (section) {
        section.hrItems.push(convertHRFeedback(feedback, i));
      } else {
        // Fall back to general section
        const general = feedbackMap.get("general");
        if (general) {
          general.hrItems.push(convertHRFeedback(feedback, i));
        }
      }
    }
  }

  // Calculate section-level scores
  feedbackMap.forEach((section, key) => {
    section.atsScore = deriveATSSectionScore(
      key,
      section.atsItems,
      atsScore?.overall ?? 0
    );
    section.hrScore = deriveHRSectionScore(
      key,
      section.hrItems,
      hrScore?.overall ?? 0
    );
  });

  return feedbackMap;
}

/**
 * Get feedback for a specific experience entry
 */
export function getExperienceFeedback(
  experienceId: string,
  feedbackMap: Map<string, MergedSectionFeedback>
): MergedSectionFeedback | undefined {
  return feedbackMap.get(`experience-${experienceId}`);
}

/**
 * Get all feedback items sorted by severity
 */
export function getAllFeedbackSorted(
  feedbackMap: Map<string, MergedSectionFeedback>
): SectionFeedbackItem[] {
  const allItems: SectionFeedbackItem[] = [];

  feedbackMap.forEach((section) => {
    allItems.push(...section.atsItems, ...section.hrItems);
  });

  const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
  return allItems.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}

/**
 * Count total issues by severity
 */
export function countIssuesBySeverity(
  feedbackMap: Map<string, MergedSectionFeedback>
): Record<string, number> {
  const counts: Record<string, number> = {
    critical: 0,
    warning: 0,
    info: 0,
    success: 0,
  };

  feedbackMap.forEach((section) => {
    [...section.atsItems, ...section.hrItems].forEach((item) => {
      counts[item.severity]++;
    });
  });

  return counts;
}

// =============================================================================
// Section Analysis Generation
// =============================================================================

/**
 * Generate section-specific analysis with all categories
 */
export function generateSectionAnalysis(
  sectionName: string,
  sectionContent: string,
  atsScore: ATSScore,
  hrScore: HRScore
): SectionAnalysis {
  const sectionKey = sectionName.toLowerCase().replace(/\s+/g, "-");

  // Filter ATS issues relevant to this section
  const sectionAtsIssues = atsScore.issues.filter((issue) => {
    const mappedSection = mapATSIssueToSection(issue);
    return mappedSection === sectionKey || mappedSection === "general";
  });

  // Filter HR feedback relevant to this section
  const sectionHrFormatting = hrScore.feedback.filter(
    (f) => f.layer === 1 && mapHRFeedbackToSection(f) === sectionKey
  );
  const sectionHrLlm = hrScore.feedback.filter(
    (f) => f.layer === 3 && mapHRFeedbackToSection(f) === sectionKey
  );

  // Get matched/missing keywords relevant to section
  const sectionKeywordsMatched = atsScore.matchedKeywords.filter((kw) =>
    sectionContent.toLowerCase().includes(kw.toLowerCase())
  );
  const sectionKeywordsMissing = atsScore.missingKeywords;

  return {
    sectionName,
    sectionKey,
    sectionContent,
    ats: {
      score: atsScore.overall,
      keywords: {
        matched: sectionKeywordsMatched,
        missing: sectionKeywordsMissing,
      },
      formatting: sectionAtsIssues.filter((i) => i.type === "formatting"),
      sections: [], // Will be populated at document level
    },
    hr: {
      score: hrScore.overall,
      formatting: sectionHrFormatting,
      semantic: {
        skills: hrScore.semanticScore * 0.4,
        experience: hrScore.semanticScore * 0.35,
        overall: hrScore.semanticScore * 0.25,
      },
      llmReview: sectionHrLlm,
    },
  };
}

/**
 * Generate ATS categories for the analysis panel
 */
export function generateATSCategories(
  atsScore: ATSScore,
  sectionContent?: string
): ATSCategoryData[] {
  const categories: ATSCategoryData[] = [];

  // Keywords category
  const keywordItems: ATSCategoryData["items"] = [];

  // Add matched keywords
  atsScore.matchedKeywords.forEach((kw, i) => {
    keywordItems.push({
      id: `kw-match-${i}`,
      label: kw,
      status: "pass",
      value: "matched",
    });
  });

  // Add missing keywords
  atsScore.missingKeywords.forEach((kw, i) => {
    const issue = atsScore.issues.find(
      (issue) =>
        issue.type === "missing_keyword" &&
        issue.message.toLowerCase().includes(kw.toLowerCase())
    );
    keywordItems.push({
      id: `kw-miss-${i}`,
      label: kw,
      status: "fail",
      value: "missing",
      issue,
    });
  });

  const keywordStatus: "pass" | "warning" | "fail" =
    atsScore.keywordMatchPct >= 80
      ? "pass"
      : atsScore.keywordMatchPct >= 60
        ? "warning"
        : "fail";

  categories.push({
    id: "keywords",
    title: "Keywords",
    icon: "Search",
    status: keywordStatus,
    items: keywordItems,
  });

  // Formatting category
  const formattingIssues = atsScore.issues.filter((i) => i.type === "formatting");
  const formattingItems: ATSCategoryData["items"] = [
    {
      id: "fmt-contact",
      label: "Contact Info",
      status: formattingIssues.some((i) =>
        i.message.toLowerCase().includes("contact") ||
        i.message.toLowerCase().includes("email") ||
        i.message.toLowerCase().includes("phone")
      )
        ? "warning"
        : "pass",
    },
    {
      id: "fmt-table",
      label: "Table Layout",
      status: formattingIssues.some((i) => i.message.toLowerCase().includes("table"))
        ? "fail"
        : "pass",
    },
    {
      id: "fmt-column",
      label: "Multi-Column",
      status: formattingIssues.some((i) => i.message.toLowerCase().includes("column"))
        ? "fail"
        : "pass",
    },
    {
      id: "fmt-date",
      label: "Date Consistency",
      status: formattingIssues.some((i) => i.message.toLowerCase().includes("date"))
        ? "warning"
        : "pass",
    },
    {
      id: "fmt-special",
      label: "Special Characters",
      status: formattingIssues.some((i) =>
        i.message.toLowerCase().includes("special") ||
        i.message.toLowerCase().includes("unicode")
      )
        ? "warning"
        : "pass",
    },
    {
      id: "fmt-length",
      label: "Resume Length",
      status: formattingIssues.some((i) =>
        i.message.toLowerCase().includes("length") ||
        i.message.toLowerCase().includes("page")
      )
        ? "warning"
        : "pass",
    },
  ];

  // Attach issues to relevant items
  formattingItems.forEach((item) => {
    const relatedIssue = formattingIssues.find((issue) => {
      const msg = issue.message.toLowerCase();
      const label = item.label.toLowerCase();
      return msg.includes(label.split(" ")[0]) ||
        (label === "Contact Info" && (msg.includes("contact") || msg.includes("email") || msg.includes("phone"))) ||
        (label === "Table Layout" && msg.includes("table")) ||
        (label === "Multi-Column" && msg.includes("column")) ||
        (label === "Date Consistency" && msg.includes("date")) ||
        (label === "Special Characters" && (msg.includes("special") || msg.includes("unicode"))) ||
        (label === "Resume Length" && (msg.includes("length") || msg.includes("page")));
    });
    if (relatedIssue) {
      item.issue = relatedIssue;
    }
  });

  const formattingStatus: "pass" | "warning" | "fail" =
    atsScore.formattingScore >= 80
      ? "pass"
      : atsScore.formattingScore >= 60
        ? "warning"
        : "fail";

  categories.push({
    id: "formatting",
    title: "Formatting",
    icon: "FileText",
    status: formattingStatus,
    items: formattingItems,
  });

  // Section Validation category
  const sectionIssues = atsScore.issues.filter((i) => i.type === "section");
  const sectionItems: ATSCategoryData["items"] = [
    {
      id: "sec-contact",
      label: "Contact",
      status: sectionIssues.some((i) => i.message.toLowerCase().includes("contact"))
        ? "fail"
        : "pass",
    },
    {
      id: "sec-summary",
      label: "Summary",
      status: sectionIssues.some((i) => i.message.toLowerCase().includes("summary"))
        ? "warning"
        : "pass",
    },
    {
      id: "sec-experience",
      label: "Experience",
      status: sectionIssues.some((i) => i.message.toLowerCase().includes("experience"))
        ? "fail"
        : "pass",
    },
    {
      id: "sec-education",
      label: "Education",
      status: sectionIssues.some((i) => i.message.toLowerCase().includes("education"))
        ? "warning"
        : "pass",
    },
    {
      id: "sec-skills",
      label: "Skills",
      status: sectionIssues.some((i) => i.message.toLowerCase().includes("skill"))
        ? "warning"
        : "pass",
    },
  ];

  // Attach issues
  sectionItems.forEach((item) => {
    const relatedIssue = sectionIssues.find((issue) =>
      issue.message.toLowerCase().includes(item.label.toLowerCase())
    );
    if (relatedIssue) {
      item.issue = relatedIssue;
    }
  });

  const sectionStatus: "pass" | "warning" | "fail" =
    atsScore.sectionScore >= 80
      ? "pass"
      : atsScore.sectionScore >= 60
        ? "warning"
        : "fail";

  categories.push({
    id: "sections",
    title: "Section Validation",
    icon: "LayoutList",
    status: sectionStatus,
    items: sectionItems,
  });

  return categories;
}

/**
 * Generate HR categories for the analysis panel
 */
export function generateHRCategories(
  hrScore: HRScore
): HRCategoryData[] {
  const categories: HRCategoryData[] = [];

  // Layer 1: Formatting Database
  const formattingFeedback = hrScore.feedback.filter((f) => f.layer === 1);
  const formattingItems: HRCategoryData["items"] = [
    {
      id: "hr-page",
      label: "Page Count",
      status: formattingFeedback.some((f) => f.message.toLowerCase().includes("page"))
        ? (formattingFeedback.find((f) => f.message.toLowerCase().includes("page"))?.severity === "critical" ? "fail" : "warning")
        : "pass",
    },
    {
      id: "hr-summary",
      label: "Summary Section",
      status: formattingFeedback.some((f) => f.message.toLowerCase().includes("summary"))
        ? "warning"
        : "pass",
    },
    {
      id: "hr-headings",
      label: "Heading Consistency",
      status: formattingFeedback.some((f) => f.message.toLowerCase().includes("heading"))
        ? "warning"
        : "pass",
    },
    {
      id: "hr-dates",
      label: "Date Format",
      status: formattingFeedback.some((f) => f.message.toLowerCase().includes("date"))
        ? "warning"
        : "pass",
    },
    {
      id: "hr-metrics",
      label: "Quantified Metrics",
      status: formattingFeedback.some((f) =>
        f.message.toLowerCase().includes("quantif") ||
        f.message.toLowerCase().includes("metric") ||
        f.message.toLowerCase().includes("number")
      )
        ? "fail"
        : "pass",
    },
    {
      id: "hr-bullets",
      label: "Bullet Points",
      status: formattingFeedback.some((f) => f.message.toLowerCase().includes("bullet"))
        ? "warning"
        : "pass",
    },
    {
      id: "hr-order",
      label: "Section Order",
      status: formattingFeedback.some((f) => f.message.toLowerCase().includes("order"))
        ? "warning"
        : "pass",
    },
  ];

  // Attach feedback to items
  formattingItems.forEach((item) => {
    const relatedFeedback = formattingFeedback.find((f) => {
      const msg = f.message.toLowerCase();
      const label = item.label.toLowerCase().split(" ")[0];
      return msg.includes(label);
    });
    if (relatedFeedback) {
      item.feedback = relatedFeedback;
    }
  });

  const formattingStatus: "pass" | "warning" | "fail" =
    hrScore.formattingScore >= 80
      ? "pass"
      : hrScore.formattingScore >= 60
        ? "warning"
        : "fail";

  categories.push({
    id: "formatting-db",
    title: "Formatting Database",
    icon: "Database",
    status: formattingStatus,
    items: formattingItems,
  });

  // Layer 2: Semantic Embeddings
  const semanticItems: HRCategoryData["items"] = [
    {
      id: "sem-skills",
      label: "Skills Similarity",
      status: hrScore.semanticScore * 0.4 >= 32 ? "pass" : hrScore.semanticScore * 0.4 >= 24 ? "warning" : "fail",
      value: `${Math.round(hrScore.semanticScore * 0.4 / 0.4)}%`,
    },
    {
      id: "sem-exp",
      label: "Experience Match",
      status: hrScore.semanticScore * 0.35 >= 28 ? "pass" : hrScore.semanticScore * 0.35 >= 21 ? "warning" : "fail",
      value: `${Math.round(hrScore.semanticScore * 0.35 / 0.35)}%`,
    },
    {
      id: "sem-overall",
      label: "Overall Relevance",
      status: hrScore.semanticScore >= 80 ? "pass" : hrScore.semanticScore >= 60 ? "warning" : "fail",
      value: `${Math.round(hrScore.semanticScore)}%`,
    },
  ];

  const semanticStatus: "pass" | "warning" | "fail" =
    hrScore.semanticScore >= 80
      ? "pass"
      : hrScore.semanticScore >= 60
        ? "warning"
        : "fail";

  categories.push({
    id: "semantic",
    title: "Semantic Embeddings",
    icon: "Brain",
    status: semanticStatus,
    items: semanticItems,
  });

  // Layer 3: HR Review Comments
  const llmFeedback = hrScore.feedback.filter((f) => f.layer === 3);
  const llmItems: HRCategoryData["items"] = [
    {
      id: "llm-narrative",
      label: "Career Narrative",
      status: llmFeedback.some((f) => f.message.toLowerCase().includes("narrative"))
        ? (llmFeedback.find((f) => f.message.toLowerCase().includes("narrative"))?.severity === "critical" ? "fail" : "warning")
        : "pass",
    },
    {
      id: "llm-achievement",
      label: "Achievement Strength",
      status: llmFeedback.some((f) => f.message.toLowerCase().includes("achievement"))
        ? (llmFeedback.find((f) => f.message.toLowerCase().includes("achievement"))?.severity === "critical" ? "fail" : "warning")
        : "pass",
    },
    {
      id: "llm-relevance",
      label: "Role Relevance",
      status: llmFeedback.some((f) => f.message.toLowerCase().includes("relevan"))
        ? "warning"
        : "pass",
    },
    {
      id: "llm-redflags",
      label: "Red Flags",
      status: llmFeedback.some((f) =>
        f.message.toLowerCase().includes("red flag") ||
        f.message.toLowerCase().includes("gap") ||
        f.message.toLowerCase().includes("concern")
      )
        ? "fail"
        : "pass",
      value: llmFeedback.filter((f) =>
        f.message.toLowerCase().includes("red flag") ||
        f.message.toLowerCase().includes("gap") ||
        f.severity === "critical"
      ).length.toString(),
    },
  ];

  // Attach feedback to items
  llmItems.forEach((item) => {
    const relatedFeedback = llmFeedback.find((f) => {
      const msg = f.message.toLowerCase();
      const label = item.label.toLowerCase().split(" ")[0];
      if (item.id === "llm-redflags") {
        return msg.includes("red flag") || msg.includes("gap") || f.severity === "critical";
      }
      return msg.includes(label);
    });
    if (relatedFeedback) {
      item.feedback = relatedFeedback;
    }
  });

  const llmStatus: "pass" | "warning" | "fail" =
    hrScore.llmScore >= 80
      ? "pass"
      : hrScore.llmScore >= 60
        ? "warning"
        : "fail";

  categories.push({
    id: "llm-review",
    title: "HR Review Comments",
    icon: "MessageSquare",
    status: llmStatus,
    items: llmItems,
  });

  return categories;
}

/**
 * Generate Grammarly-style fix suggestions for a specific issue
 */
export function generateGrammarlyFix(
  issue: ATSIssue | HRFeedback,
  sectionContent: string,
  source: "ats" | "hr"
): GrammarlyFix | null {
  // Only generate fix if there's a suggestion and textRange
  if (!issue.suggestion) {
    return null;
  }

  const id = `fix-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const textRange = issue.textRange || { start: 0, end: 0 };

  // Get the original text if textRange is valid
  const originalText =
    textRange.start !== textRange.end
      ? sectionContent.slice(textRange.start, textRange.end)
      : "";

  // Determine category
  const category =
    source === "ats"
      ? (issue as ATSIssue).type
      : (issue as HRFeedback).type;

  // Get why it helps explanations
  const whyItHelpsATS =
    source === "ats"
      ? getATSWhyItHelps((issue as ATSIssue).type || category, issue.message)
      : undefined;

  const whyItHelpsHR =
    source === "hr"
      ? getHRWhyItHelps((issue as HRFeedback).type || category, issue.message)
      : undefined;

  return {
    id,
    originalText,
    suggestedText: issue.suggestion,
    textRange,
    whyItHelpsATS,
    whyItHelpsHR,
    source,
    category,
  };
}
