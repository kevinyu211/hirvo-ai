import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  analyzeFormatting,
  fetchReferenceResumes,
} from "@/lib/hr-engine";
import { runSemanticAnalysis } from "@/lib/embeddings";
import { runHRReview } from "@/lib/prompts/hr-prompts";
import type { HRScore, HRFeedback } from "@/lib/types";
import type { HRReviewResult } from "@/lib/prompts/hr-prompts";
import type { SemanticScore } from "@/lib/embeddings";
import type { FormattingAnalysisResult } from "@/lib/hr-engine";

const hrScoreRequestSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  metadata: z
    .object({
      pageCount: z.number().optional(),
    })
    .optional(),
  userContext: z
    .object({
      targetRole: z.string().optional(),
      yearsExperience: z.string().optional(),
      visaStatus: z.string().optional(),
    })
    .optional(),
  analysisId: z.string().uuid("Invalid analysis ID").optional(),
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

  const parsed = hrScoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { resumeText, jobDescription, metadata, userContext, analysisId } =
    parsed.data;

  try {
    // ── Layer 1: Formatting Analysis ──────────────────────────────────
    let formattingResult: FormattingAnalysisResult;
    try {
      const serviceClient = createServiceRoleClient();
      const referenceResumes = await fetchReferenceResumes(serviceClient, {
        industry: undefined,
        roleLevel: undefined,
      });
      formattingResult = analyzeFormatting(
        resumeText,
        metadata,
        referenceResumes
      );
    } catch {
      // If formatting analysis fails, use standalone analysis as fallback
      formattingResult = analyzeFormatting(resumeText, metadata, []);
    }

    // ── Layer 2: Semantic Similarity (Embeddings) ─────────────────────
    let semanticScore: SemanticScore;
    try {
      const semanticResult = await runSemanticAnalysis(
        resumeText,
        jobDescription
      );
      semanticScore = semanticResult.score;

      // Store embeddings if analysisId is provided
      if (analysisId) {
        try {
          const serviceClient = createServiceRoleClient();
          const embeddingRecords = [
            // Resume section embeddings
            ...semanticResult.resumeEmbeddings.map((se) => ({
              analysis_id: analysisId,
              content_type:
                se.section === "full" ? "resume_full" : "resume_section",
              section_name: se.section === "full" ? null : se.section,
              content_text: se.content,
              embedding: se.embedding,
            })),
            // Job description embedding
            {
              analysis_id: analysisId,
              content_type: "job_description",
              section_name: null,
              content_text: jobDescription,
              embedding: semanticResult.jdEmbedding,
            },
          ];

          await serviceClient
            .from("resume_embeddings")
            .insert(embeddingRecords);
        } catch {
          // Log but don't fail — scores are still returned
          console.error("Failed to store embeddings in database");
        }
      }
    } catch {
      // If semantic analysis fails, use a zero score
      semanticScore = { overallScore: 0, sectionScores: [] };
    }

    // ── Layer 3: LLM as HR Reviewer ───────────────────────────────────
    let llmReview: HRReviewResult | null;
    try {
      llmReview = await runHRReview({
        resumeText,
        jobDescription,
        targetRole: userContext?.targetRole,
        yearsExperience: userContext?.yearsExperience,
        visaStatus: userContext?.visaStatus,
      });
    } catch {
      // If LLM review fails, proceed without it
      llmReview = null;
    }

    // ── Compute Combined HR Score ─────────────────────────────────────
    const combinedScore = computeHRScore(
      formattingResult,
      semanticScore,
      llmReview
    );

    // ── Save scores to Supabase ───────────────────────────────────────
    if (analysisId) {
      try {
        await supabase
          .from("resume_analyses")
          .update({
            hr_formatting_score: combinedScore.formattingScore,
            hr_semantic_score: combinedScore.semanticScore,
            hr_llm_score: combinedScore.llmScore,
            hr_overall_score: combinedScore.overall,
            hr_feedback: JSON.parse(JSON.stringify(combinedScore.feedback)),
          })
          .eq("id", analysisId)
          .eq("user_id", user.id);
      } catch {
        // Log but don't fail — scores are still returned
        console.error("Failed to save HR scores to database");
      }
    }

    // ── Return unified HR score object ────────────────────────────────
    return NextResponse.json({
      score: combinedScore,
      layers: {
        formatting: {
          score: formattingResult.score,
          suggestions: formattingResult.suggestions,
          referenceCount: formattingResult.referenceCount,
        },
        semantic: {
          score: semanticScore.overallScore,
          sectionScores: semanticScore.sectionScores,
        },
        llmReview: llmReview
          ? {
              score: llmReview.overallScore,
              firstImpression: llmReview.firstImpression,
              careerNarrative: llmReview.careerNarrative,
              achievementStrength: llmReview.achievementStrength,
              roleRelevance: llmReview.roleRelevance,
              redFlags: llmReview.redFlags,
              sectionComments: llmReview.sectionComments,
              callbackDecision: llmReview.callbackDecision,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("HR scoring failed:", error);
    return NextResponse.json(
      { error: "HR scoring failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Compute the combined HR score from all three layers.
 * Weights: formatting (20%) + semantic (40%) + LLM review (40%)
 *
 * If LLM review is unavailable, rebalance weights:
 * formatting (30%) + semantic (70%)
 */
function computeHRScore(
  formatting: FormattingAnalysisResult,
  semantic: SemanticScore,
  llmReview: HRReviewResult | null
): HRScore {
  const formattingScore = formatting.score;
  const semanticScore = semantic.overallScore;
  const llmScore = llmReview?.overallScore ?? 0;

  let overall: number;
  if (llmReview) {
    // Standard weights: formatting 20%, semantic 40%, LLM 40%
    overall = Math.round(
      formattingScore * 0.2 + semanticScore * 0.4 + llmScore * 0.4
    );
  } else {
    // Fallback weights without LLM: formatting 30%, semantic 70%
    overall = Math.round(formattingScore * 0.3 + semanticScore * 0.7);
  }

  // Build unified feedback array
  const feedback: HRFeedback[] = [];

  // Layer 1: Formatting feedback
  feedback.push(...formatting.feedback);

  // Layer 2: Semantic feedback — add feedback for weak sections
  for (const sectionScore of semantic.sectionScores) {
    if (sectionScore.score < 40) {
      feedback.push({
        type: "semantic",
        layer: 2,
        severity: "critical",
        message: `Your "${sectionScore.section}" section has low semantic match (${sectionScore.score}%) with the job description.`,
        suggestion: `Revise your ${sectionScore.section} section to better reflect the language and requirements in the job description.`,
      });
    } else if (sectionScore.score < 60) {
      feedback.push({
        type: "semantic",
        layer: 2,
        severity: "warning",
        message: `Your "${sectionScore.section}" section has moderate semantic match (${sectionScore.score}%) with the job description.`,
        suggestion: `Consider strengthening the alignment of your ${sectionScore.section} section with the job requirements.`,
      });
    }
  }

  // Layer 3: LLM review feedback
  if (llmReview) {
    // Red flags as feedback items
    for (const flag of llmReview.redFlags) {
      feedback.push({
        type: "llm_review",
        layer: 3,
        severity: flag.severity,
        message: `Red flag (${flag.type.replace(/_/g, " ")}): ${flag.description}`,
        suggestion: flag.mitigation,
      });
    }

    // Section comments as feedback items
    for (const comment of llmReview.sectionComments) {
      if (comment.score < 60) {
        feedback.push({
          type: "llm_review",
          layer: 3,
          severity: comment.score < 40 ? "critical" : "warning",
          message: `${comment.section}: ${comment.comment}`,
          suggestion: comment.suggestion,
        });
      }
    }

    // Career narrative feedback
    if (llmReview.careerNarrative.score < 60) {
      feedback.push({
        type: "llm_review",
        layer: 3,
        severity: llmReview.careerNarrative.score < 40 ? "critical" : "warning",
        message: `Career narrative: ${llmReview.careerNarrative.assessment}`,
        suggestion: llmReview.careerNarrative.suggestion,
      });
    }

    // Achievement strength feedback
    if (llmReview.achievementStrength.score < 60) {
      feedback.push({
        type: "llm_review",
        layer: 3,
        severity:
          llmReview.achievementStrength.score < 40 ? "critical" : "warning",
        message: `Achievement strength: ${llmReview.achievementStrength.assessment}`,
        suggestion: llmReview.achievementStrength.suggestion,
      });
    }

    // Role relevance feedback
    if (llmReview.roleRelevance.score < 60) {
      feedback.push({
        type: "llm_review",
        layer: 3,
        severity: llmReview.roleRelevance.score < 40 ? "critical" : "warning",
        message: `Role relevance: ${llmReview.roleRelevance.assessment}`,
        suggestion: llmReview.roleRelevance.suggestion,
      });
    }

    // Callback decision feedback
    if (llmReview.callbackDecision.decision === "no") {
      feedback.push({
        type: "llm_review",
        layer: 3,
        severity: "critical",
        message: `HR verdict: Would NOT call for interview. ${llmReview.callbackDecision.reasoning}`,
      });
    } else if (llmReview.callbackDecision.decision === "maybe") {
      feedback.push({
        type: "llm_review",
        layer: 3,
        severity: "warning",
        message: `HR verdict: Maybe call for interview. ${llmReview.callbackDecision.reasoning}`,
      });
    }
  }

  return {
    overall,
    formattingScore,
    semanticScore: semanticScore,
    llmScore: llmReview ? llmScore : 0,
    feedback,
  };
}
