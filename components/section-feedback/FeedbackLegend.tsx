"use client";

import { cn } from "@/lib/utils";

/**
 * Legend explaining the color and shape coding for feedback items
 */
export function FeedbackLegend() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* Severity Colors */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Severity
        </p>
        <div className="space-y-1.5">
          <LegendItem color="bg-red-500" label="Critical" />
          <LegendItem color="bg-amber-500" label="Warning" />
          <LegendItem color="bg-blue-500" label="Info" />
          <LegendItem color="bg-emerald-500" label="Strength" />
        </div>
      </div>

      {/* Category Shapes */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Category
        </p>
        <div className="space-y-1.5">
          <ShapeItem shape="circle" label="Keywords" />
          <ShapeItem shape="square" label="Formatting" />
          <ShapeItem shape="diamond" label="Content" />
          <ShapeItem shape="triangle" label="Metrics" />
        </div>
      </div>

      {/* Source */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Source
        </p>
        <div className="space-y-1.5">
          <SourceItem source="ATS" description="Automated screening" />
          <SourceItem source="HR" description="Human reviewer" />
        </div>
      </div>

      {/* Quick Reference */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Quick Tips
        </p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Click any issue for details</p>
          <p>Address critical issues first</p>
          <p>ATS issues affect filtering</p>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-3 h-3 rounded-full", color)} />
      <span className="text-xs text-foreground">{label}</span>
    </div>
  );
}

function ShapeItem({
  shape,
  label,
}: {
  shape: "circle" | "square" | "diamond" | "triangle";
  label: string;
}) {
  const getShapeClasses = () => {
    switch (shape) {
      case "circle":
        return "w-3 h-3 rounded-full bg-muted-foreground";
      case "square":
        return "w-3 h-3 rounded-sm bg-muted-foreground";
      case "diamond":
        return "w-2.5 h-2.5 bg-muted-foreground rotate-45";
      case "triangle":
        return "w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-muted-foreground";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 flex items-center justify-center">
        <div className={getShapeClasses()} />
      </div>
      <span className="text-xs text-foreground">{label}</span>
    </div>
  );
}

function SourceItem({
  source,
  description,
}: {
  source: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          source === "ATS"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
        )}
      >
        {source}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </div>
  );
}
