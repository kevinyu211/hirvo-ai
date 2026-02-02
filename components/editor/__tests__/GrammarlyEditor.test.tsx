// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  GrammarlyEditor,
  buildSegments,
  getHighlightClass,
  buildRenderedHTML,
} from "../GrammarlyEditor";
import type { GrammarlyEditorProps } from "../GrammarlyEditor";
import type { Suggestion } from "@/lib/types";
import type { ViewMode } from "../ViewToggle";

afterEach(() => {
  cleanup();
});

// ---- Helper factories ----

function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: "sug-1",
    type: "ats",
    category: "missing_keyword",
    originalText: "Python",
    suggestedText: "Python programming",
    reasoning: "Add Python to match JD",
    textRange: { start: 0, end: 6 },
    severity: "critical",
    ...overrides,
  };
}

function makeDefaultProps(
  overrides: Partial<GrammarlyEditorProps> = {}
): GrammarlyEditorProps {
  return {
    text: "I have experience with JavaScript and React.",
    onTextChange: vi.fn(),
    suggestions: [],
    activeView: "ats" as ViewMode,
    ...overrides,
  };
}

// ---- Unit tests for buildSegments ----

describe("buildSegments", () => {
  it("returns a single plain segment when no suggestions", () => {
    const result = buildSegments("Hello world", []);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello world");
    expect(result[0].isHighlighted).toBe(false);
    expect(result[0].suggestion).toBeNull();
  });

  it("returns a single plain segment for empty text", () => {
    const result = buildSegments("", [makeSuggestion()]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("");
    expect(result[0].isHighlighted).toBe(false);
  });

  it("highlights a single range correctly", () => {
    const text = "I know Python programming";
    const sug = makeSuggestion({
      textRange: { start: 7, end: 13 },
      originalText: "Python",
    });
    const result = buildSegments(text, [sug]);

    expect(result).toHaveLength(3);
    // Before highlight
    expect(result[0].text).toBe("I know ");
    expect(result[0].isHighlighted).toBe(false);
    // Highlight
    expect(result[1].text).toBe("Python");
    expect(result[1].isHighlighted).toBe(true);
    expect(result[1].suggestion?.id).toBe("sug-1");
    // After highlight
    expect(result[2].text).toBe(" programming");
    expect(result[2].isHighlighted).toBe(false);
  });

  it("handles highlight at the beginning of text", () => {
    const text = "Python is great";
    const sug = makeSuggestion({
      textRange: { start: 0, end: 6 },
    });
    const result = buildSegments(text, [sug]);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Python");
    expect(result[0].isHighlighted).toBe(true);
    expect(result[1].text).toBe(" is great");
    expect(result[1].isHighlighted).toBe(false);
  });

  it("handles highlight at the end of text", () => {
    const text = "I know Python";
    const sug = makeSuggestion({
      textRange: { start: 7, end: 13 },
    });
    const result = buildSegments(text, [sug]);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("I know ");
    expect(result[0].isHighlighted).toBe(false);
    expect(result[1].text).toBe("Python");
    expect(result[1].isHighlighted).toBe(true);
  });

  it("handles multiple non-overlapping suggestions", () => {
    const text = "I know Python and JavaScript well";
    const sugs: Suggestion[] = [
      makeSuggestion({
        id: "sug-1",
        textRange: { start: 7, end: 13 },
        originalText: "Python",
      }),
      makeSuggestion({
        id: "sug-2",
        textRange: { start: 18, end: 28 },
        originalText: "JavaScript",
        category: "weak_keyword",
        severity: "warning",
      }),
    ];
    const result = buildSegments(text, sugs);

    expect(result).toHaveLength(5);
    expect(result[0].text).toBe("I know ");
    expect(result[1].text).toBe("Python");
    expect(result[1].isHighlighted).toBe(true);
    expect(result[2].text).toBe(" and ");
    expect(result[3].text).toBe("JavaScript");
    expect(result[3].isHighlighted).toBe(true);
    expect(result[4].text).toBe(" well");
  });

  it("filters out suggestions with out-of-bounds ranges", () => {
    const text = "Short";
    const sug = makeSuggestion({
      textRange: { start: 100, end: 200 },
    });
    const result = buildSegments(text, [sug]);
    expect(result).toHaveLength(1);
    expect(result[0].isHighlighted).toBe(false);
  });

  it("filters out suggestions with negative start", () => {
    const text = "Hello";
    const sug = makeSuggestion({
      textRange: { start: -5, end: 3 },
    });
    const result = buildSegments(text, [sug]);
    expect(result).toHaveLength(1);
    expect(result[0].isHighlighted).toBe(false);
  });

  it("clamps end to text length", () => {
    const text = "Hello";
    const sug = makeSuggestion({
      textRange: { start: 3, end: 100 },
    });
    const result = buildSegments(text, [sug]);

    const highlighted = result.find((s) => s.isHighlighted);
    expect(highlighted).toBeDefined();
    expect(highlighted!.text).toBe("lo"); // chars 3-5 (text length = 5)
  });

  it("handles overlapping suggestions by processing in order", () => {
    const text = "Python JavaScript React";
    const sugs: Suggestion[] = [
      makeSuggestion({
        id: "sug-1",
        textRange: { start: 0, end: 15 },
        severity: "critical",
      }),
      makeSuggestion({
        id: "sug-2",
        textRange: { start: 7, end: 23 },
        severity: "warning",
      }),
    ];
    const result = buildSegments(text, sugs);

    // The first suggestion (0-15) takes priority; the second starts at 15 (after first ends)
    const highlighted = result.filter((s) => s.isHighlighted);
    expect(highlighted).toHaveLength(2);
    expect(highlighted[0].suggestion?.id).toBe("sug-1");
    expect(highlighted[0].text).toBe("Python JavaScri"); // 0-15
    expect(highlighted[1].suggestion?.id).toBe("sug-2");
    expect(highlighted[1].text).toBe("pt React"); // 15-23
  });
});

// ---- Unit tests for getHighlightClass ----

describe("getHighlightClass", () => {
  it("returns red highlight for ATS missing_keyword", () => {
    const sug = makeSuggestion({ category: "missing_keyword" });
    const cls = getHighlightClass(sug, "ats", false);
    expect(cls).toContain("bg-red-200");
    expect(cls).toContain("border-red-500");
  });

  it("returns yellow highlight for ATS weak_keyword", () => {
    const sug = makeSuggestion({ category: "weak_keyword" });
    const cls = getHighlightClass(sug, "ats", false);
    expect(cls).toContain("bg-yellow-200");
    expect(cls).toContain("border-yellow-500");
  });

  it("returns orange highlight for ATS formatting", () => {
    const sug = makeSuggestion({ category: "formatting" });
    const cls = getHighlightClass(sug, "ats", false);
    expect(cls).toContain("bg-orange-200");
    expect(cls).toContain("border-orange-500");
  });

  it("returns blue highlight for HR formatting", () => {
    const sug = makeSuggestion({ type: "hr", category: "formatting" });
    const cls = getHighlightClass(sug, "hr", false);
    expect(cls).toContain("bg-blue-200");
    expect(cls).toContain("border-blue-500");
  });

  it("returns purple highlight for HR semantic", () => {
    const sug = makeSuggestion({ type: "hr", category: "semantic" });
    const cls = getHighlightClass(sug, "hr", false);
    expect(cls).toContain("bg-purple-200");
    expect(cls).toContain("border-purple-500");
  });

  it("returns teal highlight for HR llm_review", () => {
    const sug = makeSuggestion({ type: "hr", category: "llm_review" });
    const cls = getHighlightClass(sug, "hr", false);
    expect(cls).toContain("bg-teal-200");
    expect(cls).toContain("border-teal-500");
  });

  it("adds ring class when selected", () => {
    const sug = makeSuggestion({ category: "missing_keyword" });
    const cls = getHighlightClass(sug, "ats", true);
    expect(cls).toContain("ring-2");
    expect(cls).toContain("ring-blue-500");
  });

  it("does not add ring class when not selected", () => {
    const sug = makeSuggestion({ category: "missing_keyword" });
    const cls = getHighlightClass(sug, "ats", false);
    expect(cls).not.toContain("ring-2");
  });

  it("falls back to formatting color for unknown category", () => {
    const sug = makeSuggestion({ category: "unknown_cat" });
    const cls = getHighlightClass(sug, "ats", false);
    expect(cls).toContain("bg-orange-200");
  });
});

// ---- Unit tests for buildRenderedHTML ----

describe("buildRenderedHTML", () => {
  it("returns escaped plain text for non-highlighted segments", () => {
    const segments = [
      { text: "Hello <world> & \"friends\"", suggestion: null, isHighlighted: false },
    ];
    const html = buildRenderedHTML(segments, "ats", null);
    expect(html).toBe("Hello &lt;world&gt; &amp; &quot;friends&quot;");
  });

  it("wraps highlighted segments in <mark> tags", () => {
    const sug = makeSuggestion({
      id: "test-id",
      category: "missing_keyword",
      severity: "critical",
      reasoning: "Add this keyword",
    });
    const segments = [
      { text: "Python", suggestion: sug, isHighlighted: true },
    ];
    const html = buildRenderedHTML(segments, "ats", null);
    expect(html).toContain("<mark");
    expect(html).toContain("data-suggestion-id=\"test-id\"");
    expect(html).toContain("data-category=\"missing_keyword\"");
    expect(html).toContain("data-severity=\"critical\"");
    expect(html).toContain("Python");
    expect(html).toContain("</mark>");
  });

  it("applies selected styling when suggestion is selected", () => {
    const sug = makeSuggestion({ id: "sel-id" });
    const segments = [
      { text: "Python", suggestion: sug, isHighlighted: true },
    ];
    const html = buildRenderedHTML(segments, "ats", "sel-id");
    expect(html).toContain("ring-2");
    expect(html).toContain("ring-blue-500");
  });

  it("does not apply selected styling when different suggestion is selected", () => {
    const sug = makeSuggestion({ id: "other-id" });
    const segments = [
      { text: "Python", suggestion: sug, isHighlighted: true },
    ];
    const html = buildRenderedHTML(segments, "ats", "different-id");
    expect(html).not.toContain("ring-2");
  });

  it("escapes HTML in suggestion text", () => {
    const sug = makeSuggestion({ id: "xss" });
    const segments = [
      { text: "<script>alert('xss')</script>", suggestion: sug, isHighlighted: true },
    ];
    const html = buildRenderedHTML(segments, "ats", null);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in suggestion attributes", () => {
    const sug = makeSuggestion({
      id: 'id"><script>',
      reasoning: 'test"><img src=x>',
    });
    const segments = [
      { text: "text", suggestion: sug, isHighlighted: true },
    ];
    const html = buildRenderedHTML(segments, "ats", null);
    expect(html).not.toContain('"><script>');
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });
});

// ---- Component rendering tests ----

describe("GrammarlyEditor component", () => {
  it("renders the editor element with correct role and id", () => {
    const { getByTestId } = render(<GrammarlyEditor {...makeDefaultProps()} />);
    const editor = getByTestId("grammarly-editor");
    expect(editor).toBeDefined();
    expect(editor.getAttribute("role")).toBe("tabpanel");
    expect(editor.getAttribute("id")).toBe("editor-ats-panel");
    expect(editor.getAttribute("aria-labelledby")).toBe("tab-ats");
  });

  it("uses HR panel id when activeView is hr", () => {
    const { getByTestId } = render(
      <GrammarlyEditor {...makeDefaultProps({ activeView: "hr" })} />
    );
    const editor = getByTestId("grammarly-editor");
    expect(editor.getAttribute("id")).toBe("editor-hr-panel");
    expect(editor.getAttribute("aria-labelledby")).toBe("tab-hr");
  });

  it("renders with contentEditable when not readOnly", () => {
    const { getByTestId } = render(<GrammarlyEditor {...makeDefaultProps()} />);
    const editor = getByTestId("grammarly-editor");
    expect(editor.getAttribute("contenteditable")).toBe("true");
  });

  it("renders without contentEditable when readOnly", () => {
    const { getByTestId } = render(
      <GrammarlyEditor {...makeDefaultProps({ readOnly: true })} />
    );
    const editor = getByTestId("grammarly-editor");
    expect(editor.getAttribute("contenteditable")).toBe("false");
  });

  it("has the correct aria-label", () => {
    const { getByTestId } = render(<GrammarlyEditor {...makeDefaultProps()} />);
    const editor = getByTestId("grammarly-editor");
    expect(editor.getAttribute("aria-label")).toBe("Resume editor");
  });

  it("renders ATS legend items in ats view", () => {
    const { container } = render(<GrammarlyEditor {...makeDefaultProps()} />);
    const legend = container.querySelector('[aria-label="Highlight legend"]');
    expect(legend).toBeTruthy();
    expect(legend!.textContent).toContain("Missing Keyword");
    expect(legend!.textContent).toContain("Weak Keyword");
    expect(legend!.textContent).toContain("Formatting Issue");
  });

  it("renders HR legend items in hr view", () => {
    const { container } = render(
      <GrammarlyEditor {...makeDefaultProps({ activeView: "hr" })} />
    );
    const legend = container.querySelector('[aria-label="Highlight legend"]');
    expect(legend).toBeTruthy();
    expect(legend!.textContent).toContain("Formatting (Layer 1)");
    expect(legend!.textContent).toContain("Semantic (Layer 2)");
    expect(legend!.textContent).toContain("LLM Review (Layer 3)");
  });

  it("shows a screen-reader status with issue count for ATS view", () => {
    const atsSuggestions: Suggestion[] = [
      makeSuggestion({ id: "s1" }),
      makeSuggestion({ id: "s2", textRange: { start: 10, end: 15 } }),
    ];
    const { container } = render(
      <GrammarlyEditor
        {...makeDefaultProps({
          suggestions: atsSuggestions,
          text: "I have experience with JavaScript and React.",
        })}
      />
    );
    const status = container.querySelector('[role="status"]');
    expect(status).toBeTruthy();
    expect(status!.textContent).toContain("2");
    expect(status!.textContent).toContain("ATS");
    expect(status!.textContent).toContain("issues");
  });

  it("shows singular 'issue' for single suggestion", () => {
    const { container } = render(
      <GrammarlyEditor
        {...makeDefaultProps({
          suggestions: [makeSuggestion()],
          text: "Python is great",
        })}
      />
    );
    const status = container.querySelector('[role="status"]');
    expect(status!.textContent).toContain("1");
    expect(status!.textContent).toContain("issue");
    expect(status!.textContent).not.toContain("issues");
  });

  it("filters suggestions by active view - shows only ATS suggestions in ATS view", () => {
    const suggestions: Suggestion[] = [
      makeSuggestion({ id: "ats-1", type: "ats" }),
      makeSuggestion({ id: "hr-1", type: "hr", textRange: { start: 10, end: 15 } }),
    ];
    const { container } = render(
      <GrammarlyEditor
        {...makeDefaultProps({
          suggestions,
          text: "I have experience with JavaScript and React.",
        })}
      />
    );
    const status = container.querySelector('[role="status"]');
    // Should only count ATS suggestions (1, not 2)
    expect(status!.textContent).toContain("1");
    expect(status!.textContent).toContain("ATS");
  });

  it("filters suggestions by active view - shows only HR suggestions in HR view", () => {
    const suggestions: Suggestion[] = [
      makeSuggestion({ id: "ats-1", type: "ats" }),
      makeSuggestion({
        id: "hr-1",
        type: "hr",
        category: "semantic",
        textRange: { start: 10, end: 15 },
      }),
      makeSuggestion({
        id: "hr-2",
        type: "hr",
        category: "llm_review",
        textRange: { start: 20, end: 25 },
      }),
    ];
    const { container } = render(
      <GrammarlyEditor
        {...makeDefaultProps({
          suggestions,
          activeView: "hr",
          text: "I have experience with JavaScript and React.",
        })}
      />
    );
    const status = container.querySelector('[role="status"]');
    expect(status!.textContent).toContain("2");
    expect(status!.textContent).toContain("HR");
  });

  it("applies readOnly styling when readOnly is true", () => {
    const { getByTestId } = render(
      <GrammarlyEditor {...makeDefaultProps({ readOnly: true })} />
    );
    const editor = getByTestId("grammarly-editor");
    expect(editor.className).toContain("bg-muted/30");
  });

  it("applies editable styling when readOnly is false", () => {
    const { getByTestId } = render(
      <GrammarlyEditor {...makeDefaultProps({ readOnly: false })} />
    );
    const editor = getByTestId("grammarly-editor");
    expect(editor.className).toContain("bg-background");
  });

  it("calls onSuggestionClick when a highlight mark is clicked", async () => {
    const onSuggestionClick = vi.fn();
    const user = userEvent.setup();
    const sug = makeSuggestion({
      id: "click-test",
      textRange: { start: 0, end: 6 },
    });

    const { getByTestId } = render(
      <GrammarlyEditor
        {...makeDefaultProps({
          text: "Python is a language",
          suggestions: [sug],
          onSuggestionClick,
        })}
      />
    );

    // The editor should have rendered mark elements
    const editor = getByTestId("grammarly-editor");
    const mark = editor.querySelector('[data-suggestion-id="click-test"]');
    expect(mark).toBeTruthy();

    await user.click(mark!);
    expect(onSuggestionClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "click-test" })
    );
  });

  it("has spellCheck disabled", () => {
    const { getByTestId } = render(<GrammarlyEditor {...makeDefaultProps()} />);
    const editor = getByTestId("grammarly-editor");
    expect(editor.getAttribute("spellcheck")).toBe("false");
  });

  it("renders resume text content", () => {
    const { getByTestId } = render(
      <GrammarlyEditor
        {...makeDefaultProps({ text: "My resume content here" })}
      />
    );
    const editor = getByTestId("grammarly-editor");
    expect(editor.textContent).toContain("My resume content here");
  });

  it("renders highlight marks for suggestions with valid text ranges", () => {
    const suggestions: Suggestion[] = [
      makeSuggestion({
        id: "mark-1",
        textRange: { start: 0, end: 5 },
      }),
    ];
    const { getByTestId } = render(
      <GrammarlyEditor
        {...makeDefaultProps({
          text: "Hello world",
          suggestions,
        })}
      />
    );
    const editor = getByTestId("grammarly-editor");
    const mark = editor.querySelector("[data-suggestion-id]");
    expect(mark).toBeTruthy();
    expect(mark!.tagName).toBe("MARK");
  });

  it("renders multiple highlights correctly", () => {
    const suggestions: Suggestion[] = [
      makeSuggestion({
        id: "m1",
        textRange: { start: 0, end: 5 },
      }),
      makeSuggestion({
        id: "m2",
        textRange: { start: 6, end: 11 },
        category: "weak_keyword",
        severity: "warning",
      }),
    ];
    const { getByTestId } = render(
      <GrammarlyEditor
        {...makeDefaultProps({
          text: "Hello World!",
          suggestions,
        })}
      />
    );
    const editor = getByTestId("grammarly-editor");
    const marks = editor.querySelectorAll("[data-suggestion-id]");
    expect(marks.length).toBe(2);
    expect(marks[0].getAttribute("data-suggestion-id")).toBe("m1");
    expect(marks[1].getAttribute("data-suggestion-id")).toBe("m2");
  });
});
