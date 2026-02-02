"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ResultsSidebar } from "./ResultsSidebar";
import { MobileSidebar } from "./MobileSidebar";
import type { ATSScore, HRScore, Suggestion } from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ViewMode } from "@/components/editor/ViewToggle";

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
}

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
}: ResultsLayoutProps) {
  const [isDesktop, setIsDesktop] = useState(true);

  // Check viewport size
  useEffect(() => {
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Calculate suggestion count for mobile FAB
  const suggestionCount = suggestions.filter(
    (s) => s.type === activeView && s.suggestedText !== s.originalText
  ).length;

  return (
    <div className="flex gap-6">
      {/* Desktop Sidebar */}
      {isDesktop && (
        <aside className="w-[380px] flex-shrink-0 hidden lg:block">
          <Card className="sticky top-24 h-[calc(100vh-120px)] overflow-hidden">
            <ResultsSidebar
              activeView={activeView}
              onViewChange={onViewChange}
              atsScore={atsScore}
              hrScore={hrScore}
              hrLayers={hrLayers}
              suggestions={suggestions}
              onApplyFix={onApplyFix}
              onDismiss={onDismiss}
              onViewSuggestion={onViewSuggestion}
            />
          </Card>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">{children}</main>

      {/* Mobile Sidebar (FAB + Bottom Sheet) */}
      {!isDesktop && (
        <MobileSidebar
          activeView={activeView}
          onViewChange={onViewChange}
          atsScore={atsScore}
          hrScore={hrScore}
          hrLayers={hrLayers}
          suggestions={suggestions}
          onApplyFix={onApplyFix}
          onDismiss={onDismiss}
          onViewSuggestion={onViewSuggestion}
          suggestionCount={suggestionCount}
        />
      )}
    </div>
  );
}
