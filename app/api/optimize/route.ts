import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { runOptimizationAnalysis } from "@/lib/prompts/optimization-prompts";
import { extractContentPatterns } from "@/lib/content-patterns";
import { getLearnedInsightsForResume } from "@/lib/success-matching";
import {
  contrastiveInsightsToSuggestions,
} from "@/lib/contrastive-analysis";
import type { ATSIssue, HRFeedback, Suggestion } from "@/lib/types";

const optimizeRequestSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  atsIssues: z.array(
    z.object({
      type: z.enum(["missing_keyword", "weak_keyword", "formatting", "section"]),
      severity: z.enum(["critical", "warning", "info"]),
      message: z.string(),
      suggestion: z.string().optional(),
      textRange: z
        .object({
          start: z.number(),
          end: z.number(),
        })
        .optional(),
    })
  ),
  hrFeedback: z.array(
    z.object({
      type: z.enum(["formatting", "semantic", "llm_review"]),
      layer: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      severity: z.enum(["critical", "warning", "info"]),
      message: z.string(),
      suggestion: z.string().optional(),
      textRange: z
        .object({
          start: z.number(),
          end: z.number(),
        })
        .optional(),
    })
  ),
  analysisId: z.string().uuid("Invalid analysis ID").optional(),
  visaFlagged: z.boolean().optional(),
  visaSignals: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = optimizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { resumeText, jobDescription, atsIssues, hrFeedback, analysisId, visaFlagged, visaSignals } =
    parsed.data;

  try {
    // Run GPT-4o optimization analysis (with visa-aware rules if flagged)
    // Run in parallel with learned patterns retrieval for better performance
    const [result, userPatterns] = await Promise.all([
      runOptimizationAnalysis({
        resumeText,
        jobDescription,
        atsIssues: atsIssues as ATSIssue[],
        hrFeedback: hrFeedback as HRFeedback[],
        visaFlagged,
        visaSignals,
      }),
      // Extract content patterns from user's resume for comparison
      Promise.resolve(extractContentPatterns(resumeText)),
    ]);

    // Convert raw suggestions to Suggestion[] with IDs and text ranges
    const suggestions: Suggestion[] = result.suggestions.map(
      (raw, index) => {
        const textRange = findTextRange(resumeText, raw.originalText);
        return {
          id: `suggestion-${index}-${Date.now()}`,
          type: raw.type,
          category: raw.category,
          originalText: raw.originalText,
          suggestedText: raw.suggestedText,
          reasoning: raw.reasoning,
          textRange,
          severity: raw.severity,
        };
      }
    );

    // Try to get learned insights (graceful degradation if no examples exist)
    let learnedInsightsData = null;
    try {
      learnedInsightsData = await getLearnedInsightsForResume(
        resumeText,
        jobDescription,
        userPatterns
      );

      // If we have both positive and negative examples, add contrastive suggestions
      if (
        learnedInsightsData.positiveExamples > 0 &&
        learnedInsightsData.negativeExamples > 0 &&
        learnedInsightsData.patterns
      ) {
        // Fetch content patterns from similar jobs for contrastive analysis
        const contrastiveSuggestions = contrastiveInsightsToSuggestions(
          userPatterns,
          {
            hasContrastiveData: true,
            positiveCount: learnedInsightsData.positiveExamples,
            negativeCount: learnedInsightsData.negativeExamples,
            insights: learnedInsightsData.insights.map((i) => ({
              pattern: i.type,
              metric: i.type,
              positiveAvg: 0,
              negativeAvg: 0,
              delta: 0,
              percentDiff: 0,
              insight: i.message,
              importance: i.importance,
              confidence: 0.8,
            })),
            summary: "",
          }
        );

        // Add learned suggestions to the main suggestions array
        for (const learned of contrastiveSuggestions) {
          suggestions.push({
            id: `learned-${suggestions.length}-${Date.now()}`,
            type: "hr", // Learned insights are HR-related
            category: learned.type,
            originalText: "",
            suggestedText: "",
            reasoning: learned.message,
            textRange: { start: 0, end: 0 },
            severity: learned.importance === "high" ? "warning" : "info",
          });
        }
      }
    } catch (learnedError) {
      // Don't fail the whole request if learned patterns fail
      console.warn("Learned patterns retrieval failed:", learnedError);
    }

    // Save optimized text hint to the analysis record if analysisId is provided
    if (analysisId) {
      try {
        await supabase
          .from("resume_analyses")
          .update({
            optimized_text: resumeText, // Will be updated when user applies suggestions
          })
          .eq("id", analysisId)
          .eq("user_id", user.id);
      } catch {
        // Log but don't fail — suggestions are still returned
        console.error("Failed to save optimization state to database");
      }
    }

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
      learnedInsights: learnedInsightsData
        ? {
            similarJobsFound: learnedInsightsData.similarJobsFound,
            positiveExamples: learnedInsightsData.positiveExamples,
            negativeExamples: learnedInsightsData.negativeExamples,
            patterns: learnedInsightsData.patterns,
            insights: learnedInsightsData.insights,
          }
        : null,
    });
  } catch (error) {
    console.error("Optimization failed:", error);
    return NextResponse.json(
      { error: "Optimization failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Find the start and end indices of a text span in the resume text.
 * Uses case-insensitive matching as a fallback if exact match fails.
 */
function findTextRange(
  resumeText: string,
  originalText: string
): { start: number; end: number } {
  // Try exact match first
  const exactIndex = resumeText.indexOf(originalText);
  if (exactIndex !== -1) {
    return { start: exactIndex, end: exactIndex + originalText.length };
  }

  // Fallback: case-insensitive match
  const lowerResume = resumeText.toLowerCase();
  const lowerOriginal = originalText.toLowerCase();
  const ciIndex = lowerResume.indexOf(lowerOriginal);
  if (ciIndex !== -1) {
    return { start: ciIndex, end: ciIndex + originalText.length };
  }

  // If no match found, return 0,0 — the suggestion won't have a visible highlight
  return { start: 0, end: 0 };
}
