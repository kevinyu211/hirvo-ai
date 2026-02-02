import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { runATSAnalysis } from "@/lib/ats-engine";
import { runSupplementaryATSAnalysis } from "@/lib/prompts/ats-prompts";
import type { ATSScore, ATSIssue } from "@/lib/types";

const atsScoreRequestSchema = z.object({
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

  const parsed = atsScoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { resumeText, jobDescription, metadata, analysisId } = parsed.data;

  try {
    // Step 1: Run deterministic ATS engine
    const deterministicScore = runATSAnalysis(
      resumeText,
      jobDescription,
      metadata
    );

    // Step 2: Run supplementary GPT-4o analysis
    let supplementary;
    try {
      supplementary = await runSupplementaryATSAnalysis({
        resumeText,
        jobDescription,
        matchedKeywords: deterministicScore.matchedKeywords,
        missingKeywords: deterministicScore.missingKeywords,
        matchPct: deterministicScore.keywordMatchPct,
      });
    } catch {
      // If GPT-4o fails, proceed with deterministic results only
      supplementary = null;
    }

    // Step 3: Combine results into a unified ATS score
    const combinedScore = combineATSResults(deterministicScore, supplementary);

    // Step 4: Save scores to Supabase if an analysisId is provided
    if (analysisId) {
      const { error: updateError } = await supabase
        .from("resume_analyses")
        .update({
          ats_overall_score: combinedScore.overall,
          ats_keyword_match_pct: combinedScore.keywordMatchPct,
          ats_formatting_score: combinedScore.formattingScore,
          ats_section_score: combinedScore.sectionScore,
          ats_issues: JSON.parse(JSON.stringify(combinedScore.issues)),
        })
        .eq("id", analysisId)
        .eq("user_id", user.id);

      if (updateError) {
        // Log but don't fail the request — scores are still returned
        console.error("Failed to save ATS scores to database:", updateError);
      }
    }

    // Step 5: Return the full ATS breakdown
    return NextResponse.json({
      score: combinedScore,
      supplementary: supplementary ?? undefined,
    });
  } catch (error) {
    console.error("ATS scoring failed:", error);
    return NextResponse.json(
      { error: "ATS scoring failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Combines the deterministic ATS score with the supplementary GPT-4o analysis.
 *
 * The supplementary analysis can:
 * 1. Recover alias matches (keywords missed by exact matching but present via abbreviations)
 * 2. Add weak usage warnings (keywords present but poorly used)
 * 3. Add additional keyword suggestions
 *
 * The combined score adjusts the keyword match percentage based on alias recoveries
 * and adds supplementary issues to the issues list.
 */
function combineATSResults(
  deterministic: ATSScore,
  supplementary: Awaited<
    ReturnType<typeof runSupplementaryATSAnalysis>
  > | null
): ATSScore {
  if (!supplementary) {
    return deterministic;
  }

  // Recover alias matches — move them from missing to matched
  const aliasRecovered = new Set(
    supplementary.aliasMatches.map((a) => a.original.toLowerCase())
  );

  const updatedMatched = [...deterministic.matchedKeywords];
  const updatedMissing: string[] = [];

  for (const keyword of deterministic.missingKeywords) {
    if (aliasRecovered.has(keyword.toLowerCase())) {
      updatedMatched.push(keyword);
    } else {
      updatedMissing.push(keyword);
    }
  }

  // Recalculate keyword match percentage
  const totalKeywords = updatedMatched.length + updatedMissing.length;
  const updatedMatchPct =
    totalKeywords > 0
      ? Math.round((updatedMatched.length / totalKeywords) * 100)
      : 100;

  // Recalculate overall score with updated keyword percentage
  const updatedOverall = Math.round(
    updatedMatchPct * 0.5 +
      deterministic.formattingScore * 0.25 +
      deterministic.sectionScore * 0.25
  );

  // Build combined issues list
  const combinedIssues: ATSIssue[] = [...deterministic.issues];

  // Update missing keyword issues — remove recovered aliases
  const filteredIssues = combinedIssues.filter((issue) => {
    if (issue.type !== "missing_keyword") return true;
    // Check if this missing keyword was recovered by alias
    const keywordMatch = issue.message.match(/Missing keyword: "(.+?)"/);
    if (keywordMatch && aliasRecovered.has(keywordMatch[1].toLowerCase())) {
      return false;
    }
    return true;
  });

  // Add weak usage warnings from supplementary analysis
  for (const weak of supplementary.weakUsages) {
    filteredIssues.push({
      type: "weak_keyword",
      severity: "warning",
      message: `Weak usage of "${weak.keyword}": ${weak.issue}`,
      suggestion: weak.suggestedImprovement,
    });
  }

  // Add additional keyword suggestions
  for (const keyword of supplementary.additionalKeywords) {
    filteredIssues.push({
      type: "missing_keyword",
      severity: "info",
      message: `Consider adding "${keyword}" — identified as relevant for this role but not found in your resume.`,
      suggestion: `Add "${keyword}" to a relevant section if it reflects your actual skills or experience.`,
    });
  }

  return {
    overall: updatedOverall,
    keywordMatchPct: updatedMatchPct,
    formattingScore: deterministic.formattingScore,
    sectionScore: deterministic.sectionScore,
    matchedKeywords: updatedMatched,
    missingKeywords: updatedMissing,
    issues: filteredIssues,
    passed: updatedOverall >= 75,
  };
}
