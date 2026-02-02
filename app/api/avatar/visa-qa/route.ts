import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
import { VISA_QA_SYSTEM_PROMPT } from "@/lib/prompts/visa-qa-prompts";

// ============================================================================
// Request Validation Schema
// ============================================================================

const requestSchema = z.object({
  /** The user's spoken question (transcribed by HeyGen SDK) */
  question: z.string().min(1, "Question is required"),

  /** ID of an existing interview session to continue (optional for first question) */
  sessionId: z.string().uuid().optional(),

  /** User's visa status from their profile or resume detection */
  visaStatus: z.string().optional(),

  /** The job role they're targeting */
  targetRole: z.string().optional(),

  /** The job description they're applying to */
  jobDescription: z.string().optional(),

  /** Resume analysis ID to link this session to (for new sessions) */
  analysisId: z.string().uuid().optional(),
});

export type VisaQARequest = z.infer<typeof requestSchema>;

// ============================================================================
// Transcript Entry Type
// ============================================================================

interface TranscriptEntry {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

// Interface for interview session from Supabase
interface InterviewSession {
  id: string;
  user_id: string;
  session_type: string;
  transcript: TranscriptEntry[] | null;
  feedback: unknown;
  analysis_id: string | null;
  duration_seconds: number | null;
  created_at: string;
}

// ============================================================================
// POST /api/avatar/visa-qa
// ============================================================================

/**
 * Visa Q&A Avatar LLM Backend
 *
 * Receives the user's spoken question (transcribed by HeyGen), passes it to
 * GPT-4o with the visa advisor system prompt, and returns the AI response
 * for the avatar to speak aloud.
 *
 * Maintains conversation history in an interview_sessions record.
 *
 * Request body:
 * - question: string (required) - the transcribed user question
 * - sessionId: string (optional) - existing session ID to continue
 * - visaStatus: string (optional) - user's visa status for context
 * - targetRole: string (optional) - job role they're targeting
 * - jobDescription: string (optional) - JD they're applying to
 * - analysisId: string (optional) - link to resume analysis
 *
 * Response:
 * - response: string - the AI response text for the avatar to speak
 * - sessionId: string - the session ID (new or existing)
 * - transcriptLength: number - number of messages in the conversation
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();

  // ── Auth check ──────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse and validate request body ─────────────────────────────────────
  let body: VisaQARequest;
  try {
    const rawBody = await request.json();
    const parsed = requestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { question, sessionId, visaStatus, targetRole, jobDescription, analysisId } = body;

  // ── Load or create session ──────────────────────────────────────────────
  let currentSessionId: string;
  let transcript: TranscriptEntry[] = [];

  if (sessionId) {
    // Load existing session
    const { data, error: sessionError } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", user.id) // Ensure user owns this session
      .single();

    if (sessionError || !data) {
      return NextResponse.json(
        { error: "Session not found or access denied" },
        { status: 404 }
      );
    }

    const session = data as unknown as InterviewSession;

    // Validate it's a visa_qa session
    if (session.session_type !== "visa_qa") {
      return NextResponse.json(
        { error: "Invalid session type for visa Q&A" },
        { status: 400 }
      );
    }

    currentSessionId = session.id;
    transcript = session.transcript || [];
  } else {
    // Create a new session
    const { data: newSession, error: insertError } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        session_type: "visa_qa",
        analysis_id: analysisId || null,
        transcript: [],
        feedback: null,
        duration_seconds: null,
      })
      .select("id")
      .single();

    if (insertError || !newSession) {
      console.error("Failed to create visa Q&A session:", insertError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    currentSessionId = newSession.id;
    transcript = [];
  }

  // ── Add user question to transcript ─────────────────────────────────────
  const userEntry: TranscriptEntry = {
    role: "user",
    message: question,
    timestamp: new Date().toISOString(),
  };
  transcript.push(userEntry);

  // ── Build conversation history for GPT-4o ───────────────────────────────
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: VISA_QA_SYSTEM_PROMPT },
  ];

  // Add context if provided (as an initial system message addition)
  const contextParts: string[] = [];
  if (visaStatus && visaStatus !== "prefer_not_to_say") {
    contextParts.push(`User's visa status: ${visaStatus}`);
  }
  if (targetRole) {
    contextParts.push(`Target job role: ${targetRole}`);
  }
  if (jobDescription) {
    // Truncate JD for context (keep first 1000 chars)
    const truncatedJD = jobDescription.length > 1000
      ? jobDescription.slice(0, 1000) + "..."
      : jobDescription;
    contextParts.push(`Job description summary:\n${truncatedJD}`);
  }

  if (contextParts.length > 0) {
    messages.push({
      role: "user",
      content: `[Context for this conversation]\n${contextParts.join("\n\n")}`,
    });
    messages.push({
      role: "assistant",
      content: "I understand. I'm here to help you with questions about work authorization and how it affects your job search. What would you like to know?",
    });
  }

  // Add conversation history (excluding the current question which we add last)
  for (let i = 0; i < transcript.length - 1; i++) {
    const entry = transcript[i];
    messages.push({
      role: entry.role,
      content: entry.message,
    });
  }

  // Add the current question
  messages.push({ role: "user", content: question });

  // ── Call GPT-4o ─────────────────────────────────────────────────────────
  let aiResponse: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7, // Slightly higher for natural conversation
      max_tokens: 500, // Keep responses concise for speech
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4o");
    }

    aiResponse = content;
  } catch (error) {
    console.error("GPT-4o call failed for visa Q&A:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 502 }
    );
  }

  // ── Add AI response to transcript ───────────────────────────────────────
  const assistantEntry: TranscriptEntry = {
    role: "assistant",
    message: aiResponse,
    timestamp: new Date().toISOString(),
  };
  transcript.push(assistantEntry);

  // ── Save updated transcript to session ──────────────────────────────────
  const { error: updateError } = await supabase
    .from("interview_sessions")
    .update({
      transcript: JSON.parse(JSON.stringify(transcript)), // Ensure JSON-compatible
    })
    .eq("id", currentSessionId);

  if (updateError) {
    // Log but don't fail — the response was already generated
    console.error("Failed to save transcript:", updateError);
  }

  // ── Return response ─────────────────────────────────────────────────────
  return NextResponse.json({
    response: aiResponse,
    sessionId: currentSessionId,
    transcriptLength: transcript.length,
  });
}
