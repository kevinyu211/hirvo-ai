import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { autoLabelExample, validateLabelResult } from "@/lib/auto-labeler";

const autoLabelSchema = z.object({
  jobDescription: z.string().min(50, "Job description must be at least 50 characters"),
  resumeText: z.string().min(100, "Resume must be at least 100 characters"),
});

/**
 * POST /api/admin/auto-label
 *
 * Admin-only endpoint for auto-labeling a resume+JD pair using LLM.
 * Returns structured labels for review before saving.
 */
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

  // Admin check is handled by middleware, but double-check here
  const adminEmails = (process.env.ADMIN_EMAILS || "admin@hirvo.ai")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const userEmail = user.email?.toLowerCase() || "";

  let isAdmin = adminEmails.includes(userEmail);

  if (!isAdmin) {
    // Check is_admin column in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    isAdmin = profile?.is_admin === true;
  }

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

  const parsed = autoLabelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { jobDescription, resumeText } = parsed.data;

  try {
    // Call LLM auto-labeler
    const labels = await autoLabelExample(resumeText, jobDescription);

    // Validate the result
    const validation = validateLabelResult(labels);
    if (!validation.valid) {
      console.warn("Auto-label validation issues:", validation.issues);
    }

    return NextResponse.json(labels);
  } catch (error) {
    console.error("Auto-label failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to auto-label: ${message}` },
      { status: 500 }
    );
  }
}
