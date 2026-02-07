"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Bot,
  Users,
  Target,
  Sparkles,
  TrendingUp,
  Zap,
  ArrowRight,
} from "lucide-react";
import type { Highlight, HighlightAffects, HighlightSeverity } from "@/lib/types/resume-doc";
import type { ATSScore, HRScore } from "@/lib/types";
import { getNavigation } from "@/lib/highlights/ordering";
import { calculateScoreImpact, formatScoreImpact } from "@/lib/highlights/score-impact";

// =============================================================================
// Types
// =============================================================================

interface IssuePanelProps {
  highlight: Highlight | null;
  highlights: Highlight[];
  onAccept: (highlightId: string) => void;
  onDismiss: (highlightId: string) => void;
  onNavigate: (highlightId: string) => void;
  isApplying?: boolean;
  className?: string;
  // Score data for calculating actual impact
  atsScore?: ATSScore | null;
  hrScore?: HRScore | null;
}

// =============================================================================
// Helper Components
// =============================================================================

function SeverityIcon({ severity }: { severity: HighlightSeverity }) {
  switch (severity) {
    case "critical":
      return <AlertCircle className="w-4 h-4" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4" />;
    case "info":
      return <Info className="w-4 h-4" />;
  }
}

function SeverityBadge({ severity }: { severity: HighlightSeverity }) {
  const variants: Record<HighlightSeverity, string> = {
    critical: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  };

  const labels: Record<HighlightSeverity, string> = {
    critical: "Critical",
    warning: "Warning",
    info: "Tip",
  };

  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", variants[severity])}>
      <SeverityIcon severity={severity} />
      {labels[severity]}
    </Badge>
  );
}

function AffectsBadge({ affects }: { affects: HighlightAffects }) {
  const config: Record<HighlightAffects, { label: string; icon: React.ReactNode; className: string }> = {
    ATS: {
      label: "ATS",
      icon: <Bot className="w-3 h-3" />,
      className: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 border-violet-200",
    },
    HR_APPEAL: {
      label: "HR",
      icon: <Users className="w-3 h-3" />,
      className: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border-sky-200",
    },
    SEMANTIC: {
      label: "Clarity",
      icon: <Target className="w-3 h-3" />,
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200",
    },
    FORMAT: {
      label: "Format",
      icon: <AlertTriangle className="w-3 h-3" />,
      className: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200",
    },
    ELIGIBILITY: {
      label: "Red Flag",
      icon: <AlertCircle className="w-3 h-3" />,
      className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-200",
    },
  };

  const { label, icon, className } = config[affects];

  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", className)}>
      {icon}
      {label}
    </Badge>
  );
}

/**
 * Score impact chip with percentage
 */
function ScoreImpactChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "violet" | "sky" | "emerald";
}) {
  const colorClasses = {
    violet: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
    sky: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  };

  const iconClasses = {
    violet: "text-violet-500",
    sky: "text-sky-500",
    emerald: "text-emerald-500",
  };

  const icons = {
    ATS: <Bot className={cn("w-3.5 h-3.5", iconClasses[color])} />,
    HR: <Users className={cn("w-3.5 h-3.5", iconClasses[color])} />,
    FIT: <Target className={cn("w-3.5 h-3.5", iconClasses[color])} />,
  };

  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium", colorClasses[color])}>
      {icons[label as keyof typeof icons] || <TrendingUp className={cn("w-3.5 h-3.5", iconClasses[color])} />}
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="font-medium text-lg text-foreground mb-2">
        All Issues Resolved!
      </h3>
      <p className="text-sm text-muted-foreground max-w-[200px]">
        Great job! There are no more issues to address.
      </p>
    </div>
  );
}

// =============================================================================
// Main IssuePanel Component
// =============================================================================

