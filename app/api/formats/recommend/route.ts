/**
 * Format Recommendation API
 *
 * Analyzes successful resume examples from the database to recommend
 * the best format for a given job description.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeFormatsForJob } from "@/lib/success-matching";
import { z } from "zod";

const requestSchema = z.object({
  analysisId: z.string().uuid().optional(),
  jobDescription: z.string().min(50).optional(),
  industry: z.string().optional(),
  roleLevel: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate input
  const parseResult = requestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    );
  }

  const { analysisId, jobDescription: directJD, industry, roleLevel } = parseResult.data;

  // Get job description from analysisId or direct input
  let jobDescription: string | undefined = directJD;

  if (analysisId && !jobDescription) {
    const { data: analysis, error } = await supabase
      .from("resume_analyses")
      .select("job_description")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .single();

    if (error || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    jobDescription = analysis.job_description || undefined;
  }

  if (!jobDescription) {
    return NextResponse.json(
      { error: "Job description is required" },
      { status: 400 }
    );
  }

  try {
    // Get format recommendations
    const recommendations = await analyzeFormatsForJob(jobDescription, {
      industry,
      roleLevel,
    });

    return NextResponse.json({
      recommendations,
      basedOn: {
        similarJobsAnalyzed: recommendations.reduce(
          (sum, r) => sum + r.sampleCount,
          0
        ),
        hasData: recommendations.some((r) => r.sampleCount > 0),
      },
    });
  } catch (error) {
    console.error("Format recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate format recommendations" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to fetch recommendations for an existing analysis
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("analysisId");

  if (!analysisId) {
    return NextResponse.json(
      { error: "analysisId query parameter is required" },
      { status: 400 }
    );
  }

  // Auth check
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get analysis with job description
  // Use type assertion for new columns added via migration
  const { data: analysis, error } = await supabase
    .from("resume_analyses")
    .select("job_description, selected_format")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .single();

  if (error || !analysis) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 }
    );
  }

  // Cast analysis to expected type (columns added via migration)
  const analysisData = analysis as unknown as { job_description: string | null; selected_format: string | null };

  if (!analysisData.job_description) {
    return NextResponse.json(
      { error: "No job description found for this analysis" },
      { status: 400 }
    );
  }

  try {
    const recommendations = await analyzeFormatsForJob(analysisData.job_description);

    return NextResponse.json({
      recommendations,
      selectedFormat: analysisData.selected_format,
      basedOn: {
        similarJobsAnalyzed: recommendations.reduce(
          (sum, r) => sum + r.sampleCount,
          0
        ),
        hasData: recommendations.some((r) => r.sampleCount > 0),
      },
    });
  } catch (error) {
    console.error("Format recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate format recommendations" },
      { status: 500 }
    );
  }
}
