/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import {
  AvatarSessionProvider,
  useAvatarSession,
  getStatusInfo,
  MicIcon,
  MicOffIcon,
  StopIcon,
  AvatarIcon,
  CheckIcon,
  type TranscriptEntry,
  type AvatarSessionConfig,
} from "../AvatarSession";

// ============================================================================
// Mocks
// ============================================================================

// Mock HeyGen StreamingAvatar SDK
const mockOn = vi.fn();
const mockCreateStartAvatar = vi.fn().mockResolvedValue(undefined);
const mockStartVoiceChat = vi.fn().mockResolvedValue(undefined);
const mockSpeak = vi.fn().mockResolvedValue(undefined);
const mockStopAvatar = vi.fn().mockResolvedValue(undefined);
const mockMuteInputAudio = vi.fn().mockResolvedValue(undefined);
const mockUnmuteInputAudio = vi.fn().mockResolvedValue(undefined);
const mockInterrupt = vi.fn().mockResolvedValue(undefined);

// Store event handlers for triggering in tests
const eventHandlers: Record<string, (event: CustomEvent) => void> = {};

function MockStreamingAvatar() {
  return {
    on: (event: string, handler: (event: CustomEvent) => void) => {
      eventHandlers[event] = handler;
      mockOn(event, handler);
    },
    createStartAvatar: mockCreateStartAvatar,
    startVoiceChat: mockStartVoiceChat,
    speak: mockSpeak,
    stopAvatar: mockStopAvatar,
    muteInputAudio: mockMuteInputAudio,
    unmuteInputAudio: mockUnmuteInputAudio,
    interrupt: mockInterrupt,
  };
}

