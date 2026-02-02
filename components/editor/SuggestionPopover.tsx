"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Suggestion } from "@/lib/types";

export interface SuggestionPopoverProps {
  /** The currently selected suggestion to display */
  suggestion: Suggestion | null;
  /** Called when the user clicks "Apply Fix" */
  onApplyFix: (suggestion: Suggestion) => void;
  /** Called when the user clicks "Dismiss" (ignore this suggestion) */
  onDismiss: (suggestion: Suggestion) => void;
  /** The editor container element to anchor the popover to */
  editorElement?: HTMLElement | null;
}

// Category display labels
const CATEGORY_LABELS: Record<string, string> = {
  missing_keyword: "ATS: Missing Keyword",
  weak_keyword: "ATS: Weak Keyword",
  formatting: "Formatting Issue",
  semantic: "HR: Semantic Match",
  llm_review: "HR: Recruiter Comment",
  section: "ATS: Section Issue",
};

// Category color classes for the badge
const CATEGORY_COLORS: Record<string, string> = {
  missing_keyword: "bg-red-100 text-red-800 border-red-200",
  weak_keyword: "bg-yellow-100 text-yellow-800 border-yellow-200",
  formatting: "bg-orange-100 text-orange-800 border-orange-200",
  semantic: "bg-purple-100 text-purple-800 border-purple-200",
  llm_review: "bg-teal-100 text-teal-800 border-teal-200",
  section: "bg-red-100 text-red-800 border-red-200",
};

// Severity display labels
const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

// Severity badge variants
const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-600 text-white border-transparent",
  warning: "bg-yellow-500 text-white border-transparent",
  info: "bg-blue-500 text-white border-transparent",
};

