"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// Score Gauge Skeleton — circular placeholder matching ScoreGauge dimensions
// ============================================================================
function ScoreGaugeSkeleton({ size = 160 }: { size?: number }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <Skeleton
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

// ============================================================================
// Score Bar Skeleton — horizontal bar placeholder
// ============================================================================
function ScoreBarSkeleton() {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-8" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

// ============================================================================
// Breakdown Section Skeleton — collapsible section placeholder
// ============================================================================
function BreakdownSectionSkeleton() {
  return (
    <div className="flex w-full items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-4 w-10" />
    </div>
  );
}

// ============================================================================
// ATSScoreCardSkeleton — skeleton for ATS score card during loading
// ============================================================================
export function ATSScoreCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Gauge */}
        <div className="flex justify-center">
          <ScoreGaugeSkeleton />
        </div>

        {/* Sub-score Bars */}
        <div className="space-y-3">
          <ScoreBarSkeleton />
          <ScoreBarSkeleton />
          <ScoreBarSkeleton />
        </div>

        {/* Expandable Breakdown Cards */}
        <div className="space-y-2">
          <BreakdownSectionSkeleton />
          <BreakdownSectionSkeleton />
          <BreakdownSectionSkeleton />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HRScoreCardSkeleton — skeleton for HR score card during loading
// ============================================================================
export function HRScoreCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Gauge */}
        <div className="flex justify-center">
          <ScoreGaugeSkeleton />
        </div>

        {/* Sub-score Bars */}
        <div className="space-y-3">
          <ScoreBarSkeleton />
          <ScoreBarSkeleton />
          <ScoreBarSkeleton />
        </div>

        {/* Expandable Layer Breakdown Cards */}
        <div className="space-y-2">
          <BreakdownSectionSkeleton />
          <BreakdownSectionSkeleton />
          <BreakdownSectionSkeleton />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EditorSkeleton — skeleton for the Grammarly editor during loading
// ============================================================================
export function EditorSkeleton() {
  return (
    <div className="space-y-4">
      {/* View Toggle Skeleton */}
      <div className="flex items-center justify-center">
        <Skeleton className="h-10 w-64 rounded-lg" />
      </div>

      {/* Editor Content Skeleton */}
      <div className="rounded-lg border p-4 space-y-3 min-h-[300px]">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-2/3" />
        <div className="h-4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <div className="h-4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-2/3" />
      </div>

      {/* Legend Skeleton */}
      <div className="flex items-center gap-4 justify-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

// ============================================================================
// SuggestionGeneratingSkeleton — indicator for when suggestions are being generated
// ============================================================================
export function SuggestionGeneratingSkeleton() {
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
      <svg
        className="h-5 w-5 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-sm animate-pulse">Generating suggestions...</span>
    </div>
  );
}

// ============================================================================
// AnalysisPipelineSkeleton — comprehensive skeleton for the full analysis view
// ============================================================================
export function AnalysisPipelineSkeleton() {
  return (
    <div className="space-y-8">
      {/* Score Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <ATSScoreCardSkeleton />
        <HRScoreCardSkeleton />
      </div>

      {/* Editor Skeleton */}
      <EditorSkeleton />
    </div>
  );
}

// ============================================================================
// StreamingTextIndicator — indicator for streaming AI responses
// ============================================================================
export function StreamingTextIndicator({ text = "AI is thinking" }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-sm">{text}</span>
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
      </span>
    </div>
  );
}

// ============================================================================
// DashboardCardSkeleton — skeleton for dashboard cards
// ============================================================================
export function DashboardCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
    </Card>
  );
}
