"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { HRLayerData } from "@/components/scores/HRScoreCard";
import {
  ATSScoreCardSkeleton,
  HRScoreCardSkeleton,
  EditorSkeleton,
  SuggestionGeneratingSkeleton,
} from "@/components/scores/ScoreCardSkeleton";
import { LoadingSteps } from "@/components/shared/LoadingSteps";
import type { LoadingStep } from "@/components/shared/LoadingSteps";
import { ExportButton } from "@/components/export/ExportButton";
import { ResultsLayout } from "@/components/results/ResultsLayout";
import { TemplateGallery } from "@/components/templates/TemplateGallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ATSScore,
  ATSIssue,
  HRScore,
  HRFeedback,
  Suggestion,
  StructuredResume,
  ResumeFormatId,
  MergedSectionFeedback,
} from "@/lib/types";
import { detectVisaStatus } from "@/lib/visa-detection";
import { ArrowLeft, RefreshCw, Globe, Sparkles, AlertCircle } from "lucide-react";
import { ResultsHeader } from "@/components/shared/ResultsHeader";
import { StructuredResumeEditor } from "@/components/structured-editor";
import { structuredToText } from "@/lib/resume-serializer";
import { mergeSectionFeedback } from "@/lib/feedback-merger";
import type { LearnedPatterns } from "@/lib/success-matching";

// ============================================================================
// Analysis pipeline step definitions
// ============================================================================
const INITIAL_STEPS: LoadingStep[] = [
  { label: "Parsing resume structure", status: "pending" },
  { label: "Matching keywords to job description", status: "pending" },
  { label: "Checking ATS formatting compliance", status: "pending" },
  { label: "Analyzing rejection risks", status: "pending" },
  { label: "Evaluating HR perspective", status: "pending" },
  { label: "Generating personalized improvements", status: "pending" },
  { label: "Analysis complete!", status: "pending" },
];

// ============================================================================
// Types
// ============================================================================
interface AnalysisRecord {
  id: string;
  original_text: string;
  optimized_text: string | null;
  job_description: string | null;
  target_role: string | null;
  years_experience: string | null;
  visa_flagged: boolean;
  file_name: string | null;
  file_type: string | null;
  // Cached ATS scores
  ats_overall_score: number | null;
  ats_keyword_match_pct: number | null;
  ats_formatting_score: number | null;
  ats_section_score: number | null;
  ats_matched_keywords: string[] | null;
  ats_missing_keywords: string[] | null;
  ats_issues: ATSIssue[] | null;
  // Cached HR scores
  hr_overall_score: number | null;
  hr_formatting_score: number | null;
  hr_semantic_score: number | null;
  hr_llm_score: number | null;
  hr_feedback: HRFeedback[] | null;
  // Cached suggestions
  suggestions: Suggestion[] | null;
  // Structured content
  structured_content: StructuredResume | null;
  selected_format: ResumeFormatId | null;
}

