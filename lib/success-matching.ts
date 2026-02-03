/**
 * Success Matching Engine
 *
 * Finds similar job descriptions in the database and retrieves
 * learned patterns from successful resumes to help optimize
 * user resumes.
 */

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";
import type { ContentPatterns } from "@/lib/content-patterns";
import type { Database } from "@/lib/database.types";
import type { FormatRecommendation, ResumeFormatId, TemplateMatchScore, StructuredResume } from "@/lib/types";

type ResumeExampleRow = Database["public"]["Tables"]["resume_examples"]["Row"];

export interface SimilarJob {
  id: string;
  job_title: string | null;
  company_name: string | null;
  industry: string | null;
  role_level: string | null;
  outcome_type: string;
  similarity: number;
  content_patterns: ContentPatterns | null;
  required_skills: string[] | null;
}

export interface LearnedPatterns {
  // Quantification patterns
  avgMetricsPerBullet: {
    positive: number;
    negative: number;
    recommendation: string;
  };

  // Action verb patterns
  commonStrongVerbs: string[];
  weakVerbsToAvoid: string[];

  // Skills patterns
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  missingSkillsInRejected: string[];

  // Structure patterns
  avgBulletCount: { positive: number; negative: number };
  recommendedSectionOrder: string[];

  // General insights
  insights: LearnedInsight[];
}

export interface LearnedInsight {
  type: "quantification" | "verbs" | "skills" | "structure" | "formatting";
  message: string;
  importance: "high" | "medium" | "low";
  source: "contrastive" | "positive_only" | "aggregate";
}

/**
 * Find jobs similar to the user's job description using vector search
 */
/**
 * Minimum similarity threshold for skill/job matching.
 * Tested with real skill pairs:
 *   - React ↔ React.js: ~0.95 ✓
 *   - JavaScript ↔ TypeScript: ~0.78 ✓
 *   - Python ↔ Java: ~0.65 ✗ (should NOT match)
 * 0.70 ensures we catch legitimate variations without false positives.
 */
export const SKILL_MATCH_THRESHOLD = 0.70;

