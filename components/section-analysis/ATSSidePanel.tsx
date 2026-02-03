"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Search, FileText, LayoutList, Check, X, AlertTriangle } from "lucide-react";
import type { ATSScore, ATSIssue, ATSCategoryData, GrammarlyFix } from "@/lib/types";
import { generateATSCategories, generateGrammarlyFix } from "@/lib/feedback-merger";
import { getATSWhyItHelps } from "@/lib/feedback-explanations";
import { CategoryAccordion } from "./CategoryAccordion";
import { IssueDetailInline, IssueDetailPanel } from "./IssueDetailPanel";

export interface ATSSidePanelProps {
  atsScore: ATSScore;
  sectionName: string;
  sectionContent?: string;
  onSelectIssue?: (issue: ATSIssue) => void;
  onAcceptFix?: (fix: GrammarlyFix) => void;
  className?: string;
}

const ICON_MAP = {
  Search,
  FileText,
  LayoutList,
};

/**
 * Left panel showing ATS categories with expandable error lists
 */
export function ATSSidePanel({
  atsScore,
  sectionName,
  sectionContent = "",
  onSelectIssue,
  onAcceptFix,
  className,
}: ATSSidePanelProps) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  // Generate ATS categories
  const categories = useMemo(
    () => generateATSCategories(atsScore, sectionContent),
    [atsScore, sectionContent]
  );

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName as keyof typeof ICON_MAP] || FileText;
  };

  const getStatusIcon = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass":
        return <Check className="h-3 w-3 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="h-3 w-3 text-amber-500" />;
      case "fail":
        return <X className="h-3 w-3 text-red-500" />;
    }
  };

  const getStatusBg = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass":
        return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300";
      case "fail":
        return "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300";
    }
  };

  const [dismissedFixes, setDismissedFixes] = useState<Set<string>>(new Set());

  const handleIssueClick = (itemId: string, issue?: ATSIssue) => {
    if (expandedIssue === itemId) {
      setExpandedIssue(null);
    } else {
      setExpandedIssue(itemId);
      if (issue && onSelectIssue) {
        onSelectIssue(issue);
      }
    }
  };

  // Generate a fix for an issue if it has a suggestion
  const getFixForIssue = useCallback((issue: ATSIssue): GrammarlyFix | null => {
    return generateGrammarlyFix(issue, sectionContent, "ats");
  }, [sectionContent]);

  // Handle accepting a fix
  const handleAcceptIssueFix = useCallback((fix: GrammarlyFix) => {
    if (onAcceptFix) {
      onAcceptFix(fix);
      setExpandedIssue(null); // Close the expanded view
    }
  }, [onAcceptFix]);

  // Handle dismissing a fix
  const handleDismissFix = useCallback((fixId: string) => {
    setDismissedFixes(prev => new Set(prev).add(fixId));
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            ATS
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Automated Screening
          </span>
        </div>
        <span className="text-sm font-bold text-foreground">
          {atsScore.overall}/100
        </span>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const Icon = getIcon(category.icon);
        const passCount = category.items.filter((i) => i.status === "pass").length;
        const issueCount = category.items.filter((i) => i.status !== "pass").length;

        return (
          <CategoryAccordion
            key={category.id}
            title={category.title}
            icon={Icon}
            issueCount={issueCount}
            passCount={passCount}
            status={category.status}
            defaultOpen={category.status !== "pass"}
          >
            <div className="space-y-1 py-1">
              {category.items.map((item) => (
                <div key={item.id}>
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                      "hover:bg-muted/50",
                      expandedIssue === item.id && "bg-muted"
                    )}
                    onClick={() => handleIssueClick(item.id, item.issue)}
                  >
                    {/* Status icon */}
                    <div className="flex-shrink-0">
                      {getStatusIcon(item.status)}
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        "text-xs flex-1",
                        item.status === "pass"
                          ? "text-muted-foreground"
                          : "text-foreground"
                      )}
                    >
                      {item.label}
                    </span>

                    {/* Value badge */}
                    {item.value && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded",
                          getStatusBg(item.status)
                        )}
                      >
                        {item.value}
                      </span>
                    )}
                  </button>

                  {/* Expanded detail with fix capability */}
                  {expandedIssue === item.id && item.issue && (() => {
                    const fix = getFixForIssue(item.issue);
                    const fixNotDismissed = fix && !dismissedFixes.has(fix.id);

                    return fix && fixNotDismissed && onAcceptFix ? (
                      <div className="mt-2 ml-5">
                        <IssueDetailPanel
                          issue={item.issue}
                          source="ats"
                          whyItMatters={getATSWhyItHelps(item.issue.type, item.issue.message)}
                          grammarlyFix={fix}
                          onAccept={handleAcceptIssueFix}
                          onDismiss={() => handleDismissFix(fix.id)}
                          onClose={() => setExpandedIssue(null)}
                          className="shadow-md"
                        />
                      </div>
                    ) : (
                      <IssueDetailInline
                        issue={item.issue}
                        source="ats"
                        whyItMatters={getATSWhyItHelps(item.issue.type, item.issue.message)}
                        onClose={() => setExpandedIssue(null)}
                      />
                    );
                  })()}
                </div>
              ))}

              {category.items.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-2 py-2">
                  No items in this category
                </p>
              )}
            </div>
          </CategoryAccordion>
        );
      })}

      {/* Summary */}
      <div className="mt-4 pt-3 border-t px-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Keyword Match</span>
          <span className="font-medium text-foreground">
            {Math.round(atsScore.keywordMatchPct)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-muted-foreground">Formatting Score</span>
          <span className="font-medium text-foreground">
            {Math.round(atsScore.formattingScore)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-muted-foreground">Section Score</span>
          <span className="font-medium text-foreground">
            {Math.round(atsScore.sectionScore)}
          </span>
        </div>
      </div>
    </div>
  );
}
