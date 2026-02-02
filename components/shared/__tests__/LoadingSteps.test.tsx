// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LoadingSteps } from "../LoadingSteps";
import type { LoadingStep } from "../LoadingSteps";

describe("LoadingSteps", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultSteps: LoadingStep[] = [
    { label: "Running ATS simulation", status: "pending" },
    { label: "Analyzing HR perspective", status: "pending" },
    { label: "Generating suggestions", status: "pending" },
    { label: "Ready!", status: "pending" },
  ];

  it("renders all step labels", () => {
    render(<LoadingSteps steps={defaultSteps} />);
    expect(screen.getByText("Running ATS simulation")).toBeDefined();
    expect(screen.getByText("Analyzing HR perspective")).toBeDefined();
    expect(screen.getByText("Generating suggestions")).toBeDefined();
    expect(screen.getByText("Ready!")).toBeDefined();
  });

  it("renders pending steps with muted styling", () => {
    render(<LoadingSteps steps={defaultSteps} />);
    const label = screen.getByText("Running ATS simulation");
    expect(label.className).toContain("text-muted-foreground/50");
  });

  it("renders active step with animated dots and font-medium", () => {
    const steps: LoadingStep[] = [
      { label: "Running ATS simulation", status: "active" },
      { label: "Analyzing HR perspective", status: "pending" },
    ];
    const { container } = render(<LoadingSteps steps={steps} />);
    // Find the active label span (has font-medium class)
    const label = container.querySelector("span.font-medium");
    expect(label).not.toBeNull();
    expect(label?.textContent).toContain("Running ATS simulation");
    // Should have animated dots child
    const dots = label?.querySelector(".animate-pulse");
    expect(dots).not.toBeNull();
    expect(dots?.textContent).toBe("...");
  });

  it("renders complete step with green checkmark circle", () => {
    const steps: LoadingStep[] = [
      { label: "Running ATS simulation", status: "complete" },
    ];
    const { container } = render(<LoadingSteps steps={steps} />);
    // Complete step has a green bg circle
    const greenCircle = container.querySelector(".bg-green-500");
    expect(greenCircle).toBeDefined();
    // Should have a check SVG path
    const svgPath = greenCircle?.querySelector("path");
    expect(svgPath?.getAttribute("d")).toContain("3 7l3 3 5-5");
  });

  it("renders error step with red X circle", () => {
    const steps: LoadingStep[] = [
      { label: "ATS failed", status: "error" },
    ];
    const { container } = render(<LoadingSteps steps={steps} />);
    const redCircle = container.querySelector(".bg-red-500");
    expect(redCircle).toBeDefined();
    const label = screen.getByText("ATS failed");
    expect(label.className).toContain("text-red-600");
  });

  it("renders active step with blue border circle and pulsing dot", () => {
    const steps: LoadingStep[] = [
      { label: "Processing", status: "active" },
    ];
    const { container } = render(<LoadingSteps steps={steps} />);
    const blueCircle = container.querySelector(".border-blue-500");
    expect(blueCircle).toBeDefined();
    const pulsingDot = container.querySelector(".animate-pulse.bg-blue-500");
    expect(pulsingDot).toBeDefined();
  });

  it("renders mixed states correctly", () => {
    const steps: LoadingStep[] = [
      { label: "Step 1", status: "complete" },
      { label: "Step 2", status: "active" },
      { label: "Step 3", status: "pending" },
    ];
    const { container } = render(<LoadingSteps steps={steps} />);

    // Step 1 has green check
    expect(container.querySelector(".bg-green-500")).toBeDefined();
    // Step 2 has pulsing blue
    expect(container.querySelector(".bg-blue-500.animate-pulse")).toBeDefined();
    // Step 3 text is muted
    const step3 = screen.getByText("Step 3");
    expect(step3.className).toContain("text-muted-foreground/50");
  });

  it("renders empty steps array without error", () => {
    const { container } = render(<LoadingSteps steps={[]} />);
    expect(container.querySelector(".space-y-3")).toBeDefined();
  });

  it("renders complete step label with muted text", () => {
    const steps: LoadingStep[] = [
      { label: "Done step", status: "complete" },
    ];
    render(<LoadingSteps steps={steps} />);
    const label = screen.getByText("Done step");
    expect(label.className).toContain("text-muted-foreground");
    expect(label.className).not.toContain("text-muted-foreground/50");
  });

  it("does not show animated dots for non-active steps", () => {
    const steps: LoadingStep[] = [
      { label: "Complete step", status: "complete" },
      { label: "Pending step", status: "pending" },
    ];
    render(<LoadingSteps steps={steps} />);
    const completeLabel = screen.getByText("Complete step");
    expect(completeLabel.querySelector(".animate-pulse")).toBeNull();
    const pendingLabel = screen.getByText("Pending step");
    expect(pendingLabel.querySelector(".animate-pulse")).toBeNull();
  });

  it("renders pending step with empty border circle", () => {
    const steps: LoadingStep[] = [
      { label: "Waiting", status: "pending" },
    ];
    const { container } = render(<LoadingSteps steps={steps} />);
    const emptyCircle = container.querySelector(".border-muted-foreground\\/30");
    expect(emptyCircle).toBeDefined();
  });
});
