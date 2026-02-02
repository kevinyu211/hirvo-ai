"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ViewMode } from "./ViewToggle";
import type { Suggestion } from "@/lib/types";

// Highlight color classes based on suggestion type and category
const ATS_HIGHLIGHT_COLORS: Record<string, string> = {
  missing_keyword:
    "bg-red-200/70 border-b-2 border-red-500 hover:bg-red-300/70 cursor-pointer",
  weak_keyword:
    "bg-yellow-200/70 border-b-2 border-yellow-500 hover:bg-yellow-300/70 cursor-pointer",
  formatting:
    "bg-orange-200/70 border-b-2 border-orange-500 hover:bg-orange-300/70 cursor-pointer",
};

const HR_HIGHLIGHT_COLORS: Record<string, string> = {
  formatting:
    "bg-blue-200/70 border-b-2 border-blue-500 hover:bg-blue-300/70 cursor-pointer",
  semantic:
    "bg-purple-200/70 border-b-2 border-purple-500 hover:bg-purple-300/70 cursor-pointer",
  llm_review:
    "bg-teal-200/70 border-b-2 border-teal-500 hover:bg-teal-300/70 cursor-pointer",
};

// Selected highlight extra styling
const SELECTED_EXTRA = "ring-2 ring-offset-1 ring-blue-500";

export interface GrammarlyEditorProps {
  /** The resume text content */
  text: string;
  /** Called when the user edits the text */
  onTextChange: (text: string) => void;
  /** Suggestions to render as highlights */
  suggestions: Suggestion[];
  /** Current view mode (ats or hr) */
  activeView: ViewMode;
  /** Called when a suggestion highlight is clicked */
  onSuggestionClick?: (suggestion: Suggestion) => void;
  /** The currently selected suggestion ID */
  selectedSuggestionId?: string | null;
  /** Whether editing is disabled */
  readOnly?: boolean;
}

interface HighlightSegment {
  text: string;
  suggestion: Suggestion | null;
  isHighlighted: boolean;
}

/**
 * Builds non-overlapping highlight segments from text and suggestions.
 * When suggestions overlap, the one with higher severity wins.
 */
