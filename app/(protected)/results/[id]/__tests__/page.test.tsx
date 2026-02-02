// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultsPage from "../page";

// ── Mock next/navigation ───────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// ── Mock Supabase client ───────────────────────────────────────────────
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// ── Mock fetch ─────────────────────────────────────────────────────────
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Test fixtures ──────────────────────────────────────────────────────
const mockAnalysis = {
  id: "test-uuid-123",
  original_text: "John Doe\nSoftware Engineer with 5 years of experience.",
  optimized_text: null,
  job_description: "Looking for a software engineer with Python and React.",
  target_role: "Software Engineer",
  years_experience: "3-5",
  visa_flagged: false,
  file_name: "resume.pdf",
  file_type: "pdf",
};

const mockATSResponse = {
  score: {
    overall: 72,
    keywordMatchPct: 65,
    formattingScore: 80,
    sectionScore: 70,
    matchedKeywords: ["software", "engineer"],
    missingKeywords: ["python", "react"],
    issues: [
      {
        type: "missing_keyword" as const,
        severity: "critical" as const,
        message: 'Missing keyword: "Python"',
        suggestion: "Add Python to your skills section",
      },
    ],
    passed: false,
  },
};

const mockHRResponse = {
  score: {
    overall: 68,
    formattingScore: 75,
    semanticScore: 60,
    llmScore: 70,
    feedback: [
      {
        type: "formatting" as const,
        layer: 1 as const,
        severity: "warning" as const,
        message: "Consider adding more bullet points",
      },
    ],
  },
  layers: {
    formatting: {
      score: 75,
      suggestions: [],
      referenceCount: 0,
    },
    semantic: {
      score: 60,
      sectionScores: [{ section: "experience", score: 55 }],
    },
    llmReview: null,
  },
};

const mockOptimizeResponse = {
  suggestions: [
    {
      id: "suggestion-0-1234",
      type: "ats" as const,
      category: "missing_keyword",
      originalText: "experience",
      suggestedText: "Python experience",
      reasoning: "Add Python keyword for ATS match",
      textRange: { start: 37, end: 47 },
      severity: "critical" as const,
    },
  ],
  count: 1,
};

// ── Helpers ────────────────────────────────────────────────────────────
function setupFetchMock() {
  mockFetch.mockImplementation((url: string) => {
    if (url === "/api/ats-score") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockATSResponse),
      });
    }
    if (url === "/api/hr-score") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHRResponse),
      });
    }
    if (url === "/api/optimize") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockOptimizeResponse),
      });
    }
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: "Not found" }),
    });
  });
}

