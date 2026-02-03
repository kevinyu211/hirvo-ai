import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateTemplateMatches } from "@/lib/success-matching";

/**
 * GET /api/formats/template-matches
 *
 * Returns template match scores for the given analysis.
 * Uses job description and resume to calculate match percentages.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get analysisId from query params
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("analysisId");

  if (!analysisId) {
    return NextResponse.json(
      { error: "analysisId is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch analysis record
    // Use type assertion since structured_content is added via migration
    const { data: analysis, error: fetchError } = await supabase
      .from("resume_analyses")
      .select("job_description, target_role")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    const jobDescription = (analysis as any).job_description || "";
    // Note: structured_content would need to be fetched separately if needed
    const structuredResume = null;

    // Calculate template matches
    const matches = await calculateTemplateMatches(
      jobDescription,
      structuredResume,
      {
        roleLevelHint: analysis.target_role || undefined,
      }
    );

    // Check if we have historical data (matches with historicalSuccess > 0)
    const hasHistoricalData = matches.some(
      (m) => m.breakdown.historicalSuccess > 0
    );

    return NextResponse.json({
      matches,
      basedOnData: hasHistoricalData,
    });
  } catch (error) {
    console.error("Template match calculation failed:", error);
    return NextResponse.json(
      { error: "Failed to calculate template matches" },
      { status: 500 }
    );
  }
}
