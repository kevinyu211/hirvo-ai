"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
  TaskMode,
} from "@heygen/streaming-avatar";

// ============================================================================
// Types
// ============================================================================

export interface TranscriptEntry {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

export type SessionStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "processing"
  | "speaking"
  | "error"
  | "ending"
  | "ended";

export interface AvatarSessionConfig {
  /** Initial greeting message spoken by the avatar */
  greeting?: string;
  /** Callback when user speech is transcribed */
  onUserMessage?: (message: string) => Promise<string | null>;
  /** Callback when session starts successfully */
  onSessionStart?: () => void;
  /** Callback when session ends */
  onSessionEnd?: (transcript: TranscriptEntry[]) => void;
  /** Callback when status changes */
  onStatusChange?: (status: SessionStatus) => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
  /** Callback for transcript updates */
  onTranscriptUpdate?: (transcript: TranscriptEntry[]) => void;
}

export interface AvatarSessionContextValue {
  // State
  status: SessionStatus;
  error: string | null;
  transcript: TranscriptEntry[];
  isMuted: boolean;

  // Actions
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  toggleMute: () => Promise<void>;
  interrupt: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  clearError: () => void;

  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;

  // Helpers
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  setTranscript: React.Dispatch<React.SetStateAction<TranscriptEntry[]>>;
}

// ============================================================================
// Context
// ============================================================================

const AvatarSessionContext = createContext<AvatarSessionContextValue | null>(null);

export function useAvatarSession() {
  const context = useContext(AvatarSessionContext);
  if (!context) {
    throw new Error("useAvatarSession must be used within an AvatarSessionProvider");
  }
  return context;
}

// ============================================================================
// Provider Props
// ============================================================================

export interface AvatarSessionProviderProps {
  children: ReactNode;
  config: AvatarSessionConfig;
}

// ============================================================================
// Provider Component
// ============================================================================

export function AvatarSessionProvider({
  children,
  config,
}: AvatarSessionProviderProps) {
  // State
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef(config);

  // Keep config ref up to date
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (
      transcriptEndRef.current &&
      typeof transcriptEndRef.current.scrollIntoView === "function"
    ) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  // Notify on transcript updates
  useEffect(() => {
    configRef.current.onTranscriptUpdate?.(transcript);
  }, [transcript]);

  // Notify on status changes
  useEffect(() => {
    configRef.current.onStatusChange?.(status);
  }, [status]);

  // ── Add transcript entry helper ─────────────────────────────────────────
  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

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
      const message =
        err instanceof Error ? err.message : "Failed to connect to avatar service";
      setError(message);
      setStatus("error");
      configRef.current.onError?.(message);
      return null;
    }
  }, []);

  // ── Speak through avatar ────────────────────────────────────────────────
  const speak = useCallback(async (text: string) => {
    if (!avatarRef.current) return;

    try {
      await avatarRef.current.speak({
        text,
        taskType: TaskType.TALK,
        taskMode: TaskMode.SYNC,
      });
    } catch (err) {
      console.error("Failed to speak:", err);
    }
  }, []);

  // ── Start session ────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    setTranscript([]);
    setIsMuted(false);

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
          const trimmedMessage = userMessage.trim();

          // Call the onUserMessage callback to get the response
          const aiResponse = await configRef.current.onUserMessage?.(trimmedMessage);

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

      // Notify session started
      configRef.current.onSessionStart?.();

      // Speak greeting if provided
      if (configRef.current.greeting) {
        const greetingEntry: TranscriptEntry = {
          role: "assistant",
          message: configRef.current.greeting,
          timestamp: new Date().toISOString(),
        };
        setTranscript([greetingEntry]);

        await avatar.speak({
          text: configRef.current.greeting,
          taskType: TaskType.TALK,
          taskMode: TaskMode.SYNC,
        });
      }
    } catch (err) {
      console.error("Failed to start avatar session:", err);
      const message = err instanceof Error ? err.message : "Failed to start session";
      setError(message);
      setStatus("error");
      configRef.current.onError?.(message);
    }
  }, [fetchToken]);

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

    // Use the current transcript state for the callback
    setTranscript((currentTranscript) => {
      configRef.current.onSessionEnd?.(currentTranscript);
      return currentTranscript;
    });
  }, []);

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

  // ── Clear error ──────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    setError(null);
    setStatus("idle");
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (avatarRef.current && typeof avatarRef.current.stopAvatar === "function") {
        avatarRef.current.stopAvatar().catch(console.error);
      }
    };
  }, []);

  // ── Context value ────────────────────────────────────────────────────────
  const value: AvatarSessionContextValue = {
    // State
    status,
    error,
    transcript,
    isMuted,

    // Actions
    startSession,
    endSession,
    toggleMute,
    interrupt,
    speak,
    clearError,

    // Refs
    videoRef,
    transcriptEndRef,

    // Helpers
    addTranscriptEntry,
    setTranscript,
  };

  return (
    <AvatarSessionContext.Provider value={value}>
      {children}
    </AvatarSessionContext.Provider>
  );
}

// ============================================================================
// Status Helpers
// ============================================================================

export interface StatusInfo {
  text: string;
  color: string;
}

export function getStatusInfo(
  status: SessionStatus,
  mode: "visa" | "interview" = "visa"
): StatusInfo {
  switch (status) {
    case "idle":
      return { text: "Ready to start", color: "bg-gray-500" };
    case "connecting":
      return { text: "Connecting...", color: "bg-yellow-500" };
    case "ready":
      return {
        text: mode === "interview" ? "Your turn to speak" : "Waiting for you to speak",
        color: "bg-green-500",
      };
    case "listening":
      return { text: "Listening...", color: "bg-blue-500" };
    case "processing":
      return { text: "Processing...", color: "bg-purple-500" };
    case "speaking":
      return {
        text: mode === "interview" ? "Interviewer speaking..." : "Speaking...",
        color: "bg-teal-500",
      };
    case "error":
      return { text: "Error", color: "bg-red-500" };
    case "ending":
      return { text: "Generating feedback...", color: "bg-yellow-500" };
    case "ended":
      return {
        text: mode === "interview" ? "Interview completed" : "Session ended",
        color: "bg-gray-500",
      };
    default:
      return { text: "Unknown", color: "bg-gray-500" };
  }
}

// ============================================================================
// Icon Components (Shared)
// ============================================================================

export function MicIcon({ className }: { className?: string }) {
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

export function MicOffIcon({ className }: { className?: string }) {
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

export function StopIcon({ className }: { className?: string }) {
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

export function AvatarIcon({ className }: { className?: string }) {
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

export function CheckIcon({ className }: { className?: string }) {
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
