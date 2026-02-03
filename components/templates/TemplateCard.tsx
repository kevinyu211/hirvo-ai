"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  CheckCircle2,
  Star,
  Loader2,
} from "lucide-react";
import type { ResumeFormatId, TemplateMatchScore } from "@/lib/types";

// Template thumbnails and metadata
const TEMPLATE_INFO: Record<
  ResumeFormatId,
  {
    name: string;
    industryTags: string[];
    color: string;
    preview: string; // ASCII art preview
  }
> = {
  modern: {
    name: "Modern",
    industryTags: ["Tech", "Startups"],
    color: "bg-blue-500",
    preview: `┌────────────────┐
│ ▄▄▄▄▄▄▄▄▄▄▄▄▄ │
│ ────────────── │
│ ▀▀▀▀▀ ▀▀▀▀▀▀▀ │
│ • ▀▀▀▀▀▀▀▀▀▀▀ │
│ • ▀▀▀▀▀▀▀▀▀▀▀ │
│ ────────────── │
│ ▀▀▀▀▀ ▀▀▀▀▀▀▀ │
└────────────────┘`,
  },
  classic: {
    name: "Classic",
    industryTags: ["Finance", "Law"],
    color: "bg-slate-600",
    preview: `┌────────────────┐
│     Name       │
│ ═══════════════│
│ EXPERIENCE     │
│ ─────────────  │
│ • ▀▀▀▀▀▀▀▀▀▀▀ │
│ • ▀▀▀▀▀▀▀▀▀▀▀ │
│ EDUCATION      │
│ ─────────────  │
└────────────────┘`,
  },
  minimalist: {
    name: "Minimalist",
    industryTags: ["Design", "Creative"],
    color: "bg-gray-400",
    preview: `┌────────────────┐
│                │
│     Name       │
│                │
│  Experience    │
│  • ▀▀▀▀▀▀▀▀▀  │
│                │
│  Skills        │
│  ▀▀▀ ▀▀▀ ▀▀▀  │
└────────────────┘`,
  },
  technical: {
    name: "Technical",
    industryTags: ["Eng", "Data"],
    color: "bg-emerald-500",
    preview: `┌────────────────┐
│ <name/>        │
│ ══════════════ │
│ [Skills]       │
│ ┌─┐┌─┐┌─┐┌─┐  │
│ └─┘└─┘└─┘└─┘  │
│ Experience     │
│ > ▀▀▀▀▀▀▀▀▀▀▀ │
│ > ▀▀▀▀▀▀▀▀▀▀▀ │
└────────────────┘`,
  },
  executive: {
    name: "Executive",
    industryTags: ["C-Suite", "Director"],
    color: "bg-amber-700",
    preview: `┌────────────────┐
│                │
│   N A M E      │
│   ═══════      │
│                │
│ Summary        │
│ ▀▀▀▀▀▀▀▀▀▀▀▀  │
│                │
│ Experience     │
└────────────────┘`,
  },
};

export interface TemplateCardProps {
  formatId: ResumeFormatId;
  matchPercentage: number;
  breakdown: TemplateMatchScore["breakdown"];
  reasoning: string;
  isSelected: boolean;
  isBestMatch: boolean;
  onSelect: () => void;
  onDownload: () => void;
  isExporting: boolean;
  disabled: boolean;
}

export function TemplateCard({
  formatId,
  matchPercentage,
  breakdown,
  reasoning,
  isSelected,
  isBestMatch,
  onSelect,
  onDownload,
  isExporting,
  disabled,
}: TemplateCardProps) {
  const info = TEMPLATE_INFO[formatId];

  const getMatchColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (pct >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 transition-all cursor-pointer group",
        isSelected
          ? "border-accent bg-accent/5 shadow-md"
          : "border-muted hover:border-accent/50 hover:shadow-sm",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onSelect()}
    >
      {/* Best Match Badge */}
      {isBestMatch && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-amber-500 text-white border-0 gap-1 text-[10px]">
            <Star className="h-2.5 w-2.5" />
            Best
          </Badge>
        </div>
      )}

      {/* Selected Check */}
      {isSelected && (
        <div className="absolute top-2 left-2 z-10">
          <CheckCircle2 className="h-5 w-5 text-accent" />
        </div>
      )}

      {/* Template Preview */}
      <div className="p-3">
        <div
          className={cn(
            "aspect-[8.5/11] rounded-lg flex items-center justify-center text-[6px] font-mono overflow-hidden",
            "bg-white dark:bg-zinc-900 border"
          )}
        >
          <pre className="text-muted-foreground/60 leading-tight scale-90">
            {info.preview}
          </pre>
        </div>
      </div>

      {/* Template Info */}
      <div className="px-3 pb-3 space-y-2">
        {/* Name and Match */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{info.name}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn("font-bold text-sm", getMatchColor(matchPercentage))}>
                  {matchPercentage}%
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">Match Breakdown</p>
                  <div className="text-xs space-y-0.5">
                    {breakdown.historicalSuccess > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Historical Success</span>
                        <span>{breakdown.historicalSuccess}%</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Industry Fit</span>
                      <span>{breakdown.industryFit}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role Level</span>
                      <span>{breakdown.roleLevelFit}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Content Density</span>
                      <span>{breakdown.contentDensityFit}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1 border-t">
                    {reasoning}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Industry Tags */}
        <div className="flex flex-wrap gap-1">
          {info.industryTags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Download Button */}
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          className="w-full h-7 text-xs gap-1"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onDownload();
          }}
          disabled={disabled || isExporting}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-3 w-3" />
              PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
