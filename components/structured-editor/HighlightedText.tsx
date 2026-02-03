"use client";

import { useMemo, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { ATSIssue, HRFeedback, GrammarlyFix } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle, AlertTriangle, Info } from "lucide-react";

export interface TextHighlight {
  /** Start index of highlighted text */
  start: number;
  /** End index of highlighted text */
  end: number;
  /** Severity determines the color */
  severity: "critical" | "warning" | "info";
  /** The issue or feedback associated with this highlight */
  issue: ATSIssue | HRFeedback;
  /** Suggested fix text */
  suggestion?: string;
  /** Source of the issue */
  source: "ats" | "hr";
}

export interface HighlightedTextProps {
  /** The full text to display */
  text: string;
  /** Array of highlights to apply */
  highlights: TextHighlight[];
  /** Called when user clicks on a highlight */
  onHighlightClick?: (highlight: TextHighlight) => void;
  /** Called when user accepts a fix suggestion */
  onAcceptFix?: (fix: GrammarlyFix) => void;
  /** Additional class name */
  className?: string;
}

/**
 * Renders text with highlighted spans for problematic content.
 * Clicking a highlight shows a popover with the issue and fix suggestion.
 */
export function HighlightedText({
  text,
  highlights,
  onHighlightClick,
  onAcceptFix,
  className,
}: HighlightedTextProps) {
  const [activePopover, setActivePopover] = useState<number | null>(null);

  // Sort highlights by start position
  const sortedHighlights = useMemo(() => {
    return [...highlights].sort((a, b) => a.start - b.start);
  }, [highlights]);

  // Build segments of text with/without highlights
  const segments = useMemo(() => {
    const result: Array<{
      text: string;
      highlight?: TextHighlight;
      index: number;
    }> = [];

    let currentIndex = 0;

    sortedHighlights.forEach((highlight, idx) => {
      // Ensure we don't go past the text bounds
      const start = Math.max(0, Math.min(highlight.start, text.length));
      const end = Math.max(start, Math.min(highlight.end, text.length));

      // Add non-highlighted text before this highlight
      if (start > currentIndex) {
        result.push({
          text: text.slice(currentIndex, start),
          index: result.length,
        });
      }

      // Add highlighted text
      if (end > start) {
        result.push({
          text: text.slice(start, end),
          highlight,
          index: idx,
        });
      }

      currentIndex = end;
    });

    // Add remaining non-highlighted text
    if (currentIndex < text.length) {
      result.push({
        text: text.slice(currentIndex),
        index: result.length,
      });
    }

    return result;
  }, [text, sortedHighlights]);

  const getSeverityStyles = (severity: "critical" | "warning" | "info") => {
    switch (severity) {
      case "critical":
        return "bg-red-100 dark:bg-red-900/30 border-b-2 border-red-400 dark:border-red-500 text-red-900 dark:text-red-100";
      case "warning":
        return "bg-amber-100 dark:bg-amber-900/30 border-b-2 border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-100";
      case "info":
        return "bg-blue-100 dark:bg-blue-900/30 border-b-2 border-blue-400 dark:border-blue-500 text-blue-900 dark:text-blue-100";
    }
  };

  const getSeverityIcon = (severity: "critical" | "warning" | "info") => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleAcceptFix = useCallback(
    (highlight: TextHighlight) => {
      if (!highlight.suggestion || !onAcceptFix) return;

      const fix: GrammarlyFix = {
        id: `fix-${Date.now()}`,
        originalText: text.slice(highlight.start, highlight.end),
        suggestedText: highlight.suggestion,
        textRange: { start: highlight.start, end: highlight.end },
        source: highlight.source,
        category: highlight.issue.type,
      };

      onAcceptFix(fix);
      setActivePopover(null);
    },
    [text, onAcceptFix]
  );

  if (highlights.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, i) => {
        if (!segment.highlight) {
          return <span key={i}>{segment.text}</span>;
        }

        const { highlight } = segment;

        return (
          <Popover
            key={i}
            open={activePopover === segment.index}
            onOpenChange={(open) => setActivePopover(open ? segment.index : null)}
          >
            <PopoverTrigger asChild>
              <span
                className={cn(
                  "cursor-pointer rounded-sm px-0.5 transition-colors",
                  getSeverityStyles(highlight.severity),
                  "hover:opacity-80"
                )}
                onClick={() => {
                  setActivePopover(segment.index);
                  onHighlightClick?.(highlight);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setActivePopover(segment.index);
                    onHighlightClick?.(highlight);
                  }
                }}
              >
                {segment.text}
              </span>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0"
              align="start"
              side="bottom"
            >
              {/* Header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                {getSeverityIcon(highlight.severity)}
                <span className="text-sm font-medium">
                  {highlight.source === "ats" ? "ATS Issue" : "HR Feedback"}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded ml-auto",
                    highlight.severity === "critical" &&
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                    highlight.severity === "warning" &&
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                    highlight.severity === "info" &&
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  )}
                >
                  {highlight.severity}
                </span>
              </div>

              {/* Content */}
              <div className="p-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {highlight.issue.message}
                </p>

                {/* Suggestion */}
                {highlight.suggestion && (
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                      Suggested Fix:
                    </p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      {highlight.suggestion}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {highlight.suggestion && onAcceptFix && (
                <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/30">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleAcceptFix(highlight)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActivePopover(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
    </span>
  );
}

/**
 * Creates highlights from ATS issues and HR feedback
 */
export function createHighlightsFromFeedback(
  text: string,
  atsIssues: ATSIssue[],
  hrFeedback: HRFeedback[]
): TextHighlight[] {
  const highlights: TextHighlight[] = [];

  // Process ATS issues
  atsIssues.forEach((issue) => {
    if (issue.textRange && issue.textRange.start !== issue.textRange.end) {
      highlights.push({
        start: issue.textRange.start,
        end: issue.textRange.end,
        severity: issue.severity,
        issue,
        suggestion: issue.suggestion,
        source: "ats",
      });
    }
  });

  // Process HR feedback
  hrFeedback.forEach((feedback) => {
    if (feedback.textRange && feedback.textRange.start !== feedback.textRange.end) {
      highlights.push({
        start: feedback.textRange.start,
        end: feedback.textRange.end,
        severity: feedback.severity,
        issue: feedback,
        suggestion: feedback.suggestion,
        source: "hr",
      });
    }
  });

  return highlights;
}
