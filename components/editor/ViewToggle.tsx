"use client";

import { Badge } from "@/components/ui/badge";
import { Shield, Users } from "lucide-react";

export type ViewMode = "ats" | "hr";

export interface ViewToggleProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  atsIssueCount: number;
  hrFeedbackCount: number;
}

export function ViewToggle({
  activeView,
  onViewChange,
  atsIssueCount,
  hrFeedbackCount,
}: ViewToggleProps) {
  return (
    <div
      className="inline-flex rounded-xl bg-muted/50 p-1.5"
      role="tablist"
      aria-label="Analysis view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "ats"}
        aria-controls="editor-ats-panel"
        id="tab-ats"
        className={`inline-flex items-center gap-2 md:gap-2.5 rounded-lg px-3 md:px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
          activeView === "ats"
            ? "bg-white text-foreground shadow-soft"
            : "text-muted-foreground hover:text-foreground hover:bg-white/50"
        }`}
        onClick={() => onViewChange("ats")}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          activeView === "ats"
            ? "bg-red-100 text-red-600"
            : "bg-muted text-muted-foreground"
        }`}>
          <Shield className="w-4 h-4" />
        </div>
        <span className="hidden sm:inline">ATS Issues</span>
        <span className="sm:hidden">ATS</span>
        <Badge
          className={`text-xs font-semibold tabular-nums min-w-[1.5rem] justify-center ${
            activeView === "ats"
              ? atsIssueCount > 0
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {atsIssueCount}
        </Badge>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeView === "hr"}
        aria-controls="editor-hr-panel"
        id="tab-hr"
        className={`inline-flex items-center gap-2 md:gap-2.5 rounded-lg px-3 md:px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
          activeView === "hr"
            ? "bg-white text-foreground shadow-soft"
            : "text-muted-foreground hover:text-foreground hover:bg-white/50"
        }`}
        onClick={() => onViewChange("hr")}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          activeView === "hr"
            ? "bg-violet-100 text-violet-600"
            : "bg-muted text-muted-foreground"
        }`}>
          <Users className="w-4 h-4" />
        </div>
        <span className="hidden sm:inline">HR Feedback</span>
        <span className="sm:hidden">HR</span>
        <Badge
          className={`text-xs font-semibold tabular-nums min-w-[1.5rem] justify-center ${
            activeView === "hr"
              ? hrFeedbackCount > 0
                ? "bg-violet-100 text-violet-700 border-violet-200"
                : "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {hrFeedbackCount}
        </Badge>
      </button>
    </div>
  );
}
