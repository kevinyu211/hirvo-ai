"use client";

import { useState, useMemo } from "react";
import { ChevronRight, Plus, Lightbulb, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ATSScore } from "@/lib/types";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import type { ViewMode } from "@/components/editor/ViewToggle";

export interface ThingsToAddSectionProps {
  activeView: ViewMode;
  atsScore: ATSScore | null;
  hrLayers?: HRLayerData;
  jobDescription?: string;
}

// Priority types for keywords
type Priority = "critical" | "high" | "medium";

// Keyword categories
type KeywordCategory = "technical" | "experience" | "soft";

interface CategorizedKeyword {
  keyword: string;
  priority: Priority;
  category: KeywordCategory;
  count: number; // How many times it appears in job description
  explanation: string;
}

// Common technical skill patterns
const TECHNICAL_PATTERNS = [
  /javascript|typescript|python|java|c\+\+|ruby|go|rust|swift|kotlin/i,
  /react|angular|vue|node|django|flask|spring|rails/i,
  /aws|azure|gcp|docker|kubernetes|terraform/i,
  /sql|mysql|postgresql|mongodb|redis|elasticsearch/i,
  /git|ci\/cd|jenkins|github|gitlab/i,
  /api|rest|graphql|microservices/i,
  /machine learning|ai|ml|data science|nlp/i,
  /agile|scrum|kanban/i,
];

// Common soft skill patterns
const SOFT_SKILL_PATTERNS = [
  /leadership|lead|manage|mentor|coach/i,
  /communication|collaborate|team|cross-functional/i,
  /problem.?solving|analytical|critical thinking/i,
  /self.?starter|initiative|proactive/i,
  /detail.?oriented|organized|planning/i,
];

// Maximum keywords to display per category
const MAX_KEYWORDS_PER_CATEGORY = 8;

