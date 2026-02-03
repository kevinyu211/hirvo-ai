"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ATSScoreCard } from "@/components/scores/ATSScoreCard";
import { HRScoreCard } from "@/components/scores/HRScoreCard";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ATSScore, HRScore } from "@/lib/types";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface DetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: ViewMode;
  atsScore: ATSScore | null;
  hrScore: HRScore | null;
  hrLayers?: HRLayerData;
}

export function DetailsPanel({
  isOpen,
  onClose,
  activeView,
  atsScore,
  hrScore,
  hrLayers,
}: DetailsPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside className="w-[400px] flex-shrink-0 hidden lg:block">
      <div className="sticky top-24 h-[calc(100vh-120px)] overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h2 className="font-display font-semibold text-sm">
            {activeView === "ats" ? "ATS Score Details" : "HR Score Details"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-53px)] p-4">
          {activeView === "ats" && atsScore && (
            <ATSScoreCard score={atsScore} />
          )}
          {activeView === "hr" && hrScore && (
            <HRScoreCard score={hrScore} layers={hrLayers} />
          )}
        </div>
      </div>
    </aside>
  );
}
