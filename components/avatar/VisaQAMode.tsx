"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
  TaskMode,
} from "@heygen/streaming-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

export interface TranscriptEntry {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

export interface VisaQAModeProps {
  /** User's visa status for context */
  visaStatus?: string;
  /** Target job role for context */
  targetRole?: string;
  /** Job description for context */
  jobDescription?: string;
  /** Resume analysis ID to link the session to */
  analysisId?: string;
  /** Callback when session ends */
  onSessionEnd?: (transcript: TranscriptEntry[]) => void;
}

type SessionStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "ended"
  | "text_mode"; // Fallback text-only mode when HeyGen fails

// ============================================================================
// Component
// ============================================================================

export function VisaQAMode({
  visaStatus,
  targetRole,
  jobDescription,
  analysisId,
  onSessionEnd,
}: VisaQAModeProps) {
  // State
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState(""); // For text-only mode
  const [isTextModeSubmitting, setIsTextModeSubmitting] = useState(false);

  // Refs
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptEndRef.current && typeof transcriptEndRef.current.scrollIntoView === "function") {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  // ── Fetch HeyGen token ───────────────────────────────────────────────────
  const fetchToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch("/api/avatar/token", { method: "POST" });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 429) {
          throw new Error(
            data.message || "Daily session limit reached. Please try again tomorrow."
          );
        }
        if (response.status === 503) {
          throw new Error("Avatar service is not configured. Please contact support.");
        }
        throw new Error(data.error || "Failed to get avatar token");
      }

      const { token } = await response.json();
      return token;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect to avatar service";
      setError(message);
      setStatus("error");
      return null;
    }
  }, []);

  // ── Send question to visa Q&A backend ────────────────────────────────────
  const sendQuestion = useCallback(
    async (question: string): Promise<string | null> => {
      try {
        const response = await fetch("/api/avatar/visa-qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            sessionId,
            visaStatus,
            targetRole,
            jobDescription,
            analysisId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to get response");
        }

        const data = await response.json();

        // Update session ID if this was the first question
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }

        // Add to local transcript
        const userEntry: TranscriptEntry = {
          role: "user",
          message: question,
          timestamp: new Date().toISOString(),
        };
        const assistantEntry: TranscriptEntry = {
          role: "assistant",
          message: data.response,
          timestamp: new Date().toISOString(),
        };

        setTranscript((prev) => [...prev, userEntry, assistantEntry]);

        return data.response;
      } catch (err) {
        console.error("Failed to send question:", err);
        setError(err instanceof Error ? err.message : "Failed to get response");
        return null;
      }
    },
    [sessionId, visaStatus, targetRole, jobDescription, analysisId]
  );

  // ── Start session ────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setError(null);
    setStatus("connecting");

    // Get token
    const token = await fetchToken();
    if (!token) return;

    try {
      // Initialize avatar
      const avatar = new StreamingAvatar({ token });
      avatarRef.current = avatar;

      // Set up event listeners
      avatar.on(StreamingEvents.STREAM_READY, (event: CustomEvent) => {
        if (event.detail && videoRef.current) {
          videoRef.current.srcObject = event.detail as MediaStream;
          videoRef.current.play().catch(console.error);
        }
        setStatus("ready");
      });

      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        setStatus("ended");
        if (avatarRef.current) {
          avatarRef.current = null;
        }
      });

      avatar.on(StreamingEvents.USER_START, () => {
        setStatus("listening");
      });

      avatar.on(StreamingEvents.USER_STOP, () => {
        setStatus("processing");
      });

      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        setStatus("speaking");
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        setStatus("ready");
      });

      // Handle user's transcribed speech
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, async (event: CustomEvent) => {
        const userMessage = event.detail?.message;
        if (userMessage && typeof userMessage === "string" && userMessage.trim()) {
          // Send to our visa Q&A backend
          const aiResponse = await sendQuestion(userMessage.trim());

          if (aiResponse && avatarRef.current) {
            // Make the avatar speak the response
            await avatarRef.current.speak({
              text: aiResponse,
              taskType: TaskType.TALK,
              taskMode: TaskMode.SYNC,
            });
          }
        }
      });

      // Start avatar session with voice chat enabled
      await avatar.createStartAvatar({
        quality: AvatarQuality.Medium,
        avatarName: "default", // Use default avatar
        language: "en",
        disableIdleTimeout: true, // We handle our own session management
      });

      // Start voice chat mode
      await avatar.startVoiceChat({
        isInputAudioMuted: false,
      });

      // Greet the user
      const greeting =
        "Hello! I'm here to help you with questions about work authorization and visa sponsorship. Feel free to ask me anything about H-1B, OPT, CPT, or other employment-related immigration topics. What would you like to know?";

      // Add greeting to transcript
      const greetingEntry: TranscriptEntry = {
        role: "assistant",
        message: greeting,
        timestamp: new Date().toISOString(),
      };
      setTranscript([greetingEntry]);

      // Make avatar speak the greeting
      await avatar.speak({
        text: greeting,
        taskType: TaskType.TALK,
        taskMode: TaskMode.SYNC,
      });
    } catch (err) {
      console.error("Failed to start avatar session:", err);
      // Fallback to text-only mode if HeyGen connection fails
      const errorMessage = err instanceof Error ? err.message : "Failed to start session";
      console.log("Falling back to text-only mode due to:", errorMessage);

      // Start text-only mode with greeting
      const greeting =
        "Hello! I'm here to help you with questions about work authorization and visa sponsorship. Note: Video avatar is unavailable, so we'll chat via text. Ask me anything about H-1B, OPT, CPT, or other employment-related immigration topics.";

      const greetingEntry: TranscriptEntry = {
        role: "assistant",
        message: greeting,
        timestamp: new Date().toISOString(),
      };
      setTranscript([greetingEntry]);
      setError(null); // Clear error since we're falling back gracefully
      setStatus("text_mode");
    }
  }, [fetchToken, sendQuestion]);

  // ── Handle text-only message submission ──────────────────────────────────
  const handleTextModeSubmit = useCallback(async () => {
    const question = textInput.trim();
    if (!question || isTextModeSubmitting) return;

    setIsTextModeSubmitting(true);
    setTextInput("");

    try {
      const response = await fetch("/api/avatar/visa-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          sessionId,
          visaStatus,
          targetRole,
          jobDescription,
          analysisId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get response");
      }

      const data = await response.json();

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const userEntry: TranscriptEntry = {
        role: "user",
        message: question,
        timestamp: new Date().toISOString(),
      };
      const assistantEntry: TranscriptEntry = {
        role: "assistant",
        message: data.response,
        timestamp: new Date().toISOString(),
      };

      setTranscript((prev) => [...prev, userEntry, assistantEntry]);
    } catch (err) {
      console.error("Failed to send question:", err);
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setIsTextModeSubmitting(false);
      // Focus back on input
      textInputRef.current?.focus();
    }
  }, [textInput, isTextModeSubmitting, sessionId, visaStatus, targetRole, jobDescription, analysisId]);

  // ── End session ──────────────────────────────────────────────────────────
  const endSession = useCallback(async () => {
    if (avatarRef.current) {
      try {
        await avatarRef.current.stopAvatar();
      } catch (err) {
        console.error("Error stopping avatar:", err);
      }
      avatarRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStatus("ended");
    onSessionEnd?.(transcript);
  }, [transcript, onSessionEnd]);

  // ── Toggle mute ──────────────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    if (!avatarRef.current) return;

    try {
      if (isMuted) {
        await avatarRef.current.unmuteInputAudio();
      } else {
        await avatarRef.current.muteInputAudio();
      }
      setIsMuted(!isMuted);
    } catch (err) {
      console.error("Failed to toggle mute:", err);
    }
  }, [isMuted]);

  // ── Interrupt avatar ─────────────────────────────────────────────────────
  const interrupt = useCallback(async () => {
    if (!avatarRef.current) return;

    try {
      await avatarRef.current.interrupt();
      setStatus("ready");
    } catch (err) {
      console.error("Failed to interrupt:", err);
    }
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (avatarRef.current && typeof avatarRef.current.stopAvatar === "function") {
        avatarRef.current.stopAvatar().catch(console.error);
      }
    };
  }, []);

  // ── Get status display info ──────────────────────────────────────────────
  const getStatusInfo = () => {
    switch (status) {
      case "idle":
        return { text: "Ready to start", color: "bg-gray-500" };
      case "connecting":
        return { text: "Connecting...", color: "bg-yellow-500" };
      case "ready":
        return { text: "Waiting for you to speak", color: "bg-green-500" };
      case "listening":
        return { text: "Listening...", color: "bg-blue-500" };
      case "processing":
        return { text: "Processing...", color: "bg-purple-500" };
      case "speaking":
        return { text: "Speaking...", color: "bg-teal-500" };
      case "error":
        return { text: "Error", color: "bg-red-500" };
      case "ended":
        return { text: "Session ended", color: "bg-gray-500" };
      case "text_mode":
        return { text: "Text chat mode", color: "bg-indigo-500" };
      default:
        return { text: "Unknown", color: "bg-gray-500" };
    }
  };

  const statusInfo = getStatusInfo();

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" data-testid="visa-qa-mode">
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b">
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <h2 className="text-base md:text-lg font-semibold">Visa Q&A Session</h2>
          <Badge
            variant="outline"
            className={`${statusInfo.color} text-white border-0`}
            data-testid="status-badge"
          >
            {statusInfo.text}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {status !== "idle" && status !== "ended" && status !== "text_mode" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                data-testid="mute-button"
              >
                {isMuted ? (
                  <MicOffIcon className="h-4 w-4" />
                ) : (
                  <MicIcon className="h-4 w-4" />
                )}
              </Button>
              {status === "speaking" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={interrupt}
                  aria-label="Interrupt avatar"
                  data-testid="interrupt-button"
                >
                  <StopIcon className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Video container (or text chat in fallback mode) */}
        <div className="flex-1 flex items-center justify-center bg-gray-900 relative min-h-[300px] md:min-h-0">
          {status === "text_mode" ? (
            // Text-only fallback mode
            <div className="flex flex-col h-full w-full bg-background">
              {/* Chat messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {transcript.map((entry, index) => (
                  <div
                    key={index}
                    className={`max-w-[80%] ${
                      entry.role === "user"
                        ? "ml-auto bg-blue-600 text-white"
                        : "mr-auto bg-muted"
                    } p-3 rounded-lg`}
                    data-testid={`text-chat-entry-${entry.role}`}
                  >
                    <p className="font-medium text-xs mb-1 opacity-70">
                      {entry.role === "user" ? "You" : "Advisor"}
                    </p>
                    <p className="text-sm">{entry.message}</p>
                  </div>
                ))}
                {isTextModeSubmitting && (
                  <div className="mr-auto bg-muted p-3 rounded-lg animate-pulse">
                    <p className="font-medium text-xs mb-1 opacity-70">Advisor</p>
                    <p className="text-sm text-muted-foreground">Typing...</p>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>
              {/* Text input area */}
              <div className="p-4 border-t bg-muted/30">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleTextModeSubmit();
                  }}
                  className="flex gap-2"
                >
                  <input
                    ref={textInputRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type your question..."
                    className="flex-1 px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isTextModeSubmitting}
                    data-testid="text-mode-input"
                  />
                  <Button
                    type="submit"
                    disabled={!textInput.trim() || isTextModeSubmitting}
                    data-testid="text-mode-send"
                  >
                    {isTextModeSubmitting ? "Sending..." : "Send"}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Video avatar unavailable. Using text chat instead.
                </p>
              </div>
            </div>
          ) : status === "idle" ? (
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                <AvatarIcon className="h-16 w-16 text-gray-600" />
              </div>
              <p className="text-gray-400 mb-4">
                Start a session to speak with your visa Q&A advisor
              </p>
              <Button
                onClick={startSession}
                size="lg"
                data-testid="start-session-button"
              >
                Start Session
              </Button>
            </div>
          ) : status === "ended" ? (
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                <CheckIcon className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-gray-400 mb-4">Session completed</p>
              <Button
                onClick={startSession}
                size="lg"
                variant="outline"
                data-testid="restart-session-button"
              >
                Start New Session
              </Button>
            </div>
          ) : status === "connecting" ? (
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center animate-pulse">
                <AvatarIcon className="h-16 w-16 text-gray-500" />
              </div>
              <p className="text-gray-400">Connecting to avatar...</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              data-testid="avatar-video"
            />
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="bg-red-900/90 text-white p-4 rounded-lg max-w-md text-center">
                <p className="font-medium mb-2">Error</p>
                <p className="text-sm opacity-90 mb-4">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setStatus("idle");
                  }}
                  className="text-white border-white hover:bg-white/10"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Transcript panel (hidden in text mode since chat is in main area, hidden on mobile) */}
        {status !== "text_mode" && (
          <div className="hidden md:flex w-80 border-l flex-col bg-muted/30">
            <div className="p-3 border-b font-medium text-sm">Transcript</div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {transcript.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Conversation will appear here
                </p>
              ) : (
                transcript.map((entry, index) => (
                  <div
                    key={index}
                    className={`text-sm ${
                      entry.role === "user"
                        ? "bg-blue-100 dark:bg-blue-900/30 ml-4"
                        : "bg-gray-100 dark:bg-gray-800/50 mr-4"
                    } p-2 rounded-lg`}
                    data-testid={`transcript-entry-${entry.role}`}
                  >
                    <p className="font-medium text-xs mb-1 opacity-60">
                      {entry.role === "user" ? "You" : "Advisor"}
                    </p>
                    <p>{entry.message}</p>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Footer with end session button */}
      {status !== "idle" && status !== "ended" && (
        <div className={`p-4 border-t flex justify-center ${status === "text_mode" ? "bg-muted/30" : ""}`}>
          <Button
            variant="destructive"
            onClick={endSession}
            data-testid="end-session-button"
          >
            End Session
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Icon Components
// ============================================================================

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="14" height="14" x="5" y="5" rx="2" />
    </svg>
  );
}

function AvatarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
