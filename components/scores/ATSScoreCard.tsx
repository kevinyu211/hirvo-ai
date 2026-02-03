"use client";

import { useState } from "react";
import type { ATSScore, ATSIssue } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Score Gauge — circular SVG gauge with animated draw effect + bold styling
// ============================================================================
function ScoreGauge({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const strokeWidth = 14;

  // Color based on score - theme-aware
  const getColorClass = (score: number) => {
    if (score >= 75) return { stroke: "stroke-[hsl(var(--severity-success))]", text: "text-[hsl(var(--severity-success))]", bg: "bg-[hsl(var(--severity-success))]", glow: true };
    if (score >= 50) return { stroke: "stroke-[hsl(var(--severity-warning))]", text: "text-[hsl(var(--severity-warning))]", bg: "bg-[hsl(var(--severity-warning))]", glow: false };
    return { stroke: "stroke-[hsl(var(--severity-critical))]", text: "text-[hsl(var(--severity-critical))]", bg: "bg-[hsl(var(--severity-critical))]", glow: false };
  };

  const colors = getColorClass(score);
  const isExcellent = score >= 85;
  const containerClass = isExcellent
    ? "relative inline-flex items-center justify-center rounded-full score-excellent p-2"
    : "relative inline-flex items-center justify-center";

  return (
    <div className={containerClass}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`atsGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(158 64% 50%)" />
            <stop offset="100%" stopColor="hsl(158 64% 35%)" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle with animated draw */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          stroke={score >= 75 ? `url(#atsGradient-${size})` : undefined}
          className={`${score < 75 ? colors.stroke : ''} score-gauge-circle`}
          style={{
            "--circumference": circumference,
            "--progress": progress,
            filter: colors.glow ? "drop-shadow(0 0 8px hsl(158 64% 40% / 0.4))" : undefined,
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center score-gauge-text">
        <span className={`text-4xl md:text-5xl font-display font-bold ${colors.text} tracking-tight`}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">out of 100</span>
      </div>
    </div>
  );
}

// ============================================================================
// Score Bar — horizontal bar for sub-scores - Bold styling
// ============================================================================
function ScoreBar({ score, label }: { score: number; label: string }) {
  const getColorClass = (score: number) => {
    if (score >= 75) return "bg-gradient-to-r from-emerald-500 to-emerald-400";
    if (score >= 50) return "bg-gradient-to-r from-amber-500 to-amber-400";
    return "bg-gradient-to-r from-red-500 to-red-400";
  };

  const getTextColorClass = (score: number) => {
    if (score >= 75) return "text-[hsl(var(--severity-success))]";
    if (score >= 50) return "text-[hsl(var(--severity-warning))]";
    return "text-[hsl(var(--severity-critical))]";
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={`font-bold ${getTextColorClass(score)}`}>
          {score}%
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full ${getColorClass(score)} transition-all duration-700 ease-out shadow-sm`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Severity badge mapping
// ============================================================================
function SeverityBadge({ severity }: { severity: ATSIssue["severity"] }) {
  const config = {
    critical: { className: "severity-critical", label: "Critical" },
    warning: { className: "severity-warning", label: "Warning" },
    info: { className: "severity-info", label: "Info" },
  };

  const { className, label } = config[severity] || config.info;

  return (
    <Badge variant="outline" className={`${className} text-xs font-medium border`}>
      {label}
    </Badge>
  );
}

// ============================================================================
// Expandable breakdown section - Bold styling
// ============================================================================
function BreakdownSection({
  title,
  score,
  children,
  defaultOpen = false,
  issueCount = 0,
}: {
  title: string;
  score: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  issueCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const scoreColor = score >= 75 ? "text-[hsl(var(--severity-success))]" : score >= 50 ? "text-[hsl(var(--severity-warning))]" : "text-[hsl(var(--severity-critical))]";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border-2 border-transparent bg-muted/30 p-4 text-left hover:bg-muted/50 hover:border-accent/20 hover:shadow-soft transition-all duration-300 ease-out-back group"
        >
          <div className="flex items-center gap-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              className={`transition-transform duration-300 ease-out-back text-muted-foreground group-hover:text-accent ${isOpen ? "rotate-90" : ""}`}
            >
              <path
                d="M6.75 4.5L11.25 9L6.75 13.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-semibold text-sm text-foreground">{title}</span>
            {issueCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-muted rounded-full px-2.5">
                {issueCount} {issueCount === 1 ? "issue" : "issues"}
              </Badge>
            )}
          </div>
          <span className={`text-sm font-bold ${scoreColor}`}>
            {score}%
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="animate-collapsible-down">
        <div className="mt-4 space-y-3 pl-7">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Info tooltip — "What ATS systems look for"
// ============================================================================
function ATSInfoTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-muted w-5 h-5 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            aria-label="What ATS systems look for"
          >
            ?
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-left p-4">
          <p className="font-display font-semibold mb-2">What ATS systems look for:</p>
          <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
            <li>Exact keyword matches from the job description</li>
            <li>Standard section headings (Experience, Education, Skills)</li>
            <li>Single-column, ATS-friendly formatting</li>
            <li>Consistent date formats and contact info</li>
            <li>No tables, images, or multi-column layouts</li>
          </ul>
          <p className="mt-3 text-xs text-accent font-medium">
            98% of Fortune 500 companies use ATS to filter resumes.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// ATSScoreCard — main component
// ============================================================================
export interface ATSScoreCardProps {
  score: ATSScore;
}

export function ATSScoreCard({ score }: ATSScoreCardProps) {
  const keywordIssues = score.issues.filter(
    (i) => i.type === "missing_keyword" || i.type === "weak_keyword"
  );
  const formattingIssues = score.issues.filter(
    (i) => i.type === "formatting"
  );
  const sectionIssues = score.issues.filter((i) => i.type === "section");

  return (
    <Card className="overflow-hidden animate-scale-bounce-in rounded-3xl">
      {/* Header with gradient accent - bolder */}
      <div className={`h-2 ${score.passed ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-red-500 to-red-400"}`} />

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl icon-red border flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>ATS Score</CardTitle>
                <ATSInfoTooltip />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Applicant Tracking System compatibility
              </p>
            </div>
          </div>
          <Badge
            className={`text-xs font-semibold px-3 py-1 border ${
              score.passed
                ? "severity-success"
                : "severity-critical"
            }`}
          >
            {score.passed ? "PASS" : "FAIL"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Score Gauge */}
        <div className="flex justify-center py-4">
          <ScoreGauge score={score.overall} size={180} />
        </div>

        {/* Sub-score Bars - Bold container */}
        <div className="space-y-5 p-5 rounded-2xl bg-muted/20 border border-muted/30">
          <ScoreBar score={score.keywordMatchPct} label="Keyword Match" />
          <ScoreBar score={score.formattingScore} label="Formatting" />
          <ScoreBar score={score.sectionScore} label="Section Structure" />
        </div>

        {/* Expandable Breakdown Cards */}
        <div className="space-y-3">
          {/* Keyword Match Breakdown */}
          <BreakdownSection
            title="Keyword Match"
            score={score.keywordMatchPct}
            defaultOpen={keywordIssues.length > 0}
            issueCount={keywordIssues.length}
          >
            {score.matchedKeywords.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[hsl(var(--severity-success))] flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Matched Keywords ({score.matchedKeywords.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {score.matchedKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="text-xs severity-success border"
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {score.missingKeywords.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-medium text-[hsl(var(--severity-critical))] flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Missing Keywords ({score.missingKeywords.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {score.missingKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="outline"
                      className="text-xs severity-critical border"
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {keywordIssues
              .filter((i) => i.type === "weak_keyword")
              .map((issue, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border severity-warning p-3"
                >
                  <div className="flex items-start gap-2">
                    <SeverityBadge severity={issue.severity} />
                    <div className="text-sm">
                      <p className="text-[hsl(var(--severity-warning))]">{issue.message}</p>
                      {issue.suggestion && (
                        <p className="mt-1.5 text-[hsl(var(--severity-warning))] opacity-80 text-xs">
                          <span className="font-medium">Suggestion:</span> {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            {keywordIssues.length === 0 &&
              score.matchedKeywords.length === 0 &&
              score.missingKeywords.length === 0 && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-[hsl(var(--severity-success))]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  No keyword issues found.
                </p>
              )}
          </BreakdownSection>

          {/* Formatting Breakdown */}
          <BreakdownSection
            title="Formatting"
            score={score.formattingScore}
            issueCount={formattingIssues.length}
          >
            {formattingIssues.length > 0 ? (
              formattingIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${
                    issue.severity === "critical"
                      ? "severity-critical"
                      : issue.severity === "warning"
                        ? "severity-warning"
                        : "severity-info"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <SeverityBadge severity={issue.severity} />
                    <div className="text-sm">
                      <p>
                        {issue.message}
                      </p>
                      {issue.suggestion && (
                        <p className="mt-1.5 text-xs opacity-80">
                          <span className="font-medium">Suggestion:</span> {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <svg className="w-4 h-4 text-[hsl(var(--severity-success))]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No formatting issues. Your resume is ATS-friendly.
              </p>
            )}
          </BreakdownSection>

          {/* Section Structure Breakdown */}
          <BreakdownSection
            title="Section Structure"
            score={score.sectionScore}
            issueCount={sectionIssues.length}
          >
            {sectionIssues.length > 0 ? (
              sectionIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${
                    issue.severity === "critical"
                      ? "severity-critical"
                      : "severity-warning"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <SeverityBadge severity={issue.severity} />
                    <div className="text-sm">
                      <p>
                        {issue.message}
                      </p>
                      {issue.suggestion && (
                        <p className="mt-1.5 text-xs opacity-80">
                          <span className="font-medium">Suggestion:</span> {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <svg className="w-4 h-4 text-[hsl(var(--severity-success))]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                All standard sections detected. Well organized!
              </p>
            )}
          </BreakdownSection>
        </div>
      </CardContent>
    </Card>
  );
}
