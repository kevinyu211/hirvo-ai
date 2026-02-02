"use client";

import { useState } from "react";
import { ChevronRight, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SeverityDot } from "@/components/ui/severity-badge";
import type { ATSScore } from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface RejectionRisksSectionProps {
  activeView: ViewMode;
  atsScore: ATSScore | null;
  hrLayers?: HRLayerData;
}

export function RejectionRisksSection({
  activeView,
  atsScore,
  hrLayers,
}: RejectionRisksSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // For ATS: critical issues
  const criticalAtsIssues =
    activeView === "ats"
      ? (atsScore?.issues.filter((i) => i.severity === "critical") || [])
      : [];

  // For HR: red flags and callback decision
  const redFlags = activeView === "hr" ? (hrLayers?.llmReview?.redFlags || []) : [];
  const callbackDecision = activeView === "hr" ? hrLayers?.llmReview?.callbackDecision : null;
  const showCallbackWarning = callbackDecision?.decision === "no" || callbackDecision?.decision === "maybe";

  // Calculate total items count
  const itemCount =
    activeView === "ats"
      ? criticalAtsIssues.length
      : redFlags.length + (showCallbackWarning ? 1 : 0);

  if (itemCount === 0) {
    return null;
  }

  return (
    <div className="border border-red-200 rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-red-50/50 hover:bg-red-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-4 h-4 text-red-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="font-medium text-sm text-red-700">Rejection Risks</span>
          <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
            {itemCount}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="px-4 py-3 space-y-3 bg-white">
          {/* ATS View: Critical Issues */}
          {activeView === "ats" && criticalAtsIssues.length > 0 && (
            <div className="space-y-2">
              {criticalAtsIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-red-200 bg-red-50/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <SeverityDot severity="critical" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800">{issue.message}</p>
                      {issue.suggestion && (
                        <p className="text-xs text-red-600 mt-1">{issue.suggestion}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* HR View: Red Flags */}
          {activeView === "hr" && redFlags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
                <XCircle className="w-3 h-3" />
                Red Flags
              </p>
              {redFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-red-200 bg-red-50/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <SeverityDot severity={flag.severity} />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground capitalize mb-0.5">
                        {flag.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm text-red-800">{flag.description}</p>
                      {flag.mitigation && (
                        <p className="text-xs text-red-600 mt-1 italic">
                          Suggestion: {flag.mitigation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* HR View: Callback Decision Warning */}
          {activeView === "hr" && showCallbackWarning && callbackDecision && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-foreground">Callback Decision</span>
                <Badge
                  className={`text-xs ${
                    callbackDecision.decision === "no"
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}
                >
                  {callbackDecision.decision === "no" ? "Would Not Interview" : "Maybe Interview"}
                </Badge>
              </div>
              <p className="text-xs text-amber-800">{callbackDecision.reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
