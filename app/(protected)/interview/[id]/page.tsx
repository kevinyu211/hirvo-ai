"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VisaQAMode } from "@/components/avatar/VisaQAMode";
import type { TranscriptEntry as VisaTranscriptEntry } from "@/components/avatar/VisaQAMode";
import { InterviewMode } from "@/components/avatar/InterviewMode";
import type { TranscriptEntry as InterviewTranscriptEntry } from "@/components/avatar/InterviewMode";
import type { InterviewFeedbackSummary } from "@/lib/prompts/interview-prompts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// ============================================================================
// Types
// ============================================================================

type FlowStep = "visa-qa" | "hr-interview" | "summary";

interface AnalysisRecord {
  id: string;
  original_text: string;
  optimized_text: string | null;
  job_description: string | null;
  target_role: string | null;
  years_experience: string | null;
  visa_flagged: boolean;
}

interface SessionSummary {
  visaTranscript: VisaTranscriptEntry[];
  interviewTranscript: InterviewTranscriptEntry[];
  interviewFeedback: InterviewFeedbackSummary | null;
}

// ============================================================================
// Interview Page Component
// ============================================================================

export default function InterviewPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const analysisId = params.id;

  // Data state
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flow state
  const [currentStep, setCurrentStep] = useState<FlowStep | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>({
    visaTranscript: [],
    interviewTranscript: [],
    interviewFeedback: null,
  });

  // ── Fetch the analysis record from Supabase ──────────────────────────
  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("resume_analyses")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (fetchError || !data) {
        setError("Analysis not found. Please start a new analysis first.");
        setLoading(false);
        return;
      }

      const record = data as unknown as AnalysisRecord;
      setAnalysis(record);

      // Determine the starting step based on visa_flagged
      if (record.visa_flagged) {
        setCurrentStep("visa-qa");
      } else {
        setCurrentStep("hr-interview");
      }

      setLoading(false);
    }

    fetchAnalysis();
  }, [analysisId]);

  // ── Handle Visa Q&A session end ──────────────────────────────────────
  const handleVisaQAEnd = useCallback((transcript: VisaTranscriptEntry[]) => {
    setSessionSummary((prev) => ({
      ...prev,
      visaTranscript: transcript,
    }));
    // Move to HR interview step
    setCurrentStep("hr-interview");
  }, []);

  // ── Handle HR Interview session end ──────────────────────────────────
  const handleInterviewEnd = useCallback(
    (transcript: InterviewTranscriptEntry[], feedback: InterviewFeedbackSummary | null) => {
      setSessionSummary((prev) => ({
        ...prev,
        interviewTranscript: transcript,
        interviewFeedback: feedback,
      }));
      // Move to summary step
      setCurrentStep("summary");
    },
    []
  );

  // ── Skip Visa Q&A (if user wants to proceed directly) ─────────────────
  const handleSkipVisaQA = useCallback(() => {
    setCurrentStep("hr-interview");
  }, []);

  // ── Restart the entire flow ───────────────────────────────────────────
  const handleRestartFlow = useCallback(() => {
    setSessionSummary({
      visaTranscript: [],
      interviewTranscript: [],
      interviewFeedback: null,
    });
    if (analysis?.visa_flagged) {
      setCurrentStep("visa-qa");
    } else {
      setCurrentStep("hr-interview");
    }
  }, [analysis?.visa_flagged]);

  // ── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading interview session...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────
  if (error || !analysis) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <ErrorIcon className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600">{error || "Failed to load analysis"}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/analyze")}>
                Start New Analysis
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render step progress indicator ───────────────────────────────────
  const renderStepIndicator = () => {
    const steps = analysis.visa_flagged
      ? ["Visa Q&A", "HR Interview", "Summary"]
      : ["HR Interview", "Summary"];

    const currentIndex = analysis.visa_flagged
      ? currentStep === "visa-qa"
        ? 0
        : currentStep === "hr-interview"
        ? 1
        : 2
      : currentStep === "hr-interview"
      ? 0
      : 1;

    return (
      <div className="flex items-center justify-center gap-1 md:gap-2 mb-4 md:mb-6 flex-wrap px-2" data-testid="step-indicator">
        {steps.map((step, idx) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full text-xs md:text-sm font-medium transition-colors ${
                idx < currentIndex
                  ? "bg-green-500 text-white"
                  : idx === currentIndex
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
              data-testid={`step-${idx + 1}`}
            >
              {idx < currentIndex ? (
                <CheckIcon className="h-3 w-3 md:h-4 md:w-4" />
              ) : (
                idx + 1
              )}
            </div>
            <span
              className={`ml-1 md:ml-2 text-xs md:text-sm ${
                idx === currentIndex ? "font-medium" : "text-muted-foreground"
              } hidden sm:inline`}
            >
              {step}
            </span>
            {idx < steps.length - 1 && (
              <div
                className={`w-4 md:w-12 h-0.5 mx-1 md:mx-3 ${
                  idx < currentIndex ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── Render Visa Q&A step ─────────────────────────────────────────────
  const renderVisaQAStep = () => (
    <div className="space-y-4">
      {renderStepIndicator()}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Visa Q&A Session</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Speak with our AI advisor about work authorization and visa sponsorship
          </p>
        </div>
        <Button variant="ghost" onClick={handleSkipVisaQA} data-testid="skip-visa-qa">
          Skip to Interview
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-220px)] min-h-[400px] md:min-h-[500px] border rounded-lg overflow-hidden">
        <VisaQAMode
          visaStatus={undefined}
          targetRole={analysis.target_role || undefined}
          jobDescription={analysis.job_description || undefined}
          analysisId={analysisId}
          onSessionEnd={handleVisaQAEnd}
        />
      </div>
    </div>
  );

  // ── Render HR Interview step ─────────────────────────────────────────
  const renderInterviewStep = () => (
    <div className="space-y-4">
      {renderStepIndicator()}
      <div className="mb-4">
        <h1 className="text-xl font-bold">HR Interview Practice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Practice with our AI interviewer{analysis.target_role ? ` for the ${analysis.target_role} position` : ""}
        </p>
      </div>
      <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-220px)] min-h-[400px] md:min-h-[500px] border rounded-lg overflow-hidden">
        <InterviewMode
          jobDescription={analysis.job_description || undefined}
          resumeText={analysis.optimized_text || analysis.original_text}
          targetRole={analysis.target_role || undefined}
          yearsExperience={analysis.years_experience || undefined}
          analysisId={analysisId}
          onSessionEnd={handleInterviewEnd}
        />
      </div>
    </div>
  );

  // ── Render Summary step ──────────────────────────────────────────────
  const renderSummaryStep = () => {
    const { visaTranscript, interviewTranscript, interviewFeedback } = sessionSummary;
    const hasVisaSession = visaTranscript.length > 0;

    return (
      <div className="space-y-6 max-w-4xl mx-auto" data-testid="session-summary">
        {renderStepIndicator()}

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Interview Session Complete</h1>
          <p className="text-muted-foreground mt-2">
            Here&apos;s a summary of your practice session
          </p>
        </div>

        {/* Interview Feedback Summary */}
        {interviewFeedback && (
          <Card data-testid="feedback-summary-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrophyIcon className="h-5 w-5 text-yellow-500" />
                Interview Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  <span
                    className={
                      interviewFeedback.overallScore >= 70
                        ? "text-green-600"
                        : interviewFeedback.overallScore >= 50
                        ? "text-yellow-600"
                        : "text-red-600"
                    }
                    data-testid="overall-score"
                  >
                    {interviewFeedback.overallScore}
                  </span>
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
                <Progress value={interviewFeedback.overallScore} className="max-w-xs mx-auto" />
              </div>

              {/* Strengths */}
              {interviewFeedback.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <StrengthIcon className="h-4 w-4" />
                    Strengths
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm" data-testid="strengths-list">
                    {interviewFeedback.strengths.map((strength, idx) => (
                      <li key={idx}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {interviewFeedback.areasForImprovement.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                    <ImprovementIcon className="h-4 w-4" />
                    Areas for Improvement
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm" data-testid="improvements-list">
                    {interviewFeedback.areasForImprovement.map((area, idx) => (
                      <li key={idx}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Question Breakdown */}
              {interviewFeedback.questionBreakdown.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <QuestionIcon className="h-4 w-4" />
                    Question-by-Question
                  </h4>
                  <div className="space-y-2" data-testid="question-breakdown">
                    {interviewFeedback.questionBreakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-3 bg-muted/30 flex items-start justify-between gap-4"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">Q{idx + 1}: {item.question}</p>
                          <p className="text-sm text-muted-foreground">{item.assessment}</p>
                        </div>
                        <Badge
                          variant={item.score >= 70 ? "default" : item.score >= 50 ? "secondary" : "destructive"}
                        >
                          {item.score}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {interviewFeedback.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                    <TipIcon className="h-4 w-4" />
                    Recommendations
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm" data-testid="recommendations-list">
                    {interviewFeedback.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Interview Transcript */}
        {interviewTranscript.length > 0 && (
          <Card data-testid="interview-transcript-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TranscriptIcon className="h-5 w-5 text-blue-500" />
                Interview Transcript
                <Badge variant="secondary" className="ml-auto">
                  {interviewTranscript.length} messages
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {interviewTranscript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`text-sm p-3 rounded-lg ${
                      entry.role === "user"
                        ? "bg-blue-50 ml-8"
                        : "bg-gray-50 mr-8"
                    }`}
                  >
                    <p className="font-medium text-xs mb-1 opacity-60">
                      {entry.role === "user" ? "You" : "Interviewer"}
                    </p>
                    <p>{entry.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Visa Q&A Transcript (if applicable) */}
        {hasVisaSession && (
          <Card data-testid="visa-transcript-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <VisaIcon className="h-5 w-5 text-teal-500" />
                Visa Q&A Transcript
                <Badge variant="secondary" className="ml-auto">
                  {visaTranscript.length} messages
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {visaTranscript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`text-sm p-3 rounded-lg ${
                      entry.role === "user"
                        ? "bg-teal-50 ml-8"
                        : "bg-gray-50 mr-8"
                    }`}
                  >
                    <p className="font-medium text-xs mb-1 opacity-60">
                      {entry.role === "user" ? "You" : "Advisor"}
                    </p>
                    <p>{entry.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button onClick={handleRestartFlow} data-testid="restart-button">
            <RefreshIcon className="mr-2 h-4 w-4" />
            Practice Again
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/results/${analysisId}`)}
            data-testid="back-to-results-button"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Analysis Results
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            data-testid="dashboard-button"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-6">
      {currentStep === "visa-qa" && renderVisaQAStep()}
      {currentStep === "hr-interview" && renderInterviewStep()}
      {currentStep === "summary" && renderSummaryStep()}
    </div>
  );
}

// ============================================================================
// Icon Components
// ============================================================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function TranscriptIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function VisaIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M15 8h2" />
      <path d="M15 12h2" />
      <path d="M7 16h10" />
    </svg>
  );
}

function StrengthIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}

function ImprovementIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12h20" />
      <path d="M12 2v20" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function TipIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}
