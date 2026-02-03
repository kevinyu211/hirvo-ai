"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight, Sparkles } from "lucide-react";

export interface GrammarlyFixCardProps {
  originalText: string;
  suggestedText: string;
  whyThisHelps: string;
  source: "ats" | "hr" | "both";
  onAccept: () => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * Grammarly-style fix suggestion card with before/after and accept button
 */
export function GrammarlyFixCard({
  originalText,
  suggestedText,
  whyThisHelps,
  source,
  onAccept,
  onDismiss,
  className,
}: GrammarlyFixCardProps) {
  const getSourceLabel = () => {
    switch (source) {
      case "ats":
        return "ATS Optimization";
      case "hr":
        return "HR Appeal";
      case "both":
        return "ATS + HR";
    }
  };

  const getSourceColor = () => {
    switch (source) {
      case "ats":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "hr":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "both":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-foreground">
            Suggested Fix
          </span>
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              getSourceColor()
            )}
          >
            {getSourceLabel()}
          </span>
        </div>
      </div>

      {/* Before/After Comparison */}
      <div className="p-4 space-y-3">
        {/* Original (strikethrough) */}
        {originalText && (
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <X className="h-3 w-3 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Current:</p>
              <p className="text-sm text-muted-foreground line-through">
                {originalText}
              </p>
            </div>
          </div>
        )}

        {/* Arrow separator */}
        {originalText && (
          <div className="flex justify-center">
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Suggested */}
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Suggested:</p>
            <p className="text-sm text-foreground font-medium">
              {suggestedText}
            </p>
          </div>
        </div>

        {/* Why This Helps */}
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Why this helps:
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {whyThisHelps}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-t">
        <Button
          size="sm"
          onClick={onAccept}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Check className="h-4 w-4 mr-1.5" />
          Accept Fix
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1.5" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/**
 * Compact inline version for smaller spaces
 */
export function GrammarlyFixInline({
  suggestedText,
  source,
  onAccept,
  onDismiss,
}: {
  suggestedText: string;
  source: "ats" | "hr" | "both";
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const getSourceColor = () => {
    switch (source) {
      case "ats":
        return "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20";
      case "hr":
        return "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20";
      case "both":
        return "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20";
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded border text-sm",
        getSourceColor()
      )}
    >
      <span className="text-foreground">{suggestedText}</span>
      <button
        onClick={onAccept}
        className="p-0.5 rounded hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
        title="Accept suggestion"
      >
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      </button>
      <button
        onClick={onDismiss}
        className="p-0.5 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
        title="Dismiss suggestion"
      >
        <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
      </button>
    </div>
  );
}
