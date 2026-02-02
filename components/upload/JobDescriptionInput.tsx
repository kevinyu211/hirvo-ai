"use client";

import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const MAX_CHARACTERS = 10000;
const MIN_CHARACTERS = 100;

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function JobDescriptionInput({
  value,
  onChange,
}: JobDescriptionInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (newValue.length <= MAX_CHARACTERS) {
        onChange(newValue);
      }
    },
    [onChange]
  );

  const charCount = value.length;
  const isNearLimit = charCount > MAX_CHARACTERS * 0.9;
  const hasMinContent = charCount >= MIN_CHARACTERS;
  const isEmpty = charCount === 0;

  return (
    <Card className={`relative transition-all duration-200 ${
      hasMinContent
        ? "border-emerald-300 bg-emerald-50/30"
        : "bg-muted/20"
    }`}>
      {/* Success indicator */}
      {hasMinContent && (
        <div className="absolute top-4 right-4 z-10">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      )}

      <textarea
        id="job-description"
        value={value}
        onChange={handleChange}
        placeholder="Paste the full job description here...

Include the job title, responsibilities, requirements, and qualifications for the best analysis results."
        className={`w-full min-h-[280px] md:min-h-[320px] p-5 pr-14 bg-transparent border-0 resize-y text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 ${
          hasMinContent ? "text-foreground" : ""
        }`}
        required
      />

      {/* Footer with character count */}
      <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20 rounded-b-xl">
        <span className="text-xs text-muted-foreground">
          {isEmpty ? (
            <span className="text-amber-600">Required field</span>
          ) : hasMinContent ? (
            <span className="text-emerald-600">Looking good!</span>
          ) : (
            <span className="text-muted-foreground">
              Add {MIN_CHARACTERS - charCount} more characters
            </span>
          )}
        </span>
        <span className={`text-xs font-medium ${
          isNearLimit ? "text-amber-600" : "text-muted-foreground"
        }`}>
          {charCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}
        </span>
      </div>
    </Card>
  );
}
