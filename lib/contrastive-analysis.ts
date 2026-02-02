/**
 * Contrastive Analysis Engine
 *
 * Compares positive (successful) and negative (rejected) resume examples
 * for the same or similar job descriptions to identify what differentiates
 * successful candidates from rejected ones.
 *
 * Key insight: When we have both positive and negative examples for similar jobs,
 * we can identify the exact patterns that correlate with success vs failure.
 */

import type { ContentPatterns } from "@/lib/content-patterns";

export interface ContrastiveInsight {
  pattern: string;           // Category: 'quantification', 'action_verbs', etc.
  metric: string;            // Specific metric name
  positiveAvg: number;       // Average in successful resumes
  negativeAvg: number;       // Average in rejected resumes
  delta: number;             // Difference (positive - negative)
  percentDiff: number;       // Percentage difference
  insight: string;           // Human-readable insight
  importance: "high" | "medium" | "low";
  confidence: number;        // 0-1 based on sample size
}

export interface ContrastiveAnalysisResult {
  hasContrastiveData: boolean;
  positiveCount: number;
  negativeCount: number;
  insights: ContrastiveInsight[];
  summary: string;
}

/**
 * Calculate average value from an array of numbers
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate confidence based on sample sizes
 * More samples = higher confidence
 */
function calculateConfidence(posCount: number, negCount: number): number {
  const minSamples = Math.min(posCount, negCount);
  if (minSamples === 0) return 0;
  if (minSamples === 1) return 0.3;
  if (minSamples === 2) return 0.5;
  if (minSamples <= 5) return 0.7;
  if (minSamples <= 10) return 0.85;
  return 0.95;
}

/**
 * Determine importance based on delta and confidence
 */
function determineImportance(
  percentDiff: number,
  confidence: number
): "high" | "medium" | "low" {
  const significantDiff = Math.abs(percentDiff) > 50;
  const highConfidence = confidence >= 0.7;

  if (significantDiff && highConfidence) return "high";
  if (significantDiff || highConfidence) return "medium";
  return "low";
}

/**
 * Analyze contrastive patterns between positive and negative examples
 */
