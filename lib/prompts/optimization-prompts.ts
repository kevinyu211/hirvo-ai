/**
 * Optimization Prompts — GPT-4o prompts for generating text-level
 * suggestions from ATS issues and HR feedback.
 *
 * Each suggestion maps to a specific text range in the resume so the
 * Grammarly-style editor can render highlights and apply fixes.
 */

import { openai } from "@/lib/openai";
import type { ATSIssue, HRFeedback } from "@/lib/types";
import {
  getVisaOptimizationRules,
  buildVisaContextSection,
  VISA_OPTIMIZATION_CATEGORY,
} from "@/lib/prompts/visa-prompts";

// ── Types ─────────────────────────────────────────────────────────────

export interface OptimizationSuggestionRaw {
  originalText: string;
  suggestedText: string;
  category: string;
  reasoning: string;
  severity: "critical" | "warning" | "info";
  type: "ats" | "hr";
}

export interface OptimizationResult {
  suggestions: OptimizationSuggestionRaw[];
}

// ── System Prompt ─────────────────────────────────────────────────────

export const OPTIMIZATION_SYSTEM_PROMPT = `You are an expert resume optimization assistant. Your job is to generate specific, actionable text-level suggestions that improve a resume for both ATS (Applicant Tracking System) compatibility and human HR reviewer appeal.

You will receive:
1. The full resume text
2. The target job description
3. ATS issues found by deterministic analysis (missing keywords, formatting problems, etc.)
4. HR feedback from formatting analysis, semantic matching, and HR reviewer simulation

For EACH issue, generate a concrete text-level suggestion that includes:
- The exact original text from the resume that should be changed (or a relevant nearby section for additions)
- The suggested replacement text
- The category of the issue
- Clear reasoning for the change
- Severity level

## Rules
1. **Be specific**: Every suggestion must reference actual text from the resume. Do not give vague advice.
2. **Be conservative**: Only suggest changes that genuinely improve the resume. Do not rewrite the entire resume.
3. **Preserve voice**: Keep the candidate's tone and style. Improve without making it sound generic.
4. **ATS keywords**: When adding missing keywords, integrate them naturally into existing bullet points or sections. Do not just list keywords.
5. **Limit scope**: For each issue, provide ONE focused suggestion. Don't combine multiple fixes into one suggestion.
6. **Match reality**: Never add skills or experiences the candidate doesn't appear to have. Only rephrase, reorganize, or highlight what's already there.
7. **Keep it real**: Suggested text should be professional and natural. Avoid buzzwords unless they're in the job description.

## Category values
For ATS issues, use these categories:
- "missing_keyword" — adding a missing JD keyword to the resume
- "weak_keyword" — strengthening how an existing keyword is used
- "formatting" — fixing a formatting issue that breaks ATS parsing
- "section" — fixing missing or problematic resume sections

For HR issues, use these categories:
- "formatting" — formatting improvements based on HR best practices
- "semantic" — improving semantic alignment with the job description
- "llm_review" — addressing HR reviewer comments about narrative, achievements, etc.

## Output format
Return a JSON object with a "suggestions" array. Each suggestion has:
{
  "originalText": "the exact text from the resume to highlight/replace",
  "suggestedText": "the improved replacement text",
  "category": "one of the categories above",
  "reasoning": "why this change improves the resume",
  "severity": "critical" | "warning" | "info",
  "type": "ats" | "hr"
}

Important: The "originalText" MUST be an exact substring found in the resume text. If you need to suggest adding new content, use a nearby relevant line as the originalText and include the addition in the suggestedText.

Aim for 5-20 suggestions total, prioritizing the most impactful changes first. Do not exceed 25 suggestions.`;

// ── User Prompt Builder ───────────────────────────────────────────────