export function IssuePanel({
  highlight,
  highlights,
  onAccept,
  onDismiss,
  onNavigate,
  isApplying,
  className,
  atsScore,
  hrScore,
}: IssuePanelProps) {
  // Get navigation info
  const navigation = useMemo(() => {
    if (!highlight) return null;
    return getNavigation(highlights, highlight.id);
  }, [highlight, highlights]);

  // Calculate score impact based on actual scores
  const scoreImpact = useMemo(() => {
    if (!highlight) return null;
    return calculateScoreImpact(highlight, atsScore || null, hrScore || null);
  }, [highlight, atsScore, hrScore]);

  // Format impact for display
  const impactDisplay = useMemo(() => {
    if (!scoreImpact) return [];
    return formatScoreImpact(scoreImpact);
  }, [scoreImpact]);

  // No issues state
  if (!highlight) {
    return (
      <Card className={cn("h-full", className)}>
        <EmptyState />
      </Card>
    );
  }

  // Determine if we have an exact fix (can auto-apply) vs advisory fix (guidance only)
  const hasExactFix = Boolean(highlight.fix_action?.new_text && highlight.original_text);
  const hasAdvisoryFix = Boolean(highlight.suggested_fix_text);
  const hasFix = hasExactFix || hasAdvisoryFix;

  // Check for semantic match (abbreviation detection)
  const isSemanticMatch = highlight.semantic_match || false;
  const targetKeyword = highlight.target_keyword;
  const matchedSynonym = highlight.matched_synonym || highlight.original_text;

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      {/* Header with navigation */}
      <CardHeader className="flex-shrink-0 py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={highlight.severity} />
            <AffectsBadge affects={highlight.affects} />
            {navigation && (
              <span className="text-xs text-muted-foreground">
                {navigation.currentIndex + 1} / {navigation.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!navigation?.hasPrevious}
              onClick={() =>
                navigation?.previousId && onNavigate(navigation.previousId)
              }
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!navigation?.hasNext}
              onClick={() =>
                navigation?.nextId && onNavigate(navigation.nextId)
              }
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        {/* Issue title */}
        <div>
          <h3 className="font-semibold text-foreground text-base leading-tight mb-2">
            {highlight.issue_title}
          </h3>
        </div>

        {/* Why This Matters - Analysis explanation */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1 uppercase tracking-wide flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Why This Matters
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            {highlight.issue_description}
          </p>
        </div>

        {/* Semantic Match Detection - shown when abbreviation detected */}
        {isSemanticMatch && targetKeyword && matchedSynonym && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide flex items-center gap-1">
              <Bot className="w-3 h-3" />
              AI Detection
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              Found &ldquo;<span className="font-semibold">{matchedSynonym}</span>&rdquo; which is
              semantically equivalent to &ldquo;<span className="font-semibold">{targetKeyword}</span>&rdquo;,
              but ATS systems require exact keyword matches.
            </p>
          </div>
        )}

        {/* Before/After Fix Display */}
        {hasExactFix && highlight.original_text && highlight.fix_action?.new_text ? (
          <div className="space-y-2">
            {/* Before - red strikethrough */}
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400 mb-1 font-medium uppercase tracking-wide">
                Current
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 line-through leading-relaxed">
                &ldquo;{highlight.original_text}&rdquo;
              </p>
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* After - green highlight */}
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border-2 border-emerald-300 dark:border-emerald-700">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-medium uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Replace With
              </p>
              <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium leading-relaxed">
                &ldquo;{highlight.fix_action.new_text}&rdquo;
              </p>
            </div>

            {/* ATS/HR/FIT Impact Explanations */}
            <div className="space-y-2 mt-3">
              {/* ATS Impact */}
              {highlight.ats_impact && (
                <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 p-3 border border-violet-200 dark:border-violet-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">ATS Impact</span>
                  </div>
                  <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed">
                    {highlight.ats_impact}
                  </p>
                </div>
              )}

              {/* HR Impact */}
              {highlight.hr_impact && (
                <div className="rounded-lg bg-sky-50 dark:bg-sky-950/30 p-3 border border-sky-200 dark:border-sky-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wide">HR Impact</span>
                  </div>
                  <p className="text-sm text-sky-800 dark:text-sky-200 leading-relaxed">
                    {highlight.hr_impact}
                  </p>
                </div>
              )}

              {/* Job Fit Impact */}
              {highlight.fit_impact && (
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Job Fit</span>
                  </div>
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">
                    {highlight.fit_impact}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : highlight.suggested_fix_text ? (
          /* Advisory fix - guidance without exact replacement */
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border-2 border-emerald-300 dark:border-emerald-700">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-medium uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Suggested Action
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium leading-relaxed">
              {highlight.suggested_fix_text}
            </p>
          </div>
        ) : null}

        {/* Score Impact - calculated percentages */}
        {impactDisplay.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <TrendingUp className="w-3.5 h-3.5" />
              Fixing This Improves
            </div>
            <div className="flex flex-wrap gap-2">
              {impactDisplay.map((impact, idx) => (
                <ScoreImpactChip
                  key={idx}
                  label={impact.label}
                  value={impact.value}
                  color={impact.color}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Actions - prominent Accept button */}
      <div className="flex-shrink-0 border-t p-4 bg-muted/20">
        <div className="flex items-center gap-2">
          {hasExactFix ? (
            /* Exact fix: can auto-apply replacement */
            <Button
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onAccept(highlight.id)}
              disabled={isApplying}
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Apply Fix
                </>
              )}
            </Button>
          ) : hasAdvisoryFix ? (
            /* Advisory fix: user makes the change manually, button marks it as addressed */
            <Button
              className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onAccept(highlight.id)}
              disabled={isApplying}
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Mark as Fixed
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onDismiss(highlight.id)}
              disabled={isApplying}
            >
              <X className="w-4 h-4" />
              Skip
            </Button>
          )}
          {hasFix && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => onDismiss(highlight.id)}
              disabled={isApplying}
              title="Skip this issue"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

export function IssuePanelSkeleton() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-20 h-5 bg-muted rounded animate-pulse" />
            <div className="w-16 h-5 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 space-y-4">
        <div className="w-3/4 h-6 bg-muted rounded animate-pulse" />
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="w-24 h-4 bg-muted rounded animate-pulse" />
          <div className="w-full h-4 bg-muted rounded animate-pulse" />
          <div className="w-5/6 h-4 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="w-16 h-3 bg-muted rounded animate-pulse mb-2" />
            <div className="w-full h-4 bg-muted rounded animate-pulse" />
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="w-20 h-3 bg-muted rounded animate-pulse mb-2" />
            <div className="w-full h-4 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <div className="w-28 h-3 bg-muted rounded animate-pulse mb-2" />
          <div className="flex gap-2">
            <div className="w-20 h-6 bg-muted rounded animate-pulse" />
            <div className="w-20 h-6 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
      <div className="flex-shrink-0 border-t p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-10 bg-muted rounded animate-pulse" />
          <div className="w-10 h-10 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}
