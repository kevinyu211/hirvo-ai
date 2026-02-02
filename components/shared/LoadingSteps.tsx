"use client";

export interface LoadingStep {
  label: string;
  status: "pending" | "active" | "complete" | "error";
}

export interface LoadingStepsProps {
  steps: LoadingStep[];
}

export function LoadingSteps({ steps }: LoadingStepsProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-3">
          {/* Step indicator */}
          <div className="flex-shrink-0">
            {step.status === "complete" ? (
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="text-white"
                >
                  <path
                    d="M3 7l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : step.status === "active" ? (
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
            ) : step.status === "error" ? (
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="text-white"
                >
                  <path
                    d="M4 4l6 6M10 4l-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
            )}
          </div>

          {/* Step label */}
          <span
            className={`text-sm ${
              step.status === "active"
                ? "text-foreground font-medium"
                : step.status === "complete"
                  ? "text-muted-foreground"
                  : step.status === "error"
                    ? "text-red-600 font-medium"
                    : "text-muted-foreground/50"
            }`}
          >
            {step.label}
            {step.status === "active" && (
              <span className="ml-1 inline-block animate-pulse">...</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
