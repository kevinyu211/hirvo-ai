"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import type { ATSScore, HRScore, ATSIssue, HRFeedback, GrammarlyFix } from "@/lib/types";
import { ATSSidePanel } from "./ATSSidePanel";
import { HRSidePanel } from "./HRSidePanel";
import { ScoreBarWithFormula } from "./ScoreFormulaPopover";
import { AnalysisLegend, AnalysisLegendCompact } from "./AnalysisLegend";

export interface SectionAnalysisPanelProps {
  sectionName: string;
  sectionContent: string;
  atsScore: ATSScore;
  hrScore: HRScore;
  onClose: () => void;
  onAcceptFix?: (fix: GrammarlyFix) => void;
  className?: string;
}

/**
 * Expandable panel that appears within/below a section when user clicks "View Analysis"
 * Shows 50/50 split with ATS categories on left and HR categories on right
 */
export function SectionAnalysisPanel({
  sectionName,
  sectionContent,
  atsScore,
  hrScore,
  onClose,
  onAcceptFix,
  className,
}: SectionAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<"ats" | "hr" | "split">("split");
  const [selectedIssue, setSelectedIssue] = useState<ATSIssue | HRFeedback | null>(null);

  const handleSelectATSIssue = useCallback((issue: ATSIssue) => {
    setSelectedIssue(issue);
  }, []);

  const handleSelectHRFeedback = useCallback((feedback: HRFeedback) => {
    setSelectedIssue(feedback);
  }, []);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">
            {sectionName} Analysis
          </h3>

          {/* Score Bars - Clickable for formula */}
          <div className="hidden sm:flex items-center gap-4 ml-4">
            <ScoreBarWithFormula
              score={atsScore}
              type="ats"
              label="ATS"
              className="w-24"
            />
            <ScoreBarWithFormula
              score={hrScore}
              type="hr"
              label="HR"
              className="w-24"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle - Mobile tabs */}
          <div className="flex items-center gap-1 sm:hidden">
            <Button
              variant={activeTab === "ats" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveTab("ats")}
            >
              ATS
            </Button>
            <Button
              variant={activeTab === "hr" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveTab("hr")}
            >
              HR
            </Button>
          </div>

          {/* Legend toggle - Desktop only */}
          <div className="hidden lg:block">
            <AnalysisLegendCompact />
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Score Bars */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/20 sm:hidden">
        <ScoreBarWithFormula
          score={atsScore}
          type="ats"
          label="ATS"
          className="flex-1"
        />
        <ScoreBarWithFormula
          score={hrScore}
          type="hr"
          label="HR"
          className="flex-1"
        />
      </div>

      {/* Content - Split View on Desktop, Tabs on Mobile */}
      <div className="p-4">
        {/* Desktop: 50/50 Split */}
        <div className="hidden sm:grid sm:grid-cols-2 gap-4">
          {/* ATS Side (Left) */}
          <div className="border-r pr-4">
            <ATSSidePanel
              atsScore={atsScore}
              sectionName={sectionName}
              sectionContent={sectionContent}
              onSelectIssue={handleSelectATSIssue}
              onAcceptFix={onAcceptFix}
            />
          </div>

          {/* HR Side (Right) */}
          <div className="pl-4">
            <HRSidePanel
              hrScore={hrScore}
              sectionName={sectionName}
              sectionContent={sectionContent}
              onSelectFeedback={handleSelectHRFeedback}
              onAcceptFix={onAcceptFix}
            />
          </div>
        </div>

        {/* Mobile: Tab View */}
        <div className="sm:hidden">
          {activeTab === "ats" && (
            <ATSSidePanel
              atsScore={atsScore}
              sectionName={sectionName}
              sectionContent={sectionContent}
              onSelectIssue={handleSelectATSIssue}
              onAcceptFix={onAcceptFix}
            />
          )}
          {activeTab === "hr" && (
            <HRSidePanel
              hrScore={hrScore}
              sectionName={sectionName}
              sectionContent={sectionContent}
              onSelectFeedback={handleSelectHRFeedback}
              onAcceptFix={onAcceptFix}
            />
          )}
        </div>
      </div>

      {/* Legend - Mobile */}
      <div className="px-4 pb-3 lg:hidden">
        <AnalysisLegend position="inline" defaultCollapsed={true} />
      </div>
    </div>
  );
}

/**
 * Compact trigger button to show analysis panel
 */
export function AnalysisTriggerButton({
  onClick,
  issueCount,
  className,
}: {
  onClick: () => void;
  issueCount?: number;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("gap-1.5", className)}
    >
      <Maximize2 className="h-3.5 w-3.5" />
      View Analysis
      {issueCount !== undefined && issueCount > 0 && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          {issueCount}
        </span>
      )}
    </Button>
  );
}
