import { openai } from "@/lib/openai";

// ============================================================================
// Supplementary ATS Analysis Types
// ============================================================================

export interface KeywordAlias {
  /** The keyword from the JD that was missed by deterministic matching */
  original: string;
  /** The alternate form found in the resume (abbreviation, synonym, etc.) */
  aliasFoundInResume: string;
  /** Explanation of why these are equivalent */
  reasoning: string;
}

export interface KeywordPriority {
  /** The keyword from the JD */
  keyword: string;
  /** Priority level for this specific role */
  priority: "critical" | "important" | "nice_to_have";
  /** Why this priority was assigned */
  reasoning: string;
}

export interface WeakKeywordUsage {
  /** The keyword that appears in the resume */
  keyword: string;
  /** How the keyword is currently used */
  currentContext: string;
  /** Why the usage is considered weak */
  issue: string;
  /** How to improve the keyword usage */
  suggestedImprovement: string;
}

export interface SupplementaryATSAnalysis {
  /** Keywords missed by deterministic matching due to abbreviations/alternate phrasings */
  aliasMatches: KeywordAlias[];
  /** Role-specific keyword priority rankings */
  keywordPriorities: KeywordPriority[];
  /** Keywords present in resume but used weakly or in poor context */
  weakUsages: WeakKeywordUsage[];
  /** Additional keywords the LLM identifies as important but not in the deterministic list */
  additionalKeywords: string[];
}

// ============================================================================
// System Prompt for Supplementary ATS Analysis
// ============================================================================

export const ATS_SUPPLEMENTARY_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst. Your job is to supplement a deterministic keyword-matching ATS engine with contextual intelligence that code-based matching cannot provide.

You will receive:
1. A job description
2. A resume
3. The deterministic engine's results: matched keywords, missing keywords, and the overall match percentage

Your task is to provide four types of supplementary analysis:

## 1. Alias Matches
Identify keywords that the deterministic engine marked as "missing" but ARE actually present in the resume under a different form:
- Abbreviations: "JS" = "JavaScript", "ML" = "Machine Learning", "K8s" = "Kubernetes"
- Alternate spellings: "front-end" = "frontend", "e-commerce" = "ecommerce"
- Closely related terms that a recruiter would consider equivalent: "React.js" = "ReactJS" = "React"
- Acronyms: "CI/CD" = "continuous integration" / "continuous delivery"
Only include genuine equivalents that a recruiter would accept. Do NOT stretch — "Python" is not equivalent to "programming".

## 2. Keyword Priorities
Rank ALL the extracted keywords by importance for this specific role:
- "critical": Must-have skills that are core to the job (e.g., "Python" for a Python Developer role)
- "important": Strongly preferred skills mentioned multiple times or in requirements section
- "nice_to_have": Supplementary skills, soft skills, or those only in the preferred/bonus section

## 3. Weak Keyword Usages
Find keywords that ARE present in the resume but are used weakly:
- Keyword only in a skills list with no supporting experience
- Keyword mentioned once in passing without specific context
- Keyword used in a way that doesn't demonstrate actual proficiency
- Keyword buried in an unrelated section
For each, explain the issue and suggest how to strengthen the usage.

## 4. Additional Keywords
Identify important keywords or skills implied by the job description that the deterministic engine did not extract but a recruiter would look for. These might be:
- Industry-standard tools commonly paired with listed technologies
- Implied skills (e.g., "lead a team" implies "leadership", "mentoring")
- Domain knowledge that the JD assumes but doesn't explicitly list

Respond ONLY with valid JSON matching this exact structure:
{
  "aliasMatches": [{ "original": "string", "aliasFoundInResume": "string", "reasoning": "string" }],
  "keywordPriorities": [{ "keyword": "string", "priority": "critical" | "important" | "nice_to_have", "reasoning": "string" }],
  "weakUsages": [{ "keyword": "string", "currentContext": "string", "issue": "string", "suggestedImprovement": "string" }],
  "additionalKeywords": ["string"]
}`;

// ============================================================================
// Build the user prompt with the analysis context
// ============================================================================

export function buildATSUserPrompt(params: {
  resumeText: string;
  jobDescription: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchPct: number;
}): string {
  return `## Job Description
${params.jobDescription}

## Resume
${params.resumeText}

## Deterministic ATS Engine Results
- Match percentage: ${params.matchPct}%
- Matched keywords (${params.matchedKeywords.length}): ${params.matchedKeywords.join(", ") || "none"}
- Missing keywords (${params.missingKeywords.length}): ${params.missingKeywords.join(", ") || "none"}

Analyze the above and provide your supplementary ATS analysis as JSON.`;
}

// ============================================================================
// Call GPT-4o for supplementary ATS analysis
// ============================================================================

export async function runSupplementaryATSAnalysis(params: {
  resumeText: string;
  jobDescription: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchPct: number;
}): Promise<SupplementaryATSAnalysis> {
  const userPrompt = buildATSUserPrompt(params);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: ATS_SUPPLEMENTARY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from GPT-4o for supplementary ATS analysis");
  }

  const parsed = JSON.parse(content) as SupplementaryATSAnalysis;

  // Validate the structure has the expected fields with defaults
  return {
    aliasMatches: Array.isArray(parsed.aliasMatches)
      ? parsed.aliasMatches
      : [],
    keywordPriorities: Array.isArray(parsed.keywordPriorities)
      ? parsed.keywordPriorities
      : [],
    weakUsages: Array.isArray(parsed.weakUsages) ? parsed.weakUsages : [],
    additionalKeywords: Array.isArray(parsed.additionalKeywords)
      ? parsed.additionalKeywords
      : [],
  };
}
