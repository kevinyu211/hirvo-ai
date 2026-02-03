"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/scores/ScoreGauge";
import type { ATSScore, HRScore } from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface SidebarScoreOverviewProps {
  activeView: ViewMode;
  atsScore: ATSScore | null;
  hrScore: HRScore | null;
  hrLayers?: HRLayerData;
  onOpenDetails?: () => void;
}

function PassFailBadge({ passed }: { passed: boolean }) {
  return (
    <Badge
      className={`text-xs font-bold px-4 py-1.5 tracking-wide uppercase shadow-sm ${
        passed
          ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white border-0"
          : "bg-gradient-to-r from-red-500 to-red-400 text-white border-0"
      }`}
    >
      {passed ? "PASS" : "FAIL"}
    </Badge>
  );
}

function CallbackDecisionBadge({ decision }: { decision: "yes" | "no" | "maybe" }) {
  const config = {
    yes: { className: "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white border-0", label: "Would Interview" },
    no: { className: "bg-gradient-to-r from-red-500 to-red-400 text-white border-0", label: "Would Not Interview" },
    maybe: { className: "bg-gradient-to-r from-amber-500 to-amber-400 text-white border-0", label: "Maybe Interview" },
  };
  const { className, label } = config[decision];
  return <Badge className={`text-xs font-bold px-3 py-1 shadow-sm ${className}`}>{label}</Badge>;
}

export function SidebarScoreOverview({
  activeView,
  atsScore,
  hrScore,
  hrLayers,
  onOpenDetails,
}: SidebarScoreOverviewProps) {
  if (activeView === "ats" && atsScore) {
    // Count critical issues (formatting/section issues only, not keywords)
    const criticalIssueCount = atsScore.issues.filter(
      (i) => i.severity === "critical" && i.type !== "missing_keyword"
    ).length;

    return (
      <div className="space-y-4">
        {/* Clickable score gauge */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full flex justify-center hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="View full ATS score breakdown"
        >
          <ScoreGauge score={atsScore.overall} size={120} />
        </button>

        {/* Pass/Fail badge */}
        <div className="flex justify-center">
          <PassFailBadge passed={atsScore.passed} />
        </div>

        {/* Inline warning banner for critical issues - Bold */}
        {!atsScore.passed && (
          <div className="rounded-2xl border-2 severity-critical p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Your resume may be filtered out</p>
                <p className="text-xs mt-1 opacity-80">
                  {criticalIssueCount > 0
                    ? `${criticalIssueCount} critical issue${criticalIssueCount !== 1 ? "s" : ""} detected`
                    : "Score below ATS threshold"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Details link - Bold */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-all duration-300 py-3 rounded-xl hover:bg-accent/5"
        >
          View Details
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    );
  }

  if (activeView === "hr" && hrScore) {
    const callbackDecision = hrLayers?.llmReview?.callbackDecision?.decision;
    const callbackReasoning = hrLayers?.llmReview?.callbackDecision?.reasoning;
    const showCallbackWarning = callbackDecision === "no" || callbackDecision === "maybe";

    return (
      <div className="space-y-4">
        {/* Clickable score gauge */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full flex justify-center hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="View full HR score breakdown"
        >
          <ScoreGauge score={hrScore.overall} size={120} />
        </button>

        {/* Callback decision badge (HR only) */}
        {callbackDecision && (
          <div className="flex justify-center">
            <CallbackDecisionBadge decision={callbackDecision} />
          </div>
        )}

        {/* Inline warning banner for callback decision - Bold */}
        {showCallbackWarning && callbackReasoning && (
          <div
            className={`rounded-2xl border-2 p-4 shadow-soft ${
              callbackDecision === "no" ? "severity-critical" : "severity-warning"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {callbackDecision === "no"
                    ? "Unlikely to get an interview"
                    : "Interview chances unclear"}
                </p>
                <p className="text-xs mt-1 opacity-80 line-clamp-2">
                  {callbackReasoning}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Details link - Bold */}
        <button
          type="button"
          onClick={onOpenDetails}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-all duration-300 py-3 rounded-xl hover:bg-accent/5"
        >
          View Details
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    );
  }

  return null;
}