export function SuggestionPopover({
  suggestion,
  onApplyFix,
  onDismiss,
  editorElement,
}: SuggestionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate popover position based on the mark element in the editor
  useEffect(() => {
    if (!suggestion || !editorElement) {
      setPosition(null);
      return;
    }

    const markElement = editorElement.querySelector(
      `[data-suggestion-id="${suggestion.id}"]`
    ) as HTMLElement | null;

    if (!markElement) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const markRect = markElement.getBoundingClientRect();
      const editorRect = editorElement.getBoundingClientRect();

      // Position below the mark element, relative to the editor container's parent
      const top = markRect.bottom - editorRect.top + 8; // 8px gap below highlight
      let left = markRect.left - editorRect.left;

      // Ensure the popover doesn't overflow the right edge of the editor
      const popoverWidth = 320;
      const editorWidth = editorRect.width;
      if (left + popoverWidth > editorWidth) {
        left = Math.max(0, editorWidth - popoverWidth);
      }

      setPosition({ top, left });
    };

    updatePosition();

    // Recalculate on scroll or resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [suggestion, editorElement]);

  // Close on Escape key
  useEffect(() => {
    if (!suggestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss(suggestion);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [suggestion, onDismiss]);

  const handleApplyFix = useCallback(() => {
    if (suggestion) {
      onApplyFix(suggestion);
    }
  }, [suggestion, onApplyFix]);

  const handleDismiss = useCallback(() => {
    if (suggestion) {
      onDismiss(suggestion);
    }
  }, [suggestion, onDismiss]);

  if (!suggestion) return null;

  const categoryLabel =
    CATEGORY_LABELS[suggestion.category] ?? suggestion.category;
  const categoryColor =
    CATEGORY_COLORS[suggestion.category] ?? "bg-gray-100 text-gray-800 border-gray-200";
  const severityLabel =
    SEVERITY_LABELS[suggestion.severity] ?? suggestion.severity;
  const severityColor =
    SEVERITY_COLORS[suggestion.severity] ?? "bg-gray-500 text-white border-transparent";
  const hasFix =
    suggestion.suggestedText &&
    suggestion.suggestedText !== suggestion.originalText;

  // Mobile: bottom sheet layout
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={handleDismiss}
          aria-hidden="true"
          data-testid="suggestion-popover-overlay"
        />
        {/* Bottom sheet */}
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Suggestion details"
          data-testid="suggestion-popover"
          className="fixed bottom-0 left-0 right-0 z-50 rounded-t-xl border-t bg-popover text-popover-foreground shadow-lg max-h-[80vh] overflow-y-auto"
        >
          {/* Drag handle indicator */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header: Category + Severity badges */}
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Badge
              className={`text-xs ${categoryColor}`}
              data-testid="category-badge"
            >
              {categoryLabel}
            </Badge>
            <Badge
              className={`text-xs ${severityColor}`}
              data-testid="severity-badge"
            >
              {severityLabel}
            </Badge>
          </div>

          {/* Body */}
          <div className="space-y-3 px-4 py-3">
            {/* What's wrong */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Issue
              </p>
              <p className="text-sm" data-testid="issue-reasoning">
                {suggestion.reasoning}
              </p>
            </div>

            {/* Original text */}
            {suggestion.originalText && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Current Text
                </p>
                <p
                  className="text-sm rounded bg-muted/50 px-2 py-1 font-mono break-words"
                  data-testid="original-text"
                >
                  {suggestion.originalText}
                </p>
              </div>
            )}

            {/* Suggested fix */}
            {hasFix && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Suggested Fix
                </p>
                <p
                  className="text-sm rounded bg-green-50 px-2 py-1 font-mono text-green-900 border border-green-200 break-words"
                  data-testid="suggested-text"
                >
                  {suggestion.suggestedText}
                </p>
              </div>
            )}
          </div>

          {/* Footer: Action buttons - larger touch targets on mobile */}
          <div className="flex items-center justify-end gap-2 border-t px-4 py-4 pb-safe">
            <Button
              variant="ghost"
              size="lg"
              onClick={handleDismiss}
              data-testid="dismiss-button"
              className="flex-1"
            >
              Dismiss
            </Button>
            {hasFix && (
              <Button
                size="lg"
                onClick={handleApplyFix}
                data-testid="apply-fix-button"
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
              >
                Apply Fix
              </Button>
            )}
          </div>
        </div>
      </>
    );
  }

  // Desktop: absolute positioned popover
  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Suggestion details"
      data-testid="suggestion-popover"
      className="absolute z-50 w-80 rounded-lg border bg-popover text-popover-foreground shadow-lg"
      style={
        position
          ? { top: `${position.top}px`, left: `${position.left}px` }
          : undefined
      }
    >
      {/* Header: Category + Severity badges */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Badge
          className={`text-xs ${categoryColor}`}
          data-testid="category-badge"
        >
          {categoryLabel}
        </Badge>
        <Badge
          className={`text-xs ${severityColor}`}
          data-testid="severity-badge"
        >
          {severityLabel}
        </Badge>
      </div>

      {/* Body */}
      <div className="space-y-3 px-4 py-3">
        {/* What's wrong */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Issue
          </p>
          <p className="text-sm" data-testid="issue-reasoning">
            {suggestion.reasoning}
          </p>
        </div>

        {/* Original text */}
        {suggestion.originalText && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Current Text
            </p>
            <p
              className="text-sm rounded bg-muted/50 px-2 py-1 font-mono"
              data-testid="original-text"
            >
              {suggestion.originalText}
            </p>
          </div>
        )}

        {/* Suggested fix */}
        {hasFix && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Suggested Fix
            </p>
            <p
              className="text-sm rounded bg-green-50 px-2 py-1 font-mono text-green-900 border border-green-200"
              data-testid="suggested-text"
            >
              {suggestion.suggestedText}
            </p>
          </div>
        )}
      </div>

      {/* Footer: Action buttons */}
      <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          data-testid="dismiss-button"
        >
          Dismiss
        </Button>
        {hasFix && (
          <Button
            size="sm"
            onClick={handleApplyFix}
            data-testid="apply-fix-button"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Apply Fix
          </Button>
        )}
      </div>
    </div>
  );
}
