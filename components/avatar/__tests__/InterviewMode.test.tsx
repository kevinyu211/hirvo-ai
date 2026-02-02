/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { InterviewMode } from "../InterviewMode";

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
  vi.useRealTimers();
});

// ============================================================================
// Tests
// ============================================================================

describe("InterviewMode", () => {
  describe("Initial Rendering", () => {
    it("renders the component with idle status", () => {
      render(<InterviewMode />);

      expect(screen.getByTestId("interview-mode")).toBeInTheDocument();
      expect(screen.getByText("HR Interview Practice")).toBeInTheDocument();
      expect(screen.getByTestId("status-badge")).toHaveTextContent("Ready to start");
    });

    it("renders start interview button in idle state", () => {
      render(<InterviewMode />);

      expect(screen.getByTestId("start-session-button")).toBeInTheDocument();
      expect(screen.getByText("Start Interview")).toBeInTheDocument();
    });

    it("renders empty transcript placeholder", () => {
      render(<InterviewMode />);

      expect(screen.getByText("Interview Transcript")).toBeInTheDocument();
      expect(screen.getByText("Conversation will appear here")).toBeInTheDocument();
    });

    it("does not render end session button in idle state", () => {
      render(<InterviewMode />);

      expect(screen.queryByTestId("end-session-button")).not.toBeInTheDocument();
    });

    it("does not render mute, interrupt, or next question buttons in idle state", () => {
      render(<InterviewMode />);

      expect(screen.queryByTestId("mute-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("interrupt-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("next-question-button")).not.toBeInTheDocument();
    });

    it("displays target role when provided", () => {
      render(<InterviewMode targetRole="Software Engineer" />);

      expect(screen.getByText("Practicing for: Software Engineer")).toBeInTheDocument();
    });
  });

  describe("Start Session Flow", () => {
    it("fetches token when start interview is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode />);

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

      render(<InterviewMode />);

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

      render(<InterviewMode />);

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

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(mockStartVoiceChat).toHaveBeenCalledWith({
          isInputAudioMuted: false,
        });
      });
    });

    it("speaks greeting message with role context when targetRole provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode targetRole="Product Manager" />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining("Product Manager"),
          })
        );
      });
    });

    it("adds greeting to transcript and shows current question", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("transcript-entry-assistant")).toBeInTheDocument();
        expect(
          screen.getByText(/Welcome to your mock interview/i)
        ).toBeInTheDocument();
      });
    });

    it("sets initial question count to 1", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("question-counter")).toHaveTextContent("Q1");
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

      render(<InterviewMode />);

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

      render(<InterviewMode />);

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

      render(<InterviewMode />);

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

      render(<InterviewMode />);

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

  describe("Session Controls", () => {
    it("shows end session button after connecting", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode />);

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

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("mute-button")).toBeInTheDocument();
      });
    });

    it("shows next question button after connecting", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("next-question-button")).toBeInTheDocument();
      });
    });
  });

  describe("End Session", () => {
    it("sends end session request when end interview is clicked", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "test-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "Thank you for practicing!",
              sessionId: "session-123",
              sessionEnded: true,
              feedback: {
                overallScore: 75,
                strengths: ["Good communication"],
                areasForImprovement: ["Be more specific"],
                questionBreakdown: [],
                recommendations: ["Practice STAR method"],
              },
            }),
        });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/avatar/interview",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining('"endSession":true'),
          })
        );
      });
    });

    it("calls onSessionEnd callback with transcript and feedback", async () => {
      const onSessionEnd = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "test-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "Thank you!",
              sessionId: "session-123",
              sessionEnded: true,
              feedback: {
                overallScore: 80,
                strengths: [],
                areasForImprovement: [],
                questionBreakdown: [],
                recommendations: [],
              },
            }),
        });

      render(<InterviewMode onSessionEnd={onSessionEnd} />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        expect(onSessionEnd).toHaveBeenCalled();
      });
    });

    it("shows feedback summary after session ends", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "test-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "Thank you!",
              sessionId: "session-123",
              sessionEnded: true,
              feedback: {
                overallScore: 75,
                strengths: ["Excellent communication skills"],
                areasForImprovement: ["Could use more specific examples"],
                questionBreakdown: [
                  { question: "Tell me about yourself", score: 80, assessment: "Good intro" },
                ],
                recommendations: ["Practice the STAR method"],
              },
            }),
        });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("feedback-summary")).toBeInTheDocument();
        expect(screen.getByTestId("overall-score")).toHaveTextContent("75");
        expect(screen.getByTestId("strengths-list")).toBeInTheDocument();
        expect(screen.getByTestId("improvements-list")).toBeInTheDocument();
        expect(screen.getByTestId("recommendations-list")).toBeInTheDocument();
      });
    });

    it("shows restart button after session ends", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "test-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "Thank you!",
              sessionEnded: true,
              feedback: { overallScore: 70, strengths: [], areasForImprovement: [], questionBreakdown: [], recommendations: [] },
            }),
        });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("restart-session-button")).toBeInTheDocument();
        expect(screen.getByText("Start New Interview")).toBeInTheDocument();
      });
    });
  });

  describe("Mute/Unmute", () => {
    it("calls muteInputAudio when mute is clicked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("mute-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("mute-button"));

      await waitFor(() => {
        expect(mockMuteInputAudio).toHaveBeenCalled();
      });
    });

    it("has proper aria-label on mute button", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("mute-button")).toHaveAttribute(
          "aria-label",
          "Mute microphone"
        );
      });
    });
  });

  describe("Next Question", () => {
    it("sends next question request when clicked", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "test-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "What is your greatest achievement?",
              sessionId: "session-123",
            }),
        });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("next-question-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("next-question-button"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/avatar/interview",
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("next question"),
          })
        );
      });
    });
  });

  describe("Props", () => {
    it("accepts jobDescription prop", () => {
      render(<InterviewMode jobDescription="Looking for a senior engineer..." />);
      expect(screen.getByTestId("interview-mode")).toBeInTheDocument();
    });

    it("accepts resumeText prop", () => {
      render(<InterviewMode resumeText="Experienced software developer..." />);
      expect(screen.getByTestId("interview-mode")).toBeInTheDocument();
    });

    it("accepts targetRole prop", () => {
      render(<InterviewMode targetRole="Software Engineer" />);
      expect(screen.getByTestId("interview-mode")).toBeInTheDocument();
    });

    it("accepts yearsExperience prop", () => {
      render(<InterviewMode yearsExperience="5-10" />);
      expect(screen.getByTestId("interview-mode")).toBeInTheDocument();
    });

    it("accepts analysisId prop", () => {
      render(<InterviewMode analysisId="analysis-123" />);
      expect(screen.getByTestId("interview-mode")).toBeInTheDocument();
    });
  });

  describe("Timer", () => {
    it("shows answer timer after session is ready", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      // Wait for connecting state first
      await waitFor(() => {
        expect(mockCreateStartAvatar).toHaveBeenCalled();
      });

      // Simulate STREAM_READY event to transition to ready state
      // Use a mock object instead of MediaStream which doesn't exist in jsdom
      await act(async () => {
        if (eventHandlers["stream_ready"]) {
          eventHandlers["stream_ready"]({ detail: { id: "mock-stream" } });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId("answer-timer")).toBeInTheDocument();
        expect(screen.getByTestId("answer-timer")).toHaveTextContent("0:00");
      });
    });

    it("timer increments while user is listening", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });

      render(<InterviewMode />);

      await user.click(screen.getByTestId("start-session-button"));

      // Wait for avatar setup
      await waitFor(() => {
        expect(mockCreateStartAvatar).toHaveBeenCalled();
      });

      // Simulate STREAM_READY event to transition to ready state
      await act(async () => {
        if (eventHandlers["stream_ready"]) {
          eventHandlers["stream_ready"]({ detail: { id: "mock-stream" } });
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId("answer-timer")).toBeInTheDocument();
      });

      // Simulate USER_START event to start the timer
      await act(async () => {
        if (eventHandlers["user_start"]) {
          eventHandlers["user_start"]({});
        }
      });

      // Advance timer
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByTestId("answer-timer")).toHaveTextContent("0:05");
      });

      vi.useRealTimers();
    });
  });

  describe("Current Question Display", () => {
    it("shows current question overlay during session", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: "test-token" }),
      });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      // Wait for avatar setup to complete and greeting to be spoken
      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalled();
      });

      // The current question should be visible after greeting is set
      const questionOverlay = screen.getByTestId("current-question");
      expect(questionOverlay).toBeInTheDocument();
      // Check within the question overlay specifically
      expect(questionOverlay.textContent).toContain("tell me a little about yourself");
    });
  });

  describe("Feedback Summary Rendering", () => {
    it("renders score with correct color for high scores", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "test-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "Great job!",
              sessionEnded: true,
              feedback: {
                overallScore: 85,
                strengths: [],
                areasForImprovement: [],
                questionBreakdown: [],
                recommendations: [],
              },
            }),
        });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        const scoreElement = screen.getByTestId("overall-score");
        expect(scoreElement).toHaveTextContent("85");
        expect(scoreElement).toHaveClass("text-green-600");
      });
    });

    it("renders score with yellow color for medium scores", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "test-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "Good effort!",
              sessionEnded: true,
              feedback: {
                overallScore: 55,
                strengths: [],
                areasForImprovement: [],
                questionBreakdown: [],
                recommendations: [],
              },
            }),
        });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        const scoreElement = screen.getByTestId("overall-score");
        expect(scoreElement).toHaveTextContent("55");
        expect(scoreElement).toHaveClass("text-yellow-600");
      });
    });

    it("renders question breakdown with scores", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: "test-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              response: "Done!",
              sessionEnded: true,
              feedback: {
                overallScore: 70,
                strengths: [],
                areasForImprovement: [],
                questionBreakdown: [
                  { question: "Tell me about yourself", score: 75, assessment: "Clear intro" },
                  { question: "What is your greatest strength?", score: 65, assessment: "Could be more specific" },
                ],
                recommendations: [],
              },
            }),
        });

      render(<InterviewMode />);

      await userEvent.click(screen.getByTestId("start-session-button"));

      await waitFor(() => {
        expect(screen.getByTestId("end-session-button")).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTestId("end-session-button"));

      await waitFor(() => {
        const breakdown = screen.getByTestId("question-breakdown");
        expect(breakdown).toBeInTheDocument();
        expect(screen.getByText("Tell me about yourself")).toBeInTheDocument();
        expect(screen.getByText("Clear intro")).toBeInTheDocument();
      });
    });
  });
});
