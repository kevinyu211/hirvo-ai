import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import { openai } from "@/lib/openai";
import { extractFormattingPatterns } from "@/lib/formatting-patterns";
import { extractContentPatterns } from "@/lib/content-patterns";
import type { AutoLabelResult } from "@/lib/auto-labeler";

const exampleSchema = z.object({
  jobDescription: z.string().min(50, "Job description must be at least 50 characters"),
  resumeText: z.string().min(100, "Resume must be at least 100 characters"),
  outcomeType: z.enum(["positive", "negative"]),
  outcomeDetail: z
    .enum(["interview", "offer", "rejected_ats", "rejected_hr", "ghosted"])
    .nullable()
    .optional(),
  labels: z.object({
    job_title: z.string(),
    company_name: z.string().nullable(),
    industry: z.string(),
    role_level: z.string(),
    required_skills: z.array(z.string()),
    candidate_experience_years: z.number(),
    candidate_skills: z.array(z.string()),
    is_quality_example: z.boolean(),
    quality_reasoning: z.string(),
    notable_patterns: z.array(
      z.object({
        pattern_type: z.string(),
        description: z.string(),
        is_positive: z.boolean(),
      })
    ),
  }),
  pairId: z.string().uuid().nullable().optional(),
});

/**
 * Check if user is admin
 */
async function checkAdmin(supabase: ReturnType<typeof createClient>, userId: string, userEmail?: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || "admin@hirvo.ai")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const email = userEmail?.toLowerCase() || "";

  if (adminEmails.includes(email)) {
    return true;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  return profile?.is_admin === true;
}

/**
 * Generate embeddings for JD and resume
 */
async function generateEmbeddings(jobDescription: string, resumeText: string) {
  try {
    const [jdResponse, resumeResponse] = await Promise.all([
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: jobDescription.slice(0, 8000),
      }),
      openai.embeddings.create({
        model: "text-embedding-3-small",
        input: resumeText.slice(0, 8000),
      }),
    ]);

    return {
      jdEmbedding: jdResponse.data[0].embedding,
      resumeEmbedding: resumeResponse.data[0].embedding,
    };
  } catch (error) {
    console.error("Failed to generate embeddings:", error);
    return { jdEmbedding: null, resumeEmbedding: null };
  }
}

/**
 * GET /api/admin/examples
 *
 * List all resume examples with optional filtering.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await checkAdmin(supabase, user.id, user.email);
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const industry = searchParams.get("industry");
  const roleLevel = searchParams.get("role_level");
  const outcomeType = searchParams.get("outcome_type");
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Build query
  let query = supabase
    .from("resume_examples")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (industry) query = query.eq("industry", industry);
  if (roleLevel) query = query.eq("role_level", roleLevel);
  if (outcomeType) query = query.eq("outcome_type", outcomeType);

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch examples:", error);
    return NextResponse.json({ error: "Failed to fetch examples" }, { status: 500 });
  }

  return NextResponse.json({ data, count, limit, offset });
}

/**
 * POST /api/admin/examples
 *
 * Create a new resume example with auto-generated labels.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await checkAdmin(supabase, user.id, user.email);
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = exampleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { jobDescription, resumeText, outcomeType, outcomeDetail, labels, pairId } =
    parsed.data;

  try {
    // Generate embeddings
    const { jdEmbedding, resumeEmbedding } = await generateEmbeddings(
      jobDescription,
      resumeText
    );

    // Extract patterns
    const formattingPatterns = extractFormattingPatterns(resumeText);
    const contentPatterns = extractContentPatterns(resumeText, labels.required_skills);

    // Store using service role client (bypasses RLS)
    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from("resume_examples")
      .insert({
        job_description: jobDescription,
        job_description_embedding: jdEmbedding,
        job_title: labels.job_title,
        company_name: labels.company_name,
        industry: labels.industry,
        role_level: labels.role_level,
        resume_text: resumeText,
        resume_embedding: resumeEmbedding,
        outcome_type: outcomeType,
        outcome_detail: outcomeDetail || null,
        required_skills: labels.required_skills,
        candidate_skills: labels.candidate_skills,
        candidate_experience_years: labels.candidate_experience_years,
        is_quality_example: labels.is_quality_example,
        quality_reasoning: labels.quality_reasoning,
        formatting_patterns: JSON.parse(JSON.stringify(formattingPatterns)),
        content_patterns: JSON.parse(JSON.stringify(contentPatterns)),
        notable_patterns: JSON.parse(JSON.stringify(labels.notable_patterns)),
        source: "admin_upload",
        pair_id: pairId || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to insert example:", error);
      return NextResponse.json({ error: "Failed to save example" }, { status: 500 });
    }

    return NextResponse.json(
      {
        data,
        embeddingsGenerated: jdEmbedding !== null && resumeEmbedding !== null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Example creation failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create example: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/examples
 *
 * Update an existing example's labels.
 */
export async function PUT(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await checkAdmin(supabase, user.id, user.email);
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updateSchema = z.object({
    id: z.string().uuid(),
    job_title: z.string().optional(),
    company_name: z.string().nullable().optional(),
    industry: z.string().optional(),
    role_level: z.string().optional(),
    outcome_type: z.enum(["positive", "negative"]).optional(),
    outcome_detail: z
      .enum(["interview", "offer", "rejected_ats", "rejected_hr", "ghosted"])
      .nullable()
      .optional(),
    required_skills: z.array(z.string()).optional(),
    candidate_skills: z.array(z.string()).optional(),
    is_quality_example: z.boolean().optional(),
    pair_id: z.string().uuid().nullable().optional(),
  });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("resume_examples")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update example:", error);
    return NextResponse.json({ error: "Failed to update example" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/admin/examples
 *
 * Delete an example by ID.
 */
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await checkAdmin(supabase, user.id, user.email);
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.from("resume_examples").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete example:", error);
    return NextResponse.json({ error: "Failed to delete example" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
