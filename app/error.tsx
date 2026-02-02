"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================================================
// Types
// ============================================================================

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// ============================================================================
// Error Type Detection
// ============================================================================

function getErrorInfo(error: Error): {
  title: string;
  description: string;
  suggestion: string;
} {
  const message = error.message.toLowerCase();

  // OpenAI API errors
  if (
    message.includes("openai") ||
    message.includes("rate limit") ||
    message.includes("api key")
  ) {
    return {
      title: "AI Service Temporarily Unavailable",
      description:
        "Our AI analysis service is experiencing issues. This is usually temporary.",
      suggestion:
        "Please wait a moment and try again. If the problem persists, our team has been notified.",
    };
  }

  // Supabase/database errors
  if (
    message.includes("supabase") ||
    message.includes("database") ||
    message.includes("postgres")
  ) {
    return {
      title: "Database Connection Error",
      description:
        "We had trouble connecting to our database. Your data is safe.",
      suggestion: "Please try again in a few moments.",
    };
  }

  // HeyGen avatar errors
  if (
    message.includes("heygen") ||
    message.includes("avatar") ||
    message.includes("webrtc")
  ) {
    return {
      title: "Avatar Service Unavailable",
      description:
        "We couldn't connect to the AI avatar service. This might be due to high demand.",
      suggestion:
        "Try refreshing the page or check if you've reached your daily session limit.",
    };
  }

  // File parsing errors
  if (
    message.includes("parse") ||
    message.includes("pdf") ||
    message.includes("docx")
  ) {
    return {
      title: "File Processing Error",
      description:
        "There was a problem processing your file. It might be corrupted or in an unsupported format.",
      suggestion: "Please try uploading a different file or convert it to a standard PDF or DOCX format.",
    };
  }

  // Network errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    return {
      title: "Connection Problem",
      description: "We couldn't reach our servers due to a network issue.",
      suggestion: "Please check your internet connection and try again.",
    };
  }

  // Default error
  return {
    title: "Something Went Wrong",
    description:
      "An unexpected error occurred. We've logged this issue and will look into it.",
    suggestion: "Please try again. If the problem continues, try refreshing the page.",
  };
}

// ============================================================================
// Error Page Component
// ============================================================================

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Log error to console (and potentially to error tracking service)
  useEffect(() => {
    console.error("Page error:", error);
    // Here you could send to an error tracking service like Sentry
    // captureException(error);
  }, [error]);

  const errorInfo = getErrorInfo(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <CardTitle className="text-xl">{errorInfo.title}</CardTitle>
              {error.digest && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <CardDescription className="text-base">
            {errorInfo.description}
          </CardDescription>

          <p className="text-sm text-muted-foreground">
            {errorInfo.suggestion}
          </p>

          {/* Show error details in development */}
          {process.env.NODE_ENV === "development" && (
            <details className="rounded-md bg-muted p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Technical Details (Development Only)
              </summary>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {error.message}
                {"\n\n"}
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={reset} variant="default" className="flex-1 sm:flex-none">
              Try Again
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              Go Home
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              className="flex-1 sm:flex-none"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
