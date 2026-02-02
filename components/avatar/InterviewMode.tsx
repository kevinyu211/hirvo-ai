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
import { Progress } from "@/components/ui/progress";
import type { InterviewFeedbackSummary } from "@/lib/prompts/interview-prompts";

// ============================================================================
// Types
// ============================================================================

export interface TranscriptEntry {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

export interface InterviewModeProps {
  /** Job description for context-aware questions */
  jobDescription?: string;
  /** Resume text for context */
  resumeText?: string;
  /** Target job role */
  targetRole?: string;
  /** User's years of experience */
  yearsExperience?: string;
  /** Resume analysis ID to link the session to */
  analysisId?: string;
  /** Callback when session ends with transcript and feedback */
  onSessionEnd?: (transcript: TranscriptEntry[], feedback: InterviewFeedbackSummary | null) => void;
}

type SessionStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "ending"
  | "ended"
  | "text_mode"; // Fallback text-only mode when HeyGen fails

// ============================================================================
// Component
// ============================================================================

export function InterviewMode({
  jobDescription,
  resumeText,
  targetRole,
  yearsExperience,
  analysisId,
  onSessionEnd,
}: InterviewModeProps) {
  // State
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answerTime, setAnswerTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedbackSummary | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [textInput, setTextInput] = useState(""); // For text-only mode
  const [isTextModeSubmitting, setIsTextModeSubmitting] = useState(false);

  // Refs
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptEndRef.current && typeof transcriptEndRef.current.scrollIntoView === "function") {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setAnswerTime((prev) => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

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

  // ── Send message to interview backend ────────────────────────────────────
  const sendMessage = useCallback(
    async (userMessage: string, endSession?: boolean): Promise<{ response: string; sessionEnded?: boolean; feedback?: InterviewFeedbackSummary } | null> => {
      try {
        const response = await fetch("/api/avatar/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage,
            sessionId,
            jobDescription,
            resumeText,
            targetRole,
            yearsExperience,
            analysisId,
            endSession,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to get response");
        }

        const data = await response.json();

        // Update session ID if this was the first message
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }

        // Add to local transcript
        const userEntry: TranscriptEntry = {
          role: "user",
          message: userMessage,
          timestamp: new Date().toISOString(),
        };
        const assistantEntry: TranscriptEntry = {
          role: "assistant",
          message: data.response,
          timestamp: new Date().toISOString(),
        };

        setTranscript((prev) => [...prev, userEntry, assistantEntry]);

        // Extract current question from the response if it contains one
        const questionMatch = data.response.match(/(?:tell me about|how would you|what|why|describe|can you|could you)[^.?!]*\?/gi);
        if (questionMatch && questionMatch.length > 0) {
          setCurrentQuestion(questionMatch[questionMatch.length - 1]);
          setQuestionCount((prev) => prev + 1);
        }

        return {
          response: data.response,
          sessionEnded: data.sessionEnded,
          feedback: data.feedback,
        };
      } catch (err) {
        console.error("Failed to send message:", err);
        setError(err instanceof Error ? err.message : "Failed to get response");
        return null;
      }
    },
    [sessionId, jobDescription, resumeText, targetRole, yearsExperience, analysisId]
  );

  // ── Start session ────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    setFeedback(null);
    setTranscript([]);
    setCurrentQuestion(null);
    setQuestionCount(0);
    setAnswerTime(0);

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
        setIsTimerRunning(false);
        if (avatarRef.current) {
          avatarRef.current = null;
        }
      });

      avatar.on(StreamingEvents.USER_START, () => {
        setStatus("listening");
        setIsTimerRunning(true);
      });

      avatar.on(StreamingEvents.USER_STOP, () => {
        setStatus("processing");
        setIsTimerRunning(false);
      });

      avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        setStatus("speaking");
        setIsTimerRunning(false);
      });

      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        setStatus("ready");
        // Reset timer for next answer
        setAnswerTime(0);
      });

      // Handle user's transcribed speech
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, async (event: CustomEvent) => {
        const userMessage = event.detail?.message;
        if (userMessage && typeof userMessage === "string" && userMessage.trim()) {
          // Send to our interview backend
          const result = await sendMessage(userMessage.trim());

          if (result?.response && avatarRef.current) {
            // Make the avatar speak the response
            await avatarRef.current.speak({
              text: result.response,
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

      // Greet the user with interview opening
      const roleContext = targetRole ? ` for the ${targetRole} position` : "";
      const greeting = `Hello! Welcome to your mock interview${roleContext}. I'm here to help you practice and improve your interview skills. This will be a conversational interview where I'll ask you questions relevant to the role, and after each answer, I'll provide feedback. Let's begin with a warm-up question: Can you tell me a little about yourself and why you're interested in this role?`;

      // Add greeting to transcript
      const greetingEntry: TranscriptEntry = {
        role: "assistant",
        message: greeting,
        timestamp: new Date().toISOString(),
      };
      setTranscript([greetingEntry]);
      setCurrentQuestion("Can you tell me a little about yourself and why you're interested in this role?");
      setQuestionCount(1);

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
      const roleContext = targetRole ? ` for the ${targetRole} position` : "";
      const greeting = `Hello! Welcome to your mock interview${roleContext}. Note: Video avatar is unavailable, so we'll chat via text. I'm here to help you practice and improve your interview skills. I'll ask you questions relevant to the role, and after each answer, I'll provide feedback. Let's begin with a warm-up question: Can you tell me a little about yourself and why you're interested in this role?`;

      const greetingEntry: TranscriptEntry = {
        role: "assistant",
        message: greeting,
        timestamp: new Date().toISOString(),
      };
      setTranscript([greetingEntry]);
      setCurrentQuestion("Can you tell me a little about yourself and why you're interested in this role?");
      setQuestionCount(1);
      setError(null); // Clear error since we're falling back gracefully
      setStatus("text_mode");
    }
  }, [fetchToken, sendMessage, targetRole]);

  // ── Handle text-only message submission ──────────────────────────────────
  const handleTextModeSubmit = useCallback(async () => {
    const userMessage = textInput.trim();
    if (!userMessage || isTextModeSubmitting) return;

    setIsTextModeSubmitting(true);
    setTextInput("");

    try {
      const result = await sendMessage(userMessage);

      if (result?.response) {
        // Question extraction is already handled in sendMessage
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsTextModeSubmitting(false);
      textInputRef.current?.focus();
    }
  }, [textInput, isTextModeSubmitting, sendMessage]);

  // ── End session with feedback ───────────────────────────────────────────
  const endSession = useCallback(async () => {
    setIsTimerRunning(false);
    setStatus("ending");

    // Request feedback from the interview API
    const result = await sendMessage("I'd like to end the interview now. Please provide your overall feedback.", true);

    if (result?.feedback) {
      setFeedback(result.feedback);
    }

    if (avatarRef.current) {
      try {
        // If we have a closing message, speak it first
        if (result?.response && avatarRef.current) {
          await avatarRef.current.speak({
            text: result.response,
            taskType: TaskType.TALK,
            taskMode: TaskMode.SYNC,
          });
        }
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
    onSessionEnd?.(transcript, result?.feedback || null);
  }, [transcript, onSessionEnd, sendMessage]);

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

  // ── Request next question ────────────────────────────────────────────────
  const requestNextQuestion = useCallback(async () => {
    if (!avatarRef.current) return;

    const result = await sendMessage("Please move on to the next question.");

    if (result?.response && avatarRef.current) {
      await avatarRef.current.speak({
        text: result.response,
        taskType: TaskType.TALK,
        taskMode: TaskMode.SYNC,
      });
    }
  }, [sendMessage]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (avatarRef.current && typeof avatarRef.current.stopAvatar === "function") {
        avatarRef.current.stopAvatar().catch(console.error);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // ── Format timer ─────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ── Get status display info ──────────────────────────────────────────────
  const getStatusInfo = () => {
    switch (status) {
      case "idle":
        return { text: "Ready to start", color: "bg-gray-500" };
      case "connecting":
        return { text: "Connecting...", color: "bg-yellow-500" };
      case "ready":
        return { text: "Your turn to speak", color: "bg-green-500" };
      case "listening":
        return { text: "Listening...", color: "bg-blue-500" };
      case "processing":
        return { text: "Processing...", color: "bg-purple-500" };
      case "speaking":
        return { text: "Interviewer speaking...", color: "bg-teal-500" };
      case "error":
        return { text: "Error", color: "bg-red-500" };
      case "ending":
        return { text: "Generating feedback...", color: "bg-yellow-500" };
      case "ended":
        return { text: "Interview completed", color: "bg-gray-500" };
      case "text_mode":
        return { text: "Text chat mode", color: "bg-indigo-500" };
      default:
        return { text: "Unknown", color: "bg-gray-500" };
    }
  };

  const statusInfo = getStatusInfo();

  // ── Render feedback summary ──────────────────────────────────────────────
  const renderFeedbackSummary = () => {
    if (!feedback) return null;

    return (
      <div className="p-6 space-y-6" data-testid="feedback-summary">
        {/* Overall Score */}
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Overall Interview Score</h3>
          <div className="relative inline-flex items-center justify-center">
            <div
              className={`text-4xl font-bold ${
                feedback.overallScore >= 70
                  ? "text-green-600"
                  : feedback.overallScore >= 50
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
              data-testid="overall-score"
            >
              {feedback.overallScore}
            </div>
            <span className="text-lg text-muted-foreground ml-1">/100</span>
          </div>
          <Progress
            value={feedback.overallScore}
            className="mt-2 max-w-xs mx-auto"
            data-testid="score-progress"
          />
        </div>

        {/* Strengths */}
        {feedback.strengths.length > 0 && (
          <div>
            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
              <StrengthIcon className="h-4 w-4" />
              Strengths
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm" data-testid="strengths-list">
              {feedback.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas for Improvement */}
        {feedback.areasForImprovement.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
              <ImprovementIcon className="h-4 w-4" />
              Areas for Improvement
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm" data-testid="improvements-list">
              {feedback.areasForImprovement.map((area, idx) => (
                <li key={idx}>{area}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Question Breakdown */}
        {feedback.questionBreakdown.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <QuestionIcon className="h-4 w-4" />
              Question-by-Question Breakdown
            </h4>
            <div className="space-y-3" data-testid="question-breakdown">
              {feedback.questionBreakdown.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Q{idx + 1}</span>
                    <Badge
                      variant={item.score >= 70 ? "default" : item.score >= 50 ? "secondary" : "destructive"}
                    >
                      {item.score}/100
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{item.question}</p>
                  <p className="text-sm">{item.assessment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {feedback.recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
              <TipIcon className="h-4 w-4" />
              Practice Recommendations
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm" data-testid="recommendations-list">
              {feedback.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" data-testid="interview-mode">
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b">
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          <h2 className="text-base md:text-lg font-semibold">HR Interview Practice</h2>
          <Badge
            variant="outline"
            className={`${statusInfo.color} text-white border-0`}
            data-testid="status-badge"
          >
            {statusInfo.text}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {status !== "idle" && status !== "ended" && status !== "ending" && status !== "text_mode" && (
            <>
              {/* Question counter */}
              <Badge variant="secondary" data-testid="question-counter">
                Q{questionCount}
              </Badge>

              {/* Answer timer */}
              {(status === "listening" || status === "ready") && (
                <Badge
                  variant="outline"
                  className={answerTime > 120 ? "text-red-500 border-red-500" : ""}
                  data-testid="answer-timer"
                >
                  <TimerIcon className="h-3 w-3 mr-1" />
                  {formatTime(answerTime)}
                </Badge>
              )}

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
                  aria-label="Interrupt interviewer"
                  data-testid="interrupt-button"
                >
                  <StopIcon className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {/* Text mode question counter */}
          {status === "text_mode" && questionCount > 0 && (
            <Badge variant="secondary" data-testid="question-counter">
              Q{questionCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Video container */}
        <div className="flex-1 flex flex-col bg-gray-900 relative min-h-[300px] md:min-h-0">
          {/* Current question display */}
          {currentQuestion && status !== "idle" && status !== "ended" && (
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="bg-black/70 text-white p-3 rounded-lg" data-testid="current-question">
                <p className="text-xs text-gray-400 mb-1">Current Question:</p>
                <p className="text-sm">{currentQuestion}</p>
              </div>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center">
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
                        {entry.role === "user" ? "You" : "Interviewer"}
                      </p>
                      <p className="text-sm">{entry.message}</p>
                    </div>
                  ))}
                  {isTextModeSubmitting && (
                    <div className="mr-auto bg-muted p-3 rounded-lg animate-pulse">
                      <p className="font-medium text-xs mb-1 opacity-70">Interviewer</p>
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
                      placeholder="Type your answer..."
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
                  <InterviewIcon className="h-16 w-16 text-gray-600" />
                </div>
                <p className="text-gray-400 mb-2">Start your mock interview session</p>
                {targetRole && (
                  <p className="text-gray-500 text-sm mb-4">
                    Practicing for: {targetRole}
                  </p>
                )}
                <Button
                  onClick={startSession}
                  size="lg"
                  data-testid="start-session-button"
                >
                  Start Interview
                </Button>
              </div>
            ) : status === "ended" ? (
              <div className="text-center w-full max-w-2xl mx-auto overflow-y-auto max-h-full">
                {feedback ? (
                  renderFeedbackSummary()
                ) : (
                  <div>
                    <div className="w-32 h-32 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                      <CheckIcon className="h-16 w-16 text-green-500" />
                    </div>
                    <p className="text-gray-400 mb-4">Interview completed</p>
                  </div>
                )}
                <Button
                  onClick={startSession}
                  size="lg"
                  variant="outline"
                  className="mt-4"
                  data-testid="restart-session-button"
                >
                  Start New Interview
                </Button>
              </div>
            ) : status === "connecting" || status === "ending" ? (
              <div className="text-center">
                <div className="w-32 h-32 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center animate-pulse">
                  <InterviewIcon className="h-16 w-16 text-gray-500" />
                </div>
                <p className="text-gray-400">
                  {status === "connecting" ? "Connecting to interviewer..." : "Generating feedback..."}
                </p>
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
          </div>

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
            <div className="p-3 border-b font-medium text-sm flex items-center justify-between">
              <span>Interview Transcript</span>
              {transcript.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {transcript.length} messages
                </Badge>
              )}
            </div>
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
                      {entry.role === "user" ? "You" : "Interviewer"}
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

      {/* Footer with controls */}
      {status !== "idle" && status !== "ended" && status !== "ending" && (
        <div className={`p-4 border-t flex justify-center gap-3 ${status === "text_mode" ? "bg-muted/30" : ""}`}>
          {status !== "text_mode" && (
            <Button
              variant="outline"
              onClick={requestNextQuestion}
              disabled={status === "speaking" || status === "processing"}
              data-testid="next-question-button"
            >
              Next Question
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={endSession}
            data-testid="end-session-button"
          >
            End Interview
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

function InterviewIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="8" r="4" />
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

function TimerIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function StrengthIcon({ className }: { className?: string }) {
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
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}

function ImprovementIcon({ className }: { className?: string }) {
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
      <path d="M2 12h20" />
      <path d="M12 2v20" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function TipIcon({ className }: { className?: string }) {
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
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}
