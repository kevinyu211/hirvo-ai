// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewToggle } from "../ViewToggle";
import type { ViewMode } from "../ViewToggle";

afterEach(() => {
  cleanup();
});

describe("ViewToggle", () => {
  const defaultProps = {
    activeView: "ats" as ViewMode,
    onViewChange: vi.fn(),
    atsIssueCount: 7,
    hrFeedbackCount: 12,
  };

  it("renders both ATS and HR tab buttons", () => {
    const { getByRole } = render(<ViewToggle {...defaultProps} />);
    expect(getByRole("tab", { name: /ATS Issues/i })).toBeDefined();
    expect(getByRole("tab", { name: /HR Feedback/i })).toBeDefined();
  });

  it("renders the tablist container with proper role", () => {
    const { getByRole } = render(<ViewToggle {...defaultProps} />);
    expect(getByRole("tablist")).toBeDefined();
  });

  it("shows issue count badges on each tab", () => {
    const { getByRole } = render(<ViewToggle {...defaultProps} />);
    const atsTab = getByRole("tab", { name: /ATS Issues/i });
    const hrTab = getByRole("tab", { name: /HR Feedback/i });
    expect(atsTab.textContent).toContain("7");
    expect(hrTab.textContent).toContain("12");
  });

  it("marks the ATS tab as selected when activeView is ats", () => {
    const { getByRole } = render(
      <ViewToggle {...defaultProps} activeView="ats" />
    );
    const atsTab = getByRole("tab", { name: /ATS Issues/i });
    const hrTab = getByRole("tab", { name: /HR Feedback/i });
    expect(atsTab.getAttribute("aria-selected")).toBe("true");
    expect(hrTab.getAttribute("aria-selected")).toBe("false");
  });

  it("marks the HR tab as selected when activeView is hr", () => {
    const { getByRole } = render(
      <ViewToggle {...defaultProps} activeView="hr" />
    );
    const atsTab = getByRole("tab", { name: /ATS Issues/i });
    const hrTab = getByRole("tab", { name: /HR Feedback/i });
    expect(atsTab.getAttribute("aria-selected")).toBe("false");
    expect(hrTab.getAttribute("aria-selected")).toBe("true");
  });

  it("calls onViewChange with 'hr' when HR tab is clicked", async () => {
    const onViewChange = vi.fn();
    const user = userEvent.setup();
    const { getByRole } = render(
      <ViewToggle {...defaultProps} onViewChange={onViewChange} activeView="ats" />
    );
    await user.click(getByRole("tab", { name: /HR Feedback/i }));
    expect(onViewChange).toHaveBeenCalledWith("hr");
    expect(onViewChange).toHaveBeenCalledTimes(1);
  });

  it("calls onViewChange with 'ats' when ATS tab is clicked", async () => {
    const onViewChange = vi.fn();
    const user = userEvent.setup();
    const { getByRole } = render(
      <ViewToggle {...defaultProps} onViewChange={onViewChange} activeView="hr" />
    );
    await user.click(getByRole("tab", { name: /ATS Issues/i }));
    expect(onViewChange).toHaveBeenCalledWith("ats");
    expect(onViewChange).toHaveBeenCalledTimes(1);
  });

  it("applies active styling to the selected tab", () => {
    const { getByRole } = render(
      <ViewToggle {...defaultProps} activeView="ats" />
    );
    const atsTab = getByRole("tab", { name: /ATS Issues/i });
    const hrTab = getByRole("tab", { name: /HR Feedback/i });
    expect(atsTab.className).toContain("bg-background");
    expect(atsTab.className).toContain("shadow-sm");
    expect(hrTab.className).toContain("text-muted-foreground");
    expect(hrTab.className).not.toContain("shadow-sm");
  });

  it("applies active styling to HR tab when selected", () => {
    const { getByRole } = render(
      <ViewToggle {...defaultProps} activeView="hr" />
    );
    const atsTab = getByRole("tab", { name: /ATS Issues/i });
    const hrTab = getByRole("tab", { name: /HR Feedback/i });
    expect(hrTab.className).toContain("bg-background");
    expect(hrTab.className).toContain("shadow-sm");
    expect(atsTab.className).toContain("text-muted-foreground");
    expect(atsTab.className).not.toContain("shadow-sm");
  });

  it("shows zero issue counts correctly", () => {
    const { getByRole } = render(
      <ViewToggle
        {...defaultProps}
        atsIssueCount={0}
        hrFeedbackCount={0}
      />
    );
    const atsTab = getByRole("tab", { name: /ATS Issues/i });
    const hrTab = getByRole("tab", { name: /HR Feedback/i });
    expect(atsTab.textContent).toContain("0");
    expect(hrTab.textContent).toContain("0");
  });

  it("shows large issue counts correctly", () => {
    const { getByRole } = render(
      <ViewToggle
        {...defaultProps}
        atsIssueCount={99}
        hrFeedbackCount={150}
      />
    );
    const atsTab = getByRole("tab", { name: /ATS Issues/i });
    const hrTab = getByRole("tab", { name: /HR Feedback/i });
    expect(atsTab.textContent).toContain("99");
    expect(hrTab.textContent).toContain("150");
  });

  it("applies red badge color for ATS tab with issues when active", () => {
    const { container } = render(
      <ViewToggle {...defaultProps} activeView="ats" atsIssueCount={5} />
    );
    const atsButton = container.querySelector('[aria-selected="true"]');
    const badge = atsButton?.querySelector('[class*="bg-red-600"]');
    expect(badge).toBeTruthy();
  });

  it("applies green badge color for ATS tab with zero issues when active", () => {
    const { container } = render(
      <ViewToggle {...defaultProps} activeView="ats" atsIssueCount={0} />
    );
    const atsButton = container.querySelector('[aria-selected="true"]');
    const badge = atsButton?.querySelector('[class*="bg-green-600"]');
    expect(badge).toBeTruthy();
  });

  it("applies purple badge color for HR tab with issues when active", () => {
    const { container } = render(
      <ViewToggle {...defaultProps} activeView="hr" hrFeedbackCount={5} />
    );
    const hrButton = container.querySelector('[id="tab-hr"]');
    const badge = hrButton?.querySelector('[class*="bg-purple-600"]');
    expect(badge).toBeTruthy();
  });

  it("has correct aria-controls attributes", () => {
    const { getByRole } = render(<ViewToggle {...defaultProps} />);
    const atsTab = getByRole("tab", { name: /ATS Issues/i });
    const hrTab = getByRole("tab", { name: /HR Feedback/i });
    expect(atsTab.getAttribute("aria-controls")).toBe("editor-ats-panel");
    expect(hrTab.getAttribute("aria-controls")).toBe("editor-hr-panel");
  });

  it("has correct tab IDs", () => {
    const { getByRole } = render(<ViewToggle {...defaultProps} />);
    const atsTab = getByRole("tab", { name: /ATS Issues/i });
    const hrTab = getByRole("tab", { name: /HR Feedback/i });
    expect(atsTab.id).toBe("tab-ats");
    expect(hrTab.id).toBe("tab-hr");
  });
});
