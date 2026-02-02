import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  runSemanticAnalysis,
  type SectionEmbedding,
} from "@/lib/embeddings";

const embeddingsRequestSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  analysisId: z.string().uuid("Invalid analysis ID"),
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

  const parsed = embeddingsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { resumeText, jobDescription, analysisId } = parsed.data;

  try {
    // Step 1: Run the full semantic analysis pipeline
    // This generates embeddings for each resume section + the JD, then computes similarity scores
    const { score, resumeEmbeddings, jdEmbedding } =
      await runSemanticAnalysis(resumeText, jobDescription);

    // Step 2: Store all embeddings in the resume_embeddings table
    // Use service role client to bypass RLS for embedding storage
    const serviceClient = createServiceRoleClient();

    const embeddingRecords = buildEmbeddingRecords(
      analysisId,
      resumeEmbeddings,
      jdEmbedding,
      jobDescription
    );

    if (embeddingRecords.length > 0) {
      const { error: insertError } = await serviceClient
        .from("resume_embeddings")
        .insert(embeddingRecords);

      if (insertError) {
        // Log but don't fail the request — scores are still returned
        console.error("Failed to store embeddings:", insertError);
      }
    }

    // Step 3: Return semantic similarity scores
    return NextResponse.json({
      score,
      embeddingsStored: embeddingRecords.length,
    });
  } catch (error) {
    console.error("Embeddings generation failed:", error);
    return NextResponse.json(
      { error: "Embeddings generation failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Build embedding records for insertion into the resume_embeddings table.
 * Creates records for:
 * - Each resume section embedding (content_type: 'resume_section')
 * - A full resume embedding (content_type: 'resume_full') — uses the first section if only one, or all combined
 * - The job description embedding (content_type: 'job_description')
 */
function buildEmbeddingRecords(
  analysisId: string,
  resumeEmbeddings: SectionEmbedding[],
  jdEmbedding: number[],
  jobDescription: string
): Array<{
  analysis_id: string;
  content_type: string;
  section_name: string | null;
  content_text: string;
  embedding: number[];
}> {
  const records: Array<{
    analysis_id: string;
    content_type: string;
    section_name: string | null;
    content_text: string;
    embedding: number[];
  }> = [];

  // Add resume section embeddings
  for (const sectionEmb of resumeEmbeddings) {
    // If it's a "full" section, store as resume_full instead of resume_section
    const contentType =
      sectionEmb.section === "full" ? "resume_full" : "resume_section";

    records.push({
      analysis_id: analysisId,
      content_type: contentType,
      section_name: sectionEmb.section === "full" ? null : sectionEmb.section,
      content_text: sectionEmb.content,
      embedding: sectionEmb.embedding,
    });
  }

  // Add job description embedding
  records.push({
    analysis_id: analysisId,
    content_type: "job_description",
    section_name: null,
    content_text: jobDescription,
    embedding: jdEmbedding,
  });

  return records;
}
