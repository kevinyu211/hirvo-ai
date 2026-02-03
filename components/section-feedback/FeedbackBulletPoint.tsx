"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SectionFeedbackItem, FeedbackCategory } from "@/lib/types";
import { getSeverityColor, getCategoryShape } from "@/lib/feedback-explanations";

export interface FeedbackBulletPointProps {
  item: SectionFeedbackItem;
  className?: string;
}

/**
 * Renders the shape icon based on category
 */
function CategoryShape({
  category,
  severity,
}: {
  category: FeedbackCategory;
  severity: SectionFeedbackItem["severity"];
}) {
  const shape = getCategoryShape(category);
  const colors = getSeverityColor(severity);

  const baseClasses = cn(colors.icon, "flex-shrink-0");

  switch (shape) {
    case "circle":
      return <div className={cn(baseClasses, "w-2.5 h-2.5 rounded-full bg-current")} />;
    case "square":
      return <div className={cn(baseClasses, "w-2.5 h-2.5 rounded-sm bg-current")} />;
    case "diamond":
      return <div className={cn(baseClasses, "w-2 h-2 bg-current rotate-45")} />;
    case "triangle":
      return (
        <div
          className={cn(
            "w-0 h-0 flex-shrink-0",
            "border-l-[4px] border-l-transparent",
            "border-r-[4px] border-r-transparent",
            "border-b-[7px]",
            severity === "critical"
              ? "border-b-red-500"
              : severity === "warning"
                ? "border-b-amber-500"
                : severity === "success"
                  ? "border-b-emerald-500"
                  : "border-b-blue-500"
          )}
        />
      );
  }
}

export function FeedbackBulletPoint({
  item,
  className,
}: FeedbackBulletPointProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = getSeverityColor(item.severity);

  return (
    <div className={cn("group", className)}>
      <button
        className={cn(
          "w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors",
          "hover:bg-muted/50",
          isExpanded && colors.bg
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Shape icon */}
        <div className="mt-1">
          <CategoryShape category={item.category} severity={item.severity} />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm", colors.text)}>{item.message}</p>
        </div>

        {/* Source badge */}
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
            item.source === "ats"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
          )}
        >
          {item.source.toUpperCase()}
        </span>

        {/* Expand indicator */}
        <div className="flex-shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded explanation */}
      {isExpanded && (
        <div
          className={cn(
            "ml-5 mr-2 mt-1 p-3 rounded-lg border animate-in slide-in-from-top-2 duration-200",
            colors.bg,
            colors.border
          )}
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            {item.detailedExplanation}
          </p>

          {item.suggestion && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <p className="text-xs font-medium text-foreground">Suggestion:</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.suggestion}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for mobile or sidebar
 */
export function FeedbackBulletPointCompact({
  item,
  onClick,
}: {
  item: SectionFeedbackItem;
  onClick?: () => void;
}) {
  const colors = getSeverityColor(item.severity);

  return (
    <button
      className={cn(
        "w-full flex items-center gap-2 p-2 rounded text-left transition-colors",
        "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <CategoryShape category={item.category} severity={item.severity} />
      <p className={cn("text-xs truncate flex-1", colors.text)}>{item.message}</p>
    </button>
  );
}
