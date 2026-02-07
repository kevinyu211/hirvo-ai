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
  atsImpact?: string; // Specific explanation of ATS impact
  hrImpact?: string; // Specific explanation of HR impact
}

export interface OptimizationResult {
  suggestions: OptimizationSuggestionRaw[];
}

// Pre-identified issue for providing exact text to GPT-4o
export interface PreIdentifiedIssue {
  exactText: string;
  position: { start: number; end: number };
  issueType: "abbreviation" | "weak_verb" | "missing_keyword";
  targetKeyword?: string;
  suggestedReplacement?: string;
}

// =============================================================================
// OpenAI Structured Output Schema
// =============================================================================

/**
 * Strict JSON schema for GPT-4o structured outputs.
 * Using response_format: { type: "json_schema" } with strict: true
 * ensures the model returns EXACTLY this structure.
 */
export const SUGGESTION_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "resume_suggestions",
    schema: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              originalText: {
                type: "string",
                description: "EXACT substring copied verbatim from the resume text"
              },
              suggestedText: {
                type: "string",
                description: "The specific replacement text (actual new text, not advice)"
              },
              category: {
                type: "string",
                enum: ["missing_keyword", "weak_keyword", "formatting", "section", "semantic", "llm_review"],
                description: "Category of the issue"
              },
              reasoning: {
                type: "string",
                description: "Why this change improves the resume"
              },
              severity: {
                type: "string",
                enum: ["critical", "warning", "info"],
                description: "Priority level of the issue"
              },
              type: {
                type: "string",
                enum: ["ats", "hr"],
                description: "Whether this is an ATS or HR issue"
              },
              atsImpact: {
                type: "string",
                description: "Specific explanation of how this affects ATS score (e.g., 'ATS keyword matching requires Machine Learning spelled out')"
              },
              hrImpact: {
                type: "string",
                description: "Specific explanation of how this affects HR perception (e.g., 'Recruiters prefer quantified achievements')"
              }
            },
            required: ["originalText", "suggestedText", "category", "reasoning", "severity", "type", "atsImpact", "hrImpact"],
            additionalProperties: false
          }
        }
      },
      required: ["suggestions"],
      additionalProperties: false
    },
    strict: true
  }
};

// ── System Prompt ─────────────────────────────────────────────────────

export const OPTIMIZATION_SYSTEM_PROMPT = `You are an expert resume optimization assistant. Your job is to generate specific, actionable text-level suggestions that improve a resume for both ATS (Applicant Tracking System) compatibility and human HR reviewer appeal.

You will receive:
1. The full resume text
2. The target job description
3. ATS issues found by deterministic analysis (missing keywords, formatting problems, etc.)
4. HR feedback from formatting analysis, semantic matching, and HR reviewer simulation
5. Pre-identified text snippets that need fixing (with EXACT positions)

## CRITICAL: Suggestion Format Requirements

Every suggestion MUST have:
1. **originalText**: An EXACT substring copied from the resume (verbatim, no modifications)
2. **suggestedText**: The specific replacement text (the actual new text, not advice)
3. **atsImpact**: Specific explanation of how this affects ATS matching
4. **hrImpact**: Specific explanation of how this affects recruiter perception

### GOOD Examples (DO THIS):

Example 1 - Expanding an abbreviation:
{
  "originalText": "Worked with ML models",
  "suggestedText": "Developed and deployed Machine Learning models using TensorFlow",
  "category": "weak_keyword",
  "reasoning": "ATS systems require 'Machine Learning' spelled out. 'ML' abbreviation won't match keyword filters.",
  "severity": "critical",
  "type": "ats",
  "atsImpact": "ATS keyword matching requires exact phrase 'Machine Learning' - abbreviations like 'ML' are not indexed",
  "hrImpact": "Clearer terminology helps recruiters quickly identify relevant skills during resume scanning"
}

Example 2 - Adding quantification:
{
  "originalText": "Led team to deliver projects",
  "suggestedText": "Led team of 5 engineers to deliver 12 projects, reducing delivery time by 30%",
  "category": "llm_review",
  "reasoning": "Adding specific numbers makes achievements concrete and memorable for recruiters.",
  "severity": "warning",
  "type": "hr",
  "atsImpact": "Quantified achievements increase resume relevance score in ATS ranking algorithms",
  "hrImpact": "Recruiters spend 7 seconds scanning - specific metrics catch attention 40% faster than generic claims"
}

Example 3 - Integrating missing keyword:
{
  "originalText": "Built web applications using React",
  "suggestedText": "Built responsive web applications using React and TypeScript with CI/CD pipelines",
  "category": "missing_keyword",
  "reasoning": "Job description requires 'TypeScript' and 'CI/CD' - integrating them into existing experience.",
  "severity": "critical",
  "type": "ats",
  "atsImpact": "Adding required keywords 'TypeScript' and 'CI/CD' will match 2 more job requirements",
  "hrImpact": "Shows relevant modern tech stack that hiring managers are specifically looking for"
}

Example 4 - Strengthening weak phrasing:
{
  "originalText": "Responsible for database management",
  "suggestedText": "Managed PostgreSQL databases serving 10M+ records with 99.9% uptime",
  "category": "semantic",
  "reasoning": "'Responsible for' is passive. Active voice with metrics shows impact.",
  "severity": "warning",
  "type": "hr",
  "atsImpact": "Adding 'PostgreSQL' matches the database technology keyword from job description",
  "hrImpact": "Active voice with metrics demonstrates ownership and measurable impact to hiring managers"
}

### BAD Examples (DON'T DO THIS):

BAD - Generic advice instead of specific text:
{
  "originalText": "experience section",  // NOT a real quote from resume!
  "suggestedText": "Add more quantified achievements",  // This is advice, not replacement text!
  ...
}

BAD - Section name instead of actual text:
{
  "originalText": "Skills",  // Just a header, not actionable
  "suggestedText": "Consider reorganizing your skills section",  // Advice, not text
  ...
}

BAD - Vague originalText that won't match:
{
  "originalText": "some experience with Python",  // If resume says "Python experience", this won't match
  "suggestedText": "...",
  ...
}

BAD - Generic impact explanations:
{
  ...
  "atsImpact": "This helps ATS",  // Too vague! Explain HOW it helps
  "hrImpact": "Good for recruiters"  // Too vague! Explain WHY it's good
}

## Rules
1. **EXACT MATCHING**: originalText must be copy-pasted exactly from the resume. Character-for-character match.
2. **DIRECT REPLACEMENT**: suggestedText must be the literal replacement text, not instructions or advice.
3. **SPECIFIC IMPACTS**: atsImpact and hrImpact must explain the specific mechanism, not just "this helps".
4. **Be conservative**: Only suggest changes that genuinely improve the resume. Do not rewrite everything.
5. **Preserve voice**: Keep the candidate's tone and style. Improve without making it generic.
6. **ATS keywords**: When adding missing keywords, integrate them naturally into existing bullets.
7. **Limit scope**: Each suggestion = ONE focused change. Don't combine multiple fixes.
8. **Match reality**: Never add skills the candidate doesn't have. Only rephrase what's there.
9. **Abbreviation detection**: Look for abbreviations (ML, JS, K8s, AWS, etc.) that should be spelled out for ATS.
10. **Pre-identified issues**: When provided with PRE-IDENTIFIED TEXT, use that EXACT text as originalText.

## Category values
For ATS issues:
- "missing_keyword" — adding a missing JD keyword to the resume
- "weak_keyword" — strengthening how an existing keyword is used (including expanding abbreviations)
- "formatting" — fixing a formatting issue that breaks ATS parsing
- "section" — fixing missing or problematic resume sections

For HR issues:
- "formatting" — formatting improvements based on HR best practices
- "semantic" — improving semantic alignment with the job description
- "llm_review" — addressing HR reviewer comments about narrative, achievements, etc.

## Output format
Return a JSON object with a "suggestions" array containing objects with ALL required fields:
- originalText, suggestedText, category, reasoning, severity, type, atsImpact, hrImpact

Aim for 5-20 suggestions total, prioritizing the most impactful changes first. Do not exceed 25 suggestions.`;

