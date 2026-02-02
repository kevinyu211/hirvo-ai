"use client";

import { useState } from "react";
import { ChevronRight, Plus, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ATSScore } from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface ThingsToAddSectionProps {
  activeView: ViewMode;
  atsScore: ATSScore | null;
  hrLayers?: HRLayerData;
}

export function ThingsToAddSection({
  activeView,
  atsScore,
  hrLayers,
}: ThingsToAddSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // For ATS: missing keywords
  const missingKeywords = activeView === "ats" ? (atsScore?.missingKeywords || []) : [];

  // For HR: weak sections (score < 60) and achievement suggestions
  const weakSections =
    activeView === "hr"
      ? (hrLayers?.llmReview?.sectionComments?.filter((c) => c.score < 60) || [])
      : [];
  const achievementScore = hrLayers?.llmReview?.achievementStrength?.score ?? 100;
  const achievementSuggestion =
    activeView === "hr" && achievementScore < 60
      ? hrLayers?.llmReview?.achievementStrength?.suggestion
      : null;

  // Calculate total items count
  const itemCount =
    activeView === "ats"
      ? missingKeywords.length
      : weakSections.length + (achievementSuggestion ? 1 : 0);

  if (itemCount === 0) {
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
          <span className="font-medium text-sm">Things to Add</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {itemCount}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 py-3 space-y-3">
          {/* ATS View: Missing Keywords */}
          {activeView === "ats" && missingKeywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Plus className="w-3 h-3" />
                Missing Keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="outline"
                    className="text-xs border-red-200 text-red-600 bg-red-50 cursor-default"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Try to naturally incorporate these keywords into your experience descriptions.
              </p>
            </div>
          )}

          {/* HR View: Weak Sections */}
          {activeView === "hr" && weakSections.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3" />
                Sections to Strengthen
              </p>
              {weakSections.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-amber-200 bg-amber-50/50 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground capitalize">
                      {section.section}
                    </span>
                    <span className="text-xs text-amber-600 font-medium">{section.score}/100</span>
                  </div>
                  <p className="text-xs text-amber-800">{section.comment}</p>
                  {section.suggestion && (
                    <p className="text-xs text-amber-600 mt-1 italic">{section.suggestion}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* HR View: Achievement Suggestion */}
          {activeView === "hr" && achievementSuggestion && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Lightbulb className="w-3 h-3" />
                Strengthen Achievements
              </p>
              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
                <p className="text-xs text-violet-800">{achievementSuggestion}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
