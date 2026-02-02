/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import InterviewPage from "../page";
import { createClient } from "@/lib/supabase/client";
import type { TranscriptEntry as VisaTranscriptEntry } from "@/components/avatar/VisaQAMode";
import type { TranscriptEntry as InterviewTranscriptEntry } from "@/components/avatar/InterviewMode";
import type { InterviewFeedbackSummary } from "@/lib/prompts/interview-prompts";

// ============================================================================
// Mocks
// ============================================================================

// Mock useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

// Mock VisaQAMode component
let capturedVisaQAProps: {
  onSessionEnd?: (transcript: VisaTranscriptEntry[]) => void;
} = {};

vi.mock("@/components/avatar/VisaQAMode", () => ({
  VisaQAMode: (props: { onSessionEnd?: (transcript: VisaTranscriptEntry[]) => void }) => {
    capturedVisaQAProps = props;
    return (
      <div data-testid="visa-qa-mode-mock">
        <button
          data-testid="visa-qa-end-session"
          onClick={() =>
            props.onSessionEnd?.([
              { role: "assistant", message: "Welcome to visa Q&A", timestamp: "2024-01-01T00:00:00Z" },
              { role: "user", message: "What about H1B?", timestamp: "2024-01-01T00:01:00Z" },
            ])
          }
        >
          End Visa Session
        </button>
      </div>
    );
  },
}));

// Mock InterviewMode component
let capturedInterviewProps: {
  onSessionEnd?: (transcript: InterviewTranscriptEntry[], feedback: InterviewFeedbackSummary | null) => void;
} = {};

const mockFeedback: InterviewFeedbackSummary = {
  overallScore: 75,
  strengths: ["Good communication", "Strong examples"],
  areasForImprovement: ["Be more concise"],
  questionBreakdown: [
    { question: "Tell me about yourself", score: 80, assessment: "Good response" },
  ],
  recommendations: ["Practice STAR method"],
};

vi.mock("@/components/avatar/InterviewMode", () => ({
  InterviewMode: (props: {
    onSessionEnd?: (transcript: InterviewTranscriptEntry[], feedback: InterviewFeedbackSummary | null) => void;
  }) => {
    capturedInterviewProps = props;
    return (
      <div data-testid="interview-mode-mock">
        <button
          data-testid="interview-end-session"
          onClick={() =>
            props.onSessionEnd?.(
              [
                { role: "assistant", message: "Welcome to the interview", timestamp: "2024-01-01T00:00:00Z" },
                { role: "user", message: "I have 5 years experience", timestamp: "2024-01-01T00:01:00Z" },
              ],
              mockFeedback
            )
          }
        >
          End Interview Session
        </button>
      </div>
    );
  },
}));

