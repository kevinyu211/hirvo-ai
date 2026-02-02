"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback UI to show when an error occurs */
  fallback?: React.ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: "openai" | "supabase" | "heygen" | "parse" | "network" | "unknown";
}

// ============================================================================
// Error Type Detection
// ============================================================================

/**
 * Detects the type of error based on error message patterns.
 * Used to show more specific error messages to users.
 */
function detectErrorType(
  error: Error
): ErrorBoundaryState["errorType"] {
  const message = error.message.toLowerCase();

  // OpenAI API errors
  if (
    message.includes("openai") ||
    message.includes("rate limit") ||
    message.includes("api key") ||
    message.includes("insufficient_quota") ||
    message.includes("model_not_found")
  ) {
    return "openai";
  }

  // Supabase/database errors
  if (
    message.includes("supabase") ||
    message.includes("postgres") ||
    message.includes("database") ||
    message.includes("relation") ||
    message.includes("column") ||
    message.includes("row level security")
  ) {
    return "supabase";
  }

  // HeyGen avatar errors
  if (
    message.includes("heygen") ||
    message.includes("avatar") ||
    message.includes("webrtc") ||
    message.includes("streaming") ||
    message.includes("session limit")
  ) {
    return "heygen";
  }

  // File parsing errors
  if (
    message.includes("parse") ||
    message.includes("pdf") ||
    message.includes("docx") ||
    message.includes("corrupt") ||
    message.includes("invalid file")
  ) {
    return "parse";
  }

  // Network errors
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout") ||
    message.includes("connection") ||
    message.includes("econnrefused") ||
    message.includes("failed to fetch")
  ) {
    return "network";
  }

  return "unknown";
}

/**
 * Returns a user-friendly error message based on error type.
 */
function getErrorMessage(errorType: ErrorBoundaryState["errorType"]): {
  title: string;
  description: string;
  suggestion: string;
} {
  switch (errorType) {
    case "openai":
      return {
        title: "AI Service Error",
        description:
          "We encountered an issue with our AI analysis service. This could be due to high demand or a temporary service disruption.",
        suggestion:
          "Please wait a moment and try again. If the problem persists, try refreshing the page.",
      };
    case "supabase":
      return {
        title: "Database Error",
        description:
          "We had trouble connecting to our database. Your data is safe, but we couldn't complete your request.",
        suggestion:
          "Please try again in a few moments. If the issue continues, contact support.",
      };
    case "heygen":
      return {
        title: "Avatar Service Error",
        description:
          "We couldn't connect to the AI avatar service. This might be due to connection issues or service availability.",
        suggestion:
          "Check your internet connection and try again. You may have reached your daily session limit.",
      };
    case "parse":
      return {
        title: "File Processing Error",
        description:
          "We couldn't process your file. The file might be corrupted, password-protected, or in an unsupported format.",
        suggestion:
          "Please ensure your file is a valid PDF or DOCX document without password protection.",
      };
    case "network":
      return {
        title: "Connection Error",
        description:
          "We couldn't reach our servers. This is usually caused by network connectivity issues.",
        suggestion:
          "Please check your internet connection and try again.",
      };
    default:
      return {
        title: "Something Went Wrong",
        description:
          "An unexpected error occurred while processing your request.",
        suggestion:
          "Please try again. If the problem persists, refresh the page or contact support.",
      };
  }
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: "unknown",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorType: detectErrorType(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorType: "unknown",
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Allow custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = getErrorMessage(this.state.errorType);

      return (
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <svg
                    className="h-5 w-5 text-red-600"
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
                <CardTitle className="text-red-600">
                  {errorMessage.title}
                </CardTitle>
              </div>
              <CardDescription className="mt-2">
                {errorMessage.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {errorMessage.suggestion}
              </p>

              {/* Show error details in development */}
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="rounded-md bg-muted p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
                    {this.state.error.message}
                    {"\n\n"}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="outline">
                  Try Again
                </Button>
                <Button onClick={this.handleRefresh} variant="default">
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Hook for Functional Components
// ============================================================================

/**
 * Custom hook to trigger error boundary from functional components.
 * Usage: const throwError = useErrorHandler(); throwError(new Error("Something went wrong"));
 */
export function useErrorHandler() {
  const [, setError] = React.useState<Error | null>(null);

  const throwError = React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);

  return throwError;
}

export default ErrorBoundary;
