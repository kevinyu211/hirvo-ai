"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HighlightedText, type TextHighlight } from "./HighlightedText";
import type { GrammarlyFix } from "@/lib/types";

export interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  readOnly?: boolean;
  /** Visual style variant */
  variant?: "default" | "heading" | "subheading" | "body" | "bullet";
  /** Highlights to show on the text when not editing */
  highlights?: TextHighlight[];
  /** Called when user clicks a highlight */
  onHighlightClick?: (highlight: TextHighlight) => void;
  /** Called when user accepts a fix from highlight */
  onAcceptFix?: (fix: GrammarlyFix) => void;
}

export function EditableField({
  value,
  onChange,
  placeholder = "Click to edit",
  className,
  inputClassName,
  multiline = false,
  readOnly = false,
  variant = "default",
  highlights = [],
  onHighlightClick,
  onAcceptFix,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync with external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (readOnly) return;
    setIsEditing(true);
    setEditValue(value);
  }, [readOnly, value]);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  }, [editValue, value, onChange]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [multiline, handleSave, handleCancel]
  );

  const variantStyles: Record<string, string> = {
    default: "text-sm",
    heading: "text-xl font-bold",
    subheading: "text-base font-semibold",
    body: "text-sm leading-relaxed",
    bullet: "text-sm leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0",
  };

  if (isEditing) {
    const InputComponent = multiline ? "textarea" : "input";
    return (
      <div className={cn("flex items-start gap-2", className)}>
        <InputComponent
          ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className={cn(
            "flex-1 rounded border border-primary/50 px-2 py-1 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/30",
            variantStyles[variant],
            multiline && "min-h-[80px] resize-y",
            inputClassName
          )}
          rows={multiline ? 3 : undefined}
        />
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="h-7 w-7 p-0"
            aria-label="Save"
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-7 w-7 p-0"
            aria-label="Cancel"
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  // Determine if we should show highlighted text
  const hasHighlights = highlights.length > 0 && value;

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded px-1 py-0.5 transition-colors",
        !readOnly && !hasHighlights && "hover:bg-muted/50 cursor-pointer",
        className
      )}
      onClick={hasHighlights ? undefined : handleStartEdit}
      role={readOnly || hasHighlights ? undefined : "button"}
      tabIndex={readOnly || hasHighlights ? undefined : 0}
      onKeyDown={readOnly || hasHighlights ? undefined : (e) => e.key === "Enter" && handleStartEdit()}
    >
      {hasHighlights ? (
        // Show highlighted text with clickable highlights
        <div className="flex-1 flex items-start gap-2">
          <HighlightedText
            text={value}
            highlights={highlights}
            onHighlightClick={onHighlightClick}
            onAcceptFix={onAcceptFix}
            className={variantStyles[variant]}
          />
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit();
              }}
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      ) : (
        // Normal text display
        <>
          <span
            className={cn(
              variantStyles[variant],
              "flex-1",
              !value && "text-muted-foreground italic"
            )}
          >
            {value || placeholder}
          </span>
          {!readOnly && (
            <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
          )}
        </>
      )}
    </div>
  );
}
