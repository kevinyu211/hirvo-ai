"use client";

import { useState } from "react";
import {
  ChevronRight,
  Sparkles,
  TrendingUp,
  Lightbulb,
  BarChart3,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LearnedInsight, LearnedPatterns } from "@/lib/success-matching";
import type { ContrastiveInsight } from "@/lib/contrastive-analysis";

export interface LearnedInsightsProps {
  similarJobsFound: number;
  positiveExamples: number;
  negativeExamples: number;
  patterns: LearnedPatterns | null;
  insights: LearnedInsight[];
  contrastiveInsights?: ContrastiveInsight[];
}

export function LearnedInsights({
  similarJobsFound,
  positiveExamples,
  negativeExamples,
  patterns,
  insights,
  contrastiveInsights = [],
}: LearnedInsightsProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Don't render if no data
  if (similarJobsFound === 0 || insights.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-xl overflow-hidden border-violet-200 bg-violet-50/30">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-violet-100/50 hover:bg-violet-100/70 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`w-4 h-4 text-violet-600 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
          <Sparkles className="w-4 h-4 text-violet-600" />
          <span className="font-medium text-sm text-violet-900">
            What Worked for Similar Jobs
          </span>
          <span className="text-xs text-violet-600 bg-violet-200/70 px-2 py-0.5 rounded-full">
            {insights.length} insights
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Stats Summary */}
          <div className="flex gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>{similarJobsFound} similar jobs analyzed</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{positiveExamples} successful</span>
            </div>
            {negativeExamples > 0 && (
              <div className="flex items-center gap-1.5 text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{negativeExamples} rejected</span>
              </div>
            )}
          </div>

          {/* Contrastive Insights (if available) */}
          {contrastiveInsights.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-violet-800 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Key Differences Found
              </h4>
              <div className="space-y-2">
                {contrastiveInsights.slice(0, 3).map((insight, i) => (
                  <ContrastiveInsightCard key={i} insight={insight} />
                ))}
              </div>
            </div>
          )}

          {/* Learned Insights */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-violet-800 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Recommendations Based on Success Patterns
            </h4>
            <div className="space-y-2">
              {insights.slice(0, 5).map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </div>

          {/* Key Metrics (if patterns available) */}
          {patterns && (
            <div className="space-y-2 pt-2 border-t border-violet-200">
              <h4 className="text-xs font-medium text-violet-800 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Success Benchmarks
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {patterns.avgMetricsPerBullet.positive > 0 && (
                  <MetricCard
                    label="Metrics per bullet"
                    value={patterns.avgMetricsPerBullet.positive.toFixed(1)}
                    subtext="in successful resumes"
                  />
                )}
                {patterns.avgBulletCount.positive > 0 && (
                  <MetricCard
                    label="Bullet points"
                    value={patterns.avgBulletCount.positive.toString()}
                    subtext="average count"
                  />
                )}
              </div>

              {/* Common Strong Verbs */}
              {patterns.commonStrongVerbs.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Top action verbs in successful resumes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {patterns.commonStrongVerbs.slice(0, 6).map((verb) => (
                      <Badge
                        key={verb}
                        variant="outline"
                        className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 capitalize"
                      >
                        {verb}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Must-Have Skills */}
              {patterns.mustHaveSkills.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Skills appearing in most successful resumes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {patterns.mustHaveSkills.slice(0, 5).map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="text-xs bg-violet-100 text-violet-700 border-violet-200"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: LearnedInsight }) {
  const getIcon = () => {
    switch (insight.type) {
      case "quantification":
        return <BarChart3 className="w-3.5 h-3.5 text-violet-600" />;
      case "verbs":
        return <Sparkles className="w-3.5 h-3.5 text-violet-600" />;
      case "skills":
        return <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />;
      case "structure":
        return <TrendingUp className="w-3.5 h-3.5 text-violet-600" />;
      default:
        return <Lightbulb className="w-3.5 h-3.5 text-violet-600" />;
    }
  };

  const getBorderColor = () => {
    switch (insight.importance) {
      case "high":
        return "border-l-violet-600";
      case "medium":
        return "border-l-violet-400";
      default:
        return "border-l-violet-200";
    }
  };

  return (
    <div
      className={`flex items-start gap-2 p-2.5 bg-white/50 rounded-lg border-l-2 ${getBorderColor()}`}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground">{insight.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="outline"
            className={`text-[10px] ${
              insight.importance === "high"
                ? "bg-violet-100 text-violet-700 border-violet-200"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {insight.importance}
          </Badge>
          <span className="text-[10px] text-muted-foreground capitalize">
            {insight.source.replace("_", " ")}
          </span>
        </div>
      </div>
    </div>
  );
}

function ContrastiveInsightCard({ insight }: { insight: ContrastiveInsight }) {
  return (
    <div className="flex items-start gap-2 p-2.5 bg-white/50 rounded-lg border-l-2 border-l-emerald-500">
      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground">{insight.insight}</p>
        <div className="flex items-center gap-3 mt-1.5 text-[10px]">
          <span className="text-emerald-600">
            Successful: {insight.positiveAvg}
          </span>
          <span className="text-red-600">
            Rejected: {insight.negativeAvg}
          </span>
          {insight.percentDiff !== 0 && (
            <span className="text-muted-foreground">
              ({insight.percentDiff > 0 ? "+" : ""}
              {insight.percentDiff}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="p-2.5 bg-white/50 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-violet-700">{value}</p>
      <p className="text-[10px] text-muted-foreground">{subtext}</p>
    </div>
  );
}
