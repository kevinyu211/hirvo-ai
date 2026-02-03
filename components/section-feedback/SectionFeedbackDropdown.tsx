"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SectionFeedbackItem } from "@/lib/types";
import { FeedbackBulletPoint } from "./FeedbackBulletPoint";

export interface SectionFeedbackDropdownProps {
  sectionName: string;
  atsScore: number;
  hrScore: number;
  atsFeedback: SectionFeedbackItem[];
  hrFeedback: SectionFeedbackItem[];
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

function MiniProgressBar({ score, label }: { score: number; label: string }) {
  const getColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground w-8">
        {label}
      </span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-foreground w-6">{score}</span>
    </div>
  );
}

export function SectionFeedbackDropdown({
  sectionName,
  atsScore,
  hrScore,
  atsFeedback,
  hrFeedback,
  isExpanded: controlledExpanded,
  onToggle,
  className,
}: SectionFeedbackDropdownProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isExpanded = controlledExpanded ?? internalExpanded;
  const handleToggle = onToggle ?? (() => setInternalExpanded(!internalExpanded));

  const totalIssues = atsFeedback.length + hrFeedback.length;
  const hasCritical = [...atsFeedback, ...hrFeedback].some(
    (f) => f.severity === "critical"
  );

  if (totalIssues === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-lg border", className)}>
      {/* Dropdown Header */}
      <button
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
          "hover:bg-muted/50 rounded-lg",
          isExpanded && "border-b rounded-b-none"
        )}
        onClick={handleToggle}
      >
        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>

        {/* Section Name with Issue Count */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">
            Section Feedback
          </span>
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              hasCritical
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                : "bg-muted text-muted-foreground"
            )}
          >
            {totalIssues} {totalIssues === 1 ? "issue" : "issues"}
          </span>
        </div>

        {/* Mini Score Bars */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <MiniProgressBar score={atsScore} label="ATS" />
          <MiniProgressBar score={hrScore} label="HR" />
        </div>
      </button>

      {/* Dropdown Content */}
      {isExpanded && (
        <div className="p-3 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ATS Issues Column */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] font-bold">
                  ATS
                </span>
                Issues ({atsFeedback.length})
              </h4>
              {atsFeedback.length > 0 ? (
                <div className="space-y-1">
                  {atsFeedback.map((item) => (
                    <FeedbackBulletPoint key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-2">
                  No ATS issues detected
                </p>
              )}
            </div>

            {/* HR Issues Column */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] font-bold">
                  HR
                </span>
                Issues ({hrFeedback.length})
              </h4>
              {hrFeedback.length > 0 ? (
                <div className="space-y-1">
                  {hrFeedback.map((item) => (
                    <FeedbackBulletPoint key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-2">
                  No HR concerns detected
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline version for experience entries (more compact)
 */
export function ExperienceFeedbackDropdown({
  roleTitle,
  company,
  atsScore,
  hrScore,
  atsFeedback,
  hrFeedback,
  isExpanded,
  onToggle,
}: {
  roleTitle: string;
  company: string;
  atsScore: number;
  hrScore: number;
  atsFeedback: SectionFeedbackItem[];
  hrFeedback: SectionFeedbackItem[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const totalIssues = atsFeedback.length + hrFeedback.length;

  if (totalIssues === 0) {
    return null;
  }

  return (
    <SectionFeedbackDropdown
      sectionName={`${roleTitle} @ ${company}`}
      atsScore={atsScore}
      hrScore={hrScore}
      atsFeedback={atsFeedback}
      hrFeedback={hrFeedback}
      isExpanded={isExpanded}
      onToggle={onToggle}
      className="mt-2 border-dashed"
    />
  );
}
