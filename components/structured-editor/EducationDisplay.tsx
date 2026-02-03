"use client";

import type { EducationEntry } from "@/lib/types";
import { EditableField } from "./EditableField";
import { ResumeSection } from "./ResumeSection";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";

export interface EducationDisplayProps {
  entries: EducationEntry[];
  onChange: (entries: EducationEntry[]) => void;
  readOnly?: boolean;
}

interface EducationEntryCardProps {
  entry: EducationEntry;
  onChange: (entry: EducationEntry) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

function EducationEntryCard({
  entry,
  onChange,
  onDelete,
  readOnly,
}: EducationEntryCardProps) {
  const updateField = (field: keyof EducationEntry, value: string | string[]) => {
    onChange({ ...entry, [field]: value });
  };

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...entry.highlights];
    newHighlights[index] = value;
    updateField("highlights", newHighlights);
  };

  const addHighlight = () => {
    updateField("highlights", [...entry.highlights, ""]);
  };

  const removeHighlight = (index: number) => {
    const newHighlights = entry.highlights.filter((_, i) => i !== index);
    updateField("highlights", newHighlights);
  };

  return (
    <div className="relative rounded-lg border bg-background p-4 group">
      {/* Delete button */}
      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
          aria-label="Delete education"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}

      {/* School */}
      <EditableField
        value={entry.school}
        onChange={(v) => updateField("school", v)}
        placeholder="University/College Name"
        readOnly={readOnly}
        variant="subheading"
        className="mb-1"
      />

      {/* Degree and Field */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <EditableField
          value={entry.degree}
          onChange={(v) => updateField("degree", v)}
          placeholder="Degree"
          readOnly={readOnly}
          variant="body"
        />
        {(entry.field || !readOnly) && (
          <>
            <span className="text-muted-foreground">in</span>
            <EditableField
              value={entry.field || ""}
              onChange={(v) => updateField("field", v)}
              placeholder="Field of Study"
              readOnly={readOnly}
              variant="body"
            />
          </>
        )}
      </div>

      {/* Date and GPA */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
        <EditableField
          value={entry.endDate}
          onChange={(v) => updateField("endDate", v)}
          placeholder="Graduation Date"
          readOnly={readOnly}
          variant="body"
          className="text-muted-foreground"
        />
        {(entry.gpa || !readOnly) && (
          <>
            <span>|</span>
            <span>GPA:</span>
            <EditableField
              value={entry.gpa || ""}
              onChange={(v) => updateField("gpa", v)}
              placeholder="3.8"
              readOnly={readOnly}
              variant="body"
              className="text-muted-foreground w-16"
            />
          </>
        )}
      </div>

      {/* Highlights */}
      {(entry.highlights.length > 0 || !readOnly) && (
        <div className="space-y-1">
          {entry.highlights.map((highlight, index) => (
            <div key={index} className="flex items-start gap-2 group/highlight">
              <span className="text-muted-foreground mt-1">•</span>
              <EditableField
                value={highlight}
                onChange={(v) => updateHighlight(index, v)}
                placeholder="Achievement, honor, or relevant coursework..."
                readOnly={readOnly}
                variant="body"
                className="flex-1"
              />
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover/highlight:opacity-100 transition-opacity"
                  onClick={() => removeHighlight(index)}
                  aria-label="Remove highlight"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}

          {/* Add Highlight Button */}
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-muted-foreground hover:text-foreground"
              onClick={addHighlight}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add highlight
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function EducationDisplay({
  entries,
  onChange,
  readOnly = false,
}: EducationDisplayProps) {
  const updateEntry = useCallback(
    (index: number, entry: EducationEntry) => {
      const newEntries = [...entries];
      newEntries[index] = entry;
      onChange(newEntries);
    },
    [entries, onChange]
  );

  const deleteEntry = useCallback(
    (index: number) => {
      const newEntries = entries.filter((_, i) => i !== index);
      onChange(newEntries);
    },
    [entries, onChange]
  );

  const addEntry = useCallback(() => {
    const newEntry: EducationEntry = {
      id: `edu-${Date.now()}`,
      school: "",
      degree: "",
      endDate: "",
      highlights: [],
    };
    onChange([...entries, newEntry]);
  }, [entries, onChange]);

  return (
    <ResumeSection title="Education" collapsible>
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <EducationEntryCard
            key={entry.id}
            entry={entry}
            onChange={(e) => updateEntry(index, e)}
            onDelete={() => deleteEntry(index)}
            readOnly={readOnly}
          />
        ))}

        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            No education entries yet
          </p>
        )}

        {/* Add Entry Button */}
        {!readOnly && (
          <Button
            variant="outline"
            className="w-full"
            onClick={addEntry}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>
        )}
      </div>
    </ResumeSection>
  );
}
