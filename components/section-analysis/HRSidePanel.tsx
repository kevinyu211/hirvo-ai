"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Database, Brain, MessageSquare, Check, X, AlertTriangle } from "lucide-react";
import type { HRScore, HRFeedback, HRCategoryData, GrammarlyFix } from "@/lib/types";
import { generateHRCategories, generateGrammarlyFix } from "@/lib/feedback-merger";
import { getHRWhyItHelps } from "@/lib/feedback-explanations";
import { CategoryAccordion } from "./CategoryAccordion";
import { IssueDetailInline, IssueDetailPanel } from "./IssueDetailPanel";

export interface HRSidePanelProps {
  hrScore: HRScore;
  sectionName: string;
  sectionContent?: string;
  onSelectFeedback?: (feedback: HRFeedback) => void;
  onAcceptFix?: (fix: GrammarlyFix) => void;
  className?: string;
}

const ICON_MAP = {
  Database,
  Brain,
  MessageSquare,
};

/**
 * Right panel showing HR categories with expandable feedback lists
 */
export function HRSidePanel({
  hrScore,
  sectionName,
  sectionContent = "",
  onSelectFeedback,
  onAcceptFix,
  className,
}: HRSidePanelProps) {
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  // Generate HR categories
  const categories = useMemo(
    () => generateHRCategories(hrScore),
    [hrScore]
  );

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName as keyof typeof ICON_MAP] || Database;
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

  const handleFeedbackClick = (itemId: string, feedback?: HRFeedback) => {
    if (expandedFeedback === itemId) {
      setExpandedFeedback(null);
    } else {
      setExpandedFeedback(itemId);
      if (feedback && onSelectFeedback) {
        onSelectFeedback(feedback);
      }
    }
  };

  // Generate a fix for feedback if it has a suggestion
  const getFixForFeedback = useCallback((feedback: HRFeedback): GrammarlyFix | null => {
    return generateGrammarlyFix(feedback, sectionContent, "hr");
  }, [sectionContent]);

  // Handle accepting a fix
  const handleAcceptFeedbackFix = useCallback((fix: GrammarlyFix) => {
    if (onAcceptFix) {
      onAcceptFix(fix);
      setExpandedFeedback(null); // Close the expanded view
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
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            HR
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Human Review
          </span>
        </div>
        <span className="text-sm font-bold text-foreground">
          {hrScore.overall}/100
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
                      expandedFeedback === item.id && "bg-muted"
                    )}
                    onClick={() => handleFeedbackClick(item.id, item.feedback)}
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
                  {expandedFeedback === item.id && item.feedback && (() => {
                    const fix = getFixForFeedback(item.feedback);
                    const fixNotDismissed = fix && !dismissedFixes.has(fix.id);

                    return fix && fixNotDismissed && onAcceptFix ? (
                      <div className="mt-2 ml-5">
                        <IssueDetailPanel
                          issue={item.feedback}
                          source="hr"
                          whyItMatters={getHRWhyItHelps(item.feedback.type, item.feedback.message)}
                          grammarlyFix={fix}
                          onAccept={handleAcceptFeedbackFix}
                          onDismiss={() => handleDismissFix(fix.id)}
                          onClose={() => setExpandedFeedback(null)}
                          className="shadow-md"
                        />
                      </div>
                    ) : (
                      <IssueDetailInline
                        issue={item.feedback}
                        source="hr"
                        whyItMatters={getHRWhyItHelps(item.feedback.type, item.feedback.message)}
                        onClose={() => setExpandedFeedback(null)}
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
          <span className="text-muted-foreground">Formatting</span>
          <span className="font-medium text-foreground">
            {Math.round(hrScore.formattingScore)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-muted-foreground">Content Quality</span>
          <span className="font-medium text-foreground">
            {Math.round(hrScore.semanticScore)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-muted-foreground">Relevance</span>
          <span className="font-medium text-foreground">
            {Math.round(hrScore.llmScore)}
          </span>
        </div>
      </div>
    </div>
  );
}
