"use client";

import { useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { ATSScoreCard } from "@/components/scores/ATSScoreCard";
import { HRScoreCard } from "@/components/scores/HRScoreCard";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ATSScore, HRScore } from "@/lib/types";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface FullBreakdownSectionProps {
  activeView: ViewMode;
  atsScore: ATSScore | null;
  hrScore: HRScore | null;
  hrLayers?: HRLayerData;
}

export function FullBreakdownSection({
  activeView,
  atsScore,
  hrScore,
  hrLayers,
}: FullBreakdownSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Full Breakdown</span>
        </div>
      </button>

      {isOpen && (
        <div className="p-4">
          {activeView === "ats" && atsScore && (
            <ATSScoreCard score={atsScore} />
          )}
          {activeView === "hr" && hrScore && (
            <HRScoreCard score={hrScore} layers={hrLayers} />
          )}
        </div>
      )}
    </div>
  );
}