vi.mock("@heygen/streaming-avatar", () => ({
  default: MockStreamingAvatar,
  StreamingEvents: {
    STREAM_READY: "stream-ready",
    STREAM_DISCONNECTED: "stream-disconnected",
    USER_START: "user-start",
    USER_STOP: "user-stop",
    AVATAR_START_TALKING: "avatar-start-talking",
    AVATAR_STOP_TALKING: "avatar-stop-talking",
    USER_TALKING_MESSAGE: "user-talking-message",
  },
  AvatarQuality: { Medium: "medium" },
  TaskType: { TALK: "talk" },
  TaskMode: { SYNC: "sync" },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// Test Helpers
// ============================================================================

// Test component that uses the hook
function TestConsumer({ testId = "test-consumer" }: { testId?: string }) {
  const session = useAvatarSession();

  return (
    <div data-testid={testId}>
      <div data-testid="status">{session.status}</div>
      <div data-testid="error">{session.error || "none"}</div>
      <div data-testid="is-muted">{session.isMuted ? "muted" : "unmuted"}</div>
      <div data-testid="transcript-count">{session.transcript.length}</div>
      <button data-testid="start" onClick={session.startSession}>
        Start
      </button>
      <button data-testid="end" onClick={session.endSession}>
        End
      </button>
      <button data-testid="mute" onClick={session.toggleMute}>
        Toggle Mute
      </button>
      <button data-testid="interrupt" onClick={session.interrupt}>
        Interrupt
      </button>
      <button data-testid="speak" onClick={() => session.speak("Hello")}>
        Speak
      </button>
      <button data-testid="clear-error" onClick={session.clearError}>
        Clear Error
      </button>
      <button
        data-testid="add-entry"
        onClick={() =>
          session.addTranscriptEntry({
            role: "user",
            message: "Test",
            timestamp: new Date().toISOString(),
          })
        }
      >
        Add Entry
      </button>
      <video ref={session.videoRef as React.RefObject<HTMLVideoElement>} data-testid="video" />
      <div ref={session.transcriptEndRef as React.RefObject<HTMLDivElement>} data-testid="transcript-end" />
    </div>
  );
}

function renderWithProvider(config: AvatarSessionConfig = {}) {
  return render(
    <AvatarSessionProvider config={config}>
      <TestConsumer />
    </AvatarSessionProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("AvatarSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key]);

    // Default successful token fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: "test-token" }),
    });

    // Mock HTMLMediaElement.play() for jsdom
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  // ── Context Tests ─────────────────────────────────────────────────────────

  describe("useAvatarSession hook", () => {
    it("throws error when used outside provider", () => {
      // Suppress console error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow("useAvatarSession must be used within an AvatarSessionProvider");

      consoleSpy.mockRestore();
    });

    it("provides context value within provider", () => {
      renderWithProvider();

      expect(screen.getByTestId("status")).toHaveTextContent("idle");
      expect(screen.getByTestId("error")).toHaveTextContent("none");
      expect(screen.getByTestId("is-muted")).toHaveTextContent("unmuted");
      expect(screen.getByTestId("transcript-count")).toHaveTextContent("0");
    });
  });

  // ── Initial State Tests ───────────────────────────────────────────────────

  describe("initial state", () => {
    it("starts with idle status", () => {
      renderWithProvider();
      expect(screen.getByTestId("status")).toHaveTextContent("idle");
    });

    it("starts with no error", () => {
      renderWithProvider();
      expect(screen.getByTestId("error")).toHaveTextContent("none");
    });

    it("starts unmuted", () => {
      renderWithProvider();
      expect(screen.getByTestId("is-muted")).toHaveTextContent("unmuted");
    });

    it("starts with empty transcript", () => {
      renderWithProvider();
      expect(screen.getByTestId("transcript-count")).toHaveTextContent("0");
    });
  });

  // ── Start Session Tests ───────────────────────────────────────────────────

  describe("startSession", () => {
    it("sets status to connecting when starting", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      // Don't wait for full session - just check initial transition
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => ({ token: "test" }) }), 100))
      );

      await user.click(screen.getByTestId("start"));

      expect(screen.getByTestId("status")).toHaveTextContent("connecting");
    });

    it("fetches token from /api/avatar/token", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      expect(mockFetch).toHaveBeenCalledWith("/api/avatar/token", { method: "POST" });
    });

    it("handles 429 rate limit error", async () => {
      const user = userEvent.setup();
      const onError = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: "Daily limit reached" }),
      });

      renderWithProvider({ onError });

      await user.click(screen.getByTestId("start"));

      expect(screen.getByTestId("status")).toHaveTextContent("error");
      expect(screen.getByTestId("error")).toHaveTextContent("Daily limit reached");
      expect(onError).toHaveBeenCalledWith("Daily limit reached");
    });

    it("handles 503 service unavailable error", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      });

      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      expect(screen.getByTestId("status")).toHaveTextContent("error");
      expect(screen.getByTestId("error")).toHaveTextContent("Avatar service is not configured");
    });

    it("calls onSessionStart callback after successful start", async () => {
      const user = userEvent.setup();
      const onSessionStart = vi.fn();
      renderWithProvider({ onSessionStart });

      await user.click(screen.getByTestId("start"));

      expect(onSessionStart).toHaveBeenCalled();
    });

    it("initializes avatar with correct config", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      expect(mockCreateStartAvatar).toHaveBeenCalledWith({
        quality: "medium",
        avatarName: "default",
        language: "en",
        disableIdleTimeout: true,
      });
    });

    it("starts voice chat after avatar creation", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      expect(mockStartVoiceChat).toHaveBeenCalledWith({
        isInputAudioMuted: false,
      });
    });

    it("speaks greeting if provided", async () => {
      const user = userEvent.setup();
      renderWithProvider({ greeting: "Hello, welcome!" });

      await user.click(screen.getByTestId("start"));

      expect(mockSpeak).toHaveBeenCalledWith({
        text: "Hello, welcome!",
        taskType: "talk",
        taskMode: "sync",
      });
    });

    it("adds greeting to transcript", async () => {
      const user = userEvent.setup();
      renderWithProvider({ greeting: "Hello!" });

      await user.click(screen.getByTestId("start"));

      expect(screen.getByTestId("transcript-count")).toHaveTextContent("1");
    });
  });

  // ── Stream Event Tests ────────────────────────────────────────────────────

  describe("stream events", () => {
    it("sets status to ready on STREAM_READY", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      // Trigger stream ready event
      act(() => {
        eventHandlers["stream-ready"]?.({
          detail: { id: "mock-stream" },
        } as CustomEvent);
      });

      expect(screen.getByTestId("status")).toHaveTextContent("ready");
    });

    it("sets status to ended on STREAM_DISCONNECTED", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      act(() => {
        eventHandlers["stream-disconnected"]?.({} as CustomEvent);
      });

      expect(screen.getByTestId("status")).toHaveTextContent("ended");
    });

    it("sets status to listening on USER_START", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      // Wait for session to start (event handlers are registered)
      await vi.waitFor(() => {
        expect(eventHandlers["user-start"]).toBeDefined();
      });

      act(() => {
        eventHandlers["user-start"]?.({} as CustomEvent);
      });

      expect(screen.getByTestId("status")).toHaveTextContent("listening");
    });

    it("sets status to processing on USER_STOP", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      act(() => {
        eventHandlers["user-stop"]?.({} as CustomEvent);
      });

      expect(screen.getByTestId("status")).toHaveTextContent("processing");
    });

    it("sets status to speaking on AVATAR_START_TALKING", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      act(() => {
        eventHandlers["avatar-start-talking"]?.({} as CustomEvent);
      });

      expect(screen.getByTestId("status")).toHaveTextContent("speaking");
    });

    it("sets status to ready on AVATAR_STOP_TALKING", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      // First set to speaking
      act(() => {
        eventHandlers["avatar-start-talking"]?.({} as CustomEvent);
      });
      expect(screen.getByTestId("status")).toHaveTextContent("speaking");

      // Then stop talking
      act(() => {
        eventHandlers["avatar-stop-talking"]?.({} as CustomEvent);
      });

      expect(screen.getByTestId("status")).toHaveTextContent("ready");
    });

    it("calls onUserMessage when user speech is transcribed", async () => {
      const user = userEvent.setup();
      const onUserMessage = vi.fn().mockResolvedValue("AI response");
      renderWithProvider({ onUserMessage });

      await user.click(screen.getByTestId("start"));

      await act(async () => {
        await eventHandlers["user-talking-message"]?.({
          detail: { message: "User question" },
        } as CustomEvent);
      });

      expect(onUserMessage).toHaveBeenCalledWith("User question");
    });

    it("makes avatar speak the response from onUserMessage", async () => {
      const user = userEvent.setup();
      const onUserMessage = vi.fn().mockResolvedValue("AI response text");
      renderWithProvider({ onUserMessage });

      await user.click(screen.getByTestId("start"));
      mockSpeak.mockClear(); // Clear the greeting speak call

      await act(async () => {
        await eventHandlers["user-talking-message"]?.({
          detail: { message: "Question" },
        } as CustomEvent);
      });

      expect(mockSpeak).toHaveBeenCalledWith({
        text: "AI response text",
        taskType: "talk",
        taskMode: "sync",
      });
    });

    it("ignores empty user messages", async () => {
      const user = userEvent.setup();
      const onUserMessage = vi.fn();
      renderWithProvider({ onUserMessage });

      await user.click(screen.getByTestId("start"));

      await act(async () => {
        await eventHandlers["user-talking-message"]?.({
          detail: { message: "   " },
        } as CustomEvent);
      });

      expect(onUserMessage).not.toHaveBeenCalled();
    });
  });

  // ── End Session Tests ─────────────────────────────────────────────────────

  describe("endSession", () => {
    it("stops the avatar", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));
      await user.click(screen.getByTestId("end"));

      expect(mockStopAvatar).toHaveBeenCalled();
    });

    it("sets status to ended", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));
      await user.click(screen.getByTestId("end"));

      expect(screen.getByTestId("status")).toHaveTextContent("ended");
    });

    it("calls onSessionEnd with transcript", async () => {
      const user = userEvent.setup();
      const onSessionEnd = vi.fn();
      renderWithProvider({ onSessionEnd, greeting: "Hello" });

      await user.click(screen.getByTestId("start"));
      await user.click(screen.getByTestId("end"));

      expect(onSessionEnd).toHaveBeenCalled();
      const transcriptArg = onSessionEnd.mock.calls[0][0] as TranscriptEntry[];
      expect(transcriptArg.length).toBe(1);
      expect(transcriptArg[0].message).toBe("Hello");
    });
  });

  // ── Mute/Unmute Tests ─────────────────────────────────────────────────────

  describe("toggleMute", () => {
    it("mutes when unmuted", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));
      await user.click(screen.getByTestId("mute"));

      expect(mockMuteInputAudio).toHaveBeenCalled();
      expect(screen.getByTestId("is-muted")).toHaveTextContent("muted");
    });

    it("unmutes when muted", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));
      await user.click(screen.getByTestId("mute")); // Mute
      await user.click(screen.getByTestId("mute")); // Unmute

      expect(mockUnmuteInputAudio).toHaveBeenCalled();
      expect(screen.getByTestId("is-muted")).toHaveTextContent("unmuted");
    });
  });

  // ── Interrupt Tests ───────────────────────────────────────────────────────

  describe("interrupt", () => {
    it("interrupts the avatar", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));
      await user.click(screen.getByTestId("interrupt"));

      expect(mockInterrupt).toHaveBeenCalled();
    });

    it("sets status to ready after interrupt", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));

      // Set to speaking first
      act(() => {
        eventHandlers["avatar-start-talking"]?.({} as CustomEvent);
      });
      expect(screen.getByTestId("status")).toHaveTextContent("speaking");

      await user.click(screen.getByTestId("interrupt"));

      expect(screen.getByTestId("status")).toHaveTextContent("ready");
    });
  });

  // ── Speak Tests ───────────────────────────────────────────────────────────

  describe("speak", () => {
    it("makes avatar speak provided text", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("start"));
      mockSpeak.mockClear();

      await user.click(screen.getByTestId("speak"));

      expect(mockSpeak).toHaveBeenCalledWith({
        text: "Hello",
        taskType: "talk",
        taskMode: "sync",
      });
    });
  });

  // ── Clear Error Tests ─────────────────────────────────────────────────────

  describe("clearError", () => {
    it("clears error and resets to idle", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Test error" }),
      });

      renderWithProvider();

      await user.click(screen.getByTestId("start"));
      expect(screen.getByTestId("status")).toHaveTextContent("error");

      await user.click(screen.getByTestId("clear-error"));

      expect(screen.getByTestId("error")).toHaveTextContent("none");
      expect(screen.getByTestId("status")).toHaveTextContent("idle");
    });
  });

  // ── Transcript Helper Tests ───────────────────────────────────────────────

  describe("addTranscriptEntry", () => {
    it("adds entry to transcript", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await user.click(screen.getByTestId("add-entry"));

      expect(screen.getByTestId("transcript-count")).toHaveTextContent("1");
    });

    it("calls onTranscriptUpdate when transcript changes", async () => {
      const user = userEvent.setup();
      const onTranscriptUpdate = vi.fn();
      renderWithProvider({ onTranscriptUpdate });

      await user.click(screen.getByTestId("add-entry"));

      expect(onTranscriptUpdate).toHaveBeenCalled();
    });
  });

  // ── Callback Tests ────────────────────────────────────────────────────────

  describe("callbacks", () => {
    it("calls onStatusChange when status changes", async () => {
      const user = userEvent.setup();
      const onStatusChange = vi.fn();
      renderWithProvider({ onStatusChange });

      // Initial call with "idle"
      expect(onStatusChange).toHaveBeenCalledWith("idle");

      await user.click(screen.getByTestId("start"));

      // Should be called with "connecting"
      expect(onStatusChange).toHaveBeenCalledWith("connecting");
    });
  });
});

