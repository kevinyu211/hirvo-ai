"use client";

import { SidebarScoreToggle } from "./SidebarScoreToggle";
import { SidebarScoreOverview } from "./SidebarScoreOverview";
import { QuickFixesSection } from "./QuickFixesSection";
import { ThingsToAddSection } from "./ThingsToAddSection";
import type { ATSScore, HRScore, Suggestion } from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface ResultsSidebarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  atsScore: ATSScore | null;
  hrScore: HRScore | null;
  hrLayers?: HRLayerData;
  suggestions: Suggestion[];
  onApplyFix: (suggestion: Suggestion) => void;
  onDismiss: (suggestion: Suggestion) => void;
  onViewSuggestion: (suggestion: Suggestion) => void;
  jobDescription?: string;
  onOpenDetails?: () => void;
}

export function ResultsSidebar({
  activeView,
  onViewChange,
  atsScore,
  hrScore,
  hrLayers,
  suggestions,
  onApplyFix,
  onDismiss,
  onViewSuggestion,
  jobDescription,
  onOpenDetails,
}: ResultsSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Score Toggle */}
      <div className="p-5 border-b">
        <SidebarScoreToggle activeView={activeView} onViewChange={onViewChange} />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Score Overview with inline warnings and "View Details" link */}
        <SidebarScoreOverview
          activeView={activeView}
          atsScore={atsScore}
          hrScore={hrScore}
          hrLayers={hrLayers}
          onOpenDetails={onOpenDetails}
        />

        {/* Quick Fixes */}
        <QuickFixesSection
          suggestions={suggestions}
          activeView={activeView}
          onApplyFix={onApplyFix}
          onDismiss={onDismiss}
          onView={onViewSuggestion}
        />

        {/* Things to Add */}
        <ThingsToAddSection
          activeView={activeView}
          atsScore={atsScore}
          hrLayers={hrLayers}
          jobDescription={jobDescription}
        />
      </div>
    </div>
  );
}