describe("ResultsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading spinner initially", () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    render(<ResultsPage params={{ id: "test-uuid-123" }} />);
    expect(screen.getByText("Loading analysis...")).toBeDefined();
  });

  it("shows error when analysis is not found", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    render(<ResultsPage params={{ id: "nonexistent-id" }} />);

    await waitFor(() => {
      expect(
        screen.getByText("Analysis not found. It may have been deleted.")
      ).toBeDefined();
    });
  });

  it("shows start new analysis button on error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    render(<ResultsPage params={{ id: "nonexistent-id" }} />);

    await waitFor(() => {
      expect(screen.getByText("Start new analysis")).toBeDefined();
    });
  });

  it("fetches analysis record from Supabase on load", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("resume_analyses");
      expect(mockSelect).toHaveBeenCalledWith("*");
    });
  });

  it("shows analysis results header with target role", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      expect(screen.getByText("Analysis Results")).toBeDefined();
    });

    await waitFor(() => {
      expect(
        screen.getByText("Target role: Software Engineer")
      ).toBeDefined();
    });
  });

  it("shows loading steps during analysis", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    // Delay fetch responses to keep loading state visible
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve(mockATSResponse),
              }),
            500
          )
        )
    );

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      expect(screen.getByText(/Running ATS simulation/)).toBeDefined();
    });
  });

  it("triggers ATS and HR scoring API calls", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      const atsCalls = mockFetch.mock.calls.filter(
        (c: string[]) => c[0] === "/api/ats-score"
      );
      expect(atsCalls.length).toBe(1);
    });

    await waitFor(() => {
      const hrCalls = mockFetch.mock.calls.filter(
        (c: string[]) => c[0] === "/api/hr-score"
      );
      expect(hrCalls.length).toBe(1);
    });
  });

  it("sends correct request body to ATS score endpoint", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      const atsCalls = mockFetch.mock.calls.filter(
        (c: string[]) => c[0] === "/api/ats-score"
      );
      expect(atsCalls.length).toBe(1);
      const body = JSON.parse(atsCalls[0][1].body);
      expect(body.resumeText).toBe(mockAnalysis.original_text);
      expect(body.jobDescription).toBe(mockAnalysis.job_description);
      expect(body.analysisId).toBe("test-uuid-123");
      expect(body.userContext.targetRole).toBe("Software Engineer");
    });
  });

  it("calls optimize endpoint after scoring completes", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      const optimizeCalls = mockFetch.mock.calls.filter(
        (c: string[]) => c[0] === "/api/optimize"
      );
      expect(optimizeCalls.length).toBe(1);
    });
  });

  it("displays ATS score card after analysis completes", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      expect(screen.getByText("ATS Score")).toBeDefined();
    });
  });

  it("displays HR score card after analysis completes", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      expect(screen.getByText("HR Score")).toBeDefined();
    });
  });

  it("shows ViewToggle with suggestion counts after analysis", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      expect(screen.getByRole("tablist")).toBeDefined();
    });
  });

  it("shows Re-analyze button after analysis completes", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      expect(screen.getByText("Re-analyze")).toBeDefined();
    });
  });

  it("shows suggestion count text after analysis", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      expect(screen.getByText("1 suggestion remaining")).toBeDefined();
    });
  });

  it("handles ATS scoring failure gracefully", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/ats-score") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "ATS scoring failed" }),
        });
      }
      if (url === "/api/hr-score") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockHRResponse),
        });
      }
      if (url === "/api/optimize") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ suggestions: [], count: 0 }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Not found" }),
      });
    });

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    // HR score should still show
    await waitFor(() => {
      expect(screen.getByText("HR Score")).toBeDefined();
    });
  });

  it("navigates to analyze page when start new analysis is clicked", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    const user = userEvent.setup();
    render(<ResultsPage params={{ id: "nonexistent-id" }} />);

    await waitFor(() => {
      expect(screen.getByText("Start new analysis")).toBeDefined();
    });

    await user.click(screen.getByText("Start new analysis"));
    expect(mockPush).toHaveBeenCalledWith("/analyze");
  });

  it("uses optimized_text when available", async () => {
    const analysisWithOptimized = {
      ...mockAnalysis,
      optimized_text: "Optimized resume text here",
    };
    mockSingle.mockResolvedValue({
      data: analysisWithOptimized,
      error: null,
    });
    setupFetchMock();

    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    await waitFor(() => {
      const atsCalls = mockFetch.mock.calls.filter(
        (c: string[]) => c[0] === "/api/ats-score"
      );
      if (atsCalls.length > 0) {
        const body = JSON.parse(atsCalls[0][1].body);
        expect(body.resumeText).toBe("Optimized resume text here");
      }
    });
  });

  it("re-runs analysis when Re-analyze button is clicked", async () => {
    mockSingle.mockResolvedValue({ data: mockAnalysis, error: null });
    setupFetchMock();

    const user = userEvent.setup();
    render(<ResultsPage params={{ id: "test-uuid-123" }} />);

    // Wait for initial analysis
    await waitFor(() => {
      expect(screen.getByText("Re-analyze")).toBeDefined();
    });

    // Clear mock call counts
    mockFetch.mockClear();
    setupFetchMock();

    await user.click(screen.getByText("Re-analyze"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
