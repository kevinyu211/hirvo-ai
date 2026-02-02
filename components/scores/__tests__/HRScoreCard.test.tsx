/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HRScoreCard } from "../HRScoreCard";
import type { HRScore } from "@/lib/types";
import type { HRLayerData } from "../HRScoreCard";

afterEach(() => {
  cleanup();
});

// Helper to create a valid HRScore for testing
function makeScore(overrides: Partial<HRScore> = {}): HRScore {
  return {
    overall: 68,
    formattingScore: 75,
    semanticScore: 62,
    llmScore: 70,
    feedback: [
      {
        type: "formatting",
        layer: 1,
        severity: "warning",
        message: "Your resume uses 2 pages — 85% of successful resumes use 1 page.",
        suggestion: "Consider condensing to 1 page.",
      },
      {
        type: "semantic",
        layer: 2,
        severity: "warning",
        message:
          'Your "skills" section has moderate semantic match (55%) with the job description.',
        suggestion:
          "Consider strengthening the alignment of your skills section with the job requirements.",
      },
      {
        type: "llm_review",
        layer: 3,
        severity: "critical",
        message:
          "Red flag (employment gap): 2-year gap between 2019 and 2021.",
        suggestion: "Address the gap in your cover letter or summary.",
      },
    ],
    ...overrides,
  };
}

function makeLayerData(
  overrides: Partial<HRLayerData> = {}
): HRLayerData {
  return {
    formatting: {
      score: 75,
      suggestions: [
        {
          aspect: "page_count",
          userValue: "2 pages",
          referenceValue: "1 page",
          percentageSupport: 85,
          message:
            "Your resume uses 2 pages — 85% of successful resumes use 1 page.",
          severity: "warning",
        },
      ],
      referenceCount: 50,
    },
    semantic: {
      score: 62,
      sectionScores: [
        { section: "experience", score: 72 },
        { section: "skills", score: 55 },
        { section: "education", score: 48 },
      ],
    },
    llmReview: {
      score: 70,
      firstImpression:
        "The resume presents a solid candidate with relevant experience.",
      careerNarrative: {
        score: 65,
        assessment: "Career progression is somewhat logical but has gaps.",
        suggestion: "Better explain the transition between roles.",
      },
      achievementStrength: {
        score: 72,
        assessment: "Achievements are present and some are quantified.",
        suggestion: "Add more metrics to strengthen impact.",
      },
      roleRelevance: {
        score: 68,
        assessment: "Moderate relevance to the target role.",
        suggestion: "Emphasize transferable skills more clearly.",
      },
      redFlags: [
        {
          type: "employment_gap",
          description: "2-year gap between 2019 and 2021.",
          severity: "critical",
          mitigation: "Address the gap in your cover letter or summary.",
        },
      ],
      sectionComments: [
        {
          section: "Experience",
          comment: "Good variety of roles but could use more detail.",
          suggestion: "Expand bullet points with quantified results.",
          score: 65,
        },
      ],
      callbackDecision: {
        decision: "maybe",
        reasoning:
          "Candidate shows potential but needs to address career gaps and strengthen relevance.",
      },
    },
    ...overrides,
  };
}

