import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
import {
  HR_INTERVIEW_SYSTEM_PROMPT,
  buildInterviewFeedbackPrompt,
  validateInterviewFeedback,
  InterviewFeedbackSummary,
} from "@/lib/prompts/interview-prompts";

// ============================================================================
// Request Validation Schema
// ============================================================================

const requestSchema = z.object({
  /** The user's spoken response (transcribed by HeyGen SDK) */
  userMessage: z.string().min(1, "User message is required"),

  /** ID of an existing interview session to continue (optional for first message) */
  sessionId: z.string().uuid().optional(),

  /** The job description for interview context */
  jobDescription: z.string().optional(),

  /** The user's resume text for context */
  resumeText: z.string().optional(),

  /** The target role */
  targetRole: z.string().optional(),

  /** Years of experience */
  yearsExperience: z.string().optional(),

  /** Resume analysis ID to link this session to */
  analysisId: z.string().uuid().optional(),

  /** Whether to end the session and generate final feedback */
  endSession: z.boolean().optional(),
});

export type InterviewRequest = z.infer<typeof requestSchema>;

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
  feedback: InterviewFeedbackSummary | null;
  analysis_id: string | null;
  duration_seconds: number | null;
  created_at: string;
}

// ============================================================================
// POST /api/avatar/interview
// ============================================================================