// Helper to create mock Supabase client
function createMockSupabase(analysisData: Record<string, unknown> | null, error: Error | null = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: analysisData,
            error,
          }),
        })),
      })),
    })),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("InterviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedVisaQAProps = {};
    capturedInterviewProps = {};
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("Loading State", () => {
    it("shows loading spinner while fetching analysis", async () => {
      // Create a promise that never resolves to keep loading state
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => new Promise(() => {})),
            })),
          })),
        })),
      };
      (createClient as Mock).mockReturnValue(mockSupabase);

      render(<InterviewPage params={{ id: "test-id" }} />);

      expect(screen.getByText(/loading interview session/i)).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("shows error when analysis is not found", async () => {
      const mockSupabase = createMockSupabase(null, new Error("Not found"));
      (createClient as Mock).mockReturnValue(mockSupabase);

      render(<InterviewPage params={{ id: "invalid-id" }} />);

      await waitFor(() => {
        expect(screen.getByText(/analysis not found/i)).toBeInTheDocument();
      });
    });

    it("shows navigation buttons on error", async () => {
      const mockSupabase = createMockSupabase(null);
      (createClient as Mock).mockReturnValue(mockSupabase);

      render(<InterviewPage params={{ id: "invalid-id" }} />);

      await waitFor(() => {
        expect(screen.getByText(/start new analysis/i)).toBeInTheDocument();
        expect(screen.getByText(/go to dashboard/i)).toBeInTheDocument();
      });
    });

    it("navigates to analyze page when Start New Analysis is clicked", async () => {
      const mockSupabase = createMockSupabase(null);
      (createClient as Mock).mockReturnValue(mockSupabase);

      render(<InterviewPage params={{ id: "invalid-id" }} />);

      await waitFor(() => {
        fireEvent.click(screen.getByText(/start new analysis/i));
      });

      expect(mockPush).toHaveBeenCalledWith("/analyze");
    });
  });

  describe("Non-Visa Flow", () => {
    const nonVisaAnalysis = {
      id: "test-id",
      original_text: "Resume text here",
      optimized_text: null,
      job_description: "Job description here",
      target_role: "Software Engineer",
      years_experience: "3-5",
      visa_flagged: false,
    };

    beforeEach(() => {
      const mockSupabase = createMockSupabase(nonVisaAnalysis);
      (createClient as Mock).mockReturnValue(mockSupabase);
    });

    it("skips visa Q&A and shows interview mode directly for non-visa users", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("interview-mode-mock")).toBeInTheDocument();
      });

      // Should NOT show visa Q&A
      expect(screen.queryByTestId("visa-qa-mode-mock")).not.toBeInTheDocument();
    });

    it("shows step indicator with 2 steps for non-visa users", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("step-indicator")).toBeInTheDocument();
      });

      expect(screen.getByText("HR Interview")).toBeInTheDocument();
      expect(screen.getByText("Summary")).toBeInTheDocument();
      // Should NOT have Visa Q&A step
      expect(screen.queryByText("Visa Q&A")).not.toBeInTheDocument();
    });

    it("shows target role in interview header", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByText(/software engineer/i)).toBeInTheDocument();
      });
    });

    it("transitions to summary after interview ends", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("interview-mode-mock")).toBeInTheDocument();
      });

      // End the interview session
      fireEvent.click(screen.getByTestId("interview-end-session"));

      await waitFor(() => {
        expect(screen.getByTestId("session-summary")).toBeInTheDocument();
      });
    });
  });

  describe("Visa Flow", () => {
    const visaAnalysis = {
      id: "test-id",
      original_text: "Resume text here",
      optimized_text: "Optimized resume",
      job_description: "Job description here",
      target_role: "Data Scientist",
      years_experience: "6-10",
      visa_flagged: true,
    };

    beforeEach(() => {
      const mockSupabase = createMockSupabase(visaAnalysis);
      (createClient as Mock).mockReturnValue(mockSupabase);
    });

    it("shows visa Q&A first for visa-flagged users", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("visa-qa-mode-mock")).toBeInTheDocument();
      });

      // Should NOT show interview mode yet
      expect(screen.queryByTestId("interview-mode-mock")).not.toBeInTheDocument();
    });

    it("shows step indicator with 3 steps for visa users", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("step-indicator")).toBeInTheDocument();
      });

      expect(screen.getByText("Visa Q&A")).toBeInTheDocument();
      expect(screen.getByText("HR Interview")).toBeInTheDocument();
      expect(screen.getByText("Summary")).toBeInTheDocument();
    });

    it("shows skip button on visa Q&A step", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("skip-visa-qa")).toBeInTheDocument();
      });
    });

    it("skips to interview when skip button is clicked", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("visa-qa-mode-mock")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("skip-visa-qa"));

      await waitFor(() => {
        expect(screen.getByTestId("interview-mode-mock")).toBeInTheDocument();
      });
    });

    it("transitions from visa Q&A to interview after session ends", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("visa-qa-mode-mock")).toBeInTheDocument();
      });

      // End visa Q&A session
      fireEvent.click(screen.getByTestId("visa-qa-end-session"));

      await waitFor(() => {
        expect(screen.getByTestId("interview-mode-mock")).toBeInTheDocument();
      });
    });

    it("shows full 3-step flow from visa Q&A to interview to summary", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      // Step 1: Visa Q&A
      await waitFor(() => {
        expect(screen.getByTestId("visa-qa-mode-mock")).toBeInTheDocument();
      });

      // End visa Q&A
      fireEvent.click(screen.getByTestId("visa-qa-end-session"));

      // Step 2: Interview
      await waitFor(() => {
        expect(screen.getByTestId("interview-mode-mock")).toBeInTheDocument();
      });

      // End interview
      fireEvent.click(screen.getByTestId("interview-end-session"));

      // Step 3: Summary
      await waitFor(() => {
        expect(screen.getByTestId("session-summary")).toBeInTheDocument();
      });
    });
  });

  describe("Summary Page", () => {
    const visaAnalysis = {
      id: "test-id",
      original_text: "Resume text here",
      optimized_text: null,
      job_description: "Job description",
      target_role: "Product Manager",
      years_experience: "10+",
      visa_flagged: true,
    };

    beforeEach(() => {
      const mockSupabase = createMockSupabase(visaAnalysis);
      (createClient as Mock).mockReturnValue(mockSupabase);
    });

    it("displays interview feedback summary", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      // Complete the flow
      await waitFor(() => fireEvent.click(screen.getByTestId("visa-qa-end-session")));
      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        expect(screen.getByTestId("feedback-summary-card")).toBeInTheDocument();
        expect(screen.getByTestId("overall-score")).toHaveTextContent("75");
      });
    });

    it("displays strengths list", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("visa-qa-end-session")));
      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        expect(screen.getByTestId("strengths-list")).toBeInTheDocument();
        expect(screen.getByText("Good communication")).toBeInTheDocument();
      });
    });

    it("displays areas for improvement", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("visa-qa-end-session")));
      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        expect(screen.getByTestId("improvements-list")).toBeInTheDocument();
        expect(screen.getByText("Be more concise")).toBeInTheDocument();
      });
    });

    it("displays question breakdown", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("visa-qa-end-session")));
      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        expect(screen.getByTestId("question-breakdown")).toBeInTheDocument();
        expect(screen.getByText(/tell me about yourself/i)).toBeInTheDocument();
      });
    });

    it("displays recommendations", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("visa-qa-end-session")));
      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        expect(screen.getByTestId("recommendations-list")).toBeInTheDocument();
        expect(screen.getByText("Practice STAR method")).toBeInTheDocument();
      });
    });

    it("displays interview transcript", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("visa-qa-end-session")));
      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        expect(screen.getByTestId("interview-transcript-card")).toBeInTheDocument();
        expect(screen.getByText("Welcome to the interview")).toBeInTheDocument();
      });
    });

    it("displays visa Q&A transcript when visa session was completed", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("visa-qa-end-session")));
      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        expect(screen.getByTestId("visa-transcript-card")).toBeInTheDocument();
        expect(screen.getByText("Welcome to visa Q&A")).toBeInTheDocument();
      });
    });

    it("does not show visa transcript if visa Q&A was skipped", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      // Skip visa Q&A
      await waitFor(() => fireEvent.click(screen.getByTestId("skip-visa-qa")));
      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        expect(screen.getByTestId("session-summary")).toBeInTheDocument();
      });

      // Should NOT have visa transcript card
      expect(screen.queryByTestId("visa-transcript-card")).not.toBeInTheDocument();
    });
  });

  describe("Navigation Actions", () => {
    const analysisData = {
      id: "test-id",
      original_text: "Resume",
      optimized_text: null,
      job_description: "JD",
      target_role: "Engineer",
      years_experience: "3-5",
      visa_flagged: false,
    };

    beforeEach(() => {
      const mockSupabase = createMockSupabase(analysisData);
      (createClient as Mock).mockReturnValue(mockSupabase);
    });

    it("restarts flow when Practice Again is clicked", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        expect(screen.getByTestId("restart-button")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("restart-button"));

      await waitFor(() => {
        expect(screen.getByTestId("interview-mode-mock")).toBeInTheDocument();
      });
    });

    it("navigates to results page when Back to Analysis Results is clicked", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("back-to-results-button"));
      });

      expect(mockPush).toHaveBeenCalledWith("/results/test-id");
    });

    it("navigates to dashboard when Go to Dashboard is clicked", async () => {
      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        fireEvent.click(screen.getByTestId("dashboard-button"));
      });

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Score Color Coding", () => {
    it("shows green for scores >= 70", async () => {
      const analysisData = {
        id: "test-id",
        original_text: "Resume",
        optimized_text: null,
        job_description: "JD",
        target_role: "Engineer",
        years_experience: "3-5",
        visa_flagged: false,
      };
      const mockSupabase = createMockSupabase(analysisData);
      (createClient as Mock).mockReturnValue(mockSupabase);

      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => fireEvent.click(screen.getByTestId("interview-end-session")));

      await waitFor(() => {
        const scoreElement = screen.getByTestId("overall-score");
        expect(scoreElement).toHaveClass("text-green-600");
      });
    });
  });

  describe("Props Passing", () => {
    it("passes correct props to VisaQAMode", async () => {
      const analysisData = {
        id: "test-id",
        original_text: "Resume",
        optimized_text: null,
        job_description: "Job Description",
        target_role: "Data Scientist",
        years_experience: "3-5",
        visa_flagged: true,
      };
      const mockSupabase = createMockSupabase(analysisData);
      (createClient as Mock).mockReturnValue(mockSupabase);

      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("visa-qa-mode-mock")).toBeInTheDocument();
      });

      // The mock captured the props - verify onSessionEnd is a function
      expect(typeof capturedVisaQAProps.onSessionEnd).toBe("function");
    });

    it("passes correct props to InterviewMode", async () => {
      const analysisData = {
        id: "test-id",
        original_text: "Resume text",
        optimized_text: "Optimized text",
        job_description: "JD",
        target_role: "Engineer",
        years_experience: "6-10",
        visa_flagged: false,
      };
      const mockSupabase = createMockSupabase(analysisData);
      (createClient as Mock).mockReturnValue(mockSupabase);

      render(<InterviewPage params={{ id: "test-id" }} />);

      await waitFor(() => {
        expect(screen.getByTestId("interview-mode-mock")).toBeInTheDocument();
      });

      expect(typeof capturedInterviewProps.onSessionEnd).toBe("function");
    });
  });
});
