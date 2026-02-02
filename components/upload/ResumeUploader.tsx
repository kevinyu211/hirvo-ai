"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ParsedResume } from "@/lib/types";
import { Upload, FileText, X, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface ParseWarning {
  message: string;
  type: "warning" | "info";
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ResumeUploaderProps {
  onParsed?: (result: ParsedResume) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function ResumeUploader({ onParsed }: ResumeUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (selectedFile: File) => {
      setError(null);
      setParsed(null);
      setWarnings([]);

      // Validate file type
      if (!isValidFile(selectedFile)) {
        setError("Invalid file type. Only PDF and DOCX files are accepted.");
        return;
      }

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError(
          `File too large. Maximum size is 5MB. Your file is ${formatFileSize(selectedFile.size)}.`
        );
        return;
      }

      setFile(selectedFile);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("/api/parse", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.isScannedPdf) {
            setError(data.error || "Unable to extract text from this file. It may be a scanned image PDF.");
          } else {
            setError(data.error || "Failed to parse resume.");
          }
          setUploading(false);
          return;
        }

        // Process any warnings from the API
        if (data.warnings && Array.isArray(data.warnings)) {
          const parsedWarnings: ParseWarning[] = data.warnings.map((w: string) => ({
            message: w,
            type: w.toLowerCase().includes("truncated") ? "warning" : "info",
          }));
          setWarnings(parsedWarnings);
        }

        const result: ParsedResume = {
          text: data.text,
          pageCount: data.pageCount,
          wordCount: data.wordCount,
          sections: data.sections,
          metadata: data.metadata,
          warnings: data.warnings,
          isTruncated: data.isTruncated,
        };

        setParsed(result);
        onParsed?.(result);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onParsed]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleRemove = useCallback(() => {
    setFile(null);
    setParsed(null);
    setError(null);
    setWarnings([]);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload resume file"
      />

      {/* Drop zone */}
      <Card
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!uploading) inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 md:p-10 text-center transition-all duration-200 ${
          dragOver
            ? "border-accent bg-accent/5 shadow-glow"
            : parsed
              ? "border-emerald-300 bg-emerald-50/50"
              : "border-muted-foreground/25 hover:border-accent/50 hover:bg-muted/30"
        } ${uploading ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
      >
        {/* Upload icon or success state */}
        <div className={`mb-4 w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
          parsed
            ? "bg-emerald-100 text-emerald-600"
            : dragOver
              ? "bg-accent/10 text-accent"
              : "bg-muted text-muted-foreground"
        }`}>
          {uploading ? (
            <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-accent rounded-full animate-spin" />
          ) : parsed ? (
            <CheckCircle2 className="w-7 h-7" />
          ) : (
            <Upload className="w-7 h-7" />
          )}
        </div>

        {uploading ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Parsing resume...</p>
            <p className="text-xs text-muted-foreground">Extracting text and analyzing structure</p>
          </div>
        ) : parsed ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-700">Resume uploaded successfully</p>
            <p className="text-xs text-emerald-600/70">Click to upload a different file</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {dragOver ? "Drop your file here" : "Drop your resume here, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF or DOCX, up to 5MB
            </p>
          </div>
        )}
      </Card>

      {/* Error message */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3 animate-scale-in">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Upload failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className={`rounded-xl p-4 flex items-start gap-3 ${
                warning.type === "warning"
                  ? "bg-amber-50 border border-amber-200"
                  : "bg-sky-50 border border-sky-200"
              }`}
            >
              {warning.type === "warning" ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm ${warning.type === "warning" ? "text-amber-800" : "text-sky-800"}`}>
                {warning.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* File info and parsed result */}
      {file && !error && (
        <Card className="p-4 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            {!uploading && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Parsed metadata */}
          {parsed && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs bg-muted">
                {parsed.pageCount} page{parsed.pageCount !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-muted">
                {parsed.wordCount.toLocaleString()} words
              </Badge>
              <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                {parsed.sections.filter((s) => s.found).length}/{parsed.sections.length} sections detected
              </Badge>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
