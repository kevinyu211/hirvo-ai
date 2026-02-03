/**
 * Parse Structured API — Convert raw resume text to structured format
 *
 * Takes plain text from the /api/parse endpoint and returns a StructuredResume
 * object with contact info, experience, education, skills, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseToStructured, parseContactOnly } from "@/lib/resume-parser";
import type { StructuredResume } from "@/lib/types";
import { z } from "zod";

const requestSchema = z.object({
  text: z.string().min(50, "Resume text must be at least 50 characters"),
  quickParse: z.boolean().optional().default(false),
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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate input
  const parseResult = requestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    );
  }

  const { text, quickParse } = parseResult.data;

  try {
    let structuredResume: StructuredResume;

    if (quickParse) {
      // Quick parse: only extract contact info (no LLM call)
      const contact = parseContactOnly(text);
      structuredResume = {
        contact,
        experience: [],
        education: [],
        skills: {
          technical: [],
          soft: [],
          tools: [],
          languages: [],
        },
        sectionOrder: ["contact", "summary", "experience", "education", "skills"],
        rawText: text,
      };
    } else {
      // Full parse: extract all structured content using LLM
      structuredResume = await parseToStructured(text);
    }

    return NextResponse.json({
      structuredResume,
      isQuickParse: quickParse,
    });
  } catch (error) {
    console.error("Structured parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse resume into structured format" },
      { status: 500 }
    );
  }
}
