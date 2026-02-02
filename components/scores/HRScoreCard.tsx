"use client";

import { useState } from "react";
import type { HRScore, HRFeedback } from "@/lib/types";
import type { FormattingSuggestion } from "@/lib/hr-engine";
import type { HRRedFlag } from "@/lib/prompts/hr-prompts";
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
// Score Gauge — circular SVG gauge with animated draw effect
// ============================================================================
function ScoreGauge({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const strokeWidth = 12;

  // Color based on score - theme-aware
  const getColorClass = (score: number) => {
    if (score >= 75) return { stroke: "stroke-[hsl(var(--severity-success))]", text: "text-[hsl(var(--severity-success))]", bg: "bg-[hsl(var(--severity-success))]" };
    if (score >= 50) return { stroke: "stroke-[hsl(var(--severity-warning))]", text: "text-[hsl(var(--severity-warning))]", bg: "bg-[hsl(var(--severity-warning))]" };
    return { stroke: "stroke-[hsl(var(--severity-critical))]", text: "text-[hsl(var(--severity-critical))]", bg: "bg-[hsl(var(--severity-critical))]" };
  };

  const colors = getColorClass(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          className={`${colors.stroke} score-gauge-circle`}
          style={{
            "--circumference": circumference,
            "--progress": progress,
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center score-gauge-text">
        <span className={`text-3xl md:text-4xl font-display font-bold ${colors.text}`}>
          {Math.round(score)}
        </span>
        <span className="text-xs text-muted-foreground font-medium">out of 100</span>
      </div>
    </div>
  );
}

// ============================================================================
// Score Bar — horizontal bar for sub-scores
// ============================================================================
function ScoreBar({ score, label }: { score: number; label: string }) {
  const getColorClass = (score: number) => {
    if (score >= 75) return "bg-[hsl(var(--severity-success))]";
    if (score >= 50) return "bg-[hsl(var(--severity-warning))]";
    return "bg-[hsl(var(--severity-critical))]";
  };

  const getTextColorClass = (score: number) => {
    if (score >= 75) return "text-[hsl(var(--severity-success))]";
    if (score >= 50) return "text-[hsl(var(--severity-warning))]";
    return "text-[hsl(var(--severity-critical))]";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={`font-semibold ${getTextColorClass(score)}`}>
          {Math.round(score)}%
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full ${getColorClass(score)} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(Math.round(score), 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Severity badge mapping
// ============================================================================
function SeverityBadge({
  severity,
}: {
  severity: "critical" | "warning" | "info";
}) {
  const config = {
    critical: { className: "severity-critical", label: "critical" },
    warning: { className: "severity-warning", label: "warning" },
    info: { className: "severity-info", label: "info" },
  };

  const { className, label } = config[severity] || config.info;

  return (
    <Badge variant="outline" className={`${className} text-xs font-medium border`}>
      {label}
    </Badge>
  );
}

// ============================================================================
// Expandable breakdown section
// ============================================================================
function BreakdownSection({
  title,
  score,
  children,
  defaultOpen = false,
}: {
  title: string;
  score: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-medium text-sm">{title}</span>
          </div>
          <span
            className={`text-sm font-semibold ${
              score >= 70
                ? "text-[hsl(var(--severity-success))]"
                : score >= 40
                  ? "text-[hsl(var(--severity-warning))]"
                  : "text-[hsl(var(--severity-critical))]"
            }`}
          >
            {Math.round(score)}%
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2 pl-6">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Info tooltip — "How HR simulation works"
// ============================================================================
function HRInfoTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border w-5 h-5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
            aria-label="How HR simulation works"
          >
            ?
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-left">
          <p className="font-semibold mb-1">How the HR simulation works:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-xs">
            <li>
              <strong>Formatting Analysis</strong> — compares your resume
              formatting against successful resumes in your field
            </li>
            <li>
              <strong>Semantic Match</strong> — measures meaning overlap between
              your resume and the job description using AI embeddings
            </li>
            <li>
              <strong>HR Reviewer</strong> — AI acts as an experienced recruiter
              evaluating your resume holistically
            </li>
          </ul>
          <p className="mt-1 text-xs opacity-80">
            Combined score: Formatting (20%) + Semantic (40%) + HR Review (40%)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Layer-specific detail components
// ============================================================================

/** Layer 1 — Formatting suggestion cards */
function FormattingSuggestionCard({
  suggestion,
}: {
  suggestion: FormattingSuggestion;
}) {
  const severityClass =
    suggestion.severity === "critical"
      ? "severity-critical"
      : suggestion.severity === "warning"
        ? "severity-warning"
        : "severity-info";

  return (
    <div className={`rounded-md border p-2 text-xs ${severityClass}`}>
      <div className="flex items-start gap-2">
        <SeverityBadge severity={suggestion.severity} />
        <div>
          <p>{suggestion.message}</p>
          {suggestion.percentageSupport > 0 && (
            <p className="mt-1 opacity-80">
              Based on {suggestion.percentageSupport}% of successful resumes
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Layer 2 — Per-section semantic similarity bars */
function SemanticSectionBar({
  section,
  score,
}: {
  section: string;
  score: number;
}) {
  const color =
    score >= 70
      ? "bg-[hsl(var(--icon-violet))]"
      : score >= 40
        ? "bg-[hsl(var(--icon-violet))] opacity-60"
        : "bg-[hsl(var(--icon-violet))] opacity-30";

  const textColor =
    score >= 70
      ? "text-[hsl(var(--severity-success))]"
      : score >= 40
        ? "text-[hsl(var(--severity-warning))]"
        : "text-[hsl(var(--severity-critical))]";

  // Capitalize section name
  const label = section.charAt(0).toUpperCase() + section.slice(1);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${textColor}`}>
          {Math.round(score)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/30">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{
            width: `${Math.min(Math.round(score), 100)}%`,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

/** Layer 3 — Red flag card */
function RedFlagCard({ flag }: { flag: HRRedFlag }) {
  const typeLabel = flag.type.replace(/_/g, " ");

  const severityClass =
    flag.severity === "critical"
      ? "severity-critical"
      : flag.severity === "warning"
        ? "severity-warning"
        : "severity-info";

  return (
    <div className={`rounded-md border p-2 text-xs ${severityClass}`}>
      <div className="flex items-start gap-2">
        <SeverityBadge severity={flag.severity} />
        <div>
          <p className="font-medium capitalize">{typeLabel}</p>
          <p>{flag.description}</p>
          {flag.mitigation && (
            <p className="mt-1 opacity-80">
              Suggestion: {flag.mitigation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Callback decision badge */
function CallbackBadge({
  decision,
}: {
  decision: "yes" | "no" | "maybe";
}) {
  if (decision === "yes") {
    return (
      <Badge className="severity-success border">Would Interview</Badge>
    );
  }
  if (decision === "no") {
    return (
      <Badge className="severity-critical border">Would Not Interview</Badge>
    );
  }
  return (
    <Badge className="severity-warning border">Maybe Interview</Badge>
  );
}

// ============================================================================
// HRScoreCard — main component
// ============================================================================

/** Layer data from the HR score API response */
export interface HRLayerData {
  formatting?: {
    score: number;
    suggestions: FormattingSuggestion[];
    referenceCount: number;
  };
  semantic?: {
    score: number;
    sectionScores: { section: string; score: number }[];
  };
  llmReview?: {
    score: number;
    firstImpression: string;
    careerNarrative: { score: number; assessment: string; suggestion: string };
    achievementStrength: {
      score: number;
      assessment: string;
      suggestion: string;
    };
    roleRelevance: { score: number; assessment: string; suggestion: string };
    redFlags: HRRedFlag[];
    sectionComments: {
      section: string;
      comment: string;
      suggestion: string;
      score: number;
    }[];
    callbackDecision: { decision: "yes" | "no" | "maybe"; reasoning: string };
  } | null;
}

export interface HRScoreCardProps {
  score: HRScore;
  layers?: HRLayerData;
}

export function HRScoreCard({ score, layers }: HRScoreCardProps) {
  const formattingFeedback = score.feedback.filter(
    (f) => f.type === "formatting"
  );
  const semanticFeedback = score.feedback.filter(
    (f) => f.type === "semantic"
  );
  const llmFeedback = score.feedback.filter(
    (f) => f.type === "llm_review"
  );

  const hasLLMReview = score.llmScore > 0 || (layers?.llmReview != null);

  // Determine overall pass/fail
  const passed = score.overall >= 60;

  return (
    <Card className="overflow-hidden animate-fade-up">
      {/* Header with gradient accent */}
      <div className={`h-1.5 ${passed ? "bg-[hsl(var(--severity-success))]" : "bg-[hsl(var(--severity-warning))]"}`} />

      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl icon-violet border flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>HR Score</CardTitle>
                <HRInfoTooltip />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Human recruiter perspective
              </p>
            </div>
          </div>
          {layers?.llmReview && (
            <CallbackBadge
              decision={layers.llmReview.callbackDecision.decision}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Score Gauge */}
        <div className="flex justify-center py-4">
          <ScoreGauge score={score.overall} size={180} />
        </div>

        {/* Sub-score Bars */}
        <div className="space-y-4 p-4 rounded-xl bg-muted/20">
          <ScoreBar
            score={score.formattingScore}
            label="Formatting (Layer 1)"
          />
          <ScoreBar
            score={score.semanticScore}
            label="Semantic Match (Layer 2)"
          />
          <ScoreBar
            score={score.llmScore}
            label="HR Review (Layer 3)"
          />
        </div>

        {/* Expandable Layer Breakdown Cards */}
        <div className="space-y-2">
          {/* Layer 1: Formatting Analysis */}
          <BreakdownSection
            title={`Formatting Analysis (${formattingFeedback.length} issues)`}
            score={score.formattingScore}
            defaultOpen={formattingFeedback.length > 0}
          >
            {layers?.formatting ? (
              <>
                {layers.formatting.referenceCount > 0 && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Compared against {layers.formatting.referenceCount} successful
                    resumes
                  </p>
                )}
                {layers.formatting.suggestions.length > 0 ? (
                  layers.formatting.suggestions.map((s, idx) => (
                    <FormattingSuggestionCard key={idx} suggestion={s} />
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No formatting issues found. Your resume formatting looks
                    great.
                  </p>
                )}
              </>
            ) : formattingFeedback.length > 0 ? (
              formattingFeedback.map((fb, idx) => (
                <FeedbackCard key={idx} feedback={fb} />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No formatting issues found. Your resume formatting looks great.
              </p>
            )}
          </BreakdownSection>

          {/* Layer 2: Semantic Match */}
          <BreakdownSection
            title={`Semantic Match (${semanticFeedback.length} issues)`}
            score={score.semanticScore}
            defaultOpen={semanticFeedback.length > 0}
          >
            {layers?.semantic ? (
              <>
                {layers.semantic.sectionScores.length > 0 ? (
                  <div className="space-y-2">
                    {layers.semantic.sectionScores.map((ss) => (
                      <SemanticSectionBar
                        key={ss.section}
                        section={ss.section}
                        score={ss.score}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No section-level data available.
                  </p>
                )}
                {semanticFeedback.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Issues
                    </p>
                    {semanticFeedback.map((fb, idx) => (
                      <FeedbackCard key={idx} feedback={fb} />
                    ))}
                  </div>
                )}
              </>
            ) : semanticFeedback.length > 0 ? (
              semanticFeedback.map((fb, idx) => (
                <FeedbackCard key={idx} feedback={fb} />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                Your resume has strong semantic alignment with the job
                description.
              </p>
            )}
          </BreakdownSection>

          {/* Layer 3: HR Reviewer Comments */}
          <BreakdownSection
            title={`HR Reviewer (${llmFeedback.length} issues)`}
            score={hasLLMReview ? score.llmScore : 0}
            defaultOpen={llmFeedback.length > 0}
          >
            {layers?.llmReview ? (
              <div className="space-y-3">
                {/* First Impression */}
                <div className="rounded-md border border-muted bg-muted/10 p-3 text-xs">
                  <p className="font-medium text-foreground mb-1">
                    First Impression
                  </p>
                  <p className="text-muted-foreground">
                    {layers.llmReview.firstImpression}
                  </p>
                </div>

                {/* Dimension Scores */}
                <div className="space-y-2">
                  <DimensionRow
                    label="Career Narrative"
                    score={layers.llmReview.careerNarrative.score}
                    assessment={layers.llmReview.careerNarrative.assessment}
                  />
                  <DimensionRow
                    label="Achievement Strength"
                    score={layers.llmReview.achievementStrength.score}
                    assessment={
                      layers.llmReview.achievementStrength.assessment
                    }
                  />
                  <DimensionRow
                    label="Role Relevance"
                    score={layers.llmReview.roleRelevance.score}
                    assessment={layers.llmReview.roleRelevance.assessment}
                  />
                </div>

                {/* Red Flags */}
                {layers.llmReview.redFlags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[hsl(var(--severity-critical))]">
                      Red Flags ({layers.llmReview.redFlags.length})
                    </p>
                    {layers.llmReview.redFlags.map((flag, idx) => (
                      <RedFlagCard key={idx} flag={flag} />
                    ))}
                  </div>
                )}

                {/* Section Comments */}
                {layers.llmReview.sectionComments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Section Feedback
                    </p>
                    {layers.llmReview.sectionComments.map((comment, idx) => (
                      <SectionCommentCard key={idx} comment={comment} />
                    ))}
                  </div>
                )}

                {/* Callback Decision */}
                <div className="rounded-md border border-muted bg-muted/10 p-3 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground">
                      Callback Decision
                    </p>
                    <CallbackBadge
                      decision={layers.llmReview.callbackDecision.decision}
                    />
                  </div>
                  <p className="text-muted-foreground">
                    {layers.llmReview.callbackDecision.reasoning}
                  </p>
                </div>
              </div>
            ) : llmFeedback.length > 0 ? (
              llmFeedback.map((fb, idx) => (
                <FeedbackCard key={idx} feedback={fb} />
              ))
            ) : hasLLMReview ? (
              <p className="text-xs text-muted-foreground">
                No specific issues flagged by the HR reviewer.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                HR review data is not available.
              </p>
            )}
          </BreakdownSection>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper components
// ============================================================================

/** Generic feedback card for when detailed layer data isn't available */
function FeedbackCard({ feedback }: { feedback: HRFeedback }) {
  const severityClass =
    feedback.severity === "critical"
      ? "severity-critical"
      : feedback.severity === "warning"
        ? "severity-warning"
        : "severity-info";

  return (
    <div className={`rounded-md border p-2 text-xs ${severityClass}`}>
      <div className="flex items-start gap-2">
        <SeverityBadge severity={feedback.severity} />
        <div>
          <p>{feedback.message}</p>
          {feedback.suggestion && (
            <p className="mt-1 opacity-80">
              {feedback.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** HR review dimension row (career narrative, achievement, relevance) */
function DimensionRow({
  label,
  score,
  assessment,
}: {
  label: string;
  score: number;
  assessment: string;
}) {
  const color =
    score >= 70
      ? "text-[hsl(var(--severity-success))]"
      : score >= 40
        ? "text-[hsl(var(--severity-warning))]"
        : "text-[hsl(var(--severity-critical))]";

  return (
    <div className="rounded-md border border-muted p-2 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-foreground">{label}</span>
        <span className={`font-semibold ${color}`}>{score}/100</span>
      </div>
      <p className="text-muted-foreground">{assessment}</p>
    </div>
  );
}

/** LLM section comment card */
function SectionCommentCard({
  comment,
}: {
  comment: {
    section: string;
    comment: string;
    suggestion: string;
    score: number;
  };
}) {
  const color =
    comment.score >= 70
      ? "text-[hsl(var(--severity-success))]"
      : comment.score >= 40
        ? "text-[hsl(var(--severity-warning))]"
        : "text-[hsl(var(--severity-critical))]";

  return (
    <div className="rounded-md border border-muted p-2 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-foreground capitalize">
          {comment.section}
        </span>
        <span className={`font-semibold ${color}`}>{comment.score}/100</span>
      </div>
      <p className="text-muted-foreground">{comment.comment}</p>
      {comment.suggestion && (
        <p className="mt-1 text-muted-foreground italic">
          {comment.suggestion}
        </p>
      )}
    </div>
  );
}
