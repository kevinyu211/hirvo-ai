"use client";

import { useCallback, useEffect, useState } from "react";
import { ScoreSummaryHeader } from "@/components/section-feedback";
import type { ATSScore, HRScore, Suggestion, MergedSectionFeedback } from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ViewMode } from "@/components/editor/ViewToggle";
import type { LearnedPatterns } from "@/lib/success-matching";

export interface ResultsLayoutProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  atsScore: ATSScore | null;
  hrScore: HRScore | null;
  hrLayers?: HRLayerData;
  suggestions: Suggestion[];
  onApplyFix: (suggestion: Suggestion) => void;
  onDismiss: (suggestion: Suggestion) => void;
  onViewSuggestion: (suggestion: Suggestion) => void;
  children: React.ReactNode;
  jobDescription?: string;
  /** Merged section-level feedback for passing to editor */
  sectionFeedback?: Map<string, MergedSectionFeedback>;
  /** Learned patterns from similar successful resumes */
  learnedPatterns?: LearnedPatterns | null;
  /** Number of similar jobs found in database */
  similarJobsCount?: number;
}

/**
 * ResultsLayout - Simplified single-column layout
 *
 * Removed left sidebar and right panel.
 * Score summary header is now at the top.
 * Section-level feedback is integrated into the editor sections.
 */
export function ResultsLayout({
  activeView,
  onViewChange,
  atsScore,
  hrScore,
  hrLayers,
  suggestions,
  onApplyFix,
  onDismiss,
  onViewSuggestion,
  children,
  jobDescription,
  sectionFeedback,
  learnedPatterns,
  similarJobsCount = 0,
}: ResultsLayoutProps) {
  return (
    <div className="w-full results-container mx-auto">
      {/* Score Summary Header */}
      <ScoreSummaryHeader
        atsScore={atsScore}
        hrScore={hrScore}
        learnedPatterns={learnedPatterns}
        similarJobsCount={similarJobsCount}
      />

      {/* Main Content (Editor + Template Gallery) */}
      <main className="space-y-6">
        {children}
      </main>
    </div>
  );
}
