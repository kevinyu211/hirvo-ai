"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ResumeUploader } from "@/components/upload/ResumeUploader";
import { JobDescriptionInput } from "@/components/upload/JobDescriptionInput";
import { ContextCaptureForm } from "@/components/upload/ContextCaptureForm";
import { createClient } from "@/lib/supabase/client";
import type { ParsedResume, UserContext } from "@/lib/types";
import { ArrowLeft, Sparkles, FileText, ClipboardList, Settings2, AlertCircle } from "lucide-react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";

export default function AnalyzePage() {
  const router = useRouter();
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [userContext, setUserContext] = useState<UserContext>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = parsedResume !== null && jobDescription.trim().length > 0 && !submitting;

  const handleParsed = useCallback((result: ParsedResume) => {
    setParsedResume(result);
    setError(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!parsedResume || !jobDescription.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to analyze a resume.");
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_text: parsedResume.text,
          job_description: jobDescription.trim(),
          target_role: userContext.targetRole || undefined,
          years_experience: userContext.yearsExperience || undefined,
          file_name: parsedResume.metadata.fileName,
          file_type: parsedResume.metadata.fileType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to create analysis. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push(`/results/${result.data.id}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }, [parsedResume, jobDescription, userContext, router]);

  // Calculate progress
  const steps = [
    { done: !!parsedResume, label: "Resume uploaded" },
    { done: jobDescription.trim().length > 0, label: "Job description added" },
  ];
  const completedSteps = steps.filter(s => s.done).length;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-5xl">
        {/* Back button */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="mb-10 animate-fade-up">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Analyze Your Resume
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Upload your resume and paste the job description to get ATS and HR simulation scores
            with actionable improvement suggestions.
          </p>
        </div>

        {/* Progress indicator */}
        <Card className="p-4 mb-8 bg-muted/30 border-dashed animate-fade-up delay-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${completedSteps === 2 ? "gradient-emerald text-white" : "bg-muted text-muted-foreground"} transition-all`}>
                {completedSteps === 2 ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{completedSteps}/2</span>
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {completedSteps === 2 ? "Ready to analyze!" : "Getting started"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {completedSteps === 0 && "Upload your resume and add a job description"}
                  {completedSteps === 1 && !parsedResume && "Upload your resume to continue"}
                  {completedSteps === 1 && parsedResume && "Add a job description to continue"}
                  {completedSteps === 2 && "Click the button below to run your analysis"}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${step.done ? "bg-accent" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
        </Card>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
          {/* Resume upload */}
          <div className="animate-fade-up delay-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl icon-red border flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Resume
                </h2>
                <p className="text-sm text-muted-foreground">
                  PDF or DOCX, max 5MB
                </p>
              </div>
            </div>
            <ResumeUploader onParsed={handleParsed} />
          </div>

          {/* Job description */}
          <div className="animate-fade-up delay-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl icon-violet border flex items-center justify-center">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Job Description
                </h2>
                <p className="text-sm text-muted-foreground">
                  Paste the full job posting
                </p>
              </div>
            </div>
            <JobDescriptionInput value={jobDescription} onChange={setJobDescription} />
          </div>
        </div>

        {/* Context capture form */}
        <div className="animate-fade-up delay-400">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl icon-sky border flex items-center justify-center">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Additional Context
              </h2>
              <p className="text-sm text-muted-foreground">
                Optional details to improve analysis accuracy
              </p>
            </div>
          </div>
          <Card className="p-6 bg-muted/20">
            <ContextCaptureForm value={userContext} onChange={setUserContext} />
          </Card>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-6 rounded-xl severity-critical border p-4 flex items-start gap-3 animate-scale-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Error</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Submit section */}
        <div className="mt-10 pt-8 border-t animate-fade-up delay-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-semibold text-foreground mb-1">
                Ready to analyze?
              </h3>
              <p className="text-sm text-muted-foreground">
                {!canSubmit && !submitting
                  ? !parsedResume && !jobDescription.trim()
                    ? "Upload a resume and paste a job description to get started."
                    : !parsedResume
                      ? "Upload a resume to continue."
                      : "Paste a job description to continue."
                  : "Your resume will be analyzed against the job description."}
              </p>
            </div>
            <Button
              size="lg"
              disabled={!canSubmit}
              onClick={handleAnalyze}
              className="w-full sm:w-auto gap-2.5 gradient-emerald text-white border-0 shadow-glow-emerald hover:shadow-glow-emerald-lg transition-all duration-300 ease-out-back hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyze My Resume
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
