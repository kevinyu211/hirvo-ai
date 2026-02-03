"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ATSScore, HRScore } from "@/lib/types";

export interface ScoreFormulaPopoverProps {
  score: ATSScore | HRScore;
  type: "ats" | "hr";
  className?: string;
  children: React.ReactNode;
}

/**
 * Clickable score bar that shows formula calculation breakdown
 */
export function ScoreFormulaPopover({
  score,
  type,
  className,
  children,
}: ScoreFormulaPopoverProps) {
  const isATS = type === "ats";
  const atsScore = score as ATSScore;
  const hrScore = score as HRScore;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("cursor-pointer hover:opacity-80 transition-opacity", className)}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="center">
        <div className="space-y-3">
          {/* Title */}
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-semibold text-sm">
              {isATS ? "ATS" : "HR"} Score Calculation
            </h4>
            <span className="text-lg font-bold text-foreground">
              {score.overall}
            </span>
          </div>

          {/* Components */}
          <div className="space-y-2 text-xs">
            {isATS ? (
              <>
                <FormulaRow
                  label="Keywords"
                  value={atsScore.keywordMatchPct}
                  weight={50}
                />
                <FormulaRow
                  label="Formatting"
                  value={atsScore.formattingScore}
                  weight={30}
                />
                <FormulaRow
                  label="Sections"
                  value={atsScore.sectionScore}
                  weight={20}
                />
              </>
            ) : (
              <>
                <FormulaRow
                  label="Formatting DB"
                  value={hrScore.formattingScore}
                  weight={20}
                />
                <FormulaRow
                  label="Semantic Match"
                  value={hrScore.semanticScore}
                  weight={40}
                />
                <FormulaRow
                  label="HR Review"
                  value={hrScore.llmScore}
                  weight={40}
                />
              </>
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t text-xs font-medium">
            <span className="text-muted-foreground">Total</span>
            <span className="text-foreground">
              {calculateTotal(score, type).toFixed(1)} → {score.overall}
            </span>
          </div>

          {/* Formula */}
          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground font-mono">
              {isATS
                ? "(K×0.5) + (F×0.3) + (S×0.2)"
                : "(F×0.2) + (S×0.4) + (R×0.4)"}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FormulaRow({
  label,
  value,
  weight,
}: {
  label: string;
  value: number;
  weight: number;
}) {
  const contribution = (value * weight) / 100;

  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">
        {Math.round(value)} × {weight}% = {contribution.toFixed(1)}
      </span>
    </div>
  );
}

function calculateTotal(score: ATSScore | HRScore, type: "ats" | "hr"): number {
  if (type === "ats") {
    const ats = score as ATSScore;
    return (
      ats.keywordMatchPct * 0.5 +
      ats.formattingScore * 0.3 +
      ats.sectionScore * 0.2
    );
  } else {
    const hr = score as HRScore;
    return (
      hr.formattingScore * 0.2 +
      hr.semanticScore * 0.4 +
      hr.llmScore * 0.4
    );
  }
}

/**
 * Inline version showing just the score with clickable formula
 */
export function ScoreBarWithFormula({
  score,
  type,
  label,
  className,
}: {
  score: ATSScore | HRScore;
  type: "ats" | "hr";
  label: string;
  className?: string;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <ScoreFormulaPopover score={score} type={type} className={className}>
      <div className="text-left">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <span
            className={cn(
              "text-sm font-bold",
              getScoreTextColor(score.overall)
            )}
          >
            {score.overall}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              getScoreColor(score.overall)
            )}
            style={{ width: `${score.overall}%` }}
          />
        </div>
      </div>
    </ScoreFormulaPopover>
  );
}
