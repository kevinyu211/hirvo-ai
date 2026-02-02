/**
 * HR Engine — Layer 1: Formatting Analysis
 *
 * Compares a user's resume formatting against reference resumes
 * (known-successful resumes stored in the database) to produce
 * a formatting score and statistical suggestions.
 */

import {
  extractFormattingPatterns,
  FormattingPatterns,
} from "@/lib/formatting-patterns";
import type { HRFeedback } from "@/lib/types";

export interface FormattingSuggestion {
  aspect: string;
  userValue: string;
  referenceValue: string;
  percentageSupport: number; // e.g., 85 means "85% of successful resumes"
  message: string;
  severity: "critical" | "warning" | "info";
}

export interface FormattingAnalysisResult {
  score: number; // 0-100
  suggestions: FormattingSuggestion[];
  feedback: HRFeedback[];
  userPatterns: FormattingPatterns;
  referenceCount: number;
}

interface ReferenceResumeRecord {
  id: string;
  title: string;
  industry: string | null;
  role_level: string | null;
  formatting_patterns: FormattingPatterns | null;
}

/**
 * Analyze a user's resume formatting against reference resumes.
 *
 * @param resumeText - The user's resume text
 * @param metadata - Optional metadata (pageCount, etc.)
 * @param referenceResumes - Pre-fetched reference resumes (for testability)
 */
export function analyzeFormatting(
  resumeText: string,
  metadata?: { pageCount?: number },
  referenceResumes?: ReferenceResumeRecord[]
): FormattingAnalysisResult {
  const userPatterns = extractFormattingPatterns(
    resumeText,
    metadata?.pageCount
  );

  // Filter references that have formatting patterns
  const refs = (referenceResumes ?? []).filter(
    (r): r is ReferenceResumeRecord & { formatting_patterns: FormattingPatterns } =>
      r.formatting_patterns !== null
  );

  // If no reference resumes available, do a standalone analysis
  if (refs.length === 0) {
    return analyzeStandalone(userPatterns);
  }

  return analyzeAgainstReferences(userPatterns, refs);
}

/**
 * Query reference resumes from Supabase, filtered by industry/role level.
 * This is separated from analyzeFormatting for testability — callers
 * fetch references and pass them in.
 */
export async function fetchReferenceResumes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: { from: (table: string) => any },
  filters?: { industry?: string; roleLevel?: string }
): Promise<ReferenceResumeRecord[]> {
  let query = supabaseClient
    .from("reference_resumes")
    .select("id, title, industry, role_level, formatting_patterns");

  // Apply filters if provided
  if (filters?.industry) {
    query = query.eq("industry", filters.industry);
  }
  if (filters?.roleLevel) {
    query = query.eq("role_level", filters.roleLevel);
  }

  const { data, error } = await query.limit(50);

  if (error || !data) {
    return [];
  }

  return data as ReferenceResumeRecord[];
}

// ── Standalone analysis (no reference resumes) ────────────────────────

