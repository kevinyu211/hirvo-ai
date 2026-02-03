"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TemplateCard } from "./TemplateCard";
import type {
  StructuredResume,
  ResumeFormatId,
  TemplateMatchScore,
} from "@/lib/types";

export interface TemplateGalleryProps {
  analysisId: string;
  jobDescription: string;
  structuredResume: StructuredResume | null;
  selectedFormat: ResumeFormatId | null;
  onFormatSelect: (formatId: ResumeFormatId) => void;
}

export function TemplateGallery({
  analysisId,
  jobDescription,
  structuredResume,
  selectedFormat,
  onFormatSelect,
}: TemplateGalleryProps) {
  const [templateMatches, setTemplateMatches] = useState<TemplateMatchScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [isExporting, setIsExporting] = useState<ResumeFormatId | null>(null);

  // Fetch template match scores
  useEffect(() => {
    async function fetchTemplateMatches() {
      if (!jobDescription) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/formats/template-matches?analysisId=${analysisId}`
        );

        if (response.ok) {
          const data = await response.json();
          setTemplateMatches(data.matches || []);
          setHasData(data.basedOnData || false);

          // Auto-select best match if none selected
          if (!selectedFormat && data.matches?.length > 0) {
            const best = data.matches.reduce(
              (a: TemplateMatchScore, b: TemplateMatchScore) =>
                a.matchPercentage > b.matchPercentage ? a : b
            );
            onFormatSelect(best.formatId);
          }
        } else {
          // Use default matches
          setTemplateMatches(getDefaultMatches());
        }
      } catch (err) {
        console.error("Failed to fetch template matches:", err);
        setTemplateMatches(getDefaultMatches());
      } finally {
        setIsLoading(false);
      }
    }

    fetchTemplateMatches();
  }, [analysisId, jobDescription, selectedFormat, onFormatSelect]);

  // Handle PDF download
  const handleDownload = useCallback(
    async (formatId: ResumeFormatId) => {
      if (!structuredResume) return;

      setIsExporting(formatId);
      try {
        const response = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format: "pdf",
            templateId: formatId,
            structuredResume,
            analysisId,
            enforceOnePage: true,
          }),
        });

        if (!response.ok) {
          throw new Error("Export failed");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `resume-${formatId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error("Export failed:", err);
      } finally {
        setIsExporting(null);
      }
    },
    [structuredResume, analysisId]
  );

  // Sort templates by match percentage
  const sortedMatches = [...templateMatches].sort(
    (a, b) => b.matchPercentage - a.matchPercentage
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Choose Your Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Choose Your Template
          </CardTitle>
          {hasData && (
            <Badge variant="secondary" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Based on similar successful applications
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Templates ranked by match to your target role. One-click PDF download.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {sortedMatches.map((match, index) => (
            <TemplateCard
              key={match.formatId}
              formatId={match.formatId}
              matchPercentage={match.matchPercentage}
              breakdown={match.breakdown}
              reasoning={match.reasoning}
              isSelected={selectedFormat === match.formatId}
              isBestMatch={index === 0}
              onSelect={() => onFormatSelect(match.formatId)}
              onDownload={() => handleDownload(match.formatId)}
              isExporting={isExporting === match.formatId}
              disabled={!structuredResume}
            />
          ))}
        </div>

        {!hasData && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Match percentages are based on industry best practices.
            Upload successful resumes via admin to enable data-driven recommendations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Default template matches when no data is available
 */
function getDefaultMatches(): TemplateMatchScore[] {
  return [
    {
      formatId: "modern",
      matchPercentage: 85,
      breakdown: {
        historicalSuccess: 0,
        industryFit: 90,
        roleLevelFit: 85,
        contentDensityFit: 80,
      },
      reasoning: "Clean, professional layout suitable for most industries",
    },
    {
      formatId: "technical",
      matchPercentage: 80,
      breakdown: {
        historicalSuccess: 0,
        industryFit: 85,
        roleLevelFit: 80,
        contentDensityFit: 75,
      },
      reasoning: "Optimized for engineering and technical roles",
    },
    {
      formatId: "classic",
      matchPercentage: 75,
      breakdown: {
        historicalSuccess: 0,
        industryFit: 80,
        roleLevelFit: 75,
        contentDensityFit: 70,
      },
      reasoning: "Traditional format preferred in conservative industries",
    },
    {
      formatId: "minimalist",
      matchPercentage: 70,
      breakdown: {
        historicalSuccess: 0,
        industryFit: 75,
        roleLevelFit: 70,
        contentDensityFit: 65,
      },
      reasoning: "Maximum whitespace for design-focused roles",
    },
    {
      formatId: "executive",
      matchPercentage: 65,
      breakdown: {
        historicalSuccess: 0,
        industryFit: 70,
        roleLevelFit: 65,
        contentDensityFit: 60,
      },
      reasoning: "Premium serif style for senior leadership positions",
    },
  ];
}
