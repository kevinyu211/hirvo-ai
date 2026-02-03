/**
 * Feedback Explanations
 *
 * Provides detailed "Why this matters" explanations for each feedback
 * category to help users understand the importance of the issues.
 */

import type { FeedbackCategory } from "@/lib/types";

interface ExplanationContext {
  source: "ats" | "hr";
  layer?: 1 | 2 | 3;
  suggestion?: string;
}

/**
 * Base explanations for each feedback category
 */
const CATEGORY_EXPLANATIONS: Record<FeedbackCategory, string> = {
  keyword_match:
    "ATS systems use exact and semantic keyword matching to score resumes. Having the right keywords increases your match score and visibility to recruiters.",

  keyword_missing:
    "ATS systems filter resumes based on keyword presence. Research shows 75% of resumes are rejected by ATS before a human ever sees them. Missing key terms significantly reduces your chances.",

  formatting:
    "ATS parsers can misread complex formatting, causing your information to be incorrectly categorized or lost entirely. Clean, standard formatting ensures your content is properly extracted.",

  section_structure:
    "Recruiters and ATS systems expect standard resume sections. Missing or non-standard sections can confuse both automated systems and human reviewers, reducing your chances.",

  semantic_match:
    "Beyond exact keywords, modern ATS and HR systems analyze semantic relevance. Your experience should clearly connect to the job requirements through related terminology and concepts.",

  narrative:
    "Hiring managers spend an average of 7 seconds on initial resume review. A clear, compelling narrative helps them quickly understand your value proposition and career trajectory.",

  achievement:
    "Quantified achievements are 40% more memorable than generic descriptions. Numbers, percentages, and metrics prove your impact rather than just describing responsibilities.",

  relevance:
    "Tailoring your resume to each role dramatically increases callback rates. Irrelevant information dilutes your message and wastes precious space.",

  red_flag:
    "Certain patterns (gaps, frequent job changes, vague descriptions) can raise concerns for recruiters. Addressing these proactively increases your chances of getting an interview.",
};

/**
 * Additional context based on source and severity
 */
const SOURCE_CONTEXT: Record<string, string> = {
  ats_critical:
    "This issue may cause automatic rejection by ATS systems.",
  ats_warning:
    "This could lower your ATS score and reduce visibility.",
  ats_info:
    "Optimizing this can improve your keyword match percentage.",
  hr_critical:
    "Hiring managers are likely to flag this as a concern.",
  hr_warning:
    "This may negatively impact the recruiter's first impression.",
  hr_info:
    "Improving this would strengthen your candidacy.",
};

/**
 * Message-specific explanations for common issues
 */
const MESSAGE_PATTERNS: [RegExp, string][] = [
  // Keyword-related
  [
    /missing.*(keyword|skill|technology)/i,
    "The job description specifically mentions this skill. Including it (if you have it) significantly increases your match score.",
  ],
  [
    /weak verb|passive|helped|assisted|responsible/i,
    "Strong action verbs (Led, Developed, Increased) create a more impactful impression than passive or weak verbs.",
  ],

  // Quantification
  [
    /quantif|metric|number|percentage/i,
    "Quantified achievements are proven to be more memorable. Try adding specific numbers: revenue impact, team size, percentage improvements.",
  ],
  [
    /vague|generic|unclear/i,
    "Specific, concrete descriptions help recruiters understand your actual contributions versus generic responsibilities.",
  ],

  // Structure
  [
    /summary|objective|profile/i,
    "A professional summary is often the first thing recruiters read. Make it targeted and impactful.",
  ],
  [
    /bullet.*(long|short|count)/i,
    "Optimal bullet points are 1-2 lines each. 3-5 bullets per role is the sweet spot for readability.",
  ],

  // Experience
  [
    /gap|employment.*(gap|break)/i,
    "Employment gaps are common and explainable. Consider briefly addressing gaps or focusing on what you accomplished during that time.",
  ],
  [
    /job.*(hop|change|multiple)/i,
    "Multiple short tenures can raise questions. Focus on achievements and growth to demonstrate value.",
  ],

  // Formatting
  [
    /font|format|layout|design/i,
    "Clean, consistent formatting improves readability and ATS parsing. Stick to standard fonts and avoid complex layouts.",
  ],
  [
    /page.*(length|count|long)/i,
    "For most roles, a 1-2 page resume is ideal. Focus on the most relevant and recent experience.",
  ],
];

/**
 * Get a detailed explanation for a feedback item
 */
export function getDetailedExplanation(
  category: FeedbackCategory,
  message: string,
  context: ExplanationContext
): string {
  const parts: string[] = [];

  // Start with base category explanation
  parts.push(CATEGORY_EXPLANATIONS[category]);

  // Check for message-specific patterns
  for (const [pattern, explanation] of MESSAGE_PATTERNS) {
    if (pattern.test(message)) {
      parts.push(explanation);
      break; // Only add one pattern-specific explanation
    }
  }

  // Add source context for critical/warning issues
  const sourceKey = `${context.source}_${getSeverityFromMessage(message)}`;
  if (SOURCE_CONTEXT[sourceKey]) {
    parts.push(SOURCE_CONTEXT[sourceKey]);
  }

  return parts.join(" ");
}