function analyzeStandalone(
  userPatterns: FormattingPatterns
): FormattingAnalysisResult {
  const suggestions: FormattingSuggestion[] = [];
  let score = 100;

  // Page count check (industry standard: 1-2 pages)
  if (userPatterns.pageCount > 2) {
    const deduction = 15;
    score -= deduction;
    suggestions.push({
      aspect: "page_count",
      userValue: `${userPatterns.pageCount} pages`,
      referenceValue: "1-2 pages",
      percentageSupport: 90,
      message: `Your resume is ${userPatterns.pageCount} pages. Most successful resumes are 1-2 pages.`,
      severity: "warning",
    });
  }

  // Summary section check
  if (!userPatterns.hasSummary) {
    const deduction = 10;
    score -= deduction;
    suggestions.push({
      aspect: "summary_section",
      userValue: "No summary section",
      referenceValue: "Has summary section",
      percentageSupport: 75,
      message: "Your resume doesn't have a summary or objective section. Most successful resumes include one.",
      severity: "warning",
    });
  }

  // Heading consistency
  if (!userPatterns.headingStyle.consistent) {
    const deduction = 10;
    score -= deduction;
    suggestions.push({
      aspect: "heading_consistency",
      userValue: `Mixed styles: ${userPatterns.headingStyle.styles.join(", ")}`,
      referenceValue: "Consistent heading style",
      percentageSupport: 88,
      message: `Your headings use mixed styles (${userPatterns.headingStyle.styles.join(", ")}). Use a consistent heading style throughout.`,
      severity: "warning",
    });
  }

  // Date format consistency
  if (!userPatterns.dateFormat.consistent) {
    const deduction = 8;
    score -= deduction;
    suggestions.push({
      aspect: "date_consistency",
      userValue: `Mixed formats: ${userPatterns.dateFormat.formats.join(", ")}`,
      referenceValue: "Consistent date format",
      percentageSupport: 85,
      message: `Your resume uses mixed date formats (${userPatterns.dateFormat.formats.join(", ")}). Use a single consistent format.`,
      severity: "warning",
    });
  }

  // Quantified metrics check
  if (userPatterns.quantifiedMetrics.count < 3) {
    const deduction = 10;
    score -= deduction;
    suggestions.push({
      aspect: "quantified_metrics",
      userValue: `${userPatterns.quantifiedMetrics.count} metrics found`,
      referenceValue: "3+ quantified metrics",
      percentageSupport: 80,
      message: `Your resume has only ${userPatterns.quantifiedMetrics.count} quantified metric(s). Strong resumes include numbers, percentages, and dollar amounts to demonstrate impact.`,
      severity: userPatterns.quantifiedMetrics.count === 0 ? "critical" : "warning",
    });
  }

  // Bullet points check
  if (userPatterns.bulletStyle.totalBullets === 0) {
    const deduction = 12;
    score -= deduction;
    suggestions.push({
      aspect: "bullet_points",
      userValue: "No bullet points detected",
      referenceValue: "Uses bullet points",
      percentageSupport: 92,
      message: "No bullet points were detected. Use bullet points to list your achievements and responsibilities.",
      severity: "critical",
    });
  } else if (userPatterns.bulletStyle.avgBulletsPerEntry > 7) {
    const deduction = 5;
    score -= deduction;
    suggestions.push({
      aspect: "bullet_density",
      userValue: `${userPatterns.bulletStyle.avgBulletsPerEntry} bullets per entry`,
      referenceValue: "3-5 bullets per entry",
      percentageSupport: 78,
      message: `You have an average of ${userPatterns.bulletStyle.avgBulletsPerEntry} bullets per role. Most successful resumes use 3-5 bullets per role for readability.`,
      severity: "info",
    });
  }

  // Section order check — key sections should exist
  const keySections = ["Experience", "Education", "Skills"];
  const missingSections = keySections.filter(
    (s) => !userPatterns.sectionOrder.includes(s)
  );
  if (missingSections.length > 0) {
    const deduction = missingSections.length * 5;
    score -= deduction;
    suggestions.push({
      aspect: "missing_sections",
      userValue: `Missing: ${missingSections.join(", ")}`,
      referenceValue: "Has Experience, Education, Skills sections",
      percentageSupport: 95,
      message: `Your resume is missing key section(s): ${missingSections.join(", ")}. Include these sections for a complete resume.`,
      severity: "critical",
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    suggestions,
    feedback: suggestionsToFeedback(suggestions),
    userPatterns,
    referenceCount: 0,
  };
}

// ── Reference-based analysis ──────────────────────────────────────────

function analyzeAgainstReferences(
  userPatterns: FormattingPatterns,
  refs: (ReferenceResumeRecord & { formatting_patterns: FormattingPatterns })[]
): FormattingAnalysisResult {
  const suggestions: FormattingSuggestion[] = [];
  let score = 100;
  const refCount = refs.length;
  const refPatterns = refs.map((r) => r.formatting_patterns);

  // ── Page count comparison ──
  const refPageCounts = refPatterns.map((p) => p.pageCount);
  const modePageCount = mode(refPageCounts);
  const pctAtMode = percentage(refPageCounts, modePageCount);

  if (userPatterns.pageCount !== modePageCount && pctAtMode >= 60) {
    const deduction = userPatterns.pageCount > modePageCount + 1 ? 15 : 8;
    score -= deduction;
    suggestions.push({
      aspect: "page_count",
      userValue: `${userPatterns.pageCount} page(s)`,
      referenceValue: `${modePageCount} page(s)`,
      percentageSupport: pctAtMode,
      message: `${pctAtMode}% of successful resumes at your level use ${modePageCount} page(s). Yours is ${userPatterns.pageCount} page(s).`,
      severity: deduction >= 15 ? "critical" : "warning",
    });
  }

  // ── Summary section comparison ──
  const refsWithSummary = refPatterns.filter((p) => p.hasSummary).length;
  const pctSummary = Math.round((refsWithSummary / refCount) * 100);

  if (!userPatterns.hasSummary && pctSummary >= 60) {
    const deduction = 10;
    score -= deduction;
    suggestions.push({
      aspect: "summary_section",
      userValue: "No summary section",
      referenceValue: "Has summary section",
      percentageSupport: pctSummary,
      message: `${pctSummary}% of successful resumes include a summary section. Consider adding one.`,
      severity: "warning",
    });
  }

  // ── Section order comparison ──
  // Check if key sections are ordered like the majority of reference resumes
  const commonOrder = computeCommonSectionOrder(refPatterns);
  if (commonOrder.length >= 2) {
    const orderIssues = checkSectionOrder(userPatterns.sectionOrder, commonOrder, refCount);
    for (const issue of orderIssues) {
      score -= issue.deduction;
      suggestions.push(issue.suggestion);
    }
  }

  // ── Bullet points comparison ──
  const refBulletAvgs = refPatterns.map((p) => p.bulletStyle.avgBulletsPerEntry);
  const avgRefBullets = Math.round(
    refBulletAvgs.reduce((a, b) => a + b, 0) / refBulletAvgs.length
  );

  if (userPatterns.bulletStyle.totalBullets === 0) {
    const pctWithBullets = Math.round(
      (refPatterns.filter((p) => p.bulletStyle.totalBullets > 0).length / refCount) * 100
    );
    if (pctWithBullets >= 50) {
      const deduction = 12;
      score -= deduction;
      suggestions.push({
        aspect: "bullet_points",
        userValue: "No bullet points detected",
        referenceValue: `Uses bullet points (avg ${avgRefBullets} per role)`,
        percentageSupport: pctWithBullets,
        message: `${pctWithBullets}% of successful resumes use bullet points. Add bullet points to describe your experience.`,
        severity: "critical",
      });
    }
  } else if (
    Math.abs(userPatterns.bulletStyle.avgBulletsPerEntry - avgRefBullets) > 3
  ) {
    const deduction = 5;
    score -= deduction;
    const pctInRange = Math.round(
      (refPatterns.filter(
        (p) => Math.abs(p.bulletStyle.avgBulletsPerEntry - avgRefBullets) <= 2
      ).length / refCount) * 100
    );
    suggestions.push({
      aspect: "bullet_density",
      userValue: `${userPatterns.bulletStyle.avgBulletsPerEntry} bullets per entry`,
      referenceValue: `${avgRefBullets} bullets per entry`,
      percentageSupport: pctInRange,
      message: `${pctInRange}% of successful resumes have ${avgRefBullets - 2}-${avgRefBullets + 2} bullet points per role. You have ${userPatterns.bulletStyle.avgBulletsPerEntry}.`,
      severity: "info",
    });
  }

  // ── Quantified metrics comparison ──
  const refMetricCounts = refPatterns.map((p) => p.quantifiedMetrics.count);
  const avgRefMetrics = Math.round(
    refMetricCounts.reduce((a, b) => a + b, 0) / refMetricCounts.length
  );

  if (userPatterns.quantifiedMetrics.count < avgRefMetrics * 0.5) {
    const pctWithMore = Math.round(
      (refPatterns.filter(
        (p) => p.quantifiedMetrics.count > userPatterns.quantifiedMetrics.count
      ).length / refCount) * 100
    );
    const deduction = userPatterns.quantifiedMetrics.count === 0 ? 12 : 8;
    score -= deduction;
    suggestions.push({
      aspect: "quantified_metrics",
      userValue: `${userPatterns.quantifiedMetrics.count} metrics found`,
      referenceValue: `Average ${avgRefMetrics} metrics`,
      percentageSupport: pctWithMore,
      message: `${pctWithMore}% of successful resumes have more quantified metrics than yours. Add numbers, percentages, and dollar amounts to demonstrate impact.`,
      severity: userPatterns.quantifiedMetrics.count === 0 ? "critical" : "warning",
    });
  }

  // ── Heading style consistency ──
  if (!userPatterns.headingStyle.consistent) {
    const pctConsistent = Math.round(
      (refPatterns.filter((p) => p.headingStyle.consistent).length / refCount) * 100
    );
    if (pctConsistent >= 50) {
      const deduction = 8;
      score -= deduction;
      suggestions.push({
        aspect: "heading_consistency",
        userValue: `Mixed styles: ${userPatterns.headingStyle.styles.join(", ")}`,
        referenceValue: "Consistent heading style",
        percentageSupport: pctConsistent,
        message: `${pctConsistent}% of successful resumes use a consistent heading style. Yours mixes ${userPatterns.headingStyle.styles.join(" and ")}.`,
        severity: "warning",
      });
    }
  }

  // ── Date format consistency ──
  if (!userPatterns.dateFormat.consistent) {
    const pctConsistent = Math.round(
      (refPatterns.filter((p) => p.dateFormat.consistent).length / refCount) * 100
    );
    if (pctConsistent >= 50) {
      const deduction = 6;
      score -= deduction;
      suggestions.push({
        aspect: "date_consistency",
        userValue: `Mixed formats: ${userPatterns.dateFormat.formats.join(", ")}`,
        referenceValue: "Consistent date format",
        percentageSupport: pctConsistent,
        message: `${pctConsistent}% of successful resumes use a consistent date format. Use one format throughout.`,
        severity: "warning",
      });
    }
  }

  // ── Missing key sections ──
  const keySections = ["Experience", "Education", "Skills"];
  const missingSections = keySections.filter(
    (s) => !userPatterns.sectionOrder.includes(s)
  );
  if (missingSections.length > 0) {
    const pctWithAll = Math.round(
      (refPatterns.filter((p) =>
        keySections.every((s) => p.sectionOrder.includes(s))
      ).length / refCount) * 100
    );
    const deduction = missingSections.length * 5;
    score -= deduction;
    suggestions.push({
      aspect: "missing_sections",
      userValue: `Missing: ${missingSections.join(", ")}`,
      referenceValue: "Has Experience, Education, Skills sections",
      percentageSupport: pctWithAll,
      message: `${pctWithAll}% of successful resumes include Experience, Education, and Skills. You're missing: ${missingSections.join(", ")}.`,
      severity: "critical",
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    suggestions,
    feedback: suggestionsToFeedback(suggestions),
    userPatterns,
    referenceCount: refCount,
  };
}

// ── Section order helpers ─────────────────────────────────────────────

/**
 * Compute the most common section order from reference resumes.
 * Returns the sections in their most-common relative order.
 */
function computeCommonSectionOrder(
  refPatterns: FormattingPatterns[]
): string[] {
  // Count how often each section appears at each position
  const positionCounts: Record<string, Record<number, number>> = {};

  for (const patterns of refPatterns) {
    for (let i = 0; i < patterns.sectionOrder.length; i++) {
      const section = patterns.sectionOrder[i];
      if (!positionCounts[section]) {
        positionCounts[section] = {};
      }
      positionCounts[section][i] = (positionCounts[section][i] || 0) + 1;
    }
  }

  // For each section, find its most common position
  const sectionAvgPositions: { section: string; avgPos: number }[] = [];
  for (const [section, positions] of Object.entries(positionCounts)) {
    let totalPos = 0;
    let totalCount = 0;
    for (const [pos, count] of Object.entries(positions)) {
      totalPos += Number(pos) * count;
      totalCount += count;
    }
    // Only include sections that appear in at least 30% of references
    if (totalCount >= refPatterns.length * 0.3) {
      sectionAvgPositions.push({
        section,
        avgPos: totalPos / totalCount,
      });
    }
  }

  // Sort by average position
  sectionAvgPositions.sort((a, b) => a.avgPos - b.avgPos);
  return sectionAvgPositions.map((s) => s.section);
}

/**
 * Check if the user's section order matches the common order.
 * Returns issues for any sections that appear out of the expected order.
 */
function checkSectionOrder(
  userOrder: string[],
  commonOrder: string[],
  refCount: number
): { deduction: number; suggestion: FormattingSuggestion }[] {
  const issues: { deduction: number; suggestion: FormattingSuggestion }[] = [];

  // Check pairs of sections that should appear in a specific order
  for (let i = 0; i < commonOrder.length - 1; i++) {
    const sectionA = commonOrder[i];
    const sectionB = commonOrder[i + 1];

    const userIdxA = userOrder.indexOf(sectionA);
    const userIdxB = userOrder.indexOf(sectionB);

    // Both sections must exist in the user's resume
    if (userIdxA === -1 || userIdxB === -1) continue;

    // If sections are in wrong order
    if (userIdxA > userIdxB) {
      issues.push({
        deduction: 5,
        suggestion: {
          aspect: "section_order",
          userValue: `${sectionB} before ${sectionA}`,
          referenceValue: `${sectionA} before ${sectionB}`,
          percentageSupport: Math.round((refCount * 0.7) / refCount * 100), // approximate
          message: `Most successful resumes place "${sectionA}" before "${sectionB}". Consider reordering your sections.`,
          severity: "info" as const,
        },
      });
      // Only report one order issue to avoid being overly noisy
      break;
    }
  }

  return issues;
}

// ── Utility functions ─────────────────────────────────────────────────

/**
 * Find the mode (most common value) of a number array.
 */
function mode(arr: number[]): number {
  const counts: Record<number, number> = {};
  let maxCount = 0;
  let modeVal = arr[0] ?? 1;

  for (const val of arr) {
    counts[val] = (counts[val] || 0) + 1;
    if (counts[val] > maxCount) {
      maxCount = counts[val];
      modeVal = val;
    }
  }

  return modeVal;
}

/**
 * Calculate what percentage of values match the target.
 */
function percentage(arr: number[], target: number): number {
  if (arr.length === 0) return 0;
  const matching = arr.filter((v) => v === target).length;
  return Math.round((matching / arr.length) * 100);
}

/**
 * Convert FormattingSuggestions to HRFeedback items (for unified output).
 */
function suggestionsToFeedback(
  suggestions: FormattingSuggestion[]
): HRFeedback[] {
  return suggestions.map((s) => ({
    type: "formatting" as const,
    layer: 1 as const,
    severity: s.severity,
    message: s.message,
    suggestion: s.aspect === "quantified_metrics"
      ? "Add specific numbers, percentages, and dollar amounts to your bullet points."
      : s.aspect === "bullet_points"
      ? "Use dash (-) or dot (•) bullet points for each achievement."
      : s.aspect === "missing_sections"
      ? `Add the missing section(s): ${s.userValue.replace("Missing: ", "")}.`
      : s.aspect === "summary_section"
      ? "Add a 2-3 sentence professional summary at the top of your resume."
      : s.aspect === "page_count"
      ? `Trim your resume to ${s.referenceValue}.`
      : s.aspect === "heading_consistency"
      ? "Choose one heading style (e.g., ALL CAPS) and use it consistently."
      : s.aspect === "date_consistency"
      ? "Pick one date format (e.g., Month YYYY) and use it throughout."
      : s.aspect === "section_order"
      ? `Reorder your sections: ${s.referenceValue}.`
      : s.aspect === "bullet_density"
      ? `Aim for ${s.referenceValue} for readability.`
      : undefined,
  }));
}
