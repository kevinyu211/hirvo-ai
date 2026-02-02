"use client";

import { useEffect } from "react";

// ============================================================================
// Types
// ============================================================================

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// ============================================================================
// Global Error Page
// ============================================================================

/**
 * Global error page that catches errors in the root layout.
 * This is a special Next.js error page that replaces the entire HTML document
 * when an error occurs at the root layout level.
 *
 * Note: This component must define its own <html> and <body> tags since
 * it replaces the root layout when an error occurs.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  // Log error to console
  useEffect(() => {
    console.error("Global error:", error);
    // Here you could send to an error tracking service like Sentry
    // captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-lg border bg-white p-8 shadow-lg">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-7 w-7 text-red-600"
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
                <h1 className="text-2xl font-semibold text-gray-900">
                  Application Error
                </h1>
                {error.digest && (
                  <p className="mt-1 text-sm text-gray-500">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="mb-4 text-gray-600">
              A critical error occurred while loading the application. This is
              likely a temporary issue.
            </p>

            <p className="mb-6 text-sm text-gray-500">
              Please try refreshing the page. If the problem persists, contact
              our support team with the error ID above.
            </p>

            {/* Show error details in development */}
            {process.env.NODE_ENV === "development" && (
              <details className="mb-6 rounded-md bg-gray-100 p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Technical Details (Development Only)
                </summary>
                <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs text-gray-600">
                  {error.message}
                  {"\n\n"}
                  {error.stack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={reset}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:flex-none"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:flex-none"
              >
                Go to Home Page
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded-md px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:flex-none"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
