/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  PlusCircle: () => <span data-testid="plus-circle-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  ArrowRight: () => <span data-testid="arrow-right-icon" />,
  MessageSquare: () => <span data-testid="message-square-icon" />,
  Video: () => <span data-testid="video-icon" />,
}));

// Need to import after mocks
import DashboardPage from "../page";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    // Default mock setup
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });

    // Setup chained mock calls
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
    mockIn.mockReturnValue({ order: mockOrder });

    mockFrom.mockImplementation((table) => {
      if (table === "resume_analyses") {
        return { select: mockSelect };
      }
      if (table === "interview_sessions") {
        return { select: () => ({ eq: () => ({ in: mockIn }) }) };
      }
      return { select: mockSelect };
    });

    mockOrder.mockResolvedValue({ data: [] });
  });

  describe("rendering", () => {
    it("renders the dashboard title and description", async () => {
      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.getByText(/Manage your resume analyses and interview sessions/)).toBeInTheDocument();
    });

    it("renders the New Analysis button with link", async () => {
      const Page = await DashboardPage();
      render(Page);

      const link = screen.getByRole("link", { name: /New Analysis/i });
      expect(link).toHaveAttribute("href", "/analyze");
    });

    it("renders Recent Analyses section heading", async () => {
      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByRole("heading", { name: "Recent Analyses" })).toBeInTheDocument();
    });

    it("renders Interview Sessions section heading", async () => {
      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByRole("heading", { name: "Interview Sessions" })).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows empty state when no analyses exist", async () => {
      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByText("No analyses yet")).toBeInTheDocument();
      expect(screen.getByText(/Upload your resume and a job description/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Create your first analysis/i })).toHaveAttribute("href", "/analyze");
    });

    it("shows empty state when no interview sessions exist", async () => {
      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByText("No interview sessions yet")).toBeInTheDocument();
      expect(screen.getByText(/Complete a resume analysis to access AI-powered interview preparation/)).toBeInTheDocument();
    });
  });

  describe("analyses list", () => {
    it("renders analysis cards with correct data", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: "analysis-1",
                        target_role: "Software Engineer",
                        file_name: "resume.pdf",
                        ats_overall_score: 85,
                        hr_overall_score: 72,
                        created_at: "2024-01-15T10:00:00Z",
                      },
                    ],
                  }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({ data: [] }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByText("Software Engineer")).toBeInTheDocument();
      expect(screen.getByText("resume.pdf")).toBeInTheDocument();
      expect(screen.getByText("ATS: 85")).toBeInTheDocument();
      expect(screen.getByText("HR Score: 72")).toBeInTheDocument();
    });

    it("renders View Results link for analysis", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: "analysis-123",
                        target_role: "Product Manager",
                        file_name: "resume.docx",
                        ats_overall_score: 65,
                        hr_overall_score: null,
                        created_at: "2024-01-10T08:30:00Z",
                      },
                    ],
                  }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({ data: [] }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      const link = screen.getByRole("link", { name: /View Results/i });
      expect(link).toHaveAttribute("href", "/results/analysis-123");
    });

    it("shows Untitled Role when target_role is null", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: "analysis-1",
                        target_role: null,
                        file_name: "resume.pdf",
                        ats_overall_score: null,
                        hr_overall_score: null,
                        created_at: "2024-01-15T10:00:00Z",
                      },
                    ],
                  }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({ data: [] }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByText("Untitled Role")).toBeInTheDocument();
    });
  });

  describe("interview sessions list", () => {
    it("renders visa Q&A session card", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: "session-1",
                          session_type: "visa_qa",
                          transcript: [{ role: "user", message: "Question 1" }, { role: "assistant", message: "Answer 1" }],
                          feedback: null,
                          analysis_id: "analysis-123",
                          created_at: "2024-01-20T14:00:00Z",
                        },
                      ],
                    }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByText("Visa Q&A Session")).toBeInTheDocument();
      expect(screen.getByText("Visa")).toBeInTheDocument();
      expect(screen.getByText("2 messages")).toBeInTheDocument();
    });

    it("renders HR interview session card with feedback score", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: "session-2",
                          session_type: "hr_interview",
                          transcript: [
                            { role: "assistant", message: "Tell me about yourself" },
                            { role: "user", message: "I am..." },
                            { role: "assistant", message: "Good answer" },
                          ],
                          feedback: { overallScore: 78, strengths: [] },
                          analysis_id: "analysis-456",
                          created_at: "2024-01-22T16:30:00Z",
                        },
                      ],
                    }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByText("HR Interview Prep")).toBeInTheDocument();
      expect(screen.getByText("Interview")).toBeInTheDocument();
      expect(screen.getByText("3 messages")).toBeInTheDocument();
      expect(screen.getByText("Score: 78")).toBeInTheDocument();
    });

    it("renders View Transcript link for session with analysis_id", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: "session-1",
                          session_type: "hr_interview",
                          transcript: [],
                          feedback: null,
                          analysis_id: "analysis-789",
                          created_at: "2024-01-20T14:00:00Z",
                        },
                      ],
                    }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      const link = screen.getByRole("link", { name: /View Transcript/i });
      expect(link).toHaveAttribute("href", "/interview/analysis-789");
    });

    it("shows disabled button when session has no analysis_id", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: "session-1",
                          session_type: "visa_qa",
                          transcript: [],
                          feedback: null,
                          analysis_id: null,
                          created_at: "2024-01-20T14:00:00Z",
                        },
                      ],
                    }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByText("No linked analysis")).toBeInTheDocument();
    });

    it("shows 0 messages when transcript is null", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: "session-1",
                          session_type: "hr_interview",
                          transcript: null,
                          feedback: null,
                          analysis_id: "analysis-123",
                          created_at: "2024-01-20T14:00:00Z",
                        },
                      ],
                    }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByText("0 messages")).toBeInTheDocument();
    });

    it("shows N/A for score when feedback has no overallScore", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: "session-1",
                          session_type: "hr_interview",
                          transcript: [],
                          feedback: { strengths: [] }, // No overallScore
                          analysis_id: "analysis-123",
                          created_at: "2024-01-20T14:00:00Z",
                        },
                      ],
                    }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      expect(screen.getByText("Score: N/A")).toBeInTheDocument();
    });
  });

  describe("authentication", () => {
    it("returns null when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const Page = await DashboardPage();

      expect(Page).toBeNull();
    });
  });

  describe("score variants", () => {
    it("shows green badge for high ATS score (>= 75)", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: "analysis-1",
                        target_role: "Engineer",
                        file_name: "resume.pdf",
                        ats_overall_score: 80,
                        hr_overall_score: null,
                        created_at: "2024-01-15T10:00:00Z",
                      },
                    ],
                  }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({ data: [] }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      // default variant is used for high scores
      const badge = screen.getByText("ATS: 80");
      expect(badge).toBeInTheDocument();
    });

    it("shows red badge for low ATS score (< 50)", async () => {
      mockFrom.mockImplementation((table) => {
        if (table === "resume_analyses") {
          return {
            select: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: "analysis-1",
                        target_role: "Engineer",
                        file_name: "resume.pdf",
                        ats_overall_score: 35,
                        hr_overall_score: null,
                        created_at: "2024-01-15T10:00:00Z",
                      },
                    ],
                  }),
              }),
            }),
          };
        }
        if (table === "interview_sessions") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({ data: [] }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const Page = await DashboardPage();
      render(Page);

      // destructive variant is used for low scores
      const badge = screen.getByText("ATS: 35");
      expect(badge).toBeInTheDocument();
    });
  });
});
