"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface OutcomeReporterProps {
  analysisId: string;
  resumeText: string;
  jobDescription: string;
}

type OutcomeType = "positive" | "negative" | null;
type OutcomeDetail = "interview" | "offer" | "rejected" | "ghosted" | null;

export function OutcomeReporter({
  analysisId,
  resumeText,
  jobDescription,
}: OutcomeReporterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"outcome" | "detail" | "notes" | "submitting" | "success">(
    "outcome"
  );
  const [outcomeType, setOutcomeType] = useState<OutcomeType>(null);
  const [outcomeDetail, setOutcomeDetail] = useState<OutcomeDetail>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOutcomeSelect = (type: OutcomeType) => {
    setOutcomeType(type);
    setStep("detail");
  };

  const handleDetailSelect = (detail: OutcomeDetail) => {
    setOutcomeDetail(detail);
    setStep("notes");
  };

  const handleSubmit = async () => {
    if (!outcomeType) return;

    setStep("submitting");
    setError(null);

    try {
      const response = await fetch("/api/feedback/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          resumeText,
          jobDescription,
          outcomeType,
          outcomeDetail,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }

      setStep("success");

      // Auto-close after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setStep("notes");
    }
  };

  const resetForm = () => {
    setStep("outcome");
    setOutcomeType(null);
    setOutcomeDetail(null);
    setNotes("");
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Report Outcome
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            Share Your Application Outcome
          </DialogTitle>
        </DialogHeader>

        {/* Success State */}
        {step === "success" && (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">Thank You!</h3>
            <p className="text-muted-foreground text-sm">
              Your feedback helps improve our recommendations for everyone.
            </p>
          </div>
        )}

        {/* Outcome Selection */}
        {step === "outcome" && (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Did you apply to this job? Let us know what happened so we can improve
              our recommendations.
            </p>
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 justify-start gap-3 hover:bg-emerald-50 hover:border-emerald-200"
                onClick={() => handleOutcomeSelect("positive")}
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div className="text-left">
                  <p className="font-medium">I got a positive response</p>
                  <p className="text-xs text-muted-foreground">
                    Interview invitation or job offer
                  </p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 justify-start gap-3 hover:bg-red-50 hover:border-red-200"
                onClick={() => handleOutcomeSelect("negative")}
              >
                <XCircle className="h-5 w-5 text-red-500" />
                <div className="text-left">
                  <p className="font-medium">I was not selected</p>
                  <p className="text-xs text-muted-foreground">
                    Rejected or no response
                  </p>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Detail Selection */}
        {step === "detail" && (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {outcomeType === "positive"
                ? "That's great! What was the outcome?"
                : "We're sorry to hear that. What happened?"}
            </p>
            <div className="grid gap-2">
              {outcomeType === "positive" ? (
                <>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleDetailSelect("interview")}
                  >
                    Got an interview
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleDetailSelect("offer")}
                  >
                    Received a job offer
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleDetailSelect("rejected")}
                  >
                    Received a rejection
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleDetailSelect("ghosted")}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    No response (ghosted)
                  </Button>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("outcome")}>
              Back
            </Button>
          </div>
        )}

        {/* Notes */}
        {step === "notes" && (
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Any additional notes? (optional)
            </p>
            <Textarea
              placeholder="E.g., 'They mentioned my skills section was well-organized'"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setStep("detail")}>
                Back
              </Button>
              <Button onClick={handleSubmit} className="gap-2">
                Submit Feedback
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Submitting */}
        {step === "submitting" && (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Submitting your feedback...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
