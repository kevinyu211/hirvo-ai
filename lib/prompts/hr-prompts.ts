import { openai } from "@/lib/openai";

// ============================================================================
// HR Reviewer LLM Analysis Types (Layer 3)
// ============================================================================

export interface HRSectionComment {
  /** Which resume section this comment applies to */
  section: string;
  /** The HR reviewer's comment on this section */
  comment: string;
  /** Specific suggestion for improvement */
  suggestion: string;
  /** Score for this section (0-100) */
  score: number;
}

export interface HRRedFlag {
  /** Type of red flag detected */
  type: "employment_gap" | "job_hopping" | "vague_description" | "overqualified" | "underqualified" | "inconsistency" | "other";
  /** Description of the concern */
  description: string;
  /** How serious this red flag is */
  severity: "critical" | "warning" | "info";
  /** How the candidate could address or mitigate this concern */
  mitigation: string;
}

export interface HRReviewResult {
  /** Overall HR impression score (0-100) */
  overallScore: number;
  /** First impression summary — what a recruiter thinks within the first 6 seconds */
  firstImpression: string;
  /** Assessment of career narrative coherence */
  careerNarrative: {
    score: number;
    assessment: string;
    suggestion: string;
  };
  /** Assessment of achievement strength and specificity */
  achievementStrength: {
    score: number;
    assessment: string;
    suggestion: string;
  };
  /** Assessment of relevance to the target role */
  roleRelevance: {
    score: number;
    assessment: string;
    suggestion: string;
  };
  /** Detected red flags (gaps, job hopping, vague descriptions) */
  redFlags: HRRedFlag[];
  /** Per-section detailed comments */
  sectionComments: HRSectionComment[];
  /** Final callback decision */
  callbackDecision: {
    decision: "yes" | "no" | "maybe";
    reasoning: string;
  };
}

// ============================================================================
// System Prompt for HR Reviewer (Layer 3)
// ============================================================================

export const HR_REVIEWER_SYSTEM_PROMPT = `You are an experienced HR recruiter with 15+ years of experience screening resumes across multiple industries. You have reviewed thousands of resumes and conducted hundreds of interviews. You are now reviewing a candidate's resume for a specific job opening.

Your task is to evaluate this resume as a human recruiter would — going beyond keyword matching to assess the candidate holistically.

You will receive:
1. A job description for the open position
2. The candidate's resume text
3. Optional context: the candidate's target role, years of experience, and work authorization status

Evaluate the resume on these dimensions:

## 1. First Impression (6-Second Scan)
Recruiters spend an average of 6-7 seconds on initial resume screening. What stands out? Is the layout scannable? Is the most relevant information immediately visible? Does this resume make you want to read more?

## 2. Career Narrative Coherence
- Does the career progression make logical sense?
- Is there a clear trajectory or theme?
- Do the roles build on each other?
- Is the candidate moving in a direction relevant to this position?

## 3. Achievement Strength & Specificity
- Are accomplishments stated with specific metrics (numbers, percentages, dollar amounts)?
- Are achievements framed as impact ("increased revenue by 40%") rather than duties ("responsible for sales")?
- Are the achievements relevant and impressive for the level of the role?
- Do the bullet points follow the CAR (Challenge-Action-Result) or STAR format?

## 4. Relevance to the Role
- How well does the candidate's experience map to what the job requires?
- Are the most relevant experiences and skills prominently featured?
- Does the candidate demonstrate understanding of the domain?
- Would this candidate be able to contribute from day one, or would they need significant ramp-up?

## 5. Red Flags
Look for these common recruiter concerns:
- Employment gaps (unexplained gaps of 6+ months)
- Job hopping (multiple roles lasting less than 1 year without clear reason)
- Vague descriptions (roles described with buzzwords but no substance)
- Overqualification (candidate significantly exceeds role requirements — might leave quickly)
- Underqualification (candidate clearly lacks key requirements)
- Inconsistencies (dates don't add up, claims that seem inflated)

## 6. Callback Decision
Based on your complete evaluation, would you call this candidate for an interview?
- "yes": Strong candidate, clearly qualified, would prioritize for interview
- "maybe": Has potential but has concerns that need clarification in a phone screen
- "no": Does not meet the bar for this specific role — explain why constructively

## Per-Section Comments
For each major section of the resume (Summary, Experience, Education, Skills, etc.), provide:
- A specific comment about what works and what doesn't
- A concrete suggestion for improvement
- A score (0-100) for that section

Respond ONLY with valid JSON matching this exact structure:
{
  "overallScore": <number 0-100>,
  "firstImpression": "<string>",
  "careerNarrative": {
    "score": <number 0-100>,
    "assessment": "<string>",
    "suggestion": "<string>"
  },
  "achievementStrength": {
    "score": <number 0-100>,
    "assessment": "<string>",
    "suggestion": "<string>"
  },
  "roleRelevance": {
    "score": <number 0-100>,
    "assessment": "<string>",
    "suggestion": "<string>"
  },
  "redFlags": [
    {
      "type": "employment_gap" | "job_hopping" | "vague_description" | "overqualified" | "underqualified" | "inconsistency" | "other",
      "description": "<string>",
      "severity": "critical" | "warning" | "info",
      "mitigation": "<string>"
    }
  ],
  "sectionComments": [
    {
      "section": "<string>",
      "comment": "<string>",
      "suggestion": "<string>",
      "score": <number 0-100>
    }
  ],
  "callbackDecision": {
    "decision": "yes" | "no" | "maybe",
    "reasoning": "<string>"
  }
}`;