export function analyzeContrastivePatterns(
  positiveExamples: ContentPatterns[],
  negativeExamples: ContentPatterns[]
): ContrastiveAnalysisResult {
  const posCount = positiveExamples.length;
  const negCount = negativeExamples.length;

  // Need at least one of each for contrastive analysis
  if (posCount === 0 || negCount === 0) {
    return {
      hasContrastiveData: false,
      positiveCount: posCount,
      negativeCount: negCount,
      insights: [],
      summary:
        posCount === 0
          ? "No successful examples available for comparison."
          : "No rejected examples available for comparison.",
    };
  }

  const confidence = calculateConfidence(posCount, negCount);
  const insights: ContrastiveInsight[] = [];

  // 1. Quantification Analysis
  const posMetrics = positiveExamples.map(
    (p) => p.quantification.avgMetricsPerBullet
  );
  const negMetrics = negativeExamples.map(
    (p) => p.quantification.avgMetricsPerBullet
  );
  const posMetricsAvg = average(posMetrics);
  const negMetricsAvg = average(negMetrics);
  const metricsDelta = posMetricsAvg - negMetricsAvg;
  const metricsPercentDiff =
    negMetricsAvg > 0 ? ((metricsDelta / negMetricsAvg) * 100) : (posMetricsAvg > 0 ? 100 : 0);

  if (Math.abs(metricsDelta) > 0.1 || posMetricsAvg > 0.3) {
    insights.push({
      pattern: "quantification",
      metric: "metrics_per_bullet",
      positiveAvg: Math.round(posMetricsAvg * 10) / 10,
      negativeAvg: Math.round(negMetricsAvg * 10) / 10,
      delta: Math.round(metricsDelta * 10) / 10,
      percentDiff: Math.round(metricsPercentDiff),
      insight:
        metricsDelta > 0
          ? `Successful resumes have ${(posMetricsAvg / Math.max(negMetricsAvg, 0.1)).toFixed(1)}x more metrics per bullet point.`
          : `Quantification levels are similar between successful and rejected resumes.`,
      importance: determineImportance(metricsPercentDiff, confidence),
      confidence,
    });
  }

  // 2. Total Metrics Count
  const posTotalMetrics = positiveExamples.map(
    (p) => p.quantification.metricsCount
  );
  const negTotalMetrics = negativeExamples.map(
    (p) => p.quantification.metricsCount
  );
  const posTotalAvg = average(posTotalMetrics);
  const negTotalAvg = average(negTotalMetrics);
  const totalDelta = posTotalAvg - negTotalAvg;
  const totalPercentDiff =
    negTotalAvg > 0 ? ((totalDelta / negTotalAvg) * 100) : (posTotalAvg > 0 ? 100 : 0);

  if (Math.abs(totalDelta) > 2) {
    insights.push({
      pattern: "quantification",
      metric: "total_metrics",
      positiveAvg: Math.round(posTotalAvg),
      negativeAvg: Math.round(negTotalAvg),
      delta: Math.round(totalDelta),
      percentDiff: Math.round(totalPercentDiff),
      insight: `Successful resumes contain ${Math.round(posTotalAvg)} metrics on average vs ${Math.round(negTotalAvg)} in rejected ones.`,
      importance: determineImportance(totalPercentDiff, confidence),
      confidence,
    });
  }

  // 3. Strong vs Weak Verbs
  const posStrongVerbs = positiveExamples.map(
    (p) => p.actionVerbs.strongVerbCount
  );
  const negStrongVerbs = negativeExamples.map(
    (p) => p.actionVerbs.strongVerbCount
  );
  const posWeakVerbs = positiveExamples.map((p) => p.actionVerbs.weakVerbCount);
  const negWeakVerbs = negativeExamples.map((p) => p.actionVerbs.weakVerbCount);

  const posStrongAvg = average(posStrongVerbs);
  const negStrongAvg = average(negStrongVerbs);
  const posWeakAvg = average(posWeakVerbs);
  const negWeakAvg = average(negWeakVerbs);

  // Strong verbs difference
  if (posStrongAvg - negStrongAvg > 2) {
    insights.push({
      pattern: "action_verbs",
      metric: "strong_verbs",
      positiveAvg: Math.round(posStrongAvg),
      negativeAvg: Math.round(negStrongAvg),
      delta: Math.round(posStrongAvg - negStrongAvg),
      percentDiff: Math.round(
        negStrongAvg > 0
          ? ((posStrongAvg - negStrongAvg) / negStrongAvg) * 100
          : 100
      ),
      insight: `Successful candidates use ${Math.round(posStrongAvg)} strong action verbs vs ${Math.round(negStrongAvg)} in rejected resumes.`,
      importance: determineImportance(
        negStrongAvg > 0
          ? ((posStrongAvg - negStrongAvg) / negStrongAvg) * 100
          : 50,
        confidence
      ),
      confidence,
    });
  }

  // Weak verbs (lower is better)
  if (negWeakAvg - posWeakAvg > 1) {
    insights.push({
      pattern: "action_verbs",
      metric: "weak_verbs",
      positiveAvg: Math.round(posWeakAvg),
      negativeAvg: Math.round(negWeakAvg),
      delta: Math.round(posWeakAvg - negWeakAvg),
      percentDiff: Math.round(
        posWeakAvg > 0
          ? ((negWeakAvg - posWeakAvg) / posWeakAvg) * 100
          : 100
      ),
      insight: `Rejected resumes have ${Math.round(negWeakAvg - posWeakAvg)} more weak verbs (helped, assisted, worked) on average.`,
      importance: determineImportance(
        posWeakAvg > 0
          ? ((negWeakAvg - posWeakAvg) / posWeakAvg) * 100
          : 50,
        confidence
      ),
      confidence,
    });
  }

  // 4. Results-First Achievement Framing
  const posResultsFirst = positiveExamples.map(
    (p) => p.achievements.resultsFirstCount
  );
  const negResultsFirst = negativeExamples.map(
    (p) => p.achievements.resultsFirstCount
  );
  const posResultsAvg = average(posResultsFirst);
  const negResultsAvg = average(negResultsFirst);

  if (posResultsAvg - negResultsAvg > 2) {
    insights.push({
      pattern: "achievement_framing",
      metric: "results_first",
      positiveAvg: Math.round(posResultsAvg),
      negativeAvg: Math.round(negResultsAvg),
      delta: Math.round(posResultsAvg - negResultsAvg),
      percentDiff: Math.round(
        negResultsAvg > 0
          ? ((posResultsAvg - negResultsAvg) / negResultsAvg) * 100
          : 100
      ),
      insight: `Successful resumes lead ${Math.round(posResultsAvg)} bullets with results vs ${Math.round(negResultsAvg)} in rejected ones.`,
      importance: determineImportance(
        negResultsAvg > 0
          ? ((posResultsAvg - negResultsAvg) / negResultsAvg) * 100
          : 50,
        confidence
      ),
      confidence,
    });
  }

  // 5. Bullet Count / Detail Level
  const posBullets = positiveExamples.map((p) => p.structure.bulletCount);
  const negBullets = negativeExamples.map((p) => p.structure.bulletCount);
  const posBulletAvg = average(posBullets);
  const negBulletAvg = average(negBullets);
  const bulletDelta = posBulletAvg - negBulletAvg;

  if (Math.abs(bulletDelta) > 5) {
    insights.push({
      pattern: "structure",
      metric: "bullet_count",
      positiveAvg: Math.round(posBulletAvg),
      negativeAvg: Math.round(negBulletAvg),
      delta: Math.round(bulletDelta),
      percentDiff: Math.round(
        negBulletAvg > 0 ? (bulletDelta / negBulletAvg) * 100 : 100
      ),
      insight:
        bulletDelta > 0
          ? `Successful resumes have more detail (${Math.round(posBulletAvg)} vs ${Math.round(negBulletAvg)} bullets).`
          : `Successful resumes are more concise (${Math.round(posBulletAvg)} vs ${Math.round(negBulletAvg)} bullets).`,
      importance: determineImportance(
        negBulletAvg > 0 ? (bulletDelta / negBulletAvg) * 100 : 50,
        confidence
      ),
      confidence,
    });
  }

  // 6. Verb Diversity
  const posDiversity = positiveExamples.map((p) => p.actionVerbs.verbDiversity);
  const negDiversity = negativeExamples.map((p) => p.actionVerbs.verbDiversity);
  const posDivAvg = average(posDiversity);
  const negDivAvg = average(negDiversity);

  if (posDivAvg - negDivAvg > 0.1) {
    insights.push({
      pattern: "action_verbs",
      metric: "verb_diversity",
      positiveAvg: Math.round(posDivAvg * 100),
      negativeAvg: Math.round(negDivAvg * 100),
      delta: Math.round((posDivAvg - negDivAvg) * 100),
      percentDiff: Math.round(
        negDivAvg > 0 ? ((posDivAvg - negDivAvg) / negDivAvg) * 100 : 100
      ),
      insight: `Successful candidates vary their verbs more (${Math.round(posDivAvg * 100)}% unique vs ${Math.round(negDivAvg * 100)}%).`,
      importance: "medium",
      confidence,
    });
  }

  // Sort by importance
  const importanceOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);

  // Generate summary
  const highImportance = insights.filter((i) => i.importance === "high").length;
  const summary =
    highImportance > 0
      ? `Found ${insights.length} differentiating patterns (${highImportance} high-impact) from ${posCount} successful and ${negCount} rejected examples.`
      : insights.length > 0
      ? `Found ${insights.length} patterns that differ between successful and rejected resumes.`
      : "No significant differences found between successful and rejected resumes.";

  return {
    hasContrastiveData: true,
    positiveCount: posCount,
    negativeCount: negCount,
    insights,
    summary,
  };
}

