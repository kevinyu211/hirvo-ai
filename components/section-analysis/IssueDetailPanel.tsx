"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Info, AlertCircle, Lightbulb } from "lucide-react";
import type { ATSIssue, HRFeedback, GrammarlyFix } from "@/lib/types";
import { GrammarlyFixCard } from "./GrammarlyFixCard";

export interface IssueDetailPanelProps {
  issue: ATSIssue | HRFeedback;
  source: "ats" | "hr";
  whyItMatters: string;
  grammarlyFix?: GrammarlyFix | null;
  /** Called with the full fix data when Accept is clicked */
  onAccept?: (fix: GrammarlyFix) => void;
  onDismiss?: () => void;
  onClose: () => void;
  className?: string;
}

/**
 * Slide-out panel showing detailed explanation when user clicks an issue
 */
export function IssueDetailPanel({
  issue,
  source,
  whyItMatters,
  grammarlyFix,
  onAccept,
  onDismiss,
  onClose,
  className,
}: IssueDetailPanelProps) {
  const getSeverityIcon = () => {
    switch (issue.severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityLabel = () => {
    switch (issue.severity) {
      case "critical":
        return "Critical Issue";
      case "warning":
        return "Warning";
      case "info":
        return "Suggestion";
    }
  };

  const getSeverityBg = () => {
    switch (issue.severity) {
      case "critical":
        return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
      case "info":
        return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card shadow-lg overflow-hidden animate-in slide-in-from-right-4 duration-200",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {getSeverityIcon()}
          <div>
            <p className="text-sm font-medium text-foreground">
              {getSeverityLabel()}
            </p>
            <p className="text-xs text-muted-foreground">
              {source === "ats" ? "ATS System" : "HR Review"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Problem Description */}
        <div className={cn("p-3 rounded-lg border", getSeverityBg())}>
          <p className="text-sm font-medium text-foreground mb-1">
            Problem
          </p>
          <p className="text-sm text-muted-foreground">{issue.message}</p>
        </div>

        {/* Why This Matters */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium text-foreground">
              Why This Matters
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {whyItMatters}
          </p>
        </div>

        {/* Grammarly-Style Fix Suggestion */}
        {grammarlyFix && onAccept && onDismiss && (
          <GrammarlyFixCard
            originalText={grammarlyFix.originalText}
            suggestedText={grammarlyFix.suggestedText}
            whyThisHelps={
              source === "ats"
                ? grammarlyFix.whyItHelpsATS || whyItMatters
                : grammarlyFix.whyItHelpsHR || whyItMatters
            }
            source={grammarlyFix.source}
            onAccept={() => onAccept(grammarlyFix)}
            onDismiss={onDismiss}
          />
        )}

        {/* Manual suggestion if no Grammarly fix */}
        {!grammarlyFix && issue.suggestion && (
          <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-1">
              Suggestion
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {issue.suggestion}
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/30">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

/**
 * Inline version that expands below an issue item
 */
export function IssueDetailInline({
  issue,
  source,
  whyItMatters,
  onClose,
}: {
  issue: ATSIssue | HRFeedback;
  source: "ats" | "hr";
  whyItMatters: string;
  onClose: () => void;
}) {
  return (
    <div className="mt-2 ml-5 p-3 rounded-lg border bg-muted/30 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-foreground">Why This Matters</p>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {whyItMatters}
      </p>
      {issue.suggestion && (
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Suggestion: {issue.suggestion}
          </p>
        </div>
      )}
    </div>
  );
}
