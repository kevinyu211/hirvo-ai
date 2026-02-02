"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type { ViewMode } from "@/components/editor/ViewToggle";
import { GrammarlyEditor } from "@/components/editor/GrammarlyEditor";
import { SuggestionPopover } from "@/components/editor/SuggestionPopover";
import { LoadingSteps } from "@/components/shared/LoadingSteps";
import type { LoadingStep } from "@/components/shared/LoadingSteps";
import { ExportButton } from "@/components/export/ExportButton";
import { ResultsLayout } from "@/components/results/ResultsLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ATSScore, HRScore, Suggestion } from "@/lib/types";
import { detectVisaStatus } from "@/lib/visa-detection";
import { ArrowLeft, RefreshCw, Globe, Sparkles, AlertCircle } from "lucide-react";
import { ResultsHeader } from "@/components/shared/ResultsHeader";

// ============================================================================
// Analysis pipeline step definitions
// ============================================================================
const INITIAL_STEPS: LoadingStep[] = [
  { label: "Running ATS simulation", status: "pending" },
  { label: "Analyzing HR perspective", status: "pending" },
  { label: "Generating suggestions", status: "pending" },
  { label: "Ready!", status: "pending" },
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

  // UI state
  const [steps, setSteps] = useState<LoadingStep[]>(INITIAL_STEPS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [activeView, setActiveView] = useState<ViewMode>("ats");
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Track dismissed suggestions
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

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

  // Run analysis pipeline
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
    setSelectedSuggestionId(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" as const })));

    const currentResumeText = resumeText;
    const jobDescription = analysis.job_description || "";

    try {
      // Step 1 & 2: Run ATS and HR scoring in parallel
      updateStep(0, "active");
      updateStep(1, "active");

      const [atsResult, hrResult] = await Promise.allSettled([
        fetch("/api/ats-score", {
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
          return res.json();
        }),

        fetch("/api/hr-score", {
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
        }),
      ]);

      // Process ATS result
      let atsData: { score: ATSScore } | null = null;
      if (atsResult.status === "fulfilled") {
        const value = atsResult.value as { score: ATSScore };
        atsData = value;
        setAtsScore(value.score);
        updateStep(0, "complete");
      } else {
        console.error("ATS scoring failed:", atsResult.reason);
        updateStep(0, "error");
      }

      // Process HR result
      let hrData: { score: HRScore; layers: HRLayerData } | null = null;
      if (hrResult.status === "fulfilled") {
        const value = hrResult.value as { score: HRScore; layers: HRLayerData };
        hrData = value;
        setHrScore(value.score);
        setHrLayers(value.layers);
        updateStep(1, "complete");
      } else {
        console.error("HR scoring failed:", hrResult.reason);
        updateStep(1, "error");
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

      // Step 3: Generate suggestions
      if (atsData || hrData) {
        updateStep(2, "active");

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
            updateStep(2, "complete");
          } else {
            console.error("Optimization failed");
            updateStep(2, "error");
          }
        } catch (optimizeErr) {
          console.error("Optimization failed:", optimizeErr);
          updateStep(2, "error");
        }
      } else {
        updateStep(2, "error");
      }

      // Step 4: Done
      updateStep(3, "complete");
      setAnalysisComplete(true);
    } catch (err) {
      console.error("Analysis pipeline failed:", err);
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [analysis, resumeText, analysisId, updateStep]);

  // Auto-start analysis
  const hasStarted = useRef(false);
  useEffect(() => {
    if (analysis && !hasStarted.current) {
      hasStarted.current = true;
      runAnalysis();
    }
  }, [analysis, runAnalysis]);

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

      setSelectedSuggestionId(null);
    },
    [resumeText]
  );

  // Handle dismissing a suggestion
  const handleDismiss = useCallback((suggestion: Suggestion) => {
    setDismissedIds((prev) => new Set(prev).add(suggestion.id));
    setSelectedSuggestionId(null);
  }, []);

  // Handle suggestion click (from sidebar "View" or editor click)
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    setSelectedSuggestionId((prev) =>
      prev === suggestion.id ? null : suggestion.id
    );
    // Scroll the suggestion into view in the editor
    setTimeout(() => {
      const markElement = editorRef.current?.querySelector(
        `[data-suggestion-id="${suggestion.id}"]`
      );
      if (markElement) {
        markElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  }, []);

  // Handle text edits
  const handleTextChange = useCallback((text: string) => {
    setResumeText(text);
  }, []);

  // Filtered suggestions
  const activeSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id));
  const selectedSuggestion =
    activeSuggestions.find((s) => s.id === selectedSuggestionId) || null;

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
      <ResultsHeader>
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
        />
      </ResultsHeader>

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-[1600px]">
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
            {/* Loading steps */}
            <Card className="mb-6 animate-fade-up">
              <CardContent className="pt-6 pb-6">
                <LoadingSteps steps={steps} />
              </CardContent>
            </Card>

            {/* Score cards skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ATSScoreCardSkeleton />
              <HRScoreCardSkeleton />
            </div>

            {/* Editor skeleton */}
            {steps[2]?.status === "active" && (
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

        {/* Main content with sidebar layout */}
        {analysisComplete && (
          <ResultsLayout
            activeView={activeView}
            onViewChange={setActiveView}
            atsScore={atsScore}
            hrScore={hrScore}
            hrLayers={hrLayers}
            suggestions={activeSuggestions}
            onApplyFix={handleApplyFix}
            onDismiss={handleDismiss}
            onViewSuggestion={handleSuggestionClick}
          >
            <div className="space-y-4 animate-fade-up">
              <Card className="p-4 md:p-6">
                {/* Suggestion count header */}
                {activeSuggestions.length > 0 && (
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <h2 className="font-display font-semibold text-lg">Resume Editor</h2>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{activeSuggestions.length}</span>
                      {" "}suggestion{activeSuggestions.length !== 1 ? "s" : ""} remaining
                    </p>
                  </div>
                )}

                {/* Editor with popover */}
                <div className="relative" ref={editorRef}>
                  <GrammarlyEditor
                    text={resumeText}
                    onTextChange={handleTextChange}
                    suggestions={activeSuggestions}
                    activeView={activeView}
                    onSuggestionClick={handleSuggestionClick}
                    selectedSuggestionId={selectedSuggestionId}
                  />
                  <SuggestionPopover
                    suggestion={selectedSuggestion}
                    onApplyFix={handleApplyFix}
                    onDismiss={handleDismiss}
                    editorElement={editorRef.current}
                  />
                </div>
              </Card>
            </div>
          </ResultsLayout>
        )}
      </div>
    </div>
  );
}
