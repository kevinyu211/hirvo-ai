import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import { parsePDF, parseDOCX } from "@/lib/parsers";
import { extractFormattingPatterns } from "@/lib/formatting-patterns";
import { openai } from "@/lib/openai";

const referenceResumeJsonSchema = z.object({
  title: z.string().min(1, "Title is required"),
  industry: z.string().optional(),
  role_level: z.enum(["entry", "mid", "senior", "executive"]).optional(),
  original_text: z.string().min(1, "Resume text is required"),
  generate_embedding: z.boolean().optional().default(true),
});

/**
 * POST /api/admin/reference-resumes
 *
 * Admin-only endpoint for uploading known-successful resumes to seed the
 * reference resume database used by HR Layer 1 (formatting analysis).
 *
 * Accepts either:
 * - multipart/form-data with a file (PDF/DOCX) + metadata fields
 * - application/json with resume text + metadata
 *
 * The endpoint:
 * 1. Authenticates the user (must be logged in)
 * 2. Parses the resume (if file upload)
 * 3. Extracts formatting patterns (deterministic)
 * 4. Optionally generates an embedding via OpenAI
 * 5. Stores everything in the reference_resumes table (via service role client)
 */
export async function POST(request: NextRequest) {
  // Auth check — only authenticated users can upload reference resumes
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  let title: string;
  let industry: string | undefined;
  let roleLevel: string | undefined;
  let originalText: string;
  let generateEmbedding = true;

  if (contentType.includes("multipart/form-data")) {
    // Handle file upload
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file");
    title = (formData.get("title") as string) || "";
    industry = (formData.get("industry") as string) || undefined;
    roleLevel = (formData.get("role_level") as string) || undefined;
    const embedFlag = formData.get("generate_embedding");
    if (embedFlag === "false") generateEmbedding = false;

    if (!title) {
      return NextResponse.json(
        { error: "Validation failed", details: { title: ["Title is required"] } },
        { status: 400 }
      );
    }

    if (roleLevel && !["entry", "mid", "senior", "executive"].includes(roleLevel)) {
      return NextResponse.json(
        { error: "Validation failed", details: { role_level: ["Must be entry, mid, senior, or executive"] } },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required for multipart upload" },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx");

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: "File must be PDF or DOCX" },
        { status: 400 }
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be under 5MB" },
        { status: 400 }
      );
    }

    // Parse the file
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const parsed = isPdf ? await parsePDF(buffer) : await parseDOCX(buffer);
      originalText = parsed.text;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown parsing error";
      return NextResponse.json(
        { error: `Failed to parse file: ${message}` },
        { status: 422 }
      );
    }
  } else {
    // Handle JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = referenceResumeJsonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    title = parsed.data.title;
    industry = parsed.data.industry;
    roleLevel = parsed.data.role_level;
    originalText = parsed.data.original_text;
    generateEmbedding = parsed.data.generate_embedding ?? true;
  }

  if (!originalText.trim()) {
    return NextResponse.json(
      { error: "Resume text is empty after parsing" },
      { status: 400 }
    );
  }

  try {
    // Extract formatting patterns (deterministic — no AI)
    const formattingPatterns = extractFormattingPatterns(originalText);

    // Generate embedding (optional — uses OpenAI)
    let embedding: number[] | null = null;
    if (generateEmbedding) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: originalText.slice(0, 8000), // Limit input for token constraints
        });
        embedding = embeddingResponse.data[0].embedding;
      } catch (embeddingError) {
        // Log but don't fail — embedding is optional for the reference resume
        console.error("Failed to generate embedding for reference resume:", embeddingError);
      }
    }

    // Store in reference_resumes table using service role client (bypasses RLS)
    const serviceClient = createServiceRoleClient();
    const { data, error } = await serviceClient
      .from("reference_resumes")
      .insert({
        title,
        industry: industry ?? null,
        role_level: roleLevel ?? null,
        original_text: originalText,
        formatting_patterns: JSON.parse(JSON.stringify(formattingPatterns)),
        embedding: embedding,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to insert reference resume:", error);
      return NextResponse.json(
        { error: "Failed to save reference resume" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data,
        formattingPatterns,
        embeddingGenerated: embedding !== null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reference resume upload failed:", error);
    return NextResponse.json(
      { error: "Failed to process reference resume" },
      { status: 500 }
    );
  }
}
