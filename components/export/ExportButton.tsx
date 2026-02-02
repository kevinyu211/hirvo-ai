"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

export interface ExportButtonProps {
  /** The current (possibly edited) resume text to export */
  resumeText: string;
  /** Optional analysis ID for saving export event */
  analysisId?: string;
  /** Whether the button should be disabled (e.g., during analysis) */
  disabled?: boolean;
}

type ExportFormat = "pdf" | "docx";

export function ExportButton({
  resumeText,
  analysisId,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setDropdownOpen(false);
      setIsExporting(true);
      setExportFormat(format);
      setError(null);

      try {
        const response = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: resumeText,
            format,
            ...(analysisId ? { analysisId } : {}),
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            err.error || `Export failed (${response.status})`
          );
        }

        // Get the binary data and trigger download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = format === "pdf" ? "resume.pdf" : "resume.docx";
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
      } catch (err) {
        console.error("Export failed:", err);
        setError(
          err instanceof Error ? err.message : "Export failed. Please try again."
        );
      } finally {
        setIsExporting(false);
        setExportFormat(null);
      }
    },
    [resumeText, analysisId]
  );

  const isDisabled = disabled || isExporting || !resumeText;

  return (
    <div className="relative inline-block">
      <Button
        onClick={() => setDropdownOpen((prev) => !prev)}
        disabled={isDisabled}
        className="gap-2"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        aria-label="Export resume"
      >
        {isExporting ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                fill="currentColor"
                className="opacity-75"
              />
            </svg>
            Exporting {exportFormat === "pdf" ? "PDF" : "DOCX"}...
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </>
        )}
      </Button>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
            aria-hidden="true"
          />

          <div
            className="absolute right-0 mt-1 w-52 rounded-md border bg-popover shadow-lg z-50"
            role="menu"
            aria-label="Export format options"
          >
            <button
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-accent rounded-t-md transition-colors"
              onClick={() => handleExport("pdf")}
              role="menuitem"
              disabled={isDisabled}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-500 flex-shrink-0"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div>
                <div className="font-medium">Download as PDF</div>
                <div className="text-xs text-muted-foreground">
                  ATS-friendly PDF format
                </div>
              </div>
            </button>

            <div className="border-t" />

            <button
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-accent rounded-b-md transition-colors"
              onClick={() => handleExport("docx")}
              role="menuitem"
              disabled={isDisabled}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-500 flex-shrink-0"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div>
                <div className="font-medium">Download as DOCX</div>
                <div className="text-xs text-muted-foreground">
                  Editable Word document
                </div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute right-0 mt-1 w-52 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-600 z-50">
          {error}
          <button
            className="ml-1 underline"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