// ============================================================================
// Build the user prompt with the resume and JD context
// ============================================================================

export function buildHRUserPrompt(params: {
  resumeText: string;
  jobDescription: string;
  targetRole?: string;
  yearsExperience?: string;
  visaStatus?: string;
}): string {
  const contextParts: string[] = [];
  if (params.targetRole) {
    contextParts.push(`Target role: ${params.targetRole}`);
  }
  if (params.yearsExperience) {
    contextParts.push(`Years of experience: ${params.yearsExperience}`);
  }
  if (params.visaStatus && params.visaStatus !== "prefer_not_to_say") {
    contextParts.push(`Work authorization: ${params.visaStatus}`);
  }

  const contextSection =
    contextParts.length > 0
      ? `\n\n## Candidate Context\n${contextParts.join("\n")}`
      : "";

  return `## Job Description
${params.jobDescription}

## Candidate's Resume
${params.resumeText}${contextSection}

Review this resume as an experienced HR recruiter hiring for the role described above. Provide your complete evaluation as JSON.`;
}

// ============================================================================
// Call GPT-4o for HR Review (Layer 3)
// ============================================================================

export async function runHRReview(params: {
  resumeText: string;
  jobDescription: string;
  targetRole?: string;
  yearsExperience?: string;
  visaStatus?: string;
}): Promise<HRReviewResult> {
  const userPrompt = buildHRUserPrompt(params);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: HR_REVIEWER_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from GPT-4o for HR review");
  }

  const parsed = JSON.parse(content) as HRReviewResult;

  return validateHRReviewResult(parsed);
}

// ============================================================================
// Validate and normalize the HR review result
// ============================================================================

function validateHRReviewResult(parsed: HRReviewResult): HRReviewResult {
  const clampScore = (score: unknown): number => {
    const num = typeof score === "number" ? score : 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  };

  const validRedFlagTypes = new Set([
    "employment_gap",
    "job_hopping",
    "vague_description",
    "overqualified",
    "underqualified",
    "inconsistency",
    "other",
  ]);

  const validSeverities = new Set(["critical", "warning", "info"]);

  const validDecisions = new Set(["yes", "no", "maybe"]);

  return {
    overallScore: clampScore(parsed.overallScore),
    firstImpression:
      typeof parsed.firstImpression === "string"
        ? parsed.firstImpression
        : "No first impression provided.",
    careerNarrative: {
      score: clampScore(parsed.careerNarrative?.score),
      assessment:
        typeof parsed.careerNarrative?.assessment === "string"
          ? parsed.careerNarrative.assessment
          : "No assessment provided.",
      suggestion:
        typeof parsed.careerNarrative?.suggestion === "string"
          ? parsed.careerNarrative.suggestion
          : "No suggestion provided.",
    },
    achievementStrength: {
      score: clampScore(parsed.achievementStrength?.score),
      assessment:
        typeof parsed.achievementStrength?.assessment === "string"
          ? parsed.achievementStrength.assessment
          : "No assessment provided.",
      suggestion:
        typeof parsed.achievementStrength?.suggestion === "string"
          ? parsed.achievementStrength.suggestion
          : "No suggestion provided.",
    },
    roleRelevance: {
      score: clampScore(parsed.roleRelevance?.score),
      assessment:
        typeof parsed.roleRelevance?.assessment === "string"
          ? parsed.roleRelevance.assessment
          : "No assessment provided.",
      suggestion:
        typeof parsed.roleRelevance?.suggestion === "string"
          ? parsed.roleRelevance.suggestion
          : "No suggestion provided.",
    },
    redFlags: Array.isArray(parsed.redFlags)
      ? parsed.redFlags.map((flag) => ({
          type: validRedFlagTypes.has(flag.type) ? flag.type : "other" as const,
          description:
            typeof flag.description === "string"
              ? flag.description
              : "Unknown issue.",
          severity: validSeverities.has(flag.severity)
            ? flag.severity
            : "warning" as const,
          mitigation:
            typeof flag.mitigation === "string"
              ? flag.mitigation
              : "No mitigation suggested.",
        }))
      : [],
    sectionComments: Array.isArray(parsed.sectionComments)
      ? parsed.sectionComments.map((sc) => ({
          section:
            typeof sc.section === "string" ? sc.section : "Unknown Section",
          comment:
            typeof sc.comment === "string" ? sc.comment : "No comment.",
          suggestion:
            typeof sc.suggestion === "string"
              ? sc.suggestion
              : "No suggestion.",
          score: clampScore(sc.score),
        }))
      : [],
    callbackDecision: {
      decision: validDecisions.has(parsed.callbackDecision?.decision)
        ? parsed.callbackDecision.decision
        : "maybe" as const,
      reasoning:
        typeof parsed.callbackDecision?.reasoning === "string"
          ? parsed.callbackDecision.reasoning
          : "No reasoning provided.",
    },
  };
}
