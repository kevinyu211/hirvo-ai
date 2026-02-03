"use client";

import { useEffect, useState } from "react";
import { X, BarChart3, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsSidebar } from "./ResultsSidebar";
import { ATSScoreCard } from "@/components/scores/ATSScoreCard";
import { HRScoreCard } from "@/components/scores/HRScoreCard";
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
  jobDescription?: string;
  // These props are passed for API consistency with desktop but mobile
  // handles details display internally via showDetailsInSheet state
  onOpenDetails?: () => void;
  isDetailsPanelOpen?: boolean;
  onCloseDetails?: () => void;
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
  jobDescription,
  // Note: onOpenDetails, isDetailsPanelOpen, onCloseDetails are passed for API consistency
  // but mobile handles details display internally via showDetailsInSheet state
}: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetailsInSheet, setShowDetailsInSheet] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDetailsInSheet) {
          setShowDetailsInSheet(false);
        } else {
          setIsOpen(false);
        }
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
  }, [isOpen, showDetailsInSheet]);

  // Handle applying fix - close sheet after applying
  const handleApplyFix = (suggestion: Suggestion) => {
    onApplyFix(suggestion);
    setIsOpen(false);
  };

  // Handle opening details in mobile (shows in same sheet)
  const handleOpenDetails = () => {
    setShowDetailsInSheet(true);
  };

  // Get the current score to display on FAB
  const currentScore =
    activeView === "ats"
      ? atsScore?.overall
      : hrScore?.overall;

  return (
    <>
      {/* FAB Button - Bold Transformation */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-foreground text-background px-5 py-3.5 rounded-full shadow-float hover:shadow-float-lg hover:scale-105 active:scale-95 transition-all duration-300 ease-out-back lg:hidden"
        aria-label="Open score sidebar"
      >
        <BarChart3 className="w-5 h-5" />
        <span className="font-semibold text-sm">
          {currentScore !== undefined ? `${Math.round(currentScore)}%` : "Scores"}
        </span>
        {suggestionCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center animate-pulse-soft">
            {suggestionCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => {
            setShowDetailsInSheet(false);
            setIsOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* Bottom Sheet - Bold 48px Radius */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-[3rem] shadow-float-lg transition-transform duration-500 ease-spring lg:hidden ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "85vh" }}
      >
        {/* Drag handle - Larger */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          {showDetailsInSheet ? (
            <>
              <button
                type="button"
                onClick={() => setShowDetailsInSheet(false)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <h2 className="font-display font-semibold text-lg">
                {activeView === "ats" ? "ATS Details" : "HR Details"}
              </h2>
            </>
          ) : (
            <h2 className="font-display font-semibold text-lg">Analysis</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowDetailsInSheet(false);
              setIsOpen(false);
            }}
            className="h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 80px)" }}>
          {showDetailsInSheet ? (
            // Full breakdown details
            <div className="p-4">
              {activeView === "ats" && atsScore && (
                <ATSScoreCard score={atsScore} />
              )}
              {activeView === "hr" && hrScore && (
                <HRScoreCard score={hrScore} layers={hrLayers} />
              )}
            </div>
          ) : (
            // Sidebar content
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
              jobDescription={jobDescription}
              onOpenDetails={handleOpenDetails}
            />
          )}
        </div>
      </div>
    </>
  );
}