/**
 * Generate user-facing suggestions from contrastive insights
 */
export function contrastiveInsightsToSuggestions(
  userPatterns: ContentPatterns,
  contrastiveResult: ContrastiveAnalysisResult
): Array<{
  message: string;
  importance: "high" | "medium" | "low";
  type: string;
  source: "learned";
}> {
  if (!contrastiveResult.hasContrastiveData) {
    return [];
  }

  const suggestions: Array<{
    message: string;
    importance: "high" | "medium" | "low";
    type: string;
    source: "learned";
  }> = [];

  for (const insight of contrastiveResult.insights) {
    // Only include relevant insights where user is below the positive average
    let isRelevant = false;
    let userValue = 0;

    switch (insight.metric) {
      case "metrics_per_bullet":
        userValue = userPatterns.quantification.avgMetricsPerBullet;
        isRelevant = userValue < insight.positiveAvg * 0.8;
        break;
      case "total_metrics":
        userValue = userPatterns.quantification.metricsCount;
        isRelevant = userValue < insight.positiveAvg * 0.8;
        break;
      case "strong_verbs":
        userValue = userPatterns.actionVerbs.strongVerbCount;
        isRelevant = userValue < insight.positiveAvg * 0.8;
        break;
      case "weak_verbs":
        userValue = userPatterns.actionVerbs.weakVerbCount;
        isRelevant = userValue > insight.positiveAvg * 1.2;
        break;
      case "results_first":
        userValue = userPatterns.achievements.resultsFirstCount;
        isRelevant = userValue < insight.positiveAvg * 0.8;
        break;
      case "bullet_count":
        userValue = userPatterns.structure.bulletCount;
        // For bullet count, check if user is far from the positive average
        isRelevant = Math.abs(userValue - insight.positiveAvg) > 5;
        break;
      case "verb_diversity":
        userValue = userPatterns.actionVerbs.verbDiversity * 100;
        isRelevant = userValue < insight.positiveAvg * 0.8;
        break;
    }

    if (isRelevant && insight.importance !== "low") {
      suggestions.push({
        message: `[Learned] ${insight.insight}`,
        importance: insight.importance,
        type: insight.pattern,
        source: "learned",
      });
    }
  }

  return suggestions;
}
