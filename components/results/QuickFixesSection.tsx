"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, X, Eye, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SeverityDot } from "@/components/ui/severity-badge";
import type { Suggestion } from "@/lib/types";
import type { ViewMode } from "@/components/editor/ViewToggle";

// Maximum number of fixes to show by default
const MAX_VISIBLE_FIXES = 5;

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
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter suggestions by active view and only those with actual fixes
  // Sort by severity (critical first)
  const quickFixes = useMemo(() => {
    const filtered = suggestions.filter(
      (s) => s.type === activeView && s.suggestedText && s.suggestedText !== s.originalText
    );

    // Sort by severity: critical > warning > info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return filtered.sort(
      (a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2)
    );
  }, [suggestions, activeView]);

  // Determine which fixes to display
  const visibleFixes = showAll ? quickFixes : quickFixes.slice(0, MAX_VISIBLE_FIXES);
  const hiddenCount = quickFixes.length - MAX_VISIBLE_FIXES;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setExpandedId(null);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (quickFixes.length === 0) {
    return null;
  }

  // Count critical fixes for badge
  const criticalCount = quickFixes.filter((s) => s.severity === "critical").length;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between gap-2 rounded-xl h-11 border-2 hover:border-accent/30 hover:shadow-soft transition-all duration-300"
      >
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="font-semibold">Quick Fixes</span>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {quickFixes.length}
          </span>
          {criticalCount > 0 && (
            <span className="text-xs font-bold text-white bg-gradient-to-r from-red-500 to-red-400 px-2 py-0.5 rounded-full shadow-sm">
              {criticalCount} critical
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-3 bg-popover border-2 rounded-2xl shadow-dramatic z-50 max-h-80 overflow-y-auto animate-scale-in">
          <div className="p-2 space-y-1">
            {visibleFixes.map((suggestion) => (
              <QuickFixItem
                key={suggestion.id}
                suggestion={suggestion}
                isExpanded={expandedId === suggestion.id}
                onToggleExpand={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                onApply={() => {
                  onApplyFix(suggestion);
                  setExpandedId(null);
                }}
                onDismiss={() => {
                  onDismiss(suggestion);
                  setExpandedId(null);
                }}
                onView={() => {
                  onView(suggestion);
                  setIsOpen(false);
                  setExpandedId(null);
                }}
              />
            ))}

            {/* Show more/less button */}
            {hiddenCount > 0 && (
              <button
                type="button"
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show less" : `Show ${hiddenCount} more fix${hiddenCount !== 1 ? "es" : ""}...`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface QuickFixItemProps {
  suggestion: Suggestion;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onApply: () => void;
  onDismiss: () => void;
  onView: () => void;
}

function QuickFixItem({
  suggestion,
  isExpanded,
  onToggleExpand,
  onApply,
  onDismiss,
  onView,
}: QuickFixItemProps) {
  return (
    <div className="rounded-xl hover:bg-accent/10 transition-all duration-200">
      {/* Clickable header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-start gap-3 text-left"
      >
        <SeverityDot severity={suggestion.severity} />
        <p className="text-sm text-foreground flex-1 line-clamp-2 font-medium">{suggestion.reasoning}</p>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Original vs Suggested preview */}
          {suggestion.originalText && (
            <div className="ml-5 space-y-2 p-3 bg-muted/30 rounded-xl border border-muted/50">
              <p className="text-xs text-muted-foreground line-through">
                {suggestion.originalText}
              </p>
              <p className="text-xs text-emerald-600 font-semibold">{suggestion.suggestedText}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              View
            </Button>
            <Button
              variant="accent"
              size="sm"
              className="h-8 px-3 text-xs rounded-lg font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                onApply();
              }}
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Apply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
