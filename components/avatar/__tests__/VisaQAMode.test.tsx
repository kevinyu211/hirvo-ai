/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { VisaQAMode } from "../VisaQAMode";

// ============================================================================
// Mocks
// ============================================================================

// Mock HeyGen StreamingAvatar SDK
const mockCreateStartAvatar = vi.fn().mockResolvedValue({});
const mockStartVoiceChat = vi.fn().mockResolvedValue({});
const mockStopAvatar = vi.fn().mockResolvedValue({});
const mockSpeak = vi.fn().mockResolvedValue({});
const mockMuteInputAudio = vi.fn().mockResolvedValue({});
const mockUnmuteInputAudio = vi.fn().mockResolvedValue({});
const mockInterrupt = vi.fn().mockResolvedValue({});
const mockOn = vi.fn();

// Store event handlers for triggering in tests
const eventHandlers: Record<string, (event: { detail?: unknown }) => void> = {};

// Use a function constructor for the mock class
function MockStreamingAvatar() {
  return {
    createStartAvatar: mockCreateStartAvatar,
    startVoiceChat: mockStartVoiceChat,
    stopAvatar: mockStopAvatar,
    speak: mockSpeak,
    muteInputAudio: mockMuteInputAudio,
    unmuteInputAudio: mockUnmuteInputAudio,
    interrupt: mockInterrupt,
    on: (event: string, handler: (e: { detail?: unknown }) => void) => {
      eventHandlers[event] = handler;
      mockOn(event, handler);
    },
  };
}

vi.mock("@heygen/streaming-avatar", () => {
  return {
    default: MockStreamingAvatar,
    AvatarQuality: { Low: "low", Medium: "medium", High: "high" },
    StreamingEvents: {
      STREAM_READY: "stream_ready",
      STREAM_DISCONNECTED: "stream_disconnected",
      USER_START: "user_start",
      USER_STOP: "user_stop",
      AVATAR_START_TALKING: "avatar_start_talking",
      AVATAR_STOP_TALKING: "avatar_stop_talking",
      USER_TALKING_MESSAGE: "user_talking_message",
    },
    TaskType: { TALK: "talk", REPEAT: "repeat" },
    TaskMode: { SYNC: "sync", ASYNC: "async" },
  };
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  mockOn.mockReset();
  // Clear event handlers
  Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key]);

  // Default mocks
  mockCreateStartAvatar.mockResolvedValue({});
  mockStartVoiceChat.mockResolvedValue({});
  mockStopAvatar.mockResolvedValue({});
  mockSpeak.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

// ============================================================================
// Tests
// ============================================================================

describe("VisaQAMode", () => {
  describe("Initial Rendering", () => {
    it("renders the component with idle status", () => {
      render(<VisaQAMode />);

      expect(screen.getByTestId("visa-qa-mode")).toBeInTheDocument();
      expect(screen.getByText("Visa Q&A Session")).toBeInTheDocument();
      expect(screen.getByTestId("status-badge")).toHaveTextContent("Ready to start");
    });

    it("renders start session button in idle state", () => {
      render(<VisaQAMode />);

      expect(screen.getByTestId("start-session-button")).toBeInTheDocument();
      expect(screen.getByText("Start Session")).toBeInTheDocument();
    });

    it("renders empty transcript placeholder", () => {
      render(<VisaQAMode />);

      expect(screen.getByText("Transcript")).toBeInTheDocument();
      expect(screen.getByText("Conversation will appear here")).toBeInTheDocument();
    });

    it("does not render end session button in idle state", () => {
      render(<VisaQAMode />);

      expect(screen.queryByTestId("end-session-button")).not.toBeInTheDocument();
    });

    it("does not render mute or interrupt buttons in idle state", () => {
      render(<VisaQAMode />);

      expect(screen.queryByTestId("mute-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("interrupt-button")).not.toBeInTheDocument();
    });
  });

  describe("Start Session Flow", () => {
    it("fetches token when start session is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/avatar/token", { method: "POST" });
      });
    });

    it("shows connecting status during initialization", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Connecting...");
      });
    });

    it("calls createStartAvatar after fetching token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(mockCreateStartAvatar).toHaveBeenCalledWith({
          quality: "medium",
          avatarName: "default",
          language: "en",
          disableIdleTimeout: true,
        });
      });
    });

    it("starts voice chat after avatar creation", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(mockStartVoiceChat).toHaveBeenCalledWith({
          isInputAudioMuted: false,
        });
      });
    });

    it("speaks greeting message after starting", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining("Hello"),
          })
        );
      });
    });

    it("adds greeting to transcript", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("transcript-entry-assistant")).toBeInTheDocument();
        expect(
          screen.getByText(/Hello! I'm here to help you with questions/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Token Fetch Errors", () => {
    it("shows error when rate limit is reached", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            message: "Daily session limit reached. Please try again tomorrow.",
          }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(
          screen.getByText("Daily session limit reached. Please try again tomorrow.")
        ).toBeInTheDocument();
      });
    });

    it("shows error when service is not configured", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: "Avatar service is not configured" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(
          screen.getByText("Avatar service is not configured. Please contact support.")
        ).toBeInTheDocument();
      });
    });

    it("shows error status badge on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Error");
      });
    });

    it("can dismiss error and return to idle", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByText("Dismiss")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText("Dismiss"));

      await waitFor(() => {
        expect(screen.getByTestId("status-badge")).toHaveTextContent("Ready to start");
      });
    });
  });

  describe("Stream Events", () => {
    it("shows end session button after connecting", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });
    });

    it("shows mute button after connecting", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("mute-button")).toBeInTheDocument();
      });
    });
  });

  describe("End Session", () => {
    it("calls stopAvatar when end session is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        expect(mockStopAvatar).toHaveBeenCalled();
      });
    });

    it("calls onSessionEnd callback when session ends", async () => {
      const onSessionEnd = vi.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode onSessionEnd={onSessionEnd} />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        expect(onSessionEnd).toHaveBeenCalled();
      });
    });

    it("shows session ended state with restart button", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        expect(screen.getByText("Session completed")).toBeInTheDocument();
        expect(screen.getByTestId("restart-session-button")).toBeInTheDocument();
      });
    });
  });

  describe("Mute/Unmute", () => {
    it("calls muteInputAudio when mute is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("mute-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("mute-button"));

      await waitFor(() => {
        expect(mockMuteInputAudio).toHaveBeenCalled();
      });
    });
  });

  describe("Props", () => {
    it("accepts visaStatus prop", () => {
      render(<VisaQAMode visaStatus="h1b" />);
      expect(screen.getByTestId("visa-qa-mode")).toBeInTheDocument();
    });

    it("accepts targetRole prop", () => {
      render(<VisaQAMode targetRole="Software Engineer" />);
      expect(screen.getByTestId("visa-qa-mode")).toBeInTheDocument();
    });

    it("accepts jobDescription prop", () => {
      render(<VisaQAMode jobDescription="Looking for a senior engineer..." />);
      expect(screen.getByTestId("visa-qa-mode")).toBeInTheDocument();
    });

    it("accepts analysisId prop", () => {
      render(<VisaQAMode analysisId="analysis-123" />);
      expect(screen.getByTestId("visa-qa-mode")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label on mute button", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<VisaQAMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("mute-button")).toHaveAttribute(
          "aria-label",
          "Mute microphone"
        );
      });
    });
  });
});
