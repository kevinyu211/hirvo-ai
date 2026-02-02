/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import {
  ATSScoreCardSkeleton,
  HRScoreCardSkeleton,
  EditorSkeleton,
  SuggestionGeneratingSkeleton,
  AnalysisPipelineSkeleton,
  StreamingTextIndicator,
  DashboardCardSkeleton,
} from "../ScoreCardSkeleton";

afterEach(() => {
  cleanup();
});

describe("ATSScoreCardSkeleton", () => {
  it("renders a skeleton card with animated placeholders", () => {
    const { container } = render(<ATSScoreCardSkeleton />);

    // Should have skeleton elements (elements with animate-pulse class)
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders score gauge skeleton placeholder", () => {
    const { container } = render(<ATSScoreCardSkeleton />);

    // Should have a circular skeleton for the gauge (rounded-full)
    const circleSkeleton = container.querySelector('.rounded-full');
    expect(circleSkeleton).toBeTruthy();
  });

  it("renders three score bar skeletons", () => {
    const { container } = render(<ATSScoreCardSkeleton />);

    // Should have multiple horizontal bar skeletons (h-2 rounded-full)
    const barSkeletons = container.querySelectorAll('.h-2.rounded-full');
    expect(barSkeletons.length).toBeGreaterThanOrEqual(3);
  });

  it("renders breakdown section skeletons", () => {
    const { container } = render(<ATSScoreCardSkeleton />);

    // Should have breakdown section placeholders (border elements)
    const sections = container.querySelectorAll('.rounded-lg.border');
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });
});

describe("HRScoreCardSkeleton", () => {
  it("renders a skeleton card with animated placeholders", () => {
    const { container } = render(<HRScoreCardSkeleton />);

    // Should have skeleton elements (elements with animate-pulse class)
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders score gauge skeleton placeholder", () => {
    const { container } = render(<HRScoreCardSkeleton />);

    const circleSkeleton = container.querySelector('.rounded-full');
    expect(circleSkeleton).toBeTruthy();
  });

  it("renders three score bar skeletons for the three layers", () => {
    const { container } = render(<HRScoreCardSkeleton />);

    const barSkeletons = container.querySelectorAll('.h-2.rounded-full');
    expect(barSkeletons.length).toBeGreaterThanOrEqual(3);
  });
});

describe("EditorSkeleton", () => {
  it("renders view toggle skeleton", () => {
    const { container } = render(<EditorSkeleton />);

    // Should have a skeleton for the toggle (w-64)
    const toggleSkeleton = container.querySelector('.w-64');
    expect(toggleSkeleton).toBeTruthy();
  });

  it("renders editor content area with multiple line skeletons", () => {
    const { container } = render(<EditorSkeleton />);

    // Should have multiple line skeletons (h-5 elements)
    const lineSkeletons = container.querySelectorAll('.h-5');
    expect(lineSkeletons.length).toBeGreaterThanOrEqual(5);
  });

  it("renders legend skeleton", () => {
    const { container } = render(<EditorSkeleton />);

    // Should have legend items (h-4 w-20 elements)
    const legendSkeletons = container.querySelectorAll('.h-4.w-20');
    expect(legendSkeletons.length).toBeGreaterThanOrEqual(3);
  });
});

describe("SuggestionGeneratingSkeleton", () => {
  it("renders loading spinner", () => {
    const { container } = render(<SuggestionGeneratingSkeleton />);

    // Should have spinner with animate-spin
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it("renders generating message with pulse animation", () => {
    const { container } = render(<SuggestionGeneratingSkeleton />);

    // Should have pulsing text
    const pulsingText = container.querySelector('.animate-pulse');
    expect(pulsingText).toBeTruthy();
    expect(pulsingText?.textContent).toContain("Generating suggestions");
  });
});

describe("AnalysisPipelineSkeleton", () => {
  it("renders both ATS and HR score card skeletons", () => {
    const { container } = render(<AnalysisPipelineSkeleton />);

    // Should have a grid with two skeleton cards
    const grid = container.querySelector('.grid');
    expect(grid).toBeTruthy();

    // Should have two Card components (from CardContent)
    const cards = container.querySelectorAll('[class*="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it("renders editor skeleton", () => {
    const { container } = render(<AnalysisPipelineSkeleton />);

    // Should have the editor area with line skeletons
    const lineSkeletons = container.querySelectorAll('.h-5');
    expect(lineSkeletons.length).toBeGreaterThan(0);
  });
});

describe("StreamingTextIndicator", () => {
  it("renders default text", () => {
    render(<StreamingTextIndicator />);

    expect(screen.getByText("AI is thinking")).toBeTruthy();
  });

  it("renders custom text", () => {
    render(<StreamingTextIndicator text="Processing response" />);

    expect(screen.getByText("Processing response")).toBeTruthy();
  });

  it("renders bouncing dots animation", () => {
    const { container } = render(<StreamingTextIndicator />);

    // Should have three bouncing dots
    const bouncingDots = container.querySelectorAll('.animate-bounce');
    expect(bouncingDots.length).toBe(3);
  });

  it("applies staggered animation delays", () => {
    const { container } = render(<StreamingTextIndicator />);

    const dots = container.querySelectorAll('.animate-bounce');
    const delays = Array.from(dots).map(dot =>
      (dot as HTMLElement).style.animationDelay
    );

    // Should have different delays
    expect(delays).toContain("0ms");
    expect(delays).toContain("150ms");
    expect(delays).toContain("300ms");
  });
});

describe("DashboardCardSkeleton", () => {
  it("renders skeleton placeholders for card content", () => {
    const { container } = render(<DashboardCardSkeleton />);

    // Should have skeleton elements (elements with animate-pulse class)
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders badge placeholders", () => {
    const { container } = render(<DashboardCardSkeleton />);

    // Should have rounded-full elements for badges
    const badges = container.querySelectorAll('.rounded-full');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });
});
