"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Check, Sparkles } from "lucide-react";
import type { StructuredResume, ResumeFormatId } from "@/lib/types";
import { FORMAT_METADATA } from "@/lib/types";

export interface ExportButtonProps {
  /** The current (possibly edited) resume text to export (legacy mode) */
  resumeText: string;
  /** Optional analysis ID for saving export event */
  analysisId?: string;
  /** Whether the button should be disabled (e.g., during analysis) */
  disabled?: boolean;
  /** Structured resume for template-based export */
  structuredResume?: StructuredResume | null;
  /** Selected format template ID */
  selectedFormat?: ResumeFormatId | null;
}

type ExportFormat = "pdf" | "docx";

interface TemplateOption {
  id: ResumeFormatId;
  name: string;
  description: string;
  isRecommended?: boolean;
}

// Map new template IDs to options
const TEMPLATES: TemplateOption[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean sans-serif with subtle accents",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional serif fonts, timeless layout",
  },
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Maximum whitespace, elegant fonts",
  },
  {
    id: "technical",
    name: "Technical",
    description: "Monospace style for engineering roles",
  },
  {
    id: "executive",
    name: "Executive",
    description: "Premium serif for senior positions",
  },
];

export function ExportButton({
  resumeText,
  analysisId,
  disabled = false,
  structuredResume,
  selectedFormat: preSelectedFormat,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [fileFormat, setFileFormat] = useState<ExportFormat | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeFormatId>(preSelectedFormat || "modern");
  const [error, setError] = useState<string | null>(null);

  // Update template when preSelectedFormat changes
  const handleSelectFormat = useCallback((format: ExportFormat) => {
    setFileFormat(format);
    setShowTemplates(true);
    // If there's a pre-selected format, use it
    if (preSelectedFormat) {
      setSelectedTemplate(preSelectedFormat);
    }
  }, [preSelectedFormat]);

  const handleExport = useCallback(
    async (format: ExportFormat, template: ResumeFormatId) => {
      setDropdownOpen(false);
      setShowTemplates(false);
      setFileFormat(null);
      setIsExporting(true);
      setExportFormat(format);
      setError(null);

      try {
        // Use structured resume export if available
        const body = structuredResume
          ? {
              format,
              templateId: template,
              structuredResume,
              ...(analysisId ? { analysisId } : {}),
            }
          : {
              text: resumeText,
              format,
              templateId: template,
              ...(analysisId ? { analysisId } : {}),
            };

        const response = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
    [resumeText, analysisId, structuredResume]
  );

  const handleBackToFormats = useCallback(() => {
    setShowTemplates(false);
    setFileFormat(null);
  }, []);

  const isDisabled = disabled || isExporting || !resumeText;

  return (
    <div className="relative inline-block">
      <Button
        variant="accent"
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
            onClick={() => {
              setDropdownOpen(false);
              setShowTemplates(false);
              setFileFormat(null);
            }}
            aria-hidden="true"
          />

          <div
            className="absolute right-0 mt-2 w-64 rounded-2xl border-2 bg-popover shadow-dramatic z-50 overflow-hidden"
            role="menu"
            aria-label="Export options"
          >
            {!showTemplates ? (
              // Format Selection
              <>
                <div className="px-3 py-2 border-b">
                  <p className="text-xs font-medium text-muted-foreground">Choose format</p>
                </div>
                <button
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
                  onClick={() => handleSelectFormat("pdf")}
                  role="menuitem"
                  disabled={isDisabled}
                >
                  <div className="flex items-center gap-3">
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
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-muted-foreground">
                        ATS-friendly format
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                <div className="border-t" />

                <button
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors"
                  onClick={() => handleSelectFormat("docx")}
                  role="menuitem"
                  disabled={isDisabled}
                >
                  <div className="flex items-center gap-3">
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
                      <div className="font-medium">DOCX</div>
                      <div className="text-xs text-muted-foreground">
                        Editable Word document
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </>
            ) : (
              // Template Selection
              <>
                <div className="px-3 py-2 border-b flex items-center gap-2">
                  <button
                    onClick={handleBackToFormats}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Go back"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <p className="text-xs font-medium text-muted-foreground">
                    Choose template for {fileFormat?.toUpperCase()}
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {TEMPLATES.map((template) => {
                    const isPreSelected = preSelectedFormat === template.id;
                    return (
                      <button
                        key={template.id}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-sm text-left hover:bg-accent transition-colors ${
                          selectedTemplate === template.id ? "bg-accent" : ""
                        }`}
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          if (fileFormat) {
                            handleExport(fileFormat, template.id);
                          }
                        }}
                        role="menuitem"
                        disabled={isDisabled}
                      >
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {template.name}
                            {isPreSelected && (
                              <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Recommended
                              </span>
                            )}
                            {template.id === "modern" && !isPreSelected && !preSelectedFormat && (
                              <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {template.description}
                          </div>
                        </div>
                        {selectedTemplate === template.id && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
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
