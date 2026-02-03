"use client";

import { Shield, Users } from "lucide-react";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface SidebarScoreToggleProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function SidebarScoreToggle({ activeView, onViewChange }: SidebarScoreToggleProps) {
  return (
    <div className="flex bg-muted/50 rounded-xl p-1.5 gap-1.5" role="tablist" aria-label="Score view">
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "ats"}
        className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ease-out-back ${
          activeView === "ats"
            ? "bg-white text-foreground shadow-soft"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
        onClick={() => onViewChange("ats")}
      >
        <Shield className={`w-4 h-4 ${activeView === "ats" ? "text-red-500" : ""}`} />
        <span>ATS</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "hr"}
        className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ease-out-back ${
          activeView === "hr"
            ? "bg-white text-foreground shadow-soft"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
        onClick={() => onViewChange("hr")}
      >
        <Users className={`w-4 h-4 ${activeView === "hr" ? "text-violet-500" : ""}`} />
        <span>HR</span>
      </button>
    </div>
  );
}
