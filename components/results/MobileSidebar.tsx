"use client";

import { useEffect, useState } from "react";
import { X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsSidebar } from "./ResultsSidebar";
import type { ATSScore, HRScore, Suggestion } from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface MobileSidebarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  atsScore: ATSScore | null;
  hrScore: HRScore | null;
  hrLayers?: HRLayerData;
  suggestions: Suggestion[];
  onApplyFix: (suggestion: Suggestion) => void;
  onDismiss: (suggestion: Suggestion) => void;
  onViewSuggestion: (suggestion: Suggestion) => void;
  suggestionCount: number;
}

export function MobileSidebar({
  activeView,
  onViewChange,
  atsScore,
  hrScore,
  hrLayers,
  suggestions,
  onApplyFix,
  onDismiss,
  onViewSuggestion,
  suggestionCount,
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle applying fix - close sheet after applying
  const handleApplyFix = (suggestion: Suggestion) => {
    onApplyFix(suggestion);
    setIsOpen(false);
  };

  // Get the current score to display on FAB
  const currentScore =
    activeView === "ats"
      ? atsScore?.overall
      : hrScore?.overall;

  return (
    <>
      {/* FAB Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-foreground text-background px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform lg:hidden"
        aria-label="Open score sidebar"
      >
        <BarChart3 className="w-5 h-5" />
        <span className="font-medium text-sm">
          {currentScore !== undefined ? `${Math.round(currentScore)}%` : "Scores"}
        </span>
        {suggestionCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
            {suggestionCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "85vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h2 className="font-display font-semibold text-lg">Analysis</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Sidebar Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 80px)" }}>
          <ResultsSidebar
            activeView={activeView}
            onViewChange={onViewChange}
            atsScore={atsScore}
            hrScore={hrScore}
            hrLayers={hrLayers}
            suggestions={suggestions}
            onApplyFix={handleApplyFix}
            onDismiss={onDismiss}
            onViewSuggestion={(s) => {
              onViewSuggestion(s);
              setIsOpen(false);
            }}
          />
        </div>
      </div>
    </>
  );
}
