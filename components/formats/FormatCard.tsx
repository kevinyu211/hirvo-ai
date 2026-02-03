"use client";

import type { FormatRecommendation, ResumeFormatId, FormatMetadata } from "@/lib/types";
import { FORMAT_METADATA } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, TrendingUp, Users, Star } from "lucide-react";

export interface FormatCardProps {
  recommendation: FormatRecommendation;
  isSelected: boolean;
  onSelect: () => void;
}

export function FormatCard({
  recommendation,
  isSelected,
  onSelect,
}: FormatCardProps) {
  const metadata = FORMAT_METADATA[recommendation.formatId];

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md",
        recommendation.isRecommended && !isSelected && "border-amber-300 dark:border-amber-700"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      aria-pressed={isSelected}
    >
      {/* Recommended badge */}
      {recommendation.isRecommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-amber-500 text-white hover:bg-amber-500">
            <Star className="h-3 w-3 mr-1 fill-current" />
            Recommended
          </Badge>
        </div>
      )}

      {/* Selected check */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}

      <CardContent className="p-4">
        {/* Format preview thumbnail */}
        <div
          className={cn(
            "h-24 w-full rounded-md mb-3 flex items-center justify-center border",
            "bg-gradient-to-br from-muted/50 to-muted"
          )}
        >
          <FormatThumbnail formatId={recommendation.formatId} metadata={metadata} />
        </div>

        {/* Format name */}
        <h4 className="font-semibold text-foreground mb-1">{recommendation.formatName}</h4>

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-3">{metadata.description}</p>

        {/* Stats */}
        <div className="space-y-2">
          {recommendation.sampleCount > 0 ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-600">
                  {recommendation.successRate}% success rate
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Based on {recommendation.sampleCount} similar applications</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              Limited data for similar jobs
            </div>
          )}
        </div>

        {/* Best for tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          {metadata.bestFor.slice(0, 3).map((industry) => (
            <Badge
              key={industry}
              variant="secondary"
              className="text-xs py-0 px-1.5"
            >
              {industry}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Thumbnail preview of the format style
 */
function FormatThumbnail({
  formatId,
  metadata,
}: {
  formatId: ResumeFormatId;
  metadata: FormatMetadata;
}) {
  // Simple visual representation of each format
  const styles: Record<ResumeFormatId, { lines: string[]; headerStyle: string }> = {
    classic: {
      lines: ["serif", "underline"],
      headerStyle: "border-b-2 border-gray-800",
    },
    modern: {
      lines: ["sans", "accent"],
      headerStyle: "text-blue-600 font-medium",
    },
    minimalist: {
      lines: ["thin", "spacious"],
      headerStyle: "text-gray-400 font-light tracking-widest",
    },
    technical: {
      lines: ["mono", "badges"],
      headerStyle: "font-mono text-green-600",
    },
    executive: {
      lines: ["premium", "elegant"],
      headerStyle: "text-gray-700 font-serif italic",
    },
  };

  const style = styles[formatId];

  return (
    <div className="w-full h-full p-3 flex flex-col">
      {/* Header simulation */}
      <div className={cn("text-[10px] font-bold mb-1", style.headerStyle)}>
        JOHN DOE
      </div>

      {/* Content lines simulation */}
      <div className="flex-1 space-y-1">
        <div className="h-1.5 w-3/4 bg-muted-foreground/20 rounded" />
        <div className="h-1.5 w-full bg-muted-foreground/10 rounded" />
        <div className="h-1.5 w-5/6 bg-muted-foreground/10 rounded" />
        <div className="h-1.5 w-2/3 bg-muted-foreground/10 rounded" />
      </div>

      {/* Section divider based on style */}
      {formatId === "classic" && (
        <div className="border-b border-gray-400 my-1" />
      )}
      {formatId === "modern" && metadata.colorAccent && (
        <div
          className="h-0.5 w-8 rounded-full my-1"
          style={{ backgroundColor: metadata.colorAccent }}
        />
      )}
    </div>
  );
}