// ============================================================================
// getStatusInfo Tests
// ============================================================================

describe("getStatusInfo", () => {
  it("returns correct info for idle status", () => {
    const info = getStatusInfo("idle");
    expect(info.text).toBe("Ready to start");
    expect(info.color).toBe("bg-gray-500");
  });

  it("returns correct info for connecting status", () => {
    const info = getStatusInfo("connecting");
    expect(info.text).toBe("Connecting...");
    expect(info.color).toBe("bg-yellow-500");
  });

  it("returns different text for ready status based on mode", () => {
    const visaInfo = getStatusInfo("ready", "visa");
    expect(visaInfo.text).toBe("Waiting for you to speak");

    const interviewInfo = getStatusInfo("ready", "interview");
    expect(interviewInfo.text).toBe("Your turn to speak");
  });

  it("returns correct info for listening status", () => {
    const info = getStatusInfo("listening");
    expect(info.text).toBe("Listening...");
    expect(info.color).toBe("bg-blue-500");
  });

  it("returns correct info for processing status", () => {
    const info = getStatusInfo("processing");
    expect(info.text).toBe("Processing...");
    expect(info.color).toBe("bg-purple-500");
  });

  it("returns different text for speaking status based on mode", () => {
    const visaInfo = getStatusInfo("speaking", "visa");
    expect(visaInfo.text).toBe("Speaking...");

    const interviewInfo = getStatusInfo("speaking", "interview");
    expect(interviewInfo.text).toBe("Interviewer speaking...");
  });

  it("returns correct info for error status", () => {
    const info = getStatusInfo("error");
    expect(info.text).toBe("Error");
    expect(info.color).toBe("bg-red-500");
  });

  it("returns correct info for ending status", () => {
    const info = getStatusInfo("ending");
    expect(info.text).toBe("Generating feedback...");
    expect(info.color).toBe("bg-yellow-500");
  });

  it("returns different text for ended status based on mode", () => {
    const visaInfo = getStatusInfo("ended", "visa");
    expect(visaInfo.text).toBe("Session ended");

    const interviewInfo = getStatusInfo("ended", "interview");
    expect(interviewInfo.text).toBe("Interview completed");
  });

  it("returns unknown for unhandled status", () => {
    // Force a type assertion to test the default case
    const info = getStatusInfo("unknown" as "idle");
    expect(info.text).toBe("Unknown");
  });
});

// ============================================================================
// Icon Component Tests
// ============================================================================

describe("Icon Components", () => {
  it("renders MicIcon with className", () => {
    const { container } = render(<MicIcon className="test-class" />);
    expect(container.querySelector("svg")).toHaveClass("test-class");
  });

  it("renders MicOffIcon with className", () => {
    const { container } = render(<MicOffIcon className="test-class" />);
    expect(container.querySelector("svg")).toHaveClass("test-class");
  });

  it("renders StopIcon with className", () => {
    const { container } = render(<StopIcon className="test-class" />);
    expect(container.querySelector("svg")).toHaveClass("test-class");
  });

  it("renders AvatarIcon with className", () => {
    const { container } = render(<AvatarIcon className="test-class" />);
    expect(container.querySelector("svg")).toHaveClass("test-class");
  });

  it("renders CheckIcon with className", () => {
    const { container } = render(<CheckIcon className="test-class" />);
    expect(container.querySelector("svg")).toHaveClass("test-class");
  });
});
