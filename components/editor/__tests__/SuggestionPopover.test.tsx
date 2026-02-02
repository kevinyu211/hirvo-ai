// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuggestionPopover } from "../SuggestionPopover";
import type { Suggestion } from "@/lib/types";

// Helper to create a suggestion
function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: "s1",
    type: "ats",
    category: "missing_keyword",
    originalText: "managed team projects",
    suggestedText: "led cross-functional team projects",
    reasoning: "The job description requires 'led' and 'cross-functional' keywords.",
    textRange: { start: 0, end: 22 },
    severity: "critical",
    ...overrides,
  };
}

// Helper to create a fake editor element with a mark element
function createEditorElement(suggestionId: string): HTMLElement {
  const editor = document.createElement("div");
  editor.style.position = "relative";
  editor.style.top = "100px";
  editor.style.left = "50px";
  editor.style.width = "600px";
  editor.style.height = "400px";

  const mark = document.createElement("mark");
  mark.setAttribute("data-suggestion-id", suggestionId);
  mark.textContent = "managed team projects";
  editor.appendChild(mark);

  document.body.appendChild(editor);
  return editor;
}

afterEach(() => {
  cleanup();
  // Clean up any editor elements added to document.body
  document.body.innerHTML = "";
});

describe("SuggestionPopover", () => {
  describe("rendering", () => {
    it("renders nothing when suggestion is null", () => {
      const { container } = render(
        <SuggestionPopover
          suggestion={null}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(container.innerHTML).toBe("");
    });

    it("renders the popover when a suggestion is provided", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion()}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.getByTestId("suggestion-popover")).toBeTruthy();
    });

    it("has role='dialog' and aria-label", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion()}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const popover = screen.getByTestId("suggestion-popover");
      expect(popover.getAttribute("role")).toBe("dialog");
      expect(popover.getAttribute("aria-label")).toBe("Suggestion details");
    });
  });

  describe("category badge", () => {
    it("shows ATS Missing Keyword category for missing_keyword", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ category: "missing_keyword" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const badge = screen.getByTestId("category-badge");
      expect(badge.textContent).toBe("ATS: Missing Keyword");
    });

    it("shows ATS Weak Keyword category for weak_keyword", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ category: "weak_keyword" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const badge = screen.getByTestId("category-badge");
      expect(badge.textContent).toBe("ATS: Weak Keyword");
    });

    it("shows Formatting Issue for formatting category", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ category: "formatting" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const badge = screen.getByTestId("category-badge");
      expect(badge.textContent).toBe("Formatting Issue");
    });

    it("shows HR Semantic Match for semantic category", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ category: "semantic", type: "hr" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const badge = screen.getByTestId("category-badge");
      expect(badge.textContent).toBe("HR: Semantic Match");
    });

    it("shows HR Recruiter Comment for llm_review category", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ category: "llm_review", type: "hr" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const badge = screen.getByTestId("category-badge");
      expect(badge.textContent).toBe("HR: Recruiter Comment");
    });

    it("falls back to raw category for unknown categories", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ category: "unknown_cat" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const badge = screen.getByTestId("category-badge");
      expect(badge.textContent).toBe("unknown_cat");
    });
  });

  describe("severity badge", () => {
    it("shows Critical severity badge", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ severity: "critical" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const badge = screen.getByTestId("severity-badge");
      expect(badge.textContent).toBe("Critical");
    });

    it("shows Warning severity badge", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ severity: "warning" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const badge = screen.getByTestId("severity-badge");
      expect(badge.textContent).toBe("Warning");
    });

    it("shows Info severity badge", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ severity: "info" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      const badge = screen.getByTestId("severity-badge");
      expect(badge.textContent).toBe("Info");
    });
  });

  describe("issue reasoning", () => {
    it("displays the reasoning text", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            reasoning: "Missing critical keyword 'Python' from job description.",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.getByTestId("issue-reasoning").textContent).toBe(
        "Missing critical keyword 'Python' from job description."
      );
    });
  });

  describe("original text", () => {
    it("displays the original text when present", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ originalText: "managed projects" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.getByTestId("original-text").textContent).toBe(
        "managed projects"
      );
    });

    it("hides original text section when originalText is empty", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ originalText: "" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.queryByTestId("original-text")).toBeNull();
    });
  });

  describe("suggested fix", () => {
    it("displays the suggested text when different from original", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            originalText: "old text",
            suggestedText: "new improved text",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.getByTestId("suggested-text").textContent).toBe(
        "new improved text"
      );
    });

    it("hides suggested text when it matches original", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            originalText: "same text",
            suggestedText: "same text",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.queryByTestId("suggested-text")).toBeNull();
    });

    it("hides suggested text when suggestedText is empty", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            originalText: "text",
            suggestedText: "",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.queryByTestId("suggested-text")).toBeNull();
    });
  });

  describe("Apply Fix button", () => {
    it("shows Apply Fix button when there is a different suggestion", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            originalText: "old",
            suggestedText: "new",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.getByTestId("apply-fix-button")).toBeTruthy();
      expect(screen.getByTestId("apply-fix-button").textContent).toBe(
        "Apply Fix"
      );
    });

    it("hides Apply Fix button when suggestion text matches original", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            originalText: "same",
            suggestedText: "same",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.queryByTestId("apply-fix-button")).toBeNull();
    });

    it("hides Apply Fix button when suggestedText is empty", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            suggestedText: "",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.queryByTestId("apply-fix-button")).toBeNull();
    });

    it("calls onApplyFix with the suggestion when clicked", async () => {
      const user = userEvent.setup();
      const onApplyFix = vi.fn();
      const suggestion = makeSuggestion({
        originalText: "old",
        suggestedText: "new",
      });

      render(
        <SuggestionPopover
          suggestion={suggestion}
          onApplyFix={onApplyFix}
          onDismiss={vi.fn()}
        />
      );

      await user.click(screen.getByTestId("apply-fix-button"));
      expect(onApplyFix).toHaveBeenCalledTimes(1);
      expect(onApplyFix).toHaveBeenCalledWith(suggestion);
    });
  });

  describe("Dismiss button", () => {
    it("always shows the Dismiss button", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion()}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.getByTestId("dismiss-button")).toBeTruthy();
      expect(screen.getByTestId("dismiss-button").textContent).toBe("Dismiss");
    });

    it("shows Dismiss even when there is no fix available", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            suggestedText: "",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(screen.getByTestId("dismiss-button")).toBeTruthy();
      // Apply Fix should not be shown
      expect(screen.queryByTestId("apply-fix-button")).toBeNull();
    });

    it("calls onDismiss with the suggestion when clicked", async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const suggestion = makeSuggestion();

      render(
        <SuggestionPopover
          suggestion={suggestion}
          onApplyFix={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      await user.click(screen.getByTestId("dismiss-button"));
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledWith(suggestion);
    });
  });

  describe("Escape key dismissal", () => {
    it("calls onDismiss when Escape is pressed", () => {
      const onDismiss = vi.fn();
      const suggestion = makeSuggestion();

      render(
        <SuggestionPopover
          suggestion={suggestion}
          onApplyFix={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      fireEvent.keyDown(document, { key: "Escape" });
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledWith(suggestion);
    });

    it("does not call onDismiss for non-Escape keys", () => {
      const onDismiss = vi.fn();

      render(
        <SuggestionPopover
          suggestion={makeSuggestion()}
          onApplyFix={vi.fn()}
          onDismiss={onDismiss}
        />
      );

      fireEvent.keyDown(document, { key: "Enter" });
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe("positioning", () => {
    it("positions relative to the editor mark element", () => {
      const suggestion = makeSuggestion({ id: "s-pos" });
      const editor = createEditorElement("s-pos");

      render(
        <SuggestionPopover
          suggestion={suggestion}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
          editorElement={editor}
        />
      );

      const popover = screen.getByTestId("suggestion-popover");
      // In jsdom, getBoundingClientRect returns zeros, so top will be 8 (0 - 0 + 8)
      expect(popover.style.top).toBe("8px");
    });

    it("does not set position when editorElement is null", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion()}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
          editorElement={null}
        />
      );

      const popover = screen.getByTestId("suggestion-popover");
      expect(popover.style.top).toBe("");
      expect(popover.style.left).toBe("");
    });

    it("does not set position when mark element is not found", () => {
      const editor = document.createElement("div");
      document.body.appendChild(editor);

      render(
        <SuggestionPopover
          suggestion={makeSuggestion({ id: "nonexistent" })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
          editorElement={editor}
        />
      );

      const popover = screen.getByTestId("suggestion-popover");
      expect(popover.style.top).toBe("");
    });
  });

  describe("complete suggestion display", () => {
    it("shows all sections for a full ATS missing keyword suggestion", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            category: "missing_keyword",
            severity: "critical",
            originalText: "managed backend services",
            suggestedText: "led development of scalable backend microservices",
            reasoning: "The JD requires 'led', 'scalable', and 'microservices'.",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      // Category badge
      expect(screen.getByTestId("category-badge").textContent).toBe(
        "ATS: Missing Keyword"
      );
      // Severity badge
      expect(screen.getByTestId("severity-badge").textContent).toBe("Critical");
      // Issue reasoning
      expect(screen.getByTestId("issue-reasoning").textContent).toContain(
        "led"
      );
      // Original text
      expect(screen.getByTestId("original-text").textContent).toBe(
        "managed backend services"
      );
      // Suggested text
      expect(screen.getByTestId("suggested-text").textContent).toBe(
        "led development of scalable backend microservices"
      );
      // Both buttons
      expect(screen.getByTestId("apply-fix-button")).toBeTruthy();
      expect(screen.getByTestId("dismiss-button")).toBeTruthy();
    });

    it("shows all sections for an HR semantic suggestion", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            type: "hr",
            category: "semantic",
            severity: "warning",
            originalText: "did some work on projects",
            suggestedText: "contributed to cross-functional product launches",
            reasoning:
              "Weak semantic alignment with the JD's emphasis on collaboration and leadership.",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId("category-badge").textContent).toBe(
        "HR: Semantic Match"
      );
      expect(screen.getByTestId("severity-badge").textContent).toBe("Warning");
      expect(screen.getByTestId("issue-reasoning").textContent).toContain(
        "semantic alignment"
      );
      expect(screen.getByTestId("suggested-text").textContent).toContain(
        "cross-functional"
      );
    });

    it("shows info-only popover (no fix) for an HR comment", () => {
      render(
        <SuggestionPopover
          suggestion={makeSuggestion({
            type: "hr",
            category: "llm_review",
            severity: "info",
            originalText: "Worked at Company X",
            suggestedText: "Worked at Company X", // same = no fix
            reasoning:
              "The recruiter noted this role is less relevant to the target position.",
          })}
          onApplyFix={vi.fn()}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByTestId("category-badge").textContent).toBe(
        "HR: Recruiter Comment"
      );
      expect(screen.getByTestId("severity-badge").textContent).toBe("Info");
      expect(screen.getByTestId("issue-reasoning").textContent).toContain(
        "recruiter"
      );
      // No suggested text or apply button since original === suggested
      expect(screen.queryByTestId("suggested-text")).toBeNull();
      expect(screen.queryByTestId("apply-fix-button")).toBeNull();
      // Dismiss is always shown
      expect(screen.getByTestId("dismiss-button")).toBeTruthy();
    });
  });
});
