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
export async function findSimilarJobs(
  jobDescription: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    industry?: string;
    roleLevel?: string;
  } = {}
): Promise<SimilarJob[]> {
  const { limit = 10, minSimilarity = 0.7, industry, roleLevel } = options;

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
  // Find similar jobs
  const similarJobs = await findSimilarJobs(jobDescription, {
    limit: 20,
    minSimilarity: 0.65,
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