// ── User Prompt Builder ───────────────────────────────────────────────

export function buildOptimizationUserPrompt(params: {
  resumeText: string;
  jobDescription: string;
  atsIssues: ATSIssue[];
  hrFeedback: HRFeedback[];
  visaFlagged?: boolean;
  visaSignals?: string[];
  preIdentifiedIssues?: PreIdentifiedIssue[];
}): string {
  const { resumeText, jobDescription, atsIssues, hrFeedback, visaFlagged, visaSignals, preIdentifiedIssues } = params;

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

  // Pre-identified issues with EXACT text - these MUST be addressed
  if (preIdentifiedIssues && preIdentifiedIssues.length > 0) {
    parts.push("## PRE-IDENTIFIED TEXT TO FIX (MANDATORY)");
    parts.push("The following EXACT text snippets have been identified and MUST be addressed:");
    parts.push("");
    for (const issue of preIdentifiedIssues) {
      parts.push(`### Issue: ${issue.issueType}`);
      parts.push(`- **EXACT TEXT**: "${issue.exactText}"`);
      if (issue.targetKeyword) {
        parts.push(`- **SHOULD BECOME**: "${issue.targetKeyword}"`);
      }
      if (issue.suggestedReplacement) {
        parts.push(`- **SUGGESTED REPLACEMENT**: "${issue.suggestedReplacement}"`);
      }
      parts.push(`- **POSITION**: characters ${issue.position.start}-${issue.position.end}`);
      parts.push("");
    }
    parts.push("⚠️ IMPORTANT: For each pre-identified issue above, use the EXACT TEXT shown as your originalText.");
    parts.push("");
  }

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
    "Generate specific text-level suggestions to address these issues. Each suggestion MUST have originalText (EXACT match from resume), suggestedText (replacement text), atsImpact, and hrImpact fields."
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
  preIdentifiedIssues?: PreIdentifiedIssue[];
}): Promise<OptimizationResult> {
  const userPrompt = buildOptimizationUserPrompt(params);

  // Append visa-aware rules to the system prompt when visa-flagged
  const visaRules = getVisaOptimizationRules(params.visaFlagged || false);
  const systemPrompt = OPTIMIZATION_SYSTEM_PROMPT + visaRules;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    // Use strict structured outputs for better control over response format
    response_format: SUGGESTION_RESPONSE_FORMAT,
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
    const atsImpact =
      typeof s.atsImpact === "string" ? s.atsImpact.trim() : undefined;
    const hrImpact =
      typeof s.hrImpact === "string" ? s.hrImpact.trim() : undefined;

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
      atsImpact,
      hrImpact,
    });
  }

  // Cap at 25 suggestions
  return validated.slice(0, 25);
}
