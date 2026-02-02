import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateATSCompliantDOCX, validateATSCompliance } from "@/lib/docx-generator";

const exportATSSchema = z.object({
  text: z.string().min(1, "Resume text is required"),
  analysisId: z.string().uuid("Invalid analysis ID").optional(),
  validate: z.boolean().optional().default(true),
});

/**
 * POST /api/export-ats
 *
 * Export resume as an ATS-compliant DOCX file.
 *
 * ATS compliance features:
 * - Single-column layout (no tables)
 * - Standard fonts (Calibri)
 * - Simple formatting
 * - Clear section headings
 * - Standard bullet characters
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

  const parsed = exportATSSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { text, analysisId, validate } = parsed.data;

  try {
    // Optionally validate ATS compliance
    let complianceReport = null;
    if (validate) {
      complianceReport = validateATSCompliance(text);
    }

    // Generate ATS-compliant DOCX
    const buffer = await generateATSCompliantDOCX(text);

    // Update analysis record if provided
    if (analysisId) {
      try {
        await supabase
          .from("resume_analyses")
          .update({
            optimized_text: text,
          })
          .eq("id", analysisId)
          .eq("user_id", user.id);
      } catch {
        console.error("Failed to save export event to database");
      }
    }

    // Return the file as a binary download
    const headers: HeadersInit = {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="resume-ats.docx"',
      "Content-Length": String(buffer.length),
    };

    // Include compliance report in custom header (JSON-encoded)
    if (complianceReport) {
      headers["X-ATS-Compliance"] = JSON.stringify(complianceReport);
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("ATS export failed:", error);
    return NextResponse.json(
      { error: "Export generation failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export-ats?text=...
 *
 * Validate resume text for ATS compliance without generating a document.
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

  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");

  if (!text) {
    return NextResponse.json({ error: "Text parameter is required" }, { status: 400 });
  }

  const complianceReport = validateATSCompliance(text);
  return NextResponse.json(complianceReport);
}
