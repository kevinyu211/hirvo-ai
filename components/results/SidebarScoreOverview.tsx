"use client";

import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/scores/ScoreGauge";
import { ScoreBar } from "@/components/scores/ScoreBar";
import type { ATSScore, HRScore } from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface SidebarScoreOverviewProps {
  activeView: ViewMode;
  atsScore: ATSScore | null;
  hrScore: HRScore | null;
  hrLayers?: HRLayerData;
}

function PassFailBadge({ passed }: { passed: boolean }) {
  return (
    <Badge
      className={`text-xs font-semibold px-2.5 py-0.5 ${
        passed
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-red-100 text-red-700 border-red-200"
      }`}
    >
      {passed ? "PASS" : "FAIL"}
    </Badge>
  );
}

function CallbackDecisionBadge({ decision }: { decision: "yes" | "no" | "maybe" }) {
  const config = {
    yes: { className: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Would Interview" },
    no: { className: "bg-red-100 text-red-700 border-red-200", label: "Would Not Interview" },
    maybe: { className: "bg-amber-100 text-amber-700 border-amber-200", label: "Maybe Interview" },
  };
  const { className, label } = config[decision];
  return <Badge className={`text-xs font-semibold ${className}`}>{label}</Badge>;
}

export function SidebarScoreOverview({
  activeView,
  atsScore,
  hrScore,
  hrLayers,
}: SidebarScoreOverviewProps) {
  if (activeView === "ats" && atsScore) {
    return (
      <div className="space-y-4">
        {/* Score gauge centered */}
        <div className="flex justify-center">
          <ScoreGauge score={atsScore.overall} size={120} />
        </div>

        {/* Pass/Fail badge */}
        <div className="flex justify-center">
          <PassFailBadge passed={atsScore.passed} />
        </div>

        {/* Mini score bars */}
        <div className="space-y-3 pt-2">
          <ScoreBar score={atsScore.keywordMatchPct} label="Keyword Match" compact />
          <ScoreBar score={atsScore.formattingScore} label="Formatting" compact />
          <ScoreBar score={atsScore.sectionScore} label="Section Structure" compact />
        </div>
      </div>
    );
  }

  if (activeView === "hr" && hrScore) {
    const callbackDecision = hrLayers?.llmReview?.callbackDecision?.decision;

    return (
      <div className="space-y-4">
        {/* Score gauge centered */}
        <div className="flex justify-center">
          <ScoreGauge score={hrScore.overall} size={120} />
        </div>

        {/* Callback decision badge (HR only) */}
        {callbackDecision && (
          <div className="flex justify-center">
            <CallbackDecisionBadge decision={callbackDecision} />
          </div>
        )}

        {/* Mini score bars */}
        <div className="space-y-3 pt-2">
          <ScoreBar score={hrScore.formattingScore} label="Formatting" compact />
          <ScoreBar score={hrScore.semanticScore} label="Semantic Match" compact />
          <ScoreBar score={hrScore.llmScore} label="HR Review" compact />
        </div>
      </div>
    );
  }

  return null;
}
