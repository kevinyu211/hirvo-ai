import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import { openai } from "@/lib/openai";
import { extractFormattingPatterns } from "@/lib/formatting-patterns";
import { extractContentPatterns } from "@/lib/content-patterns";

const feedbackSchema = z.object({
  analysisId: z.string().uuid(),
  resumeText: z.string().min(100),
  jobDescription: z.string().min(50),
  outcomeType: z.enum(["positive", "negative"]),
  outcomeDetail: z.enum(["interview", "offer", "rejected", "ghosted"]).nullable(),
  notes: z.string().nullable(),
});

/**
 * POST /api/feedback/outcome
 *
 * Submit user feedback about their application outcome.
 * This creates a new resume_example entry from user-reported data.
 */
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

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { analysisId, resumeText, jobDescription, outcomeType, outcomeDetail, notes } =
    parsed.data;

  // Verify the analysis belongs to this user
  const { data: analysis, error: analysisError } = await supabase
    .from("resume_analyses")
    .select("id, target_role")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .single();

  if (analysisError || !analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  try {
    // Generate embeddings for the JD and resume
    const [jdEmbeddingResponse, resumeEmbeddingResponse] = await Promise.all([
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: jobDescription.slice(0, 8000),
      }),
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: resumeText.slice(0, 8000),
      }),
    ]);

    const jdEmbedding = jdEmbeddingResponse.data[0].embedding;
    const resumeEmbedding = resumeEmbeddingResponse.data[0].embedding;

    // Extract patterns
    const formattingPatterns = extractFormattingPatterns(resumeText);
    const contentPatterns = extractContentPatterns(resumeText);

    // Map outcome detail to database format
    const dbOutcomeDetail =
      outcomeDetail === "rejected"
        ? "rejected_hr"
        : outcomeDetail === "ghosted"
        ? "ghosted"
        : outcomeDetail;

    // Store as a new example using service role (bypasses RLS)
    const serviceClient = createServiceRoleClient();
    const { data: example, error: insertError } = await serviceClient
      .from("resume_examples")
      .insert({
        job_description: jobDescription,
        job_description_embedding: jdEmbedding,
        job_title: analysis.target_role,
        resume_text: resumeText,
        resume_embedding: resumeEmbedding,
        outcome_type: outcomeType,
        outcome_detail: dbOutcomeDetail,
        formatting_patterns: JSON.parse(JSON.stringify(formattingPatterns)),
        content_patterns: JSON.parse(JSON.stringify(contentPatterns)),
        // User feedback is lower quality than admin-uploaded, mark accordingly
        is_quality_example: false,
        quality_reasoning: notes || "User-reported outcome",
        source: "user_feedback",
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to store feedback:", insertError);
      return NextResponse.json(
        { error: "Failed to store feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      exampleId: example.id,
      message: "Thank you for your feedback!",
    });
  } catch (error) {
    console.error("Feedback submission failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to submit feedback: ${message}` },
      { status: 500 }
    );
  }
}