function buildSegments(
  text: string,
  suggestions: Suggestion[]
): HighlightSegment[] {
  if (suggestions.length === 0 || text.length === 0) {
    return [{ text, suggestion: null, isHighlighted: false }];
  }

  // Filter suggestions with valid text ranges within bounds
  const validSuggestions = suggestions.filter(
    (s) =>
      s.textRange &&
      s.textRange.start >= 0 &&
      s.textRange.end > s.textRange.start &&
      s.textRange.start < text.length
  );

  if (validSuggestions.length === 0) {
    return [{ text, suggestion: null, isHighlighted: false }];
  }

  // Sort by start position, then by severity (critical first for overlap resolution)
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  const sorted = [...validSuggestions].sort((a, b) => {
    const startDiff = a.textRange.start - b.textRange.start;
    if (startDiff !== 0) return startDiff;
    return (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
  });

  const segments: HighlightSegment[] = [];
  let currentPos = 0;

  for (const suggestion of sorted) {
    const start = Math.max(suggestion.textRange.start, currentPos);
    const end = Math.min(suggestion.textRange.end, text.length);

    if (start >= end) continue;

    // Add plain text before this highlight
    if (start > currentPos) {
      segments.push({
        text: text.slice(currentPos, start),
        suggestion: null,
        isHighlighted: false,
      });
    }

    // Add highlighted segment
    segments.push({
      text: text.slice(start, end),
      suggestion,
      isHighlighted: true,
    });

    currentPos = end;
  }

  // Add remaining text after last highlight
  if (currentPos < text.length) {
    segments.push({
      text: text.slice(currentPos),
      suggestion: null,
      isHighlighted: false,
    });
  }

  return segments;
}

/**
 * Returns the appropriate CSS class for a suggestion highlight.
 */
function getHighlightClass(
  suggestion: Suggestion,
  activeView: ViewMode,
  isSelected: boolean
): string {
  const colorMap = activeView === "ats" ? ATS_HIGHLIGHT_COLORS : HR_HIGHLIGHT_COLORS;
  const baseClass = colorMap[suggestion.category] ?? colorMap["formatting"] ?? "";
  return isSelected ? `${baseClass} ${SELECTED_EXTRA}` : baseClass;
}

export function GrammarlyEditor({
  text,
  onTextChange,
  suggestions,
  activeView,
  onSuggestionClick,
  selectedSuggestionId,
  readOnly = false,
}: GrammarlyEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Filter suggestions for the active view
  const filteredSuggestions = useMemo(
    () => suggestions.filter((s) => s.type === activeView),
    [suggestions, activeView]
  );

  // Build highlight segments
  const segments = useMemo(
    () => buildSegments(text, filteredSuggestions),
    [text, filteredSuggestions]
  );

  // Handle text changes from contentEditable
  const handleInput = useCallback(() => {
    if (readOnly || !editorRef.current) return;
    const newText = editorRef.current.innerText;
    // Only fire onTextChange if text actually changed
    if (newText !== text) {
      onTextChange(newText);
    }
  }, [onTextChange, text, readOnly]);

  // Handle suggestion click
  const handleHighlightClick = useCallback(
    (suggestion: Suggestion, e: React.MouseEvent) => {
      e.stopPropagation();
      if (onSuggestionClick) {
        onSuggestionClick(suggestion);
      }
    },
    [onSuggestionClick]
  );

  // Sync contentEditable innerHTML when segments change but editor is not focused
  // This prevents cursor jump during user editing
  useEffect(() => {
    if (!editorRef.current || isFocused) return;
    // Only update DOM when not focused to avoid cursor jump
    const renderedHTML = buildRenderedHTML(segments, activeView, selectedSuggestionId ?? null);
    if (editorRef.current.innerHTML !== renderedHTML) {
      editorRef.current.innerHTML = renderedHTML;
    }
  }, [segments, activeView, selectedSuggestionId, isFocused]);

  // Focus/blur handlers
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Update text from DOM on blur
    if (editorRef.current) {
      const newText = editorRef.current.innerText;
      if (newText !== text) {
        onTextChange(newText);
      }
    }
  }, [text, onTextChange]);

  // Handle click events on highlight marks via event delegation
  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const mark = target.closest("[data-suggestion-id]") as HTMLElement | null;
      if (mark && onSuggestionClick) {
        const suggestionId = mark.getAttribute("data-suggestion-id");
        const found = filteredSuggestions.find((s) => s.id === suggestionId);
        if (found) {
          handleHighlightClick(found, e);
        }
      }
    },
    [filteredSuggestions, onSuggestionClick, handleHighlightClick]
  );

  // Handle keyboard shortcut for dismissing (Escape)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && selectedSuggestionId && onSuggestionClick) {
        // Deselect by calling with a null-like (parent handles this)
        onSuggestionClick(null as unknown as Suggestion);
      }
    },
    [selectedSuggestionId, onSuggestionClick]
  );

  const panelId =
    activeView === "ats" ? "editor-ats-panel" : "editor-hr-panel";
  const labelledBy = activeView === "ats" ? "tab-ats" : "tab-hr";

  return (
    <div className="relative">
      {/* Invisible status for screen readers */}
      <div className="sr-only" aria-live="polite" role="status">
        {filteredSuggestions.length} {activeView === "ats" ? "ATS" : "HR"}{" "}
        {filteredSuggestions.length === 1 ? "issue" : "issues"} highlighted
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={labelledBy}
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleEditorClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`min-h-[300px] md:min-h-[400px] w-full rounded-lg border p-3 md:p-4 font-mono text-xs md:text-sm leading-relaxed whitespace-pre-wrap focus:outline-none ${
          readOnly
            ? "bg-muted/30 cursor-default"
            : "bg-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
        }`}
        aria-label="Resume editor"
        data-testid="grammarly-editor"
        spellCheck={false}
      />

      {/* Legend */}
      <div
        className="mt-2 flex flex-wrap gap-2 md:gap-3 text-[10px] md:text-xs text-muted-foreground"
        aria-label="Highlight legend"
      >
        {activeView === "ats" ? (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-300 border border-red-500" />
              Missing Keyword
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-yellow-300 border border-yellow-500" />
              Weak Keyword
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-orange-300 border border-orange-500" />
              Formatting Issue
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-blue-300 border border-blue-500" />
              Formatting (Layer 1)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-purple-300 border border-purple-500" />
              Semantic (Layer 2)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-teal-300 border border-teal-500" />
              LLM Review (Layer 3)
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Build the innerHTML for the editor from segments.
 * Each highlighted segment becomes a <mark> element with data attributes.
 */
function buildRenderedHTML(
  segments: HighlightSegment[],
  activeView: ViewMode,
  selectedSuggestionId: string | null
): string {
  return segments
    .map((seg) => {
      if (!seg.isHighlighted || !seg.suggestion) {
        return escapeHTML(seg.text);
      }

      const isSelected = seg.suggestion.id === selectedSuggestionId;
      const highlightClass = getHighlightClass(
        seg.suggestion,
        activeView,
        isSelected
      );

      return `<mark class="rounded px-0.5 transition-colors ${highlightClass}" data-suggestion-id="${escapeAttr(seg.suggestion.id)}" data-category="${escapeAttr(seg.suggestion.category)}" data-severity="${escapeAttr(seg.suggestion.severity)}" title="${escapeAttr(seg.suggestion.reasoning)}">${escapeHTML(seg.text)}</mark>`;
    })
    .join("");
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Export internal functions for testing
export { buildSegments, getHighlightClass, buildRenderedHTML };
