"use client";

import { useState, useEffect } from "react";
import type {
  FormatRecommendation,
  ResumeFormatId,
  StructuredResume,
} from "@/lib/types";
import { FormatCard } from "./FormatCard";
import { FormatPreview } from "./FormatPreview";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";

export interface FormatSelectorProps {
  recommendations: FormatRecommendation[];
  selectedFormat: ResumeFormatId | null;
  onSelect: (formatId: ResumeFormatId) => void;
  resumePreview?: StructuredResume;
  isLoading?: boolean;
  hasData?: boolean;
}

export function FormatSelector({
  recommendations,
  selectedFormat,
  onSelect,
  resumePreview,
  isLoading = false,
  hasData = false,
}: FormatSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Auto-select recommended format if none selected
  useEffect(() => {
    if (!selectedFormat && recommendations.length > 0 && !isLoading) {
      const recommended = recommendations.find((r) => r.isRecommended);
      if (recommended) {
        onSelect(recommended.formatId);
      }
    }
  }, [recommendations, selectedFormat, isLoading, onSelect]);

  const totalSamples = recommendations.reduce((sum, r) => sum + r.sampleCount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Format Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Format Recommendations
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasData && (
              <Badge variant="secondary" className="text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                Based on {totalSamples} similar applications
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose a format that works best for your target role
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Format Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((recommendation) => (
              <FormatCard
                key={recommendation.formatId}
                recommendation={recommendation}
                isSelected={selectedFormat === recommendation.formatId}
                onSelect={() => onSelect(recommendation.formatId)}
              />
            ))}
          </div>

          {/* Preview Section */}
          {resumePreview && selectedFormat && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Live Preview</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-3 w-3 mr-1" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Show Preview
                    </>
                  )}
                </Button>
              </div>

              {showPreview && (
                <FormatPreview
                  resume={resumePreview}
                  formatId={selectedFormat}
                />
              )}
            </div>
          )}

          {/* No data message */}
          {!hasData && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <p>
                We don&apos;t have enough data for similar jobs yet to provide
                data-driven recommendations.
              </p>
              <p className="mt-1">
                Default recommendations are based on industry best practices.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Compact version for sidebar or mobile
 */
export function FormatSelectorCompact({
  recommendations,
  selectedFormat,
  onSelect,
  isLoading,
}: Omit<FormatSelectorProps, "resumePreview">) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        Export Format
      </label>
      <div className="flex flex-wrap gap-2">
        {recommendations.slice(0, 4).map((rec) => (
          <Button
            key={rec.formatId}
            variant={selectedFormat === rec.formatId ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs",
              rec.isRecommended &&
                selectedFormat !== rec.formatId &&
                "border-amber-300 dark:border-amber-700"
            )}
            onClick={() => onSelect(rec.formatId)}
          >
            {rec.formatName}
            {rec.isRecommended && (
              <Sparkles className="h-3 w-3 ml-1 text-amber-500" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