describe("HRScoreCard", () => {
  it("renders the overall score", () => {
    render(<HRScoreCard score={makeScore()} />);
    // Due to responsive design, there are two gauges (mobile and desktop)
    // We check that at least one is rendered with the score
    expect(screen.getAllByText("68").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("out of 100").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the HR Score title", () => {
    const { container } = render(<HRScoreCard score={makeScore()} />);
    const titles = container.querySelectorAll(".tracking-tight");
    const hrTitle = Array.from(titles).find(
      (t) => t.textContent === "HR Score"
    );
    expect(hrTitle).not.toBeUndefined();
  });

  it("renders sub-score bar labels for all three layers", () => {
    const { container } = render(<HRScoreCard score={makeScore()} />);
    const html = container.innerHTML;
    expect(html).toContain("Formatting (Layer 1)");
    expect(html).toContain("Semantic Match (Layer 2)");
    expect(html).toContain("HR Review (Layer 3)");
  });

  it("renders sub-score percentages in bars", () => {
    const { container } = render(
      <HRScoreCard
        score={makeScore({
          formattingScore: 75,
          semanticScore: 62,
          llmScore: 70,
        })}
      />
    );
    const html = container.innerHTML;
    expect(html).toContain("75%");
    expect(html).toContain("62%");
    expect(html).toContain("70%");
  });

  it("renders breakdown section titles with issue counts", () => {
    const { container } = render(<HRScoreCard score={makeScore()} />);
    const html = container.innerHTML;
    expect(html).toContain("Formatting Analysis (1 issues)");
    expect(html).toContain("Semantic Match (1 issues)");
    expect(html).toContain("HR Reviewer (1 issues)");
  });

  it("displays score with correct color coding for high scores (green)", () => {
    const { container } = render(
      <HRScoreCard score={makeScore({ overall: 85 })} />
    );
    const scoreText = container.querySelector(".text-green-500");
    expect(scoreText).not.toBeNull();
    expect(scoreText?.textContent).toBe("85");
  });

  it("displays score with correct color coding for medium scores (yellow)", () => {
    const { container } = render(
      <HRScoreCard score={makeScore({ overall: 55 })} />
    );
    const scoreText = container.querySelector(".text-yellow-500");
    expect(scoreText).not.toBeNull();
    expect(scoreText?.textContent).toBe("55");
  });

  it("displays score with correct color coding for low scores (red)", () => {
    const { container } = render(
      <HRScoreCard score={makeScore({ overall: 25 })} />
    );
    const scoreText = container.querySelector(".text-red-500");
    expect(scoreText).not.toBeNull();
    expect(scoreText?.textContent).toBe("25");
  });

  it("renders the info tooltip trigger button", () => {
    render(<HRScoreCard score={makeScore()} />);
    const tooltipBtn = screen.getByLabelText("How HR simulation works");
    expect(tooltipBtn).toBeDefined();
    expect(tooltipBtn.textContent).toBe("?");
  });

  // ── Layer Data Tests ────────────────────────────────────────────────────

  it("shows callback decision badge when layer data is provided", () => {
    render(
      <HRScoreCard score={makeScore()} layers={makeLayerData()} />
    );
    // Badge appears in both header and breakdown section
    const badges = screen.getAllByText("Maybe Interview");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Would Interview' badge for yes callback decision", () => {
    const layers = makeLayerData();
    layers.llmReview!.callbackDecision.decision = "yes";
    render(<HRScoreCard score={makeScore()} layers={layers} />);
    // There are two badges: one in header, one in breakdown
    const badges = screen.getAllByText("Would Interview");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'Would Not Interview' badge for no callback decision", () => {
    const layers = makeLayerData();
    layers.llmReview!.callbackDecision.decision = "no";
    render(<HRScoreCard score={makeScore()} layers={layers} />);
    const badges = screen.getAllByText("Would Not Interview");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows reference count in formatting layer when expanded", () => {
    render(
      <HRScoreCard score={makeScore()} layers={makeLayerData()} />
    );

    // Formatting section auto-opens because there's 1 formatting feedback item
    // Check reference count message is visible
    expect(
      screen.getByText("Compared against 50 successful resumes")
    ).toBeDefined();
  });

  it("shows formatting suggestions with statistical backing", () => {
    render(
      <HRScoreCard score={makeScore()} layers={makeLayerData()} />
    );

    // Formatting section is auto-opened (has issues)
    expect(
      screen.getByText(
        "Your resume uses 2 pages — 85% of successful resumes use 1 page."
      )
    ).toBeDefined();
    expect(
      screen.getByText("Based on 85% of successful resumes")
    ).toBeDefined();
  });

  it("shows semantic section score bars when layer data provided and expanded", async () => {
    const user = userEvent.setup();
    // Use a score with NO semantic feedback so the section is initially closed,
    // then click to open and verify bars appear
    const score = makeScore({
      feedback: [
        {
          type: "formatting",
          layer: 1,
          severity: "warning",
          message: "Page count issue.",
        },
      ],
    });
    const layers = makeLayerData();
    const { container } = render(
      <HRScoreCard score={score} layers={layers} />
    );

    // Find and click the semantic section trigger to expand it
    const buttons = container.querySelectorAll('button[type="button"]');
    let semanticBtn: HTMLElement | null = null;
    buttons.forEach((btn) => {
      if (btn.textContent?.includes("Semantic Match")) {
        semanticBtn = btn as HTMLElement;
      }
    });
    expect(semanticBtn).not.toBeNull();
    await user.click(semanticBtn!);

    const html = container.innerHTML;
    expect(html).toContain("Experience");
    expect(html).toContain("Skills");
    expect(html).toContain("Education");
    expect(html).toContain("72%");  // experience section score
    expect(html).toContain("55%");  // skills section score
    expect(html).toContain("48%");  // education section score
  });

  it("shows first impression in HR review layer", () => {
    const layers = makeLayerData();
    const score = makeScore();
    render(<HRScoreCard score={score} layers={layers} />);

    // Click to expand HR review section (has 1 llm_review issue)
    // It auto-opens because defaultOpen=true when issues > 0
    // But llm_review section may not auto-open if no llm_review feedback
    // In our test, there IS 1 llm_review feedback → auto-opens
    expect(
      screen.getByText(
        "The resume presents a solid candidate with relevant experience."
      )
    ).toBeDefined();
  });

  it("shows HR dimension scores in review layer", () => {
    const layers = makeLayerData();
    const { container } = render(
      <HRScoreCard score={makeScore()} layers={layers} />
    );

    // HR review section auto-opens (has issues)
    expect(screen.getByText("Career Narrative")).toBeDefined();
    expect(screen.getByText("Achievement Strength")).toBeDefined();
    expect(screen.getByText("Role Relevance")).toBeDefined();
    // 65/100 appears in both career narrative dimension and experience section comment
    const html = container.innerHTML;
    expect(html).toContain("65/100");
    expect(html).toContain("72/100");
    expect(html).toContain("68/100");
  });

  it("shows red flags in HR review layer", () => {
    render(
      <HRScoreCard score={makeScore()} layers={makeLayerData()} />
    );

    expect(screen.getByText("Red Flags (1)")).toBeDefined();
    expect(screen.getByText("employment gap")).toBeDefined();
    expect(
      screen.getByText("2-year gap between 2019 and 2021.")
    ).toBeDefined();
  });

  it("shows section comments in HR review layer", () => {
    render(
      <HRScoreCard score={makeScore()} layers={makeLayerData()} />
    );

    expect(screen.getByText("Section Feedback")).toBeDefined();
    expect(
      screen.getByText("Good variety of roles but could use more detail.")
    ).toBeDefined();
  });

  it("shows callback decision reasoning in HR review layer", () => {
    render(
      <HRScoreCard score={makeScore()} layers={makeLayerData()} />
    );

    expect(screen.getByText("Callback Decision")).toBeDefined();
    expect(
      screen.getByText(
        "Candidate shows potential but needs to address career gaps and strengthen relevance."
      )
    ).toBeDefined();
  });

  // ── Fallback/Edge Case Tests ────────────────────────────────────────────

  it("renders without layer data (feedback-only mode)", () => {
    const { container } = render(<HRScoreCard score={makeScore()} />);
    const html = container.innerHTML;
    expect(html).toContain("HR Score");
    expect(html).toContain("Formatting Analysis");
    expect(html).toContain("Semantic Match");
    expect(html).toContain("HR Reviewer");
  });

  it("shows no-issues messages when all scores are perfect", async () => {
    const user = userEvent.setup();
    const score = makeScore({
      overall: 95,
      formattingScore: 95,
      semanticScore: 90,
      llmScore: 95,
      feedback: [],
    });
    render(<HRScoreCard score={score} />);

    // Expand formatting section
    const formattingTrigger = screen.getByText("Formatting Analysis (0 issues)");
    await user.click(formattingTrigger);
    expect(
      screen.getByText(
        "No formatting issues found. Your resume formatting looks great."
      )
    ).toBeDefined();

    // Expand semantic section
    const semanticTrigger = screen.getByText("Semantic Match (0 issues)");
    await user.click(semanticTrigger);
    expect(
      screen.getByText(
        "Your resume has strong semantic alignment with the job description."
      )
    ).toBeDefined();

    // Expand HR review section
    const hrTrigger = screen.getByText("HR Reviewer (0 issues)");
    await user.click(hrTrigger);
    expect(
      screen.getByText("No specific issues flagged by the HR reviewer.")
    ).toBeDefined();
  });

  it("shows 'HR review data is not available' when llmScore is 0 and no layers", async () => {
    const user = userEvent.setup();
    const score = makeScore({
      llmScore: 0,
      feedback: [],
    });
    render(<HRScoreCard score={score} />);

    const hrTrigger = screen.getByText("HR Reviewer (0 issues)");
    await user.click(hrTrigger);
    expect(
      screen.getByText("HR review data is not available.")
    ).toBeDefined();
  });

  it("does not show callback badge in header when no layer data", () => {
    const { container } = render(
      <HRScoreCard score={makeScore()} />
    );
    const html = container.innerHTML;
    // No callback badges when layers not provided
    expect(html).not.toContain("Would Interview");
    expect(html).not.toContain("Would Not Interview");
    expect(html).not.toContain("Maybe Interview");
  });

  it("shows no callback badge in header when llmReview is null", () => {
    const layers: HRLayerData = {
      formatting: makeLayerData().formatting,
      semantic: makeLayerData().semantic,
      llmReview: null,
    };
    const { container } = render(
      <HRScoreCard score={makeScore()} layers={layers} />
    );
    const html = container.innerHTML;
    expect(html).not.toContain("Would Interview");
    expect(html).not.toContain("Would Not Interview");
    expect(html).not.toContain("Maybe Interview");
  });

  it("handles empty red flags gracefully", () => {
    const layers = makeLayerData();
    layers.llmReview!.redFlags = [];
    const { container } = render(
      <HRScoreCard score={makeScore()} layers={layers} />
    );
    const html = container.innerHTML;
    // No "Red Flags" section header when empty
    expect(html).not.toContain("Red Flags (");
  });

  it("handles empty section comments gracefully", () => {
    const layers = makeLayerData();
    layers.llmReview!.sectionComments = [];
    const { container } = render(
      <HRScoreCard score={makeScore()} layers={layers} />
    );
    const html = container.innerHTML;
    expect(html).not.toContain("Section Feedback");
  });
});