/**
 * Infer severity from message content when not explicitly provided
 */
function getSeverityFromMessage(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("missing") ||
    lower.includes("critical") ||
    lower.includes("required") ||
    lower.includes("must")
  ) {
    return "critical";
  }

  if (
    lower.includes("should") ||
    lower.includes("recommend") ||
    lower.includes("consider") ||
    lower.includes("weak")
  ) {
    return "warning";
  }

  return "info";
}

/**
 * Get a short action-oriented tip based on the category
 */
export function getQuickTip(category: FeedbackCategory): string {
  const tips: Record<FeedbackCategory, string> = {
    keyword_match: "Match job description terminology exactly",
    keyword_missing: "Add missing keywords if you have the experience",
    formatting: "Use standard formatting and fonts",
    section_structure: "Include all standard resume sections",
    semantic_match: "Align your language with the job description",
    narrative: "Create a clear career progression story",
    achievement: "Add numbers and metrics to your accomplishments",
    relevance: "Prioritize relevant experience for this role",
    red_flag: "Address potential concerns proactively",
  };

  return tips[category];
}

/**
 * Get the icon shape for a feedback category
 * Used for visual distinction in the UI
 */
export function getCategoryShape(
  category: FeedbackCategory
): "circle" | "square" | "diamond" | "triangle" {
  switch (category) {
    case "keyword_match":
    case "keyword_missing":
      return "circle"; // Keyword-related

    case "formatting":
    case "section_structure":
      return "square"; // Formatting-related

    case "narrative":
    case "semantic_match":
    case "relevance":
      return "diamond"; // Content/Narrative

    case "achievement":
    case "red_flag":
      return "triangle"; // Achievement/Metrics

    default:
      return "circle";
  }
}

/**
 * Get the color class for a severity level
 */
export function getSeverityColor(
  severity: "critical" | "warning" | "info" | "success"
): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (severity) {
    case "critical":
      return {
        bg: "bg-red-50 dark:bg-red-950/30",
        text: "text-red-700 dark:text-red-300",
        border: "border-red-200 dark:border-red-800",
        icon: "text-red-500",
      };
    case "warning":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800",
        icon: "text-amber-500",
      };
    case "info":
      return {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-800",
        icon: "text-blue-500",
      };
    case "success":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-800",
        icon: "text-emerald-500",
      };
  }
}

// =============================================================================
// ATS/HR-Specific "Why It Helps" Explanations
// =============================================================================

/**
 * ATS-specific explanations for why fixing an issue helps
 */
const ATS_WHY_IT_HELPS: Record<string, string> = {
  // Keywords
  missing_keyword:
    "Adding this keyword increases your match score by approximately 8-15%, making you more likely to pass the ATS filter and reach a recruiter.",
  weak_keyword:
    "Strengthening this keyword usage improves keyword density scoring. ATS systems often count both frequency and placement of keywords.",

  // Formatting
  formatting_contact:
    "ATS systems extract contact info using pattern matching. Standard formatting ensures your email and phone are correctly parsed.",
  formatting_table:
    "Many ATS systems cannot properly parse tables, potentially scrambling your carefully organized content. Standard layouts ensure proper parsing.",
  formatting_multicolumn:
    "Multi-column layouts often cause ATS parsers to read content in the wrong order, mixing unrelated sections together.",
  formatting_date:
    "Consistent date formats help ATS accurately calculate your years of experience and identify employment gaps.",
  formatting_length:
    "Resumes that are too long may be truncated by ATS systems. Keeping it concise ensures all content is processed.",
  formatting_special_chars:
    "Special characters and unicode symbols often display as garbage characters or cause parsing errors in older ATS systems.",

  // Sections
  section_missing:
    "ATS systems expect standard resume sections. Missing sections may result in incomplete profiles or automatic rejection.",
  section_contact:
    "Without parseable contact information, even a high-scoring resume cannot reach you for an interview.",
  section_experience:
    "The experience section is typically weighted highest in ATS scoring. A missing or poorly formatted experience section severely impacts your match score.",
  section_skills:
    "The skills section is often directly matched against job requirements. Missing it reduces keyword matching opportunities.",
};

/**
 * HR-specific explanations for why fixing an issue helps
 */