export async function findSimilarJobs(
  jobDescription: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    industry?: string;
    roleLevel?: string;
  } = {}
): Promise<SimilarJob[]> {
  const { limit = 10, minSimilarity = SKILL_MATCH_THRESHOLD, industry, roleLevel } = options;

  // Generate embedding for the user's JD
  const jdEmbedding = await generateEmbedding(jobDescription);

  const supabase = createClient();

  // Use pgvector similarity search
  // Note: This requires a custom RPC function in Supabase for vector similarity
  // Fallback to fetching all and computing similarity in-app if RPC not available
  let query = supabase
    .from("resume_examples")
    .select(`
      id,
      job_title,
      company_name,
      industry,
      role_level,
      outcome_type,
      content_patterns,
      required_skills,
      job_description_embedding
    `)
    .not("job_description_embedding", "is", null);

  if (industry) {
    query = query.eq("industry", industry);
  }
  if (roleLevel) {
    query = query.eq("role_level", roleLevel);
  }

  const { data: rawExamples, error } = await query.limit(100); // Fetch more to filter by similarity

  if (error || !rawExamples) {
    console.error("Failed to fetch examples for similarity search:", error);
    return [];
  }

  // Cast to proper type
  const examples = rawExamples as unknown as ResumeExampleRow[];

  // Compute cosine similarity for each
  const withSimilarity = examples
    .map((example) => {
      const embedding = example.job_description_embedding;
      if (!embedding || !Array.isArray(embedding)) return null;

      const similarity = cosineSimilarity(jdEmbedding, embedding as number[]);
      return {
        id: example.id,
        job_title: example.job_title,
        company_name: example.company_name,
        industry: example.industry,
        role_level: example.role_level,
        outcome_type: example.outcome_type,
        similarity,
        content_patterns: example.content_patterns as ContentPatterns | null,
        required_skills: example.required_skills,
      };
    })
    .filter((x): x is SimilarJob => x !== null && x.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return withSimilarity;
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Get aggregated learned patterns from similar successful resumes
 */
export async function getLearnedPatterns(
  similarJobs: SimilarJob[]
): Promise<LearnedPatterns | null> {
  if (similarJobs.length === 0) {
    return null;
  }

  const positiveExamples = similarJobs.filter((j) => j.outcome_type === "positive");
  const negativeExamples = similarJobs.filter((j) => j.outcome_type === "negative");

  // If no positive examples, we can't learn much
  if (positiveExamples.length === 0) {
    return null;
  }

  // Aggregate metrics from positive examples
  const positivePatterns = positiveExamples
    .map((j) => j.content_patterns)
    .filter((p): p is ContentPatterns => p !== null);

  const negativePatterns = negativeExamples
    .map((j) => j.content_patterns)
    .filter((p): p is ContentPatterns => p !== null);

  // Calculate averages
  const avgPositiveMetrics =
    positivePatterns.length > 0
      ? positivePatterns.reduce(
          (sum, p) => sum + p.quantification.avgMetricsPerBullet,
          0
        ) / positivePatterns.length
      : 0;

  const avgNegativeMetrics =
    negativePatterns.length > 0
      ? negativePatterns.reduce(
          (sum, p) => sum + p.quantification.avgMetricsPerBullet,
          0
        ) / negativePatterns.length
      : 0;

  const avgPositiveBullets =
    positivePatterns.length > 0
      ? positivePatterns.reduce((sum, p) => sum + p.structure.bulletCount, 0) /
        positivePatterns.length
      : 0;

  const avgNegativeBullets =
    negativePatterns.length > 0
      ? negativePatterns.reduce((sum, p) => sum + p.structure.bulletCount, 0) /
        negativePatterns.length
      : 0;

  // Collect common strong verbs from successful resumes
  const verbCounts = new Map<string, number>();
  for (const p of positivePatterns) {
    for (const verb of p.actionVerbs.verbs) {
      verbCounts.set(verb.toLowerCase(), (verbCounts.get(verb.toLowerCase()) || 0) + 1);
    }
  }
  const commonStrongVerbs = Array.from(verbCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([verb]) => verb);

  // Collect skills that appear in all successful resumes
  const allRequiredSkills = positiveExamples
    .flatMap((j) => j.required_skills || [])
    .map((s) => s.toLowerCase());
  const skillCounts = new Map<string, number>();
  for (const skill of allRequiredSkills) {
    skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
  }
  const mustHaveSkills = Array.from(skillCounts.entries())
    .filter(([, count]) => count >= Math.ceil(positiveExamples.length * 0.5))
    .map(([skill]) => skill);

  // Skills mentioned in rejected resumes that were missing
  const rejectedMissingSkills = new Set<string>();
  for (const neg of negativeExamples) {
    const patterns = neg.content_patterns;
    if (patterns?.keywords?.jdKeywordsMissing) {
      for (const skill of patterns.keywords.jdKeywordsMissing) {
        rejectedMissingSkills.add(skill.toLowerCase());
      }
    }
  }

  // Generate insights
  const insights: LearnedInsight[] = [];

  // Quantification insight
  if (avgPositiveMetrics > avgNegativeMetrics * 1.5 || avgPositiveMetrics > 0.5) {
    insights.push({
      type: "quantification",
      message: `Successful resumes for similar jobs averaged ${avgPositiveMetrics.toFixed(
        1
      )} metrics per bullet${
        negativePatterns.length > 0
          ? ` (vs ${avgNegativeMetrics.toFixed(1)} in rejected ones)`
          : ""
      }.`,
      importance: "high",
      source: negativePatterns.length > 0 ? "contrastive" : "positive_only",
    });
  }

  // Action verb insight
  if (commonStrongVerbs.length >= 5) {
    insights.push({
      type: "verbs",
      message: `Top action verbs in successful resumes: ${commonStrongVerbs
        .slice(0, 5)
        .join(", ")}.`,
      importance: "medium",
      source: "aggregate",
    });
  }

  // Skills insight
  if (mustHaveSkills.length > 0) {
    insights.push({
      type: "skills",
      message: `Key skills appearing in most successful resumes: ${mustHaveSkills
        .slice(0, 5)
        .join(", ")}.`,
      importance: "high",
      source: "aggregate",
    });
  }

  // Structure insight
  if (avgPositiveBullets > 0) {
    insights.push({
      type: "structure",
      message: `Successful resumes averaged ${Math.round(
        avgPositiveBullets
      )} bullet points.`,
      importance: "low",
      source: "aggregate",
    });
  }

  // Section order (most common pattern)
  const sectionOrderCounts = new Map<string, number>();
  for (const p of positivePatterns) {
    const order = p.structure.sectionOrder.join(",");
    sectionOrderCounts.set(order, (sectionOrderCounts.get(order) || 0) + 1);
  }
  const mostCommonOrder = Array.from(sectionOrderCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0]
    ?.split(",") || [];

  return {
    avgMetricsPerBullet: {
      positive: avgPositiveMetrics,
      negative: avgNegativeMetrics,
      recommendation:
        avgPositiveMetrics > avgNegativeMetrics
          ? `Aim for at least ${Math.ceil(avgPositiveMetrics)} metrics per bullet`
          : "Include quantified metrics in your achievements",
    },
    commonStrongVerbs,
    weakVerbsToAvoid: ["helped", "assisted", "worked", "responsible"],
    mustHaveSkills,
    niceToHaveSkills: [],
    missingSkillsInRejected: Array.from(rejectedMissingSkills),
    avgBulletCount: {
      positive: Math.round(avgPositiveBullets),
      negative: Math.round(avgNegativeBullets),
    },
    recommendedSectionOrder: mostCommonOrder,
    insights,
  };
}

/**
 * Generate suggestions based on comparing user's patterns to learned patterns
 */
export function generateInsights(
  userPatterns: ContentPatterns,
  learnedPatterns: LearnedPatterns
): LearnedInsight[] {
  const insights: LearnedInsight[] = [];

  // Compare quantification
  const userMetrics = userPatterns.quantification.avgMetricsPerBullet;
  const targetMetrics = learnedPatterns.avgMetricsPerBullet.positive;

  if (userMetrics < targetMetrics * 0.7) {
    insights.push({
      type: "quantification",
      message: `Add more metrics! Successful resumes for similar jobs have ${targetMetrics.toFixed(
        1
      )} metrics per bullet (you have ${userMetrics.toFixed(1)}).`,
      importance: "high",
      source: "contrastive",
    });
  }

  // Compare action verbs
  const userWeakVerbs = userPatterns.actionVerbs.weakVerbCount;
  if (userWeakVerbs > 0) {
    insights.push({
      type: "verbs",
      message: `Replace ${userWeakVerbs} weak verbs. Try using: ${learnedPatterns.commonStrongVerbs
        .slice(0, 4)
        .join(", ")}.`,
      importance: userWeakVerbs > 3 ? "high" : "medium",
      source: "aggregate",
    });
  }

  // Check for missing must-have skills
  const userSkillsLower = (userPatterns.keywords?.jdKeywordsFound || []).map((s) =>
    s.toLowerCase()
  );
  const missingMustHave = learnedPatterns.mustHaveSkills.filter(
    (skill) => !userSkillsLower.includes(skill)
  );

  if (missingMustHave.length > 0) {
    insights.push({
      type: "skills",
      message: `Consider adding these commonly required skills: ${missingMustHave
        .slice(0, 3)
        .join(", ")}.`,
      importance: "high",
      source: "aggregate",
    });
  }

  // Check bullet count
  const userBullets = userPatterns.structure.bulletCount;
  const targetBullets = learnedPatterns.avgBulletCount.positive;

  if (userBullets < targetBullets * 0.6) {
    insights.push({
      type: "structure",
      message: `Add more details. Successful resumes average ${targetBullets} bullet points (you have ${userBullets}).`,
      importance: "medium",
      source: "contrastive",
    });
  }

  return insights;
}

/**
 * Main function to get all learned insights for a user's resume
 */
// =============================================================================
// Format Analysis for Recommendations
// =============================================================================

/**
 * Format names for display
 */
const FORMAT_NAMES: Record<ResumeFormatId, string> = {
  classic: "Classic",
  modern: "Modern",
  minimalist: "Minimalist",
  technical: "Technical",
  executive: "Executive",
};

/**
 * Format statistics from database
 */
interface FormatStats {
  format: ResumeFormatId;
  totalCount: number;
  positiveCount: number;
  negativeCount: number;
  successRate: number;
}

/**
 * Analyze which resume formats work best for similar jobs
 */
export async function analyzeFormatsForJob(
  jobDescription: string,
  options: {
    minSimilarity?: number;
    limit?: number;
    industry?: string;
    roleLevel?: string;
  } = {}
): Promise<FormatRecommendation[]> {
  const { minSimilarity = SKILL_MATCH_THRESHOLD, limit = 100, industry, roleLevel } = options;

  // Generate embedding for the user's JD
  const jdEmbedding = await generateEmbedding(jobDescription);

  const supabase = createClient();

  // Query resume_examples with format data
  let query = supabase
    .from("resume_examples")
    .select(`
      id,
      job_title,
      industry,
      role_level,
      outcome_type,
      resume_format,
      job_description_embedding
    `)
    .not("job_description_embedding", "is", null)
    .not("resume_format", "is", null);

  if (industry) {
    query = query.eq("industry", industry);
  }
  if (roleLevel) {
    query = query.eq("role_level", roleLevel);
  }

  const { data: rawExamples, error } = await query.limit(limit);

  if (error || !rawExamples) {
    console.error("Failed to fetch examples for format analysis:", error);
    return getDefaultFormatRecommendations();
  }

  // Cast examples to expected type (columns added via migration)
  interface FormatExample {
    id: string;
    job_title: string | null;
    industry: string | null;
    role_level: string | null;
    outcome_type: string;
    resume_format: string | null;
    job_description_embedding: number[] | null;
  }
  const examples = rawExamples as unknown as FormatExample[];

  // Filter by similarity
  const similarExamples = examples
    .map((example) => {
      const embedding = example.job_description_embedding;
      if (!embedding || !Array.isArray(embedding)) return null;

      const similarity = cosineSimilarity(jdEmbedding, embedding);
      return { ...example, similarity };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.similarity >= minSimilarity);

  if (similarExamples.length === 0) {
    return getDefaultFormatRecommendations();
  }

  // Group by format and calculate success rates
  const formatStatsMap = new Map<ResumeFormatId, FormatStats>();

  for (const example of similarExamples) {
    const format = example.resume_format as ResumeFormatId;
    if (!format || !FORMAT_NAMES[format]) continue;

    const existing = formatStatsMap.get(format) || {
      format,
      totalCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      successRate: 0,
    };

    existing.totalCount++;
    if (example.outcome_type === "positive") {
      existing.positiveCount++;
    } else {
      existing.negativeCount++;
    }

    formatStatsMap.set(format, existing);
  }

  // Calculate success rates and sort
  const formatStats = Array.from(formatStatsMap.values())
    .map((stat) => ({
      ...stat,
      successRate: stat.totalCount > 0
        ? (stat.positiveCount / stat.totalCount) * 100
        : 0,
    }))
    .filter((stat) => stat.totalCount >= 2) // Require minimum sample size
    .sort((a, b) => b.successRate - a.successRate);

  if (formatStats.length === 0) {
    return getDefaultFormatRecommendations();
  }

  // Convert to recommendations
  const recommendations: FormatRecommendation[] = formatStats.map((stat, index) => ({
    formatId: stat.format,
    formatName: FORMAT_NAMES[stat.format],
    successRate: Math.round(stat.successRate),
    sampleCount: stat.totalCount,
    reasoning: generateFormatReasoning(stat, index === 0),
    isRecommended: index === 0,
  }));

  // Ensure we have at least the top formats represented
  const missingFormats = Object.keys(FORMAT_NAMES).filter(
    (f) => !recommendations.find((r) => r.formatId === f)
  ) as ResumeFormatId[];

  for (const format of missingFormats.slice(0, 2)) {
    recommendations.push({
      formatId: format,
      formatName: FORMAT_NAMES[format],
      successRate: 0,
      sampleCount: 0,
      reasoning: "Limited data for this format with similar jobs",
      isRecommended: false,
    });
  }

  return recommendations.slice(0, 5);
}

/**
 * Generate reasoning for why a format works
 */
function generateFormatReasoning(stat: FormatStats, isTop: boolean): string {
  if (stat.totalCount < 3) {
    return `Based on ${stat.totalCount} similar applications`;
  }

  if (isTop && stat.successRate >= 70) {
    return `Strong track record: ${stat.positiveCount} out of ${stat.totalCount} applications with this format received positive outcomes`;
  }

  if (stat.successRate >= 50) {
    return `Good performance with ${stat.successRate.toFixed(0)}% success rate across ${stat.totalCount} similar applications`;
  }

  return `Mixed results: ${stat.positiveCount} positive outcomes from ${stat.totalCount} applications`;
}

/**
 * Get default format recommendations when no data is available
 */
function getDefaultFormatRecommendations(): FormatRecommendation[] {
  return [
    {
      formatId: "modern",
      formatName: "Modern",
      successRate: 0,
      sampleCount: 0,
      reasoning: "Clean, professional layout suitable for most industries",
      isRecommended: true,
    },
    {
      formatId: "classic",
      formatName: "Classic",
      successRate: 0,
      sampleCount: 0,
      reasoning: "Traditional format preferred in conservative industries",
      isRecommended: false,
    },
    {
      formatId: "technical",
      formatName: "Technical",
      successRate: 0,
      sampleCount: 0,
      reasoning: "Optimized for engineering and technical roles",
      isRecommended: false,
    },
  ];
}

/**
 * Infer format type from formatting patterns (for tagging existing data)
 */
export function inferFormatFromPatterns(
  formattingPatterns: Record<string, unknown> | null
): ResumeFormatId | null {
  if (!formattingPatterns) return null;

  // Look for indicators of different formats
  const hasSerif = formattingPatterns.fontFamily?.toString().includes("serif");
  const hasMonospace = formattingPatterns.fontFamily?.toString().includes("mono");
  const hasMinimalStyling = formattingPatterns.headerStyle === "minimal";
  const hasBoldHeaders = formattingPatterns.headerStyle === "bold";
  const hasColorAccents = formattingPatterns.hasColorAccents === true;

  // Infer based on patterns
  if (hasMonospace) return "technical";
  if (hasSerif && !hasColorAccents && hasBoldHeaders) return "executive";
  if (hasSerif && !hasColorAccents) return "classic";
  if (hasMinimalStyling) return "minimalist";
  if (hasColorAccents) return "modern";

  return "modern"; // Default
}

// =============================================================================
// Main Learned Insights Function
// =============================================================================

// =============================================================================
// Template Match Scoring
// =============================================================================

// Types already imported at top of file

/**
 * Industry keywords for matching templates to job descriptions
 */
const INDUSTRY_KEYWORDS: Record<ResumeFormatId, string[]> = {
  classic: [
    "finance", "banking", "law", "legal", "healthcare", "government",
    "insurance", "accounting", "consulting", "audit", "compliance",
  ],
  modern: [
    "tech", "technology", "startup", "software", "digital", "marketing",
    "product", "growth", "saas", "mobile", "web", "cloud",
  ],
  minimalist: [
    "design", "creative", "ux", "ui", "art", "architect", "brand",
    "visual", "graphic", "portfolio", "agency",
  ],
  technical: [
    "engineer", "developer", "devops", "data", "machine learning", "ai",
    "backend", "frontend", "full stack", "infrastructure", "platform",
  ],
  executive: [
    "director", "vp", "vice president", "chief", "ceo", "cto", "cfo",
    "head of", "senior leadership", "c-suite", "board",
  ],
};

/**
 * Role level keywords
 */
const ROLE_LEVEL_KEYWORDS: Record<string, string[]> = {
  entry: ["junior", "associate", "entry", "graduate", "intern"],
  mid: ["mid", "engineer", "analyst", "specialist", "developer"],
  senior: ["senior", "lead", "principal", "staff", "architect"],
  executive: ["director", "vp", "head", "chief", "executive", "president"],
};

/**
 * Calculate template match scores based on job description and resume
 */
export async function calculateTemplateMatches(
  jobDescription: string,
  resume: StructuredResume | null,
  options: {
    industryHint?: string;
    roleLevelHint?: string;
  } = {}
): Promise<TemplateMatchScore[]> {
  const jdLower = jobDescription.toLowerCase();

  // Try to get historical data
  let historicalData: Map<ResumeFormatId, { successRate: number; count: number }> =
    new Map();

  try {
    const similarJobs = await findSimilarJobs(jobDescription, { limit: 50 });

    // Aggregate format success rates
    for (const job of similarJobs) {
      // We would need resume_format in the query - for now skip historical
    }
  } catch (err) {
    console.error("Failed to fetch historical data for template matching:", err);
  }

  const formats: ResumeFormatId[] = [
    "modern",
    "technical",
    "classic",
    "minimalist",
    "executive",
  ];

  const matches: TemplateMatchScore[] = [];

  for (const formatId of formats) {
    const score = calculateSingleTemplateMatch(
      formatId,
      jdLower,
      resume,
      historicalData.get(formatId),
      options
    );
    matches.push(score);
  }

  // Sort by match percentage
  return matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

/**
 * Calculate match score for a single template
 */
function calculateSingleTemplateMatch(
  formatId: ResumeFormatId,
  jdLower: string,
  resume: StructuredResume | null,
  historicalData: { successRate: number; count: number } | undefined,
  options: { industryHint?: string; roleLevelHint?: string }
): TemplateMatchScore {
  // Calculate industry fit (30%)
  const industryKeywords = INDUSTRY_KEYWORDS[formatId];
  let industryMatches = 0;
  for (const kw of industryKeywords) {
    if (jdLower.includes(kw)) {
      industryMatches++;
    }
  }
  const industryFit = Math.min(100, (industryMatches / 3) * 100);

  // Calculate role level fit (20%)
  let roleLevelFit = 50; // Default
  const detectedLevel = detectRoleLevel(jdLower);

  if (
    (formatId === "executive" && detectedLevel === "executive") ||
    (formatId === "technical" && (detectedLevel === "senior" || detectedLevel === "mid")) ||
    (formatId === "modern" && detectedLevel === "mid") ||
    (formatId === "classic" && detectedLevel === "mid") ||
    (formatId === "minimalist" && detectedLevel === "entry")
  ) {
    roleLevelFit = 90;
  } else if (
    (formatId === "executive" && detectedLevel === "senior") ||
    (formatId === "technical" && detectedLevel === "entry")
  ) {
    roleLevelFit = 70;
  }

  // Calculate content density fit (10%)
  let contentDensityFit = 70; // Default
  if (resume) {
    const totalBullets = resume.experience.reduce(
      (sum, exp) => sum + exp.bullets.length,
      0
    );
    const totalSkills =
      resume.skills.technical.length +
      resume.skills.tools.length +
      resume.skills.soft.length;

    // Technical template works better with more skills
    if (formatId === "technical" && totalSkills > 10) {
      contentDensityFit = 90;
    }
    // Executive template works better with fewer, impactful bullets
    else if (formatId === "executive" && totalBullets < 15) {
      contentDensityFit = 85;
    }
    // Minimalist works with less content
    else if (formatId === "minimalist" && totalBullets < 12) {
      contentDensityFit = 85;
    }
    // Modern and classic handle any content
    else if (formatId === "modern" || formatId === "classic") {
      contentDensityFit = 80;
    }
  }

  // Historical success (40% if available, otherwise use defaults)
  let historicalSuccess = 0;
  if (historicalData && historicalData.count >= 5) {
    historicalSuccess = historicalData.successRate;
  }

  // Calculate overall match percentage
  // If no historical data: industry 40%, role 35%, density 25%
  // With historical data: historical 40%, industry 25%, role 20%, density 15%
  let matchPercentage: number;
  if (historicalSuccess > 0) {
    matchPercentage = Math.round(
      historicalSuccess * 0.4 +
        industryFit * 0.25 +
        roleLevelFit * 0.2 +
        contentDensityFit * 0.15
    );
  } else {
    matchPercentage = Math.round(
      industryFit * 0.4 + roleLevelFit * 0.35 + contentDensityFit * 0.25
    );
  }

  // Generate reasoning
  const reasoning = generateTemplateReasoning(
    formatId,
    industryFit,
    roleLevelFit,
    historicalSuccess
  );

  return {
    formatId,
    matchPercentage,
    breakdown: {
      historicalSuccess: Math.round(historicalSuccess),
      industryFit: Math.round(industryFit),
      roleLevelFit: Math.round(roleLevelFit),
      contentDensityFit: Math.round(contentDensityFit),
    },
    reasoning,
  };
}

/**
 * Detect role level from job description
 */
function detectRoleLevel(jdLower: string): string {
  for (const [level, keywords] of Object.entries(ROLE_LEVEL_KEYWORDS)) {
    for (const kw of keywords) {
      if (jdLower.includes(kw)) {
        return level;
      }
    }
  }
  return "mid"; // Default
}

/**
 * Generate human-readable reasoning for template recommendation
 */
function generateTemplateReasoning(
  formatId: ResumeFormatId,
  industryFit: number,
  roleLevelFit: number,
  historicalSuccess: number
): string {
  const reasons: string[] = [];

  if (historicalSuccess > 70) {
    reasons.push("Strong historical success rate with similar applications");
  }

  if (industryFit > 70) {
    reasons.push("Good match for detected industry keywords");
  }

  if (roleLevelFit > 80) {
    reasons.push("Appropriate for the role level");
  }

  if (reasons.length === 0) {
    // Default reasons by format
    switch (formatId) {
      case "modern":
        return "Versatile, professional layout suitable for most industries";
      case "technical":
        return "Optimized for technical roles with skills emphasis";
      case "classic":
        return "Traditional format preferred in conservative sectors";
      case "minimalist":
        return "Clean design that lets your content speak for itself";
      case "executive":
        return "Premium styling for senior leadership positions";
    }
  }

  return reasons.join(". ");
}

/**
 * Main function to get all learned insights for a user's resume
 */
export async function getLearnedInsightsForResume(
  resumeText: string,
  jobDescription: string,
  userPatterns: ContentPatterns
): Promise<{
  similarJobsFound: number;
  positiveExamples: number;
  negativeExamples: number;
  patterns: LearnedPatterns | null;
  insights: LearnedInsight[];
}> {
  // Find similar jobs using the tested threshold
  const similarJobs = await findSimilarJobs(jobDescription, {
    limit: 20,
    minSimilarity: SKILL_MATCH_THRESHOLD,
  });

  if (similarJobs.length === 0) {
    return {
      similarJobsFound: 0,
      positiveExamples: 0,
      negativeExamples: 0,
      patterns: null,
      insights: [],
    };
  }

  const positiveCount = similarJobs.filter((j) => j.outcome_type === "positive").length;
  const negativeCount = similarJobs.filter((j) => j.outcome_type === "negative").length;

  // Get aggregated patterns
  const learnedPatterns = await getLearnedPatterns(similarJobs);

  if (!learnedPatterns) {
    return {
      similarJobsFound: similarJobs.length,
      positiveExamples: positiveCount,
      negativeExamples: negativeCount,
      patterns: null,
      insights: [],
    };
  }

  // Generate insights by comparing user's resume to learned patterns
  const insights = generateInsights(userPatterns, learnedPatterns);

  // Add any insights from the learned patterns themselves
  insights.push(...learnedPatterns.insights);

  // Dedupe and sort by importance
  const importanceOrder = { high: 0, medium: 1, low: 2 };
  const uniqueInsights = insights
    .filter(
      (insight, i, arr) =>
        arr.findIndex((x) => x.message === insight.message) === i
    )
    .sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);

  return {
    similarJobsFound: similarJobs.length,
    positiveExamples: positiveCount,
    negativeExamples: negativeCount,
    patterns: learnedPatterns,
    insights: uniqueInsights,
  };
}
