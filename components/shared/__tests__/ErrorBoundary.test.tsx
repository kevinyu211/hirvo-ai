/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ErrorBoundary, useErrorHandler } from "../ErrorBoundary";

// ============================================================================
// Test Utilities
// ============================================================================

// Component that throws an error for testing
function ThrowError({ error }: { error: Error }): never {
  throw error;
}

// Component that uses the useErrorHandler hook
function ErrorThrower({ error }: { error: Error }) {
  const throwError = useErrorHandler();
  return (
    <button onClick={() => throwError(error)}>Throw Error</button>
  );
}

// Mock console.error to avoid cluttering test output
const originalConsoleError = console.error;

beforeEach(() => {
  // Suppress React's error boundary logging and our own logging
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  cleanup();
});

// ============================================================================
// Basic Functionality Tests
// ============================================================================

describe("ErrorBoundary", () => {
  describe("basic functionality", () => {
    it("renders children when no error occurs", () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("catches errors and displays fallback UI", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Test error")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
    });

    it("shows custom fallback when provided", () => {
      render(
        <ErrorBoundary fallback={<div>Custom fallback</div>}>
          <ThrowError error={new Error("Test error")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    });

    it("calls onError callback when error is caught", () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError error={new Error("Test error")} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it("logs error to console", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Test error")} />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Error Type Detection Tests
  // ============================================================================

  describe("error type detection", () => {
    it("detects OpenAI errors", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("OpenAI API rate limit exceeded")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("AI Service Error")).toBeInTheDocument();
    });

    it("detects Supabase errors", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Supabase database connection failed")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Database Error")).toBeInTheDocument();
    });

    it("detects HeyGen errors", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("HeyGen avatar connection failed")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Avatar Service Error")).toBeInTheDocument();
    });

    it("detects file parsing errors", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Failed to parse PDF file")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("File Processing Error")).toBeInTheDocument();
    });

    it("detects network errors", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Network request timeout")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Connection Error")).toBeInTheDocument();
    });

    it("shows generic message for unknown errors", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Some random error")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // User Actions Tests
  // ============================================================================

  describe("user actions", () => {
    it("resets error state when 'Try Again' is clicked", () => {
      let shouldThrow = true;

      function MaybeThrow() {
        if (shouldThrow) {
          throw new Error("Test error");
        }
        return <div>Recovered</div>;
      }

      render(
        <ErrorBoundary>
          <MaybeThrow />
        </ErrorBoundary>
      );

      // Error should be showing
      expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click Try Again
      fireEvent.click(screen.getByText("Try Again"));

      // Should now show recovered content
      expect(screen.getByText("Recovered")).toBeInTheDocument();
    });

    it("shows 'Refresh Page' button", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Test error")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("Refresh Page")).toBeInTheDocument();
    });

    it("calls window.location.reload when 'Refresh Page' is clicked", () => {
      const reloadMock = vi.fn();
      const originalLocation = window.location;

      // Mock window.location.reload
      Object.defineProperty(window, "location", {
        value: { ...originalLocation, reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Test error")} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText("Refresh Page"));

      expect(reloadMock).toHaveBeenCalled();

      // Restore original location
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
      });
    });
  });

  // ============================================================================
  // useErrorHandler Hook Tests
  // ============================================================================

  describe("useErrorHandler hook", () => {
    it("throws error when triggered", () => {
      render(
        <ErrorBoundary>
          <ErrorThrower error={new Error("Hook triggered error")} />
        </ErrorBoundary>
      );

      // Initially no error
      expect(screen.getByText("Throw Error")).toBeInTheDocument();

      // Trigger error
      fireEvent.click(screen.getByText("Throw Error"));

      // Error boundary should catch it
      expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
    });
  });

  // ============================================================================
  // UI Element Tests
  // ============================================================================

  describe("UI elements", () => {
    it("displays error icon", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Test error")} />
        </ErrorBoundary>
      );

      // Check for SVG icon presence
      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("displays suggestion text", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Network connection failed")} />
        </ErrorBoundary>
      );

      expect(
        screen.getByText(/check your internet connection/i)
      ).toBeInTheDocument();
    });

    it("shows appropriate message for API key error", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("Invalid API key provided")} />
        </ErrorBoundary>
      );

      expect(screen.getByText("AI Service Error")).toBeInTheDocument();
      expect(
        screen.getByText(/encountered an issue with our AI analysis/i)
      ).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe("edge cases", () => {
    it("handles errors with no message", () => {
      render(
        <ErrorBoundary>
          <ThrowError error={new Error("")} />
        </ErrorBoundary>
      );

      // Should show generic error
      expect(screen.getByText("Something Went Wrong")).toBeInTheDocument();
    });

    it("handles multiple error types in message", () => {
      render(
        <ErrorBoundary>
          <ThrowError
            error={new Error("OpenAI network timeout while fetching")}
          />
        </ErrorBoundary>
      );

      // Should detect OpenAI as it appears first in detection order
      expect(screen.getByText("AI Service Error")).toBeInTheDocument();
    });
  });
});