/**
 * HR Interview Avatar LLM Backend
 *
 * Serves as the LLM backend for the HR interview avatar. GPT-4o acts as an
 * HR interviewer conducting a mock interview for the specific job description.
 *
 * Features:
 * - Asks common interview questions + role-specific questions
 * - Provides feedback after each user answer
 * - Maintains conversation history in an interview_sessions record
 * - Can generate final session feedback when endSession=true
 *
 * Request body:
 * - userMessage: string (required) - the transcribed user response
 * - sessionId: string (optional) - existing session ID to continue
 * - jobDescription: string (optional) - JD for interview context
 * - resumeText: string (optional) - user's resume for personalization
 * - targetRole: string (optional) - the role they're targeting
 * - yearsExperience: string (optional) - experience level
 * - analysisId: string (optional) - link to resume analysis
 * - endSession: boolean (optional) - if true, generates final feedback
 *
 * Response:
 * - response: string - the AI interviewer's response for the avatar to speak
 * - sessionId: string - the session ID (new or existing)
 * - transcriptLength: number - number of messages in the conversation
 * - feedback?: InterviewFeedbackSummary - only when endSession=true
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
  let body: InterviewRequest;
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

  const {
    userMessage,
    sessionId,
    jobDescription,
    resumeText,
    targetRole,
    yearsExperience,
    analysisId,
    endSession,
  } = body;

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

    // Validate it's an hr_interview session
    if (session.session_type !== "hr_interview") {
      return NextResponse.json(
        { error: "Invalid session type for HR interview" },
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
        session_type: "hr_interview",
        analysis_id: analysisId || null,
        transcript: [],
        feedback: null,
        duration_seconds: null,
      })
      .select("id")
      .single();

    if (insertError || !newSession) {
      console.error("Failed to create HR interview session:", insertError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    currentSessionId = newSession.id;
    transcript = [];
  }

  // ── Add user message to transcript ─────────────────────────────────────
  const userEntry: TranscriptEntry = {
    role: "user",
    message: userMessage,
    timestamp: new Date().toISOString(),
  };
  transcript.push(userEntry);

  // ── Handle end session request ─────────────────────────────────────────
  if (endSession) {
    return await handleEndSession(
      supabase,
      currentSessionId,
      transcript,
      jobDescription
    );
  }

  // ── Build conversation history for GPT-4o ───────────────────────────────
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: HR_INTERVIEW_SYSTEM_PROMPT },
  ];

  // Add context if provided (as an initial context exchange)
  const contextParts: string[] = [];

  if (jobDescription) {
    // Truncate JD for context (keep first 1500 chars)
    const truncatedJD =
      jobDescription.length > 1500
        ? jobDescription.slice(0, 1500) + "..."
        : jobDescription;
    contextParts.push(`## Job Description\n${truncatedJD}`);
  }

  if (targetRole) {
    contextParts.push(`## Target Role: ${targetRole}`);
  }

  if (yearsExperience) {
    contextParts.push(`## Experience Level: ${yearsExperience}`);
  }

  if (resumeText) {
    // Truncate resume for context (keep first 1000 chars)
    const truncatedResume =
      resumeText.length > 1000
        ? resumeText.slice(0, 1000) + "..."
        : resumeText;
    contextParts.push(`## Candidate Resume Summary\n${truncatedResume}`);
  }

  if (contextParts.length > 0) {
    messages.push({
      role: "user",
      content: `[Interview Context - Use this to tailor your questions]\n\n${contextParts.join("\n\n")}`,
    });
    messages.push({
      role: "assistant",
      content:
        "Thank you for the context. I'm ready to conduct the mock interview. Let's begin!",
    });
  }

  // Add conversation history (excluding the current message which we add last)
  for (let i = 0; i < transcript.length - 1; i++) {
    const entry = transcript[i];
    messages.push({
      role: entry.role,
      content: entry.message,
    });
  }

  // Add the current user message
  messages.push({ role: "user", content: userMessage });

  // ── Call GPT-4o ─────────────────────────────────────────────────────────
  let aiResponse: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7, // Slightly higher for natural conversation
      max_tokens: 600, // Allow room for feedback after each question
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from GPT-4o");
    }

    aiResponse = content;
  } catch (error) {
    console.error("GPT-4o call failed for HR interview:", error);
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
    console.error("Failed to save interview transcript:", updateError);
  }

  // ── Return response ─────────────────────────────────────────────────────
  return NextResponse.json({
    response: aiResponse,
    sessionId: currentSessionId,
    transcriptLength: transcript.length,
  });
}

// ============================================================================
// Handle End Session — Generate Final Feedback
// ============================================================================

async function handleEndSession(
  // Supabase client type is complex — using ReturnType from createClient would
  // cause circular type issues, so we accept the client as typed by caller
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  transcript: TranscriptEntry[],
  jobDescription?: string
): Promise<NextResponse> {
  // Generate final feedback using GPT-4o
  let feedback: InterviewFeedbackSummary | null = null;

  // Only generate feedback if there was meaningful conversation
  if (transcript.length >= 2) {
    try {
      const feedbackPrompt = buildInterviewFeedbackPrompt(
        transcript,
        jobDescription
      );

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: feedbackPrompt },
          { role: "user", content: "Please analyze this interview session and provide feedback in the specified JSON format." },
        ],
        temperature: 0.3, // Lower temperature for consistent feedback
        max_tokens: 1500, // Allow room for detailed feedback
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          const rawFeedback = JSON.parse(content);
          feedback = validateInterviewFeedback(rawFeedback);
        } catch {
          console.error("Failed to parse interview feedback JSON");
        }
      }
    } catch (error) {
      console.error("Failed to generate interview feedback:", error);
      // Continue without feedback — better to end session than fail entirely
    }
  }

  // Save final transcript and feedback
  const { error: finalUpdateError } = await supabase
    .from("interview_sessions")
    .update({
      transcript: JSON.parse(JSON.stringify(transcript)),
      feedback: feedback ? JSON.parse(JSON.stringify(feedback)) : null,
    })
    .eq("id", sessionId);

  if (finalUpdateError) {
    console.error("Failed to save final interview session:", finalUpdateError);
  }

  // Generate a closing response
  const closingResponse =
    "Thank you so much for practicing with me today! You did a great job. " +
    "I've compiled some feedback on your performance that you can review. " +
    "Remember, practice makes perfect, so don't hesitate to come back and practice again. Good luck with your interviews!";

  return NextResponse.json({
    response: closingResponse,
    sessionId,
    transcriptLength: transcript.length,
    feedback,
    sessionEnded: true,
  });
}
