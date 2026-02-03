"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, GripVertical, BarChart2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionFeedbackDropdown } from "@/components/section-feedback";
import { SectionAnalysisPanel } from "@/components/section-analysis";
import type { MergedSectionFeedback, ATSScore, HRScore, GrammarlyFix } from "@/lib/types";

export interface ResumeSectionProps {
  title: string;
  children: React.ReactNode;
  /** Whether the section can be collapsed */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Whether this section is optional and can be toggled on/off */
  optional?: boolean;
  /** Whether the section is currently visible (for optional sections) */
  isVisible?: boolean;
  /** Callback when visibility is toggled */
  onVisibilityChange?: (visible: boolean) => void;
  /** Additional class names */
  className?: string;
  /** Whether to show drag handle for reordering */
  draggable?: boolean;
  /** Section feedback for ATS/HR dropdown */
  sectionFeedback?: MergedSectionFeedback;
  /** Whether feedback dropdown is expanded */
  feedbackExpanded?: boolean;
  /** Callback when feedback dropdown is toggled */
  onFeedbackToggle?: () => void;
  /** ATS score for detailed analysis panel */
  atsScore?: ATSScore | null;
  /** HR score for detailed analysis panel */
  hrScore?: HRScore | null;
  /** Section content text for analysis */
  sectionContent?: string;
  /** Callback when a fix is accepted */
  onAcceptFix?: (fix: GrammarlyFix) => void;
}

export function ResumeSection({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  optional = false,
  isVisible = true,
  onVisibilityChange,
  className,
  draggable = false,
  sectionFeedback,
  feedbackExpanded,
  onFeedbackToggle,
  atsScore,
  hrScore,
  sectionContent = "",
  onAcceptFix,
}: ResumeSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [internalFeedbackExpanded, setInternalFeedbackExpanded] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);

  const isFeedbackExpanded = feedbackExpanded ?? internalFeedbackExpanded;
  const handleFeedbackToggle =
    onFeedbackToggle ?? (() => setInternalFeedbackExpanded(!internalFeedbackExpanded));

  // Determine if we can show detailed analysis
  const canShowAnalysis = atsScore && hrScore;

  // If optional section is not visible, show toggle to enable it
  if (optional && !isVisible) {
    return (
      <div className={cn("border-dashed border-2 border-muted rounded-lg p-4", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {title} (Hidden)
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onVisibilityChange?.(true)}
          >
            Show Section
          </Button>
        </div>
      </div>
    );
  }

  const hasFeedback =
    sectionFeedback &&
    (sectionFeedback.atsItems.length > 0 || sectionFeedback.hrItems.length > 0);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-all",
        className
      )}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        {draggable && (
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        )}

        <h3 className="flex-1 font-semibold text-sm uppercase tracking-wide text-foreground">
          {title}
        </h3>

        <div className="flex items-center gap-2">
          {/* View Analysis Button */}
          {canShowAnalysis && (
            <Button
              variant={showAnalysisPanel ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowAnalysisPanel(!showAnalysisPanel)}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {showAnalysisPanel ? "Hide" : "View"} Analysis
              </span>
            </Button>
          )}

          {optional && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onVisibilityChange?.(false)}
            >
              Hide
            </Button>
          )}

          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "Expand section" : "Collapse section"}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Section Content */}
      {!isCollapsed && (
        <div className="p-4">
          {/* Content FIRST */}
          {children}

          {/* Section Feedback Dropdown (shown when analysis panel is closed) - BELOW content */}
          {!showAnalysisPanel && hasFeedback && (
            <div className="mt-4 pt-4 border-t">
              <SectionFeedbackDropdown
                sectionName={title}
                atsScore={sectionFeedback.atsScore}
                hrScore={sectionFeedback.hrScore}
                atsFeedback={sectionFeedback.atsItems}
                hrFeedback={sectionFeedback.hrItems}
                isExpanded={isFeedbackExpanded}
                onToggle={handleFeedbackToggle}
              />
            </div>
          )}

          {/* Section Analysis Panel (50/50 ATS/HR split) - BELOW content */}
          {showAnalysisPanel && canShowAnalysis && (
            <div className="mt-4 pt-4 border-t">
              <SectionAnalysisPanel
                sectionName={title}
                sectionContent={sectionContent}
                atsScore={atsScore}
                hrScore={hrScore}
                onClose={() => setShowAnalysisPanel(false)}
                onAcceptFix={onAcceptFix}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
