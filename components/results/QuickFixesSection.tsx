"use client";

import { useState } from "react";
import { ChevronRight, Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityDot } from "@/components/ui/severity-badge";
import type { Suggestion } from "@/lib/types";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface QuickFixesSectionProps {
  suggestions: Suggestion[];
  activeView: ViewMode;
  onApplyFix: (suggestion: Suggestion) => void;
  onDismiss: (suggestion: Suggestion) => void;
  onView: (suggestion: Suggestion) => void;
}

export function QuickFixesSection({
  suggestions,
  activeView,
  onApplyFix,
  onDismiss,
  onView,
}: QuickFixesSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Filter suggestions by active view and only those with actual fixes
  const quickFixes = suggestions.filter(
    (s) => s.type === activeView && s.suggestedText && s.suggestedText !== s.originalText
  );

  if (quickFixes.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
          <span className="font-medium text-sm">Quick Fixes</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {quickFixes.length}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="divide-y">
          {quickFixes.map((suggestion) => (
            <QuickFixItem
              key={suggestion.id}
              suggestion={suggestion}
              onApply={() => onApplyFix(suggestion)}
              onDismiss={() => onDismiss(suggestion)}
              onView={() => onView(suggestion)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface QuickFixItemProps {
  suggestion: Suggestion;
  onApply: () => void;
  onDismiss: () => void;
  onView: () => void;
}

function QuickFixItem({ suggestion, onApply, onDismiss, onView }: QuickFixItemProps) {
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <SeverityDot severity={suggestion.severity} />
        <p className="text-sm text-foreground flex-1 line-clamp-2">{suggestion.reasoning}</p>
      </div>

      {/* Original vs Suggested preview */}
      {suggestion.originalText && (
        <div className="ml-4 space-y-1">
          <p className="text-xs text-muted-foreground line-through truncate">
            {suggestion.originalText}
          </p>
          <p className="text-xs text-emerald-600 truncate">{suggestion.suggestedText}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 ml-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onView}
        >
          <Eye className="w-3 h-3 mr-1" />
          View
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          onClick={onApply}
        >
          <Check className="w-3 h-3 mr-1" />
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50"
          onClick={onDismiss}
        >
          <X className="w-3 h-3 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