const HR_WHY_IT_HELPS: Record<string, string> = {
  // Formatting
  formatting_page_count:
    "Recruiters spend an average of 7 seconds on initial screening. Optimal length (1-2 pages) shows you can communicate concisely.",
  formatting_summary:
    "A compelling summary helps recruiters quickly understand your value proposition. 40% of recruiters read the summary first.",
  formatting_headings:
    "Consistent heading styles create visual hierarchy, making it easy for recruiters to scan and find relevant information quickly.",
  formatting_dates:
    "Inconsistent date formats appear unprofessional and make it harder to calculate your experience timeline at a glance.",
  formatting_metrics:
    "Quantified achievements are 40% more memorable than vague descriptions. Numbers provide concrete evidence of your impact.",
  formatting_bullets:
    "Well-structured bullet points improve readability. 3-5 bullets per role is optimal for the 7-second scan.",
  formatting_density:
    "Proper bullet density (not too sparse or cramped) shows professional document formatting skills.",
  formatting_section_order:
    "Standard section order matches recruiter expectations. Non-standard ordering increases cognitive load.",

  // Semantic
  semantic_skills:
    "Strong skills alignment signals you have the core competencies for the role. Recruiters check this early in their evaluation.",
  semantic_experience:
    "Experience relevance is the primary factor in interview decisions. Aligning your experience with job requirements is critical.",
  semantic_overall:
    "Overall semantic relevance affects how recruiters perceive your fit. Higher relevance increases callback likelihood by 60%.",

  // LLM Review
  llm_narrative:
    "A clear career narrative helps recruiters understand your trajectory and predict future contributions to their organization.",
  llm_achievement:
    "Strong achievements differentiate you from other candidates. Recruiters remember specific accomplishments, not job duties.",
  llm_relevance:
    "Tailoring your resume to each role increases callback rates by 30-50%. Generic resumes are easily spotted.",
  llm_red_flag:
    "Proactively addressing potential concerns builds trust. Unexplained gaps or patterns raise questions that hurt your candidacy.",
};

/**
 * Get ATS-specific explanation for why fixing an issue helps
 */
export function getATSWhyItHelps(
  issueType: string,
  message: string
): string {
  // Check for specific issue type
  const typeKey = issueType.toLowerCase().replace(/\s+/g, "_");
  if (ATS_WHY_IT_HELPS[typeKey]) {
    return ATS_WHY_IT_HELPS[typeKey];
  }

  // Check for keywords in message
  const msgLower = message.toLowerCase();
  if (msgLower.includes("keyword") && msgLower.includes("missing")) {
    return ATS_WHY_IT_HELPS.missing_keyword;
  }
  if (msgLower.includes("contact") || msgLower.includes("email") || msgLower.includes("phone")) {
    return ATS_WHY_IT_HELPS.formatting_contact;
  }
  if (msgLower.includes("table")) {
    return ATS_WHY_IT_HELPS.formatting_table;
  }
  if (msgLower.includes("column") || msgLower.includes("multi-column")) {
    return ATS_WHY_IT_HELPS.formatting_multicolumn;
  }
  if (msgLower.includes("date")) {
    return ATS_WHY_IT_HELPS.formatting_date;
  }
  if (msgLower.includes("section") && msgLower.includes("missing")) {
    return ATS_WHY_IT_HELPS.section_missing;
  }

  // Default ATS explanation
  return "Fixing this issue improves your ATS compatibility score, increasing the likelihood of passing automated screening.";
}

/**
 * Get HR-specific explanation for why fixing an issue helps
 */
export function getHRWhyItHelps(
  feedbackType: string,
  message: string
): string {
  // Check for specific feedback type
  const typeKey = feedbackType.toLowerCase().replace(/\s+/g, "_");
  if (HR_WHY_IT_HELPS[typeKey]) {
    return HR_WHY_IT_HELPS[typeKey];
  }

  // Check for keywords in message
  const msgLower = message.toLowerCase();
  if (msgLower.includes("page") && (msgLower.includes("count") || msgLower.includes("length"))) {
    return HR_WHY_IT_HELPS.formatting_page_count;
  }
  if (msgLower.includes("summary") || msgLower.includes("objective")) {
    return HR_WHY_IT_HELPS.formatting_summary;
  }
  if (msgLower.includes("heading") || msgLower.includes("consistent")) {
    return HR_WHY_IT_HELPS.formatting_headings;
  }
  if (msgLower.includes("quantif") || msgLower.includes("metric") || msgLower.includes("number")) {
    return HR_WHY_IT_HELPS.formatting_metrics;
  }
  if (msgLower.includes("bullet")) {
    return HR_WHY_IT_HELPS.formatting_bullets;
  }
  if (msgLower.includes("narrative") || msgLower.includes("story")) {
    return HR_WHY_IT_HELPS.llm_narrative;
  }
  if (msgLower.includes("achievement")) {
    return HR_WHY_IT_HELPS.llm_achievement;
  }
  if (msgLower.includes("relevant") || msgLower.includes("tailor")) {
    return HR_WHY_IT_HELPS.llm_relevance;
  }
  if (msgLower.includes("gap") || msgLower.includes("red flag")) {
    return HR_WHY_IT_HELPS.llm_red_flag;
  }

  // Default HR explanation
  return "Addressing this feedback improves how recruiters perceive your resume during their initial 7-second scan.";
}
