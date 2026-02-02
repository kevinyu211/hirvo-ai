"use client";

import { Shield, Users } from "lucide-react";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface SidebarScoreToggleProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function SidebarScoreToggle({ activeView, onViewChange }: SidebarScoreToggleProps) {
  return (
    <div className="flex bg-muted/50 rounded-lg p-1 gap-1" role="tablist" aria-label="Score view">
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "ats"}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
          activeView === "ats"
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
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
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
          activeView === "hr"
            ? "bg-white text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => onViewChange("hr")}
      >
        <Users className={`w-4 h-4 ${activeView === "hr" ? "text-violet-500" : ""}`} />
        <span>HR</span>
      </button>
    </div>
  );
}
