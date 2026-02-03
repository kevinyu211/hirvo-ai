"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, X, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export interface AnalysisLegendProps {
  /** Whether to show in collapsed state initially */
  defaultCollapsed?: boolean;
  /** Position - fixed in corner or inline */
  position?: "fixed" | "inline";
  className?: string;
}

/**
 * Legend explaining the color codes and symbols in the analysis panel
 */
export function AnalysisLegend({
  defaultCollapsed = true,
  position = "inline",
  className,
}: AnalysisLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (position === "fixed") {
    return (
      <div
        className={cn(
          "fixed top-20 right-4 z-40",
          className
        )}
      >
        <div className="bg-card border rounded-lg shadow-lg overflow-hidden max-w-[200px]">
          {/* Toggle Header */}
          <button
            className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted transition-colors"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Legend</span>
            </div>
            {isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {/* Legend Content */}
          {!isCollapsed && (
            <div className="p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <LegendContent />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline version
  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Legend</span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {!isCollapsed && (
        <div className="px-3 pb-3 space-y-3 border-t animate-in slide-in-from-top-2 duration-200">
          <LegendContent />
        </div>
      )}
    </div>
  );
}

function LegendContent() {
  return (
    <>
      {/* Status Colors */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Status
        </p>
        <div className="space-y-1">
          <LegendItem
            icon={<Check className="h-3 w-3 text-emerald-500" />}
            label="Pass"
            color="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-50 dark:bg-emerald-950/30"
          />
          <LegendItem
            icon={<AlertTriangle className="h-3 w-3 text-amber-500" />}
            label="Warning"
            color="text-amber-600 dark:text-amber-400"
            bgColor="bg-amber-50 dark:bg-amber-950/30"
          />
          <LegendItem
            icon={<X className="h-3 w-3 text-red-500" />}
            label="Fail"
            color="text-red-600 dark:text-red-400"
            bgColor="bg-red-50 dark:bg-red-950/30"
          />
        </div>
      </div>

      {/* Source Types */}
      <div className="space-y-1.5 pt-2 border-t">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Sources
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              ATS
            </span>
            <span className="text-[10px] text-muted-foreground">
              Automated Filter
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              HR
            </span>
            <span className="text-[10px] text-muted-foreground">
              Human Reviewer
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function LegendItem({
  icon,
  label,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-5 h-5 rounded flex items-center justify-center",
          bgColor
        )}
      >
        {icon}
      </div>
      <span className={cn("text-[10px]", color)}>{label}</span>
    </div>
  );
}

/**
 * Compact inline legend for tight spaces
 */
export function AnalysisLegendCompact({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-[10px]", className)}>
      <div className="flex items-center gap-1">
        <Check className="h-3 w-3 text-emerald-500" />
        <span className="text-muted-foreground">Pass</span>
      </div>
      <div className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3 text-amber-500" />
        <span className="text-muted-foreground">Warning</span>
      </div>
      <div className="flex items-center gap-1">
        <X className="h-3 w-3 text-red-500" />
        <span className="text-muted-foreground">Fail</span>
      </div>
    </div>
  );
}