export function buildOptimizationUserPrompt(params: {
  resumeText: string;
  jobDescription: string;
  atsIssues: ATSIssue[];
  hrFeedback: HRFeedback[];
  visaFlagged?: boolean;
  visaSignals?: string[];
}): string {
  const { resumeText, jobDescription, atsIssues, hrFeedback, visaFlagged, visaSignals } = params;

  const parts: string[] = [];

  parts.push("## Resume Text");
  parts.push("```");
  parts.push(resumeText);
  parts.push("```");
  parts.push("");

  parts.push("## Job Description");
  parts.push("```");
  parts.push(jobDescription);
  parts.push("```");
  parts.push("");

  if (atsIssues.length > 0) {
    parts.push("## ATS Issues Found");
    for (const issue of atsIssues) {
      parts.push(
        `- [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}${issue.suggestion ? ` — Suggestion: ${issue.suggestion}` : ""}`
      );
    }
    parts.push("");
  }

  if (hrFeedback.length > 0) {
    parts.push("## HR Feedback");
    for (const fb of hrFeedback) {
      parts.push(
        `- [${fb.severity.toUpperCase()}] Layer ${fb.layer} (${fb.type}): ${fb.message}${fb.suggestion ? ` — Suggestion: ${fb.suggestion}` : ""}`
      );
    }
    parts.push("");
  }

  // Add visa context section if visa-flagged
  const visaContext = buildVisaContextSection(visaFlagged || false, visaSignals);
  if (visaContext) {
    parts.push(visaContext);
  }

  parts.push(
    "Generate specific text-level suggestions to address these issues. Return as JSON."
  );

  return parts.join("\n");
}

// ── Run Optimization ──────────────────────────────────────────────────

export async function runOptimizationAnalysis(params: {
  resumeText: string;
  jobDescription: string;
  atsIssues: ATSIssue[];
  hrFeedback: HRFeedback[];
  visaFlagged?: boolean;
  visaSignals?: string[];
}): Promise<OptimizationResult> {
  const userPrompt = buildOptimizationUserPrompt(params);

  // Append visa-aware rules to the system prompt when visa-flagged
  const visaRules = getVisaOptimizationRules(params.visaFlagged || false);
  const systemPrompt = OPTIMIZATION_SYSTEM_PROMPT + visaRules;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    return { suggestions: [] };
  }

  try {
    const parsed = JSON.parse(content);
    const suggestions = validateOptimizationResult(
      parsed,
      params.resumeText,
      params.visaFlagged
    );
    return { suggestions };
  } catch {
    return { suggestions: [] };
  }
}

// ── Validation ────────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set([
  "missing_keyword",
  "weak_keyword",
  "formatting",
  "section",
  "semantic",
  "llm_review",
]);

const VALID_TYPES = new Set(["ats", "hr"]);
const VALID_SEVERITIES = new Set(["critical", "warning", "info"]);

/**
 * Validate and normalize the GPT-4o optimization output.
 * Filters out suggestions with invalid originalText (not found in resume),
 * normalizes categories and severities.
 *
 * When visaFlagged is true, the "visa_optimization" category is also accepted.
 */
export function validateOptimizationResult(
  raw: unknown,
  resumeText: string,
  visaFlagged?: boolean
): OptimizationSuggestionRaw[] {
  if (!raw || typeof raw !== "object") return [];

  const obj = raw as Record<string, unknown>;
  const suggestions = obj.suggestions;

  if (!Array.isArray(suggestions)) return [];

  const validated: OptimizationSuggestionRaw[] = [];
  const resumeTextLower = resumeText.toLowerCase();

  for (const item of suggestions) {
    if (!item || typeof item !== "object") continue;

    const s = item as Record<string, unknown>;

    const originalText =
      typeof s.originalText === "string" ? s.originalText.trim() : "";
    const suggestedText =
      typeof s.suggestedText === "string" ? s.suggestedText.trim() : "";
    const category =
      typeof s.category === "string" ? s.category.trim() : "formatting";
    const reasoning =
      typeof s.reasoning === "string" ? s.reasoning.trim() : "";
    const severity =
      typeof s.severity === "string" ? s.severity.trim() : "info";
    const type = typeof s.type === "string" ? s.type.trim() : "ats";

    // Skip suggestions with empty original text
    if (!originalText) continue;

    // Skip suggestions with empty suggested text and empty reasoning
    if (!suggestedText && !reasoning) continue;

    // Validate that originalText exists in the resume (case-insensitive)
    if (!resumeTextLower.includes(originalText.toLowerCase())) continue;

    // Normalize category (include visa_optimization when visa-flagged)
    const isValidCategory =
      VALID_CATEGORIES.has(category) ||
      (visaFlagged && category === VISA_OPTIMIZATION_CATEGORY);
    const normalizedCategory = isValidCategory ? category : "formatting";

    // Normalize type
    const normalizedType = VALID_TYPES.has(type) ? type : "ats";

    // Normalize severity
    const normalizedSeverity = VALID_SEVERITIES.has(severity)
      ? severity
      : "info";

    validated.push({
      originalText,
      suggestedText,
      category: normalizedCategory,
      reasoning,
      severity: normalizedSeverity as "critical" | "warning" | "info",
      type: normalizedType as "ats" | "hr",
    });
  }

  // Cap at 25 suggestions
  return validated.slice(0, 25);
}