function categorizeKeyword(keyword: string, jobDescription: string): CategorizedKeyword {
  const lowerKeyword = keyword.toLowerCase();
  const lowerJd = jobDescription.toLowerCase();

  // Count occurrences in job description
  const regex = new RegExp(lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = lowerJd.match(regex);
  const count = matches ? matches.length : 0;

  // Determine priority based on frequency
  let priority: Priority;
  if (count >= 3) {
    priority = "critical";
  } else if (count >= 2) {
    priority = "high";
  } else {
    priority = "medium";
  }

  // Determine category
  let category: KeywordCategory = "experience";

  if (TECHNICAL_PATTERNS.some(pattern => pattern.test(keyword))) {
    category = "technical";
  } else if (SOFT_SKILL_PATTERNS.some(pattern => pattern.test(keyword))) {
    category = "soft";
  }

  // Generate explanation
  let explanation: string;
  if (count >= 3) {
    explanation = `Mentioned ${count}x in job description - highly important`;
  } else if (count >= 2) {
    explanation = `Mentioned ${count}x - add to strengthen match`;
  } else if (count === 1) {
    explanation = `Found once - consider adding if relevant`;
  } else {
    explanation = `Related to job requirements`;
  }

  return { keyword, priority, category, count, explanation };
}

function getPriorityIcon(priority: Priority) {
  switch (priority) {
    case "critical":
      return <AlertTriangle className="w-3 h-3 text-red-500" />;
    case "high":
      return <AlertCircle className="w-3 h-3 text-amber-500" />;
    case "medium":
      return <Info className="w-3 h-3 text-blue-500" />;
  }
}

function getPriorityStyles(priority: Priority) {
  switch (priority) {
    case "critical":
      return "border-red-300 text-red-700 bg-red-50 hover:bg-red-100";
    case "high":
      return "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100";
    case "medium":
      return "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100";
  }
}

function getCategoryLabel(category: KeywordCategory) {
  switch (category) {
    case "technical":
      return "Technical Skills";
    case "experience":
      return "Experience Keywords";
    case "soft":
      return "Soft Skills";
  }
}

export function ThingsToAddSection({
  activeView,
  atsScore,
  hrLayers,
  jobDescription = "",
}: ThingsToAddSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);

  // For ATS: missing keywords - now categorized and prioritized
  const categorizedKeywords = useMemo(() => {
    if (activeView !== "ats" || !atsScore?.missingKeywords) return [];

    return atsScore.missingKeywords
      .map(kw => categorizeKeyword(kw, jobDescription))
      .sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { critical: 0, high: 1, medium: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Then by count
        return b.count - a.count;
      });
  }, [activeView, atsScore?.missingKeywords, jobDescription]);

  // Group keywords by category
  const keywordsByCategory = useMemo(() => {
    const groups: Record<KeywordCategory, CategorizedKeyword[]> = {
      technical: [],
      experience: [],
      soft: [],
    };

    categorizedKeywords.forEach(kw => {
      groups[kw.category].push(kw);
    });

    return groups;
  }, [categorizedKeywords]);

  // For HR: weak sections (score < 60) and achievement suggestions
  const weakSections =
    activeView === "hr"
      ? (hrLayers?.llmReview?.sectionComments?.filter((c) => c.score < 60) || [])
      : [];
  const achievementScore = hrLayers?.llmReview?.achievementStrength?.score ?? 100;
  const achievementSuggestion =
    activeView === "hr" && achievementScore < 60
      ? hrLayers?.llmReview?.achievementStrength?.suggestion
      : null;

  // Calculate total items count
  const itemCount =
    activeView === "ats"
      ? categorizedKeywords.length
      : weakSections.length + (achievementSuggestion ? 1 : 0);

  if (itemCount === 0) {
    return null;
  }

  // Count critical priority keywords for ATS view header
  const criticalCount = categorizedKeywords.filter(k => k.priority === "critical").length;

  return (
    <div className="border-2 rounded-2xl overflow-hidden shadow-soft hover:shadow-dramatic transition-all duration-300">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-all duration-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5">
          <ChevronRight
            className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
          />
          <span className="font-semibold text-sm">Things to Add</span>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {itemCount}
          </span>
          {activeView === "ats" && criticalCount > 0 && (
            <span className="text-xs font-bold text-white bg-gradient-to-r from-red-500 to-red-400 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <AlertTriangle className="w-3 h-3" />
              {criticalCount} critical
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 py-4 space-y-5">
          {/* ATS View: Missing Keywords - Grouped and Prioritized */}
          {activeView === "ats" && categorizedKeywords.length > 0 && (
            <>
              {/* Priority Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pb-3 border-b">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Critical - Must add
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  High - Strongly recommended
                </span>
                <span className="flex items-center gap-1">
                  <Info className="w-3 h-3 text-blue-500" />
                  Medium - Consider adding
                </span>
              </div>

              {/* Technical Skills */}
              {keywordsByCategory.technical.length > 0 && (
                <KeywordGroup
                  title={getCategoryLabel("technical")}
                  keywords={keywordsByCategory.technical}
                  expandedKeyword={expandedKeyword}
                  onToggleExpand={setExpandedKeyword}
                />
              )}

              {/* Experience Keywords */}
              {keywordsByCategory.experience.length > 0 && (
                <KeywordGroup
                  title={getCategoryLabel("experience")}
                  keywords={keywordsByCategory.experience}
                  expandedKeyword={expandedKeyword}
                  onToggleExpand={setExpandedKeyword}
                />
              )}

              {/* Soft Skills */}
              {keywordsByCategory.soft.length > 0 && (
                <KeywordGroup
                  title={getCategoryLabel("soft")}
                  keywords={keywordsByCategory.soft}
                  expandedKeyword={expandedKeyword}
                  onToggleExpand={setExpandedKeyword}
                />
              )}

              <p className="text-xs text-muted-foreground pt-3 border-t">
                Click on a keyword to see why it matters. Add these naturally to your experience descriptions.
              </p>
            </>
          )}

          {/* HR View: Weak Sections */}
          {activeView === "hr" && weakSections.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Sections to Strengthen
              </p>
              {weakSections.map((section, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground capitalize">
                      {section.section}
                    </span>
                    <span className="text-xs text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full">{section.score}/100</span>
                  </div>
                  <p className="text-sm text-amber-800">{section.comment}</p>
                  {section.suggestion && (
                    <p className="text-xs text-amber-600 mt-2 italic">{section.suggestion}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* HR View: Achievement Suggestion */}
          {activeView === "hr" && achievementSuggestion && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Strengthen Achievements
              </p>
              <div className="rounded-xl border-2 border-violet-200 bg-violet-50/50 p-4">
                <p className="text-sm text-violet-800">{achievementSuggestion}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface KeywordGroupProps {
  title: string;
  keywords: CategorizedKeyword[];
  expandedKeyword: string | null;
  onToggleExpand: (keyword: string | null) => void;
  maxKeywords?: number;
}

function KeywordGroup({ title, keywords, expandedKeyword, onToggleExpand, maxKeywords = MAX_KEYWORDS_PER_CATEGORY }: KeywordGroupProps) {
  const [showAll, setShowAll] = useState(false);
  const displayKeywords = showAll ? keywords : keywords.slice(0, maxKeywords);
  const hiddenCount = keywords.length - maxKeywords;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
        <Plus className="w-4 h-4" />
        {title}
        <span className="text-muted-foreground/70">({keywords.length})</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {displayKeywords.map((kw) => (
          <div key={kw.keyword} className="relative">
            <Badge
              variant="outline"
              className={`text-xs cursor-pointer transition-all duration-200 px-3 py-1.5 border-2 hover:shadow-soft ${getPriorityStyles(kw.priority)}`}
              onClick={() => onToggleExpand(expandedKeyword === kw.keyword ? null : kw.keyword)}
            >
              <span className="mr-1.5">{getPriorityIcon(kw.priority)}</span>
              {kw.keyword}
            </Badge>

            {/* Expanded explanation tooltip */}
            {expandedKeyword === kw.keyword && (
              <div className="absolute left-0 top-full mt-2 z-10 w-52 p-3 bg-popover border-2 rounded-xl shadow-dramatic text-xs animate-scale-in">
                <p className="text-foreground font-semibold mb-1.5">{kw.keyword}</p>
                <p className="text-muted-foreground">{kw.explanation}</p>
              </div>
            )}
          </div>
        ))}

        {/* Show more/less toggle */}
        {hiddenCount > 0 && (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-accent underline underline-offset-2 transition-colors"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show less" : `and ${hiddenCount} more...`}
          </button>
        )}
      </div>
    </div>
  );
}
