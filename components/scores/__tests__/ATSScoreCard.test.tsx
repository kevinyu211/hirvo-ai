/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ATSScoreCard } from "../ATSScoreCard";
import type { ATSScore } from "@/lib/types";

afterEach(() => {
  cleanup();
});

// Helper to create a valid ATSScore for testing
function makeScore(overrides: Partial<ATSScore> = {}): ATSScore {
  return {
    overall: 82,
    keywordMatchPct: 75,
    formattingScore: 90,
    sectionScore: 80,
    matchedKeywords: ["react", "typescript", "node.js"],
    missingKeywords: ["graphql", "aws"],
    issues: [
      {
        type: "missing_keyword",
        severity: "critical",
        message: 'Missing keyword: "graphql"',
        suggestion: 'Add "graphql" to your skills section.',
      },
      {
        type: "missing_keyword",
        severity: "critical",
        message: 'Missing keyword: "aws"',
        suggestion: 'Add "aws" to your skills section.',
      },
    ],
    passed: true,
    ...overrides,
  };
}

describe("ATSScoreCard", () => {
  it("renders the overall score", () => {
    render(<ATSScoreCard score={makeScore()} />);
    // Due to responsive design, there are two gauges (mobile and desktop)
    // We check that at least one is rendered with the score
    expect(screen.getAllByText("82").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("out of 100").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the ATS Score title", () => {
    const { container } = render(<ATSScoreCard score={makeScore()} />);
    const titles = container.querySelectorAll(".tracking-tight");
    // At least one should contain "ATS Score"
    const atsTitle = Array.from(titles).find(
      (t) => t.textContent === "ATS Score"
    );
    expect(atsTitle).not.toBeUndefined();
  });

  it("shows PASS badge when score passes", () => {
    render(<ATSScoreCard score={makeScore({ passed: true })} />);
    expect(screen.getByText("PASS")).toBeDefined();
  });

  it("shows FAIL badge when score fails", () => {
    render(<ATSScoreCard score={makeScore({ passed: false })} />);
    expect(screen.getByText("FAIL")).toBeDefined();
  });

  it("renders sub-score bar labels", () => {
    const { container } = render(<ATSScoreCard score={makeScore()} />);
    const html = container.innerHTML;
    expect(html).toContain("Keyword Match");
    expect(html).toContain("Formatting");
    expect(html).toContain("Section Structure");
  });

  it("renders sub-score percentages in bars", () => {
    const { container } = render(
      <ATSScoreCard
        score={makeScore({
          keywordMatchPct: 75,
          formattingScore: 90,
          sectionScore: 80,
        })}
      />
    );
    const html = container.innerHTML;
    expect(html).toContain("75%");
    expect(html).toContain("90%");
    expect(html).toContain("80%");
  });

  it("renders breakdown section titles with issue counts", () => {
    const { container } = render(<ATSScoreCard score={makeScore()} />);
    const html = container.innerHTML;
    expect(html).toContain("Keyword Match (2 issues)");
    expect(html).toContain("Formatting (0 issues)");
    expect(html).toContain("Section Structure (0 issues)");
  });

  it("shows matched keywords as badges when keyword section has issues (auto-opened)", () => {
    render(<ATSScoreCard score={makeScore()} />);
    // keyword section auto-opens because there are missing keyword issues
    expect(screen.getByText("react")).toBeDefined();
    expect(screen.getByText("typescript")).toBeDefined();
    expect(screen.getByText("node.js")).toBeDefined();
  });

  it("shows missing keywords as badges when keyword section has issues (auto-opened)", () => {
    render(<ATSScoreCard score={makeScore()} />);
    expect(screen.getByText("graphql")).toBeDefined();
    expect(screen.getByText("aws")).toBeDefined();
  });

  it("shows matched/missing keyword counts", () => {
    render(<ATSScoreCard score={makeScore()} />);
    expect(screen.getByText("Matched Keywords (3)")).toBeDefined();
    expect(screen.getByText("Missing Keywords (2)")).toBeDefined();
  });

  it("renders formatting issues when expanded", async () => {
    const user = userEvent.setup();
    const score = makeScore({
      formattingScore: 70,
      issues: [
        {
          type: "formatting",
          severity: "warning",
          message: "Possible table-based layout detected.",
          suggestion: "Replace table layouts with simple text.",
        },
      ],
    });
    render(<ATSScoreCard score={score} />);

    // Click to expand the formatting section
    const formattingTrigger = screen.getByText("Formatting (1 issues)");
    await user.click(formattingTrigger);

    expect(
      screen.getByText("Possible table-based layout detected.")
    ).toBeDefined();
    expect(
      screen.getByText("Replace table layouts with simple text.")
    ).toBeDefined();
  });

  it("renders section issues when expanded", async () => {
    const user = userEvent.setup();
    const score = makeScore({
      sectionScore: 60,
      issues: [
        {
          type: "section",
          severity: "critical",
          message: '"Contact" section not detected.',
          suggestion: 'Add a clearly labeled "Contact" section.',
        },
        {
          type: "section",
          severity: "warning",
          message: '"Summary" section not detected.',
          suggestion: 'Add a clearly labeled "Summary" section.',
        },
      ],
    });
    render(<ATSScoreCard score={score} />);

    const sectionTrigger = screen.getByText("Section Structure (2 issues)");
    await user.click(sectionTrigger);

    expect(screen.getByText('"Contact" section not detected.')).toBeDefined();
    expect(screen.getByText('"Summary" section not detected.')).toBeDefined();
  });

  it("shows no-issues messages when formatting/section scores are perfect", async () => {
    const user = userEvent.setup();
    const score = makeScore({
      overall: 100,
      keywordMatchPct: 100,
      formattingScore: 100,
      sectionScore: 100,
      matchedKeywords: ["react"],
      missingKeywords: [],
      issues: [],
      passed: true,
    });
    render(<ATSScoreCard score={score} />);

    // Expand formatting section
    const formattingTrigger = screen.getByText("Formatting (0 issues)");
    await user.click(formattingTrigger);
    expect(
      screen.getByText(
        "No formatting issues found. Your resume is ATS-friendly."
      )
    ).toBeDefined();

    // Expand section structure
    const sectionTrigger = screen.getByText("Section Structure (0 issues)");
    await user.click(sectionTrigger);
    expect(
      screen.getByText(
        "All standard sections detected. Your resume structure is well organized."
      )
    ).toBeDefined();
  });

  it("renders the info tooltip trigger button", () => {
    render(<ATSScoreCard score={makeScore()} />);
    const tooltipBtn = screen.getByLabelText("What ATS systems look for");
    expect(tooltipBtn).toBeDefined();
    expect(tooltipBtn.textContent).toBe("?");
  });

  it("displays score with correct color coding for high scores (green)", () => {
    const { container } = render(
      <ATSScoreCard score={makeScore({ overall: 85 })} />
    );
    const scoreText = container.querySelector(".text-green-500");
    expect(scoreText).not.toBeNull();
    expect(scoreText?.textContent).toBe("85");
  });

  it("displays score with correct color coding for medium scores (yellow)", () => {
    const { container } = render(
      <ATSScoreCard score={makeScore({ overall: 55 })} />
    );
    const scoreText = container.querySelector(".text-yellow-500");
    expect(scoreText).not.toBeNull();
    expect(scoreText?.textContent).toBe("55");
  });

  it("displays score with correct color coding for low scores (red)", () => {
    const { container } = render(
      <ATSScoreCard score={makeScore({ overall: 25 })} />
    );
    const scoreText = container.querySelector(".text-red-500");
    expect(scoreText).not.toBeNull();
    expect(scoreText?.textContent).toBe("25");
  });

  it("renders weak keyword issues in the keyword section", () => {
    const score = makeScore({
      issues: [
        {
          type: "weak_keyword",
          severity: "warning",
          message:
            'Keyword "python" is used weakly.',
          suggestion: "Use python in a concrete achievement bullet point.",
        },
      ],
    });
    render(<ATSScoreCard score={score} />);

    // Keyword section auto-opens because it has 1 weak_keyword issue (defaultOpen)
    expect(
      screen.getByText('Keyword "python" is used weakly.')
    ).toBeDefined();
  });

  it("handles empty matched and missing keywords gracefully", async () => {
    const user = userEvent.setup();
    const score = makeScore({
      matchedKeywords: [],
      missingKeywords: [],
      issues: [],
    });
    render(<ATSScoreCard score={score} />);

    // Keyword section is closed by default when no issues
    const trigger = screen.getByText("Keyword Match (0 issues)");
    await user.click(trigger);

    expect(screen.getByText("No keyword issues found.")).toBeDefined();
  });
});
