"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FeedbackLegend } from "./FeedbackLegend";
import { ScoringFormulaTooltip } from "./ScoringFormulaTooltip";
import type { ATSScore, HRScore } from "@/lib/types";
import type { LearnedPatterns } from "@/lib/success-matching";

export interface ScoreSummaryHeaderProps {
  atsScore: ATSScore | null;
  hrScore: HRScore | null;
  learnedPatterns?: LearnedPatterns | null;
  similarJobsCount?: number;
}

function ScoreBar({
  score,
  label,
  passed,
  description,
}: {
  score: number;
  label: string;
  passed?: boolean;
  description?: string;
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
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={cn("text-lg font-bold", getScoreTextColor(score))}>
          {score}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", getScoreColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      {description && (
        <div className="flex items-center gap-1 mt-1">
          {passed !== undefined && (
            passed ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : (
              <XCircle className="h-3 w-3 text-red-500" />
            )
          )}
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      )}
    </div>
  );
}

export function ScoreSummaryHeader({
  atsScore,
  hrScore,
  learnedPatterns,
  similarJobsCount = 0,
}: ScoreSummaryHeaderProps) {
  const [showLegend, setShowLegend] = useState(false);
  const [showInsights, setShowInsights] = useState(true);

  const hasLearnedData = learnedPatterns && similarJobsCount > 0;

  return (
    <Card className="p-4 md:p-6 mb-6">
      <div className="space-y-4">
        {/* Score Bars */}
        <div className="flex flex-col sm:flex-row gap-6">
          {atsScore && (
            <ScoreBar
              score={atsScore.overall}
              label="ATS Score"
              passed={atsScore.passed}
              description={
                atsScore.passed ? "Likely to pass ATS" : "May be filtered by ATS"
              }
            />
          )}
          {hrScore && (
            <ScoreBar
              score={hrScore.overall}
              label="HR Score"
              description={
                hrScore.overall >= 70
                  ? '"Would Interview"'
                  : hrScore.overall >= 50
                    ? "Needs improvement"
                    : "Unlikely to interview"
              }
            />
          )}

          {/* Legend & Formula Buttons */}
          <div className="flex items-start gap-2 sm:ml-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => setShowLegend(!showLegend)}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Legend</span>
                    {showLegend ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View color and shape legend</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <ScoringFormulaTooltip atsScore={atsScore} hrScore={hrScore} />
          </div>
        </div>

        {/* Legend (Collapsible) */}
        {showLegend && (
          <div className="pt-3 border-t animate-in slide-in-from-top-2 duration-200">
            <FeedbackLegend />
          </div>
        )}

        {/* Learned Insights from Database */}
        {hasLearnedData && (
          <div className="pt-3 border-t">
            <button
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-accent transition-colors w-full text-left"
              onClick={() => setShowInsights(!showInsights)}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Based on {similarJobsCount} similar successful resumes</span>
              {showInsights ? (
                <ChevronUp className="h-3 w-3 ml-auto" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-auto" />
              )}
            </button>

            {showInsights && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-200">
                {/* Top Verbs */}
                {learnedPatterns.commonStrongVerbs.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Top Action Verbs
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {learnedPatterns.commonStrongVerbs.slice(0, 5).map((verb) => (
                        <Badge
                          key={verb}
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {verb}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Must-Have Skills */}
                {learnedPatterns.mustHaveSkills.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Must-Have Skills
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {learnedPatterns.mustHaveSkills.slice(0, 5).map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metrics Recommendation */}
                {learnedPatterns.avgMetricsPerBullet.positive > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Quantification Target
                    </p>
                    <p className="text-sm text-foreground">
                      {learnedPatterns.avgMetricsPerBullet.recommendation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
