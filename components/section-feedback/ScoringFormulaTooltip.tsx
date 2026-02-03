"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import type { ATSScore, HRScore } from "@/lib/types";

export interface ScoringFormulaTooltipProps {
  atsScore: ATSScore | null;
  hrScore: HRScore | null;
}

export function ScoringFormulaTooltip({
  atsScore,
  hrScore,
}: ScoringFormulaTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Calculator className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Formula</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">How We Score</h4>
            <p className="text-xs text-muted-foreground">
              Scores are calculated using weighted factors that mirror how ATS systems
              and recruiters evaluate resumes.
            </p>
          </div>

          {/* ATS Formula */}
          {atsScore && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-foreground">
                ATS Score ({atsScore.overall}/100)
              </h5>
              <div className="space-y-1.5 text-xs">
                <FormulaRow
                  label="Keyword Match"
                  value={atsScore.keywordMatchPct}
                  weight={50}
                  description="How many job keywords appear in your resume"
                />
                <FormulaRow
                  label="Formatting"
                  value={atsScore.formattingScore}
                  weight={30}
                  description="Clean structure, no parsing issues"
                />
                <FormulaRow
                  label="Sections"
                  value={atsScore.sectionScore}
                  weight={20}
                  description="Standard sections present and complete"
                />
              </div>
            </div>
          )}

          {/* HR Formula */}
          {hrScore && (
            <div className="space-y-2 pt-2 border-t">
              <h5 className="text-xs font-medium text-foreground">
                HR Score ({hrScore.overall}/100)
              </h5>
              <div className="space-y-1.5 text-xs">
                <FormulaRow
                  label="Formatting"
                  value={hrScore.formattingScore}
                  weight={20}
                  description="Visual appeal and readability"
                />
                <FormulaRow
                  label="Content Quality"
                  value={hrScore.semanticScore}
                  weight={40}
                  description="Achievement clarity and impact"
                />
                <FormulaRow
                  label="Relevance"
                  value={hrScore.llmScore}
                  weight={40}
                  description="Alignment with job requirements"
                />
              </div>
            </div>
          )}

          {/* Pass Threshold */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Pass Threshold:</span>{" "}
              ATS score of 70+ typically passes automated screening. HR score of
              70+ indicates strong interview likelihood.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FormulaRow({
  label,
  value,
  weight,
  description,
}: {
  label: string;
  value: number;
  weight: number;
  description: string;
}) {
  const contribution = Math.round((value * weight) / 100);

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-foreground font-medium">
            {Math.round(value)} × {weight}%
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <span className="text-foreground font-medium w-8 text-right">
        = {contribution}
      </span>
    </div>
  );
}
