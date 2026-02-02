import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const HEYGEN_API_URL = "https://api.heygen.com/v1/streaming.create_token";
const MAX_SESSIONS_PER_DAY = 5;

/**
 * POST /api/avatar/token
 *
 * Generates a HeyGen access token for the authenticated user.
 * Rate-limited to MAX_SESSIONS_PER_DAY sessions per day per user.
 *
 * The token is used by the @heygen/streaming-avatar SDK on the client
 * to initialize a StreamingAvatar session (WebRTC video avatar).
 *
 * Returns: { token: string }
 */
export async function POST() {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check HEYGEN_API_KEY is configured
  const heygenApiKey = process.env.HEYGEN_API_KEY;
  if (!heygenApiKey) {
    console.error("HEYGEN_API_KEY environment variable is not set");
    return NextResponse.json(
      { error: "Avatar service is not configured" },
      { status: 503 }
    );
  }

  // Rate limiting: count interview sessions created today by this user
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error: countError } = await supabase
    .from("interview_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayStart.toISOString());

  if (countError) {
    console.error("Failed to check rate limit:", countError);
    return NextResponse.json(
      { error: "Failed to check session limit" },
      { status: 500 }
    );
  }

  if ((count ?? 0) >= MAX_SESSIONS_PER_DAY) {
    return NextResponse.json(
      {
        error: "Daily session limit reached",
        message: `You can create up to ${MAX_SESSIONS_PER_DAY} avatar sessions per day. Please try again tomorrow.`,
        limit: MAX_SESSIONS_PER_DAY,
        used: count,
      },
      { status: 429 }
    );
  }

  // Request a streaming token from HeyGen API
  try {
    const response = await fetch(HEYGEN_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": heygenApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `HeyGen API error (${response.status}):`,
        errorText
      );
      return NextResponse.json(
        { error: "Failed to generate avatar token" },
        { status: 502 }
      );
    }

    const result = await response.json();
    const token = result?.data?.token;

    if (!token) {
      console.error("HeyGen API returned no token:", result);
      return NextResponse.json(
        { error: "Failed to generate avatar token" },
        { status: 502 }
      );
    }

    // Create an interview session record to track usage for rate limiting
    const { error: insertError } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        session_type: "avatar_token",
        transcript: null,
        feedback: null,
        duration_seconds: null,
      });

    if (insertError) {
      // Log but don't block — the token was already generated
      console.error("Failed to record session for rate limiting:", insertError);
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Failed to fetch HeyGen token:", error);
    return NextResponse.json(
      { error: "Failed to connect to avatar service" },
      { status: 502 }
    );
  }
}
