"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
} from "lucide-react";
import { LabelEditor } from "./LabelEditor";
import type { AutoLabelResult } from "@/lib/auto-labeler";

type OutcomeType = "positive" | "negative";
type OutcomeDetail = "interview" | "offer" | "rejected_ats" | "rejected_hr" | "ghosted";

interface UploadState {
  step: "input" | "labeling" | "review" | "saving" | "success" | "error";
  jobDescription: string;
  resumeText: string;
  outcomeType: OutcomeType | "";
  outcomeDetail: OutcomeDetail | "";
  autoLabels: AutoLabelResult | null;
  error: string | null;
}

export function ExampleUploader() {
  const [state, setState] = useState<UploadState>({
    step: "input",
    jobDescription: "",
    resumeText: "",
    outcomeType: "",
    outcomeDetail: "",
    autoLabels: null,
    error: null,
  });

  const [editedLabels, setEditedLabels] = useState<Partial<AutoLabelResult>>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, only support text files
    // In production, would parse PDF/DOCX
    if (file.type === "text/plain") {
      const text = await file.text();
      setState((s) => ({ ...s, resumeText: text }));
    } else {
      // Placeholder for PDF/DOCX parsing
      setState((s) => ({
        ...s,
        error: "Please paste resume text directly. PDF/DOCX upload coming soon.",
      }));
    }
  };

  const handleAutoLabel = async () => {
    if (!state.jobDescription.trim() || !state.resumeText.trim() || !state.outcomeType) {
      setState((s) => ({ ...s, error: "Please fill in all required fields" }));
      return;
    }

    setState((s) => ({ ...s, step: "labeling", error: null }));

    try {
      const response = await fetch("/api/admin/auto-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: state.jobDescription,
          resumeText: state.resumeText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to auto-label");
      }

      const labels: AutoLabelResult = await response.json();
      setState((s) => ({ ...s, step: "review", autoLabels: labels }));
      setEditedLabels(labels);
    } catch (err) {
      setState((s) => ({
        ...s,
        step: "input",
        error: err instanceof Error ? err.message : "Failed to auto-label",
      }));
    }
  };

  const handleSave = async () => {
    if (!state.autoLabels) return;

    setState((s) => ({ ...s, step: "saving" }));

    try {
      const response = await fetch("/api/admin/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: state.jobDescription,
          resumeText: state.resumeText,
          outcomeType: state.outcomeType,
          outcomeDetail: state.outcomeDetail || null,
          labels: { ...state.autoLabels, ...editedLabels },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save example");
      }

      setState((s) => ({ ...s, step: "success" }));

      // Reset after 2 seconds
      setTimeout(() => {
        setState({
          step: "input",
          jobDescription: "",
          resumeText: "",
          outcomeType: "",
          outcomeDetail: "",
          autoLabels: null,
          error: null,
        });
        setEditedLabels({});
        // Refresh the page to show new example
        window.location.reload();
      }, 2000);
    } catch (err) {
      setState((s) => ({
        ...s,
        step: "review",
        error: err instanceof Error ? err.message : "Failed to save",
      }));
    }
  };

  const resetForm = () => {
    setState({
      step: "input",
      jobDescription: "",
      resumeText: "",
      outcomeType: "",
      outcomeDetail: "",
      autoLabels: null,
      error: null,
    });
    setEditedLabels({});
  };

  // Success state
  if (state.step === "success") {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold text-emerald-800 mb-2">
            Example Saved Successfully
          </h3>
          <p className="text-emerald-600">
            The example has been added to the training database.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Review state (after auto-labeling)
  if (state.step === "review" && state.autoLabels) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Review Auto-Generated Labels
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {state.error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="h-4 w-4" />
              {state.error}
            </div>
          )}

          {/* Quality Assessment */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            {state.autoLabels.is_quality_example ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <p className="font-medium">
                {state.autoLabels.is_quality_example
                  ? "Quality Example"
                  : "Low Quality Example"}
              </p>
              <p className="text-sm text-muted-foreground">
                {state.autoLabels.quality_reasoning}
              </p>
            </div>
          </div>

          <LabelEditor
            labels={state.autoLabels}
            editedLabels={editedLabels}
            onEdit={setEditedLabels}
          />

          {/* Notable Patterns */}
          {state.autoLabels.notable_patterns.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Notable Patterns Detected</h4>
              <div className="space-y-2">
                {state.autoLabels.notable_patterns.map((pattern, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm"
                  >
                    <Badge
                      variant="outline"
                      className={
                        pattern.is_positive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {pattern.is_positive ? "+" : "-"} {pattern.pattern_type}
                    </Badge>
                    <span className="text-muted-foreground">{pattern.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={resetForm} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 gradient-emerald text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm & Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Input state (default)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Resume + Job Description
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {state.error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="h-4 w-4" />
            {state.error}
          </div>
        )}

        {/* Job Description */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Job Description <span className="text-red-500">*</span>
          </label>
          <Textarea
            placeholder="Paste the full job description here..."
            className="min-h-[150px] resize-y"
            value={state.jobDescription}
            onChange={(e) =>
              setState((s) => ({ ...s, jobDescription: e.target.value, error: null }))
            }
          />
        </div>

        {/* Resume */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            Resume <span className="text-red-500">*</span>
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload file</span>
                <input
                  type="file"
                  accept=".txt,.pdf,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <span className="text-sm text-muted-foreground">or paste below</span>
            </div>
            <Textarea
              placeholder="Paste the full resume text here..."
              className="min-h-[200px] resize-y"
              value={state.resumeText}
              onChange={(e) =>
                setState((s) => ({ ...s, resumeText: e.target.value, error: null }))
              }
            />
          </div>
        </div>

        {/* Outcome */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Outcome <span className="text-red-500">*</span>
            </label>
            <Select
              value={state.outcomeType}
              onValueChange={(v: OutcomeType) =>
                setState((s) => ({ ...s, outcomeType: v, error: null }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Positive (Got Interview/Offer)
                  </span>
                </SelectItem>
                <SelectItem value="negative">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Negative (Rejected)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Outcome Detail</label>
            <Select
              value={state.outcomeDetail}
              onValueChange={(v: OutcomeDetail) =>
                setState((s) => ({ ...s, outcomeDetail: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional detail" />
              </SelectTrigger>
              <SelectContent>
                {state.outcomeType === "positive" ? (
                  <>
                    <SelectItem value="interview">Got Interview</SelectItem>
                    <SelectItem value="offer">Got Offer</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="rejected_ats">Rejected by ATS</SelectItem>
                    <SelectItem value="rejected_hr">Rejected by HR</SelectItem>
                    <SelectItem value="ghosted">Ghosted</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleAutoLabel}
          disabled={
            state.step === "labeling" ||
            !state.jobDescription.trim() ||
            !state.resumeText.trim() ||
            !state.outcomeType
          }
          className="w-full gradient-emerald text-white"
        >
          {state.step === "labeling" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Auto-Labeling with AI...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Submit & Auto-Label
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
