// =============================================================================
// Visa Detection Module
// =============================================================================
// Detects visa-related status from resume text and user context capture.
// Used to flag analyses for visa-aware routing (avatar Q&A + optimization rules).
// =============================================================================

import type { UserContext } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VisaDetectionResult {
  visaFlagged: boolean;
  signals: string[];
}

// ---------------------------------------------------------------------------
// Visa-related regex patterns
// ---------------------------------------------------------------------------

// Each pattern has a regex and a human-readable label for the signal list
const VISA_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Specific visa types
  { pattern: /\bH[- ]?1B\b/i, label: "H-1B visa mention" },
  { pattern: /\bH[- ]?1B1\b/i, label: "H-1B1 visa mention" },
  { pattern: /\bH[- ]?2[AB]\b/i, label: "H-2A/H-2B visa mention" },
  { pattern: /\bH[- ]?4\b/i, label: "H-4 visa mention" },
  { pattern: /\bL[- ]?1[AB]?\b/i, label: "L-1 visa mention" },
  { pattern: /\bO[- ]?1[AB]?\b/i, label: "O-1 visa mention" },
  { pattern: /\bTN[- ]?visa\b/i, label: "TN visa mention" },
  { pattern: /\bE[- ]?[23]\b/i, label: "E-2/E-3 visa mention" },
  { pattern: /\bJ[- ]?1\b/i, label: "J-1 visa mention" },
  { pattern: /\bF[- ]1\b/i, label: "F-1 visa mention" },
  { pattern: /\bM[- ]1\b/i, label: "M-1 visa mention" },

  // Work authorization types
  { pattern: /\bOPT\b/, label: "OPT (Optional Practical Training) mention" },
  { pattern: /\bCPT\b/, label: "CPT (Curricular Practical Training) mention" },
  {
    pattern: /\bSTEM[- ]?OPT\b/i,
    label: "STEM OPT extension mention",
  },
  { pattern: /\bEAD\b/, label: "EAD (Employment Authorization Document) mention" },
  {
    pattern: /\bDACA\b/,
    label: "DACA (Deferred Action for Childhood Arrivals) mention",
  },
  { pattern: /\bTPS\b/, label: "TPS (Temporary Protected Status) mention" },

  // General immigration/visa terms
  {
    pattern: /\bwork\s+authoriz(?:ation|ed)\b/i,
    label: "Work authorization mention",
  },
  {
    pattern: /\bemployment\s+authoriz(?:ation|ed)\b/i,
    label: "Employment authorization mention",
  },
  {
    pattern: /\bvisa\s+sponsor(?:ship|ed)?\b/i,
    label: "Visa sponsorship mention",
  },
  {
    pattern: /\bsponsorship\s+(?:required|needed|available)\b/i,
    label: "Sponsorship requirement mention",
  },
  {
    pattern: /\brequire[s]?\s+(?:visa\s+)?sponsorship\b/i,
    label: "Requires sponsorship mention",
  },
  {
    pattern: /\bimmigration\s+status\b/i,
    label: "Immigration status mention",
  },
  {
    pattern: /\bgreen\s+card\b/i,
    label: "Green card mention",
  },
  {
    pattern: /\bpermanent\s+residen(?:t|ce|cy)\b/i,
    label: "Permanent residency mention",
  },
  {
    pattern: /\bauthoriz(?:ed|ation)\s+to\s+work\b/i,
    label: "Authorization to work mention",
  },
  {
    pattern: /\blegally\s+authorized\b/i,
    label: "Legally authorized mention",
  },
  {
    pattern: /\bwork\s+permit\b/i,
    label: "Work permit mention",
  },
  {
    pattern: /\bI[- ]?9\b/,
    label: "I-9 verification mention",
  },
  {
    pattern: /\bI[- ]?140\b/,
    label: "I-140 petition mention",
  },
  {
    pattern: /\bI[- ]?485\b/,
    label: "I-485 adjustment of status mention",
  },
  {
    pattern: /\bI[- ]?765\b/,
    label: "I-765 (EAD application) mention",
  },
  {
    pattern: /\bUSCIS\b/,
    label: "USCIS mention",
  },
];

// ---------------------------------------------------------------------------
// Context-based visa status values that trigger visa flagging
// ---------------------------------------------------------------------------

const VISA_CONTEXT_STATUSES = new Set([
  "h1b",
  "opt_cpt",
  "other",
]);

// ---------------------------------------------------------------------------
// Main Detection Function
// ---------------------------------------------------------------------------

/**
 * Detects whether a resume/user context contains visa-related information.
 *
 * Checks two sources:
 * 1. Resume text — scanned for visa-related terms via regex
 * 2. User context capture — checks the visa status dropdown value
 *
 * Returns `visaFlagged: true` if ANY signal is detected from either source.
 */
export function detectVisaStatus(
  resumeText: string,
  userContext?: UserContext | null
): VisaDetectionResult {
  const signals: string[] = [];

  // ── Check user context dropdown ─────────────────────────────────────
  if (userContext?.visaStatus && VISA_CONTEXT_STATUSES.has(userContext.visaStatus)) {
    const statusLabels: Record<string, string> = {
      h1b: "User selected H-1B visa status",
      opt_cpt: "User selected OPT/CPT visa status",
      other: "User selected 'Other' visa status",
    };
    signals.push(statusLabels[userContext.visaStatus] || "User indicated non-domestic visa status");
  }

  // ── Scan resume text for visa-related terms ─────────────────────────
  if (resumeText && resumeText.trim().length > 0) {
    for (const { pattern, label } of VISA_PATTERNS) {
      if (pattern.test(resumeText)) {
        signals.push(label);
      }
    }
  }

  // Deduplicate signals (same label from different patterns shouldn't repeat)
  const uniqueSignals = Array.from(new Set(signals));

  return {
    visaFlagged: uniqueSignals.length > 0,
    signals: uniqueSignals,
  };
}