// ============================================================================
// Results Page Component
// ============================================================================
export default function ResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const analysisId = params.id;

  // Core data
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Analysis results
  const [atsScore, setAtsScore] = useState<ATSScore | null>(null);
  const [hrScore, setHrScore] = useState<HRScore | null>(null);
  const [hrLayers, setHrLayers] = useState<HRLayerData | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [visaFlagged, setVisaFlagged] = useState(false);

  // Learned patterns from database
  const [learnedPatterns, setLearnedPatterns] = useState<LearnedPatterns | null>(null);
  const [similarJobsCount, setSimilarJobsCount] = useState(0);

  // UI state
  const [steps, setSteps] = useState<LoadingStep[]>(INITIAL_STEPS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Track dismissed suggestions
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedText, setLastSavedText] = useState("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Structured editor state
  const [structuredResume, setStructuredResume] = useState<StructuredResume | null>(null);
  const [isParsingStructured, setIsParsingStructured] = useState(false);

  // Template/format state
  const [selectedFormat, setSelectedFormat] = useState<ResumeFormatId | null>(null);

  // Fetch analysis record
  useEffect(() => {
    async function fetchAnalysis() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("resume_analyses")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (fetchError || !data) {
        setError("Analysis not found. It may have been deleted.");
        return;
      }

      const record = data as unknown as AnalysisRecord;
      setAnalysis(record);
      setResumeText(record.optimized_text || record.original_text);
      if (record.visa_flagged) {
        setVisaFlagged(true);
      }
    }

    fetchAnalysis();
  }, [analysisId]);

  // Update step status
  const updateStep = useCallback(
    (index: number, status: LoadingStep["status"]) => {
      setSteps((prev) =>
        prev.map((step, i) => (i === index ? { ...step, status } : step))
      );
    },
    []
  );

  // Run analysis pipeline with granular progress updates
  const runAnalysis = useCallback(async () => {
    if (!analysis) return;

    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setError(null);
    setAtsScore(null);
    setHrScore(null);
    setHrLayers(undefined);
    setSuggestions([]);
    setVisaFlagged(false);
    setDismissedIds(new Set());
    setLearnedPatterns(null);
    setSimilarJobsCount(0);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" as const })));

    const currentResumeText = resumeText;
    const jobDescription = analysis.job_description || "";

    try {
      // Step 0: Parsing resume structure
      updateStep(0, "active");
      await new Promise((r) => setTimeout(r, 300));
      updateStep(0, "complete");

      // Step 1: Matching keywords to job description
      updateStep(1, "active");

      const atsPromise = fetch("/api/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: currentResumeText,
          jobDescription,
          analysisId,
          metadata: { pageCount: 1 },
          userContext: {
            targetRole: analysis.target_role || undefined,
            yearsExperience: analysis.years_experience || undefined,
          },
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `ATS scoring failed (${res.status})`);
        }
        updateStep(1, "complete");
        updateStep(2, "active");
        return res.json();
      });

      const hrPromise = fetch("/api/hr-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: currentResumeText,
          jobDescription,
          analysisId,
          userContext: {
            targetRole: analysis.target_role || undefined,
            yearsExperience: analysis.years_experience || undefined,
          },
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HR scoring failed (${res.status})`);
        }
        return res.json();
      });

      const [atsResult, hrResult] = await Promise.allSettled([atsPromise, hrPromise]);

      // Process ATS result
      let atsData: { score: ATSScore } | null = null;
      if (atsResult.status === "fulfilled") {
        const value = atsResult.value as { score: ATSScore };
        atsData = value;
        setAtsScore(value.score);
        updateStep(2, "complete");
        updateStep(3, "complete");
      } else {
        console.error("ATS scoring failed:", atsResult.reason);
        updateStep(2, "error");
        updateStep(3, "error");
      }

      // Process HR result
      let hrData: { score: HRScore; layers: HRLayerData } | null = null;
      if (hrResult.status === "fulfilled") {
        const value = hrResult.value as { score: HRScore; layers: HRLayerData };
        hrData = value;
        setHrScore(value.score);
        setHrLayers(value.layers);
        updateStep(4, "complete");
      } else {
        console.error("HR scoring failed:", hrResult.reason);
        updateStep(4, "error");
      }

      // Visa detection
      const visaResult = detectVisaStatus(currentResumeText, {
        visaStatus: undefined,
        targetRole: analysis.target_role || undefined,
        yearsExperience: analysis.years_experience || undefined,
      });
      setVisaFlagged(visaResult.visaFlagged);

      // Update visa_flagged in database
      if (visaResult.visaFlagged) {
        try {
          const supabase = createClient();
          await supabase
            .from("resume_analyses")
            .update({ visa_flagged: true })
            .eq("id", analysisId);
        } catch (visaUpdateErr) {
          console.error("Failed to update visa_flagged:", visaUpdateErr);
        }
      }

      // Step 5: Generating personalized improvements
      if (atsData || hrData) {
        updateStep(5, "active");

        try {
          const optimizeRes = await fetch("/api/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resumeText: currentResumeText,
              jobDescription,
              atsIssues: atsData?.score.issues || [],
              hrFeedback: hrData?.score.feedback || [],
              analysisId,
              visaFlagged: visaResult.visaFlagged,
              visaSignals: visaResult.signals,
            }),
          });

          if (optimizeRes.ok) {
            const optimizeData = await optimizeRes.json();
            setSuggestions(optimizeData.suggestions || []);

            // Capture learned insights if returned
            if (optimizeData.learnedInsights) {
              setLearnedPatterns(optimizeData.learnedInsights.patterns || null);
              setSimilarJobsCount(optimizeData.learnedInsights.similarJobsFound || 0);
            }

            updateStep(5, "complete");
          } else {
            console.error("Optimization failed");
            updateStep(5, "error");
          }
        } catch (optimizeErr) {
          console.error("Optimization failed:", optimizeErr);
          updateStep(5, "error");
        }
      } else {
        updateStep(5, "error");
      }

      // Step 6: Analysis complete!
      updateStep(6, "complete");
      setAnalysisComplete(true);
    } catch (err) {
      console.error("Analysis pipeline failed:", err);
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [analysis, resumeText, analysisId, updateStep]);

  // Check for cached results and restore them
  const restoreCachedResults = useCallback((record: AnalysisRecord): boolean => {
    if (record.ats_overall_score !== null && record.hr_overall_score !== null) {
      const cachedAtsScore: ATSScore = {
        overall: record.ats_overall_score,
        keywordMatchPct: record.ats_keyword_match_pct ?? 0,
        formattingScore: record.ats_formatting_score ?? 0,
        sectionScore: record.ats_section_score ?? 0,
        matchedKeywords: record.ats_matched_keywords ?? [],
        missingKeywords: record.ats_missing_keywords ?? [],
        issues: record.ats_issues ?? [],
        passed: record.ats_overall_score >= 70,
      };

      const cachedHrScore: HRScore = {
        overall: record.hr_overall_score,
        formattingScore: record.hr_formatting_score ?? 0,
        semanticScore: record.hr_semantic_score ?? 0,
        llmScore: record.hr_llm_score ?? 0,
        feedback: record.hr_feedback ?? [],
      };

      setAtsScore(cachedAtsScore);
      setHrScore(cachedHrScore);

      if (record.suggestions && record.suggestions.length > 0) {
        setSuggestions(record.suggestions);
      }

      setVisaFlagged(record.visa_flagged);
      setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "complete" as const })));
      setAnalysisComplete(true);

      return true;
    }
    return false;
  }, []);

  // Auto-start analysis or restore cached results
  const hasStarted = useRef(false);
  useEffect(() => {
    if (analysis && !hasStarted.current) {
      hasStarted.current = true;

      if (restoreCachedResults(analysis)) {
        return;
      }

      runAnalysis();
    }
  }, [analysis, runAnalysis, restoreCachedResults]);

  // Handle applying a suggestion fix
  const handleApplyFix = useCallback(
    (suggestion: Suggestion) => {
      const before = resumeText.slice(0, suggestion.textRange.start);
      const after = resumeText.slice(suggestion.textRange.end);
      const newText = before + suggestion.suggestedText + after;
      setResumeText(newText);

      const lengthDiff =
        suggestion.suggestedText.length -
        (suggestion.textRange.end - suggestion.textRange.start);

      setSuggestions((prev) =>
        prev
          .filter((s) => s.id !== suggestion.id)
          .map((s) => {
            if (s.textRange.start >= suggestion.textRange.end) {
              return {
                ...s,
                textRange: {
                  start: s.textRange.start + lengthDiff,
                  end: s.textRange.end + lengthDiff,
                },
              };
            }
            return s;
          })
      );
    },
    [resumeText]
  );

  // Handle dismissing a suggestion
  const handleDismiss = useCallback((suggestion: Suggestion) => {
    setDismissedIds((prev) => new Set(prev).add(suggestion.id));
  }, []);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    // In the new design, suggestions are shown inline in section feedback
    // This could scroll to the relevant section
    console.log("Suggestion clicked:", suggestion.id);
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!analysisId || saveStatus === "saving") return;

    setSaveStatus("saving");
    try {
      const saveData: {
        optimized_text: string;
        structured_content?: StructuredResume;
        selected_format?: ResumeFormatId;
      } = {
        optimized_text: resumeText,
      };

      if (structuredResume) {
        saveData.structured_content = structuredResume;
      }

      if (selectedFormat) {
        saveData.selected_format = selectedFormat;
      }

      const response = await fetch(`/api/resumes/${analysisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setLastSavedText(resumeText);
      setHasUnsavedChanges(false);
      setSaveStatus("saved");

      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("error");
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    }
  }, [analysisId, resumeText, saveStatus, structuredResume, selectedFormat]);

  // Auto-save every 30 seconds when there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges && analysisComplete) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        handleSave();
      }, 30000);

      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }
  }, [hasUnsavedChanges, analysisComplete, handleSave]);

  // Initialize lastSavedText when analysis loads
  useEffect(() => {
    if (analysis) {
      const initialText = analysis.optimized_text || analysis.original_text;
      setLastSavedText(initialText);

      if (analysis.structured_content) {
        setStructuredResume(analysis.structured_content);
      }

      if (analysis.selected_format) {
        setSelectedFormat(analysis.selected_format);
      }
    }
  }, [analysis]);

  // Parse structured resume when analysis completes
  useEffect(() => {
    async function parseStructured() {
      if (!analysisComplete || !resumeText || structuredResume || isParsingStructured) return;

      setIsParsingStructured(true);
      try {
        const response = await fetch("/api/parse-structured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: resumeText }),
        });

        if (response.ok) {
          const data = await response.json();
          setStructuredResume(data.structuredResume);
        }
      } catch (err) {
        console.error("Failed to parse structured resume:", err);
      } finally {
        setIsParsingStructured(false);
      }
    }

    parseStructured();
  }, [analysisComplete, resumeText, structuredResume, isParsingStructured]);

  // Handle structured resume changes
  const handleStructuredChange = useCallback((updated: StructuredResume) => {
    setStructuredResume(updated);

    const newText = structuredToText(updated);
    setResumeText(newText);

    setHasUnsavedChanges(true);
    setSaveStatus("idle");
  }, []);

  // Handle accepting a Grammarly-style fix
  const handleAcceptFix = useCallback((fix: import("@/lib/types").GrammarlyFix) => {
    if (!structuredResume || !fix.originalText) {
      // Can't apply fix without structured resume or original text
      return;
    }

    // Try to find and replace the text in various sections
    let updated = { ...structuredResume };
    let found = false;

    // Check summary
    if (updated.summary?.includes(fix.originalText)) {
      updated.summary = updated.summary.replace(fix.originalText, fix.suggestedText);
      found = true;
    }

    // Check experience bullets
    if (!found) {
      const updatedExperience = updated.experience.map(exp => {
        const updatedBullets = exp.bullets.map(bullet => {
          if (bullet.includes(fix.originalText)) {
            found = true;
            return bullet.replace(fix.originalText, fix.suggestedText);
          }
          return bullet;
        });
        return { ...exp, bullets: updatedBullets };
      });
      if (found) {
        updated.experience = updatedExperience;
      }
    }

    // Check education highlights
    if (!found) {
      const updatedEducation = updated.education.map(edu => {
        const updatedHighlights = edu.highlights.map(highlight => {
          if (highlight.includes(fix.originalText)) {
            found = true;
            return highlight.replace(fix.originalText, fix.suggestedText);
          }
          return highlight;
        });
        return { ...edu, highlights: updatedHighlights };
      });
      if (found) {
        updated.education = updatedEducation;
      }
    }

    // Check project bullets
    if (!found && updated.projects) {
      const updatedProjects = updated.projects.map(proj => {
        const updatedBullets = proj.bullets.map(bullet => {
          if (bullet.includes(fix.originalText)) {
            found = true;
            return bullet.replace(fix.originalText, fix.suggestedText);
          }
          return bullet;
        });
        return { ...proj, bullets: updatedBullets };
      });
      if (found) {
        updated.projects = updatedProjects;
      }
    }

    // Check certifications
    if (!found && updated.certifications) {
      const updatedCerts = updated.certifications.map(cert => {
        if (cert.includes(fix.originalText)) {
          found = true;
          return cert.replace(fix.originalText, fix.suggestedText);
        }
        return cert;
      });
      if (found) {
        updated.certifications = updatedCerts;
      }
    }

    if (found) {
      handleStructuredChange(updated);
    }
  }, [structuredResume, handleStructuredChange]);

  // Handle format selection
  const handleFormatSelect = useCallback((formatId: ResumeFormatId) => {
    setSelectedFormat(formatId);
    setHasUnsavedChanges(true);
  }, []);

  // Filtered suggestions
  const activeSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id));

  // Merge section feedback
  const sectionFeedback = useMemo(() => {
    if (!analysisComplete) return undefined;
    return mergeSectionFeedback(structuredResume, atsScore, hrScore, hrLayers);
  }, [analysisComplete, structuredResume, atsScore, hrScore, hrLayers]);

  // Loading state
  if (!analysis && !error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 animate-pulse-soft">
          <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl icon-red border flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">
                Analysis Not Found
              </h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => router.push("/analyze")} className="gradient-emerald text-white border-0">
              <Sparkles className="w-4 h-4 mr-2" />
              Start New Analysis
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ResultsHeader
        onSave={analysisComplete ? handleSave : undefined}
        saveStatus={saveStatus}
        hasUnsavedChanges={hasUnsavedChanges}
      >
        {analysisComplete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              hasStarted.current = false;
              runAnalysis();
            }}
            disabled={isAnalyzing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isAnalyzing ? "Re-analyzing..." : "Re-analyze"}</span>
          </Button>
        )}
        <ExportButton
          resumeText={resumeText}
          analysisId={analysisId}
          disabled={isAnalyzing}
          structuredResume={structuredResume}
          selectedFormat={selectedFormat}
        />
      </ResultsHeader>

      <div className="results-container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Back button */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="mb-6 animate-fade-up">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Analysis Results
          </h1>
          {analysis?.target_role && (
            <p className="text-muted-foreground">
              Target role: <span className="text-foreground font-medium">{analysis.target_role}</span>
            </p>
          )}
        </div>

        {/* Error banner */}
        {error && analysis && (
          <div className="rounded-xl border severity-critical p-4 mb-6 flex items-start gap-3 animate-scale-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isAnalyzing && (
          <>
            <Card className="mb-6 animate-fade-up">
              <CardContent className="pt-6 pb-6">
                <LoadingSteps steps={steps} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ATSScoreCardSkeleton />
              <HRScoreCardSkeleton />
            </div>

            {steps[5]?.status === "active" && (
              <div className="space-y-4 mb-6">
                <SuggestionGeneratingSkeleton />
                <EditorSkeleton />
              </div>
            )}
          </>
        )}

        {/* Visa Q&A banner */}
        {analysisComplete && visaFlagged && (
          <Card className="border-[hsl(var(--icon-sky-border))] bg-[hsl(var(--icon-sky-bg))] mb-6 animate-fade-up">
            <CardContent className="py-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl icon-sky border flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-foreground mb-1">
                    Visa-Related Information Detected
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We detected visa or work authorization information in your resume.
                    Speak with our AI avatar for visa Q&A and sponsorship guidance
                    before your interview prep.
                  </p>
                  <Button
                    variant="outline"
                    className="border-[hsl(var(--icon-sky-border))] text-[hsl(var(--icon-sky))] hover:bg-[hsl(var(--icon-sky-bg))]"
                    onClick={() => router.push(`/interview/${analysisId}`)}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Start Visa Q&A Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main content with new single-column layout */}
        {analysisComplete && (
          <ResultsLayout
            activeView="ats"
            onViewChange={() => {}}
            atsScore={atsScore}
            hrScore={hrScore}
            hrLayers={hrLayers}
            suggestions={activeSuggestions}
            onApplyFix={handleApplyFix}
            onDismiss={handleDismiss}
            onViewSuggestion={handleSuggestionClick}
            jobDescription={analysis?.job_description || ""}
            sectionFeedback={sectionFeedback}
            learnedPatterns={learnedPatterns}
            similarJobsCount={similarJobsCount}
          >
            <div className="space-y-6 animate-fade-up">
              {/* Editor Card */}
              <Card className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <h2 className="font-display font-semibold text-lg">Resume Editor</h2>
                  {activeSuggestions.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{activeSuggestions.length}</span>
                      {" "}suggestion{activeSuggestions.length !== 1 ? "s" : ""} remaining
                    </p>
                  )}
                </div>

                {/* Structured Editor Only */}
                {structuredResume ? (
                  <StructuredResumeEditor
                    resume={structuredResume}
                    onChange={handleStructuredChange}
                    suggestions={activeSuggestions}
                    onSuggestionClick={handleSuggestionClick}
                    sectionFeedback={sectionFeedback}
                    atsScore={atsScore}
                    hrScore={hrScore}
                    onAcceptFix={handleAcceptFix}
                  />
                ) : (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground justify-center">
                    <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    Parsing resume structure...
                  </div>
                )}

                {isParsingStructured && structuredResume && (
                  <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                    <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    Updating structure...
                  </div>
                )}
              </Card>

              {/* Template Gallery */}
              <TemplateGallery
                analysisId={analysisId}
                jobDescription={analysis?.job_description || ""}
                structuredResume={structuredResume}
                selectedFormat={selectedFormat}
                onFormatSelect={handleFormatSelect}
              />
            </div>
          </ResultsLayout>
        )}
      </div>
    </div>
  );
}
