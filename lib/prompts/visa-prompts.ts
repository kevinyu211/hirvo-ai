/**
 * Visa-Aware Optimization Prompts
 *
 * When a resume is visa-flagged, the optimization suggestions must follow
 * additional rules to protect the candidate's work authorization information
 * and present it in the most favorable light.
 *
 * These rules are appended to the standard optimization system prompt so GPT-4o
 * generates visa-safe suggestions alongside the normal ATS + HR improvements.
 */

// ── Visa Optimization Rules (appended to system prompt when visa-flagged) ────

export const VISA_OPTIMIZATION_RULES = `
## IMPORTANT: Visa-Aware Optimization Rules

This candidate's resume contains work authorization or visa-related information. You MUST follow these additional rules when generating suggestions:

### Rule 1: Never Remove Work Authorization Information
- Do NOT suggest removing, hiding, or downplaying any work authorization, visa status, or employment eligibility information from the resume.
- If the resume mentions H-1B, OPT, CPT, EAD, work authorization, sponsorship status, or any visa-related details, those details must be preserved in ALL suggestions.
- If a suggestion modifies a section containing authorization info, the replacement text MUST retain all authorization details.

### Rule 2: Frame Authorization Positively
- When work authorization is mentioned, suggest framing it in the most positive, professional light.
- Use confident, proactive language:
  - GOOD: "Authorized to work in the United States" or "Currently authorized for full-time employment in the US"
  - AVOID: "Requires sponsorship" or "Visa holder" (as standalone negative framing)
- If the candidate has an EAD or OPT, frame it as current authorization rather than temporary status.
- Emphasize what they CAN do (authorized to work) rather than what they need (sponsorship).

### Rule 3: Suggest Optimal Placement for Authorization Details
- Work authorization information should appear in a clear, dedicated location — typically:
  - In the header/contact section (e.g., "Authorized to work in the US")
  - Or in a brief "Authorization" or "Work Authorization" section near the top
- Do NOT suggest burying authorization info deep in the resume or in footnotes.
- If authorization info is scattered across multiple sections, suggest consolidating it into one clear statement.

### Rule 4: Avoid Misrepresenting Employment Eligibility
- NEVER suggest language that could misrepresent the candidate's actual employment eligibility or immigration status.
- Do NOT suggest claiming citizenship, permanent residency, or unrestricted work authorization if the resume indicates otherwise.
- Do NOT suggest removing visa type details (e.g., changing "H-1B visa holder" to just "authorized to work") if doing so would be misleading about the candidate's actual status.
- Accuracy about employment eligibility is legally important — always preserve truthfulness.

### Rule 5: Visa-Specific Category
- When generating suggestions related to work authorization placement, framing, or formatting, use the category "visa_optimization".
- These suggestions should have type "hr" since they relate to human reviewer perception.
- Authorization-related suggestions should generally be severity "warning" (not info) since proper handling of visa information significantly impacts hiring outcomes.

When in doubt about a visa-related edit, err on the side of preserving the original text rather than suggesting a change that might remove or misrepresent authorization information.`;

// ── Visa-specific suggestion category ────────────────────────────────────────

/**
 * Additional valid category for visa-flagged resumes.
 * This should be added to the VALID_CATEGORIES set when validating
 * optimization results for visa-flagged resumes.
 */
export const VISA_OPTIMIZATION_CATEGORY = "visa_optimization";

// ── Helper: Build visa-aware system prompt ───────────────────────────────────

/**
 * Returns the visa optimization rules to append to the base optimization
 * system prompt. Returns an empty string if visa is not flagged.
 */
export function getVisaOptimizationRules(visaFlagged: boolean): string {
  return visaFlagged ? VISA_OPTIMIZATION_RULES : "";
}

// ── Helper: Build visa context section for user prompt ───────────────────────

/**
 * Builds an optional "Visa Context" section for the optimization user prompt.
 * Includes the detected visa signals so the LLM has full context about what
 * authorization information is present in the resume.
 *
 * Returns an empty string if visa is not flagged or no signals are provided.
 */
export function buildVisaContextSection(
  visaFlagged: boolean,
  signals?: string[]
): string {
  if (!visaFlagged) return "";

  const parts: string[] = [];
  parts.push("## Visa / Work Authorization Context");
  parts.push(
    "This candidate has visa-related information in their resume. The following signals were detected:"
  );

  if (signals && signals.length > 0) {
    for (const signal of signals) {
      parts.push(`- ${signal}`);
    }
  } else {
    parts.push("- Visa-related content detected (specific signals not available)");
  }

  parts.push("");
  parts.push(
    "Apply the visa-aware optimization rules from the system prompt when generating suggestions for this resume."
  );
  parts.push("");

  return parts.join("\n");
}
