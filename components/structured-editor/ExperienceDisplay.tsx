"use client";

import type { ExperienceEntry, MergedSectionFeedback, ATSScore, HRScore, GrammarlyFix } from "@/lib/types";
import { EditableField } from "./EditableField";
import { ResumeSection } from "./ResumeSection";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useState, useMemo } from "react";
import { SectionFeedbackDropdown } from "@/components/section-feedback";
import { SectionAnalysisPanel } from "@/components/section-analysis";

export interface ExperienceDisplayProps {
  entries: ExperienceEntry[];
  onChange: (entries: ExperienceEntry[]) => void;
  readOnly?: boolean;
  /** Section feedback map keyed by experience-{id} */
  sectionFeedbackMap?: Map<string, MergedSectionFeedback>;
  /** ATS score for detailed analysis panel */
  atsScore?: ATSScore | null;
  /** HR score for detailed analysis panel */
  hrScore?: HRScore | null;
  /** Callback when a fix is accepted */
  onAcceptFix?: (fix: GrammarlyFix) => void;
}

interface ExperienceEntryCardProps {
  entry: ExperienceEntry;
  onChange: (entry: ExperienceEntry) => void;
  onDelete: () => void;
  readOnly?: boolean;
  /** Feedback specific to this experience entry */
  feedback?: MergedSectionFeedback;
  /** ATS score for detailed analysis panel */
  atsScore?: ATSScore | null;
  /** HR score for detailed analysis panel */
  hrScore?: HRScore | null;
  /** Callback when a fix is accepted */
  onAcceptFix?: (fix: GrammarlyFix) => void;
}

function ExperienceEntryCard({
  entry,
  onChange,
  onDelete,
  readOnly,
  feedback,
  atsScore,
  hrScore,
  onAcceptFix,
}: ExperienceEntryCardProps) {
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const updateField = (field: keyof ExperienceEntry, value: string | string[]) => {
    onChange({ ...entry, [field]: value });
  };

  const updateBullet = (index: number, value: string) => {
    const newBullets = [...entry.bullets];
    newBullets[index] = value;
    updateField("bullets", newBullets);
  };

  const addBullet = () => {
    updateField("bullets", [...entry.bullets, ""]);
  };

  const removeBullet = (index: number) => {
    const newBullets = entry.bullets.filter((_, i) => i !== index);
    updateField("bullets", newBullets);
  };

  // Handle accepting a fix for this entry
  const handleAcceptEntryFix = useCallback((fix: GrammarlyFix) => {
    if (!fix.originalText) {
      // If no original text, this is an "add" suggestion - we can't auto-apply
      onAcceptFix?.(fix);
      return;
    }

    // Try to find and replace the text in bullets
    let found = false;
    const updatedBullets = entry.bullets.map(bullet => {
      if (bullet.includes(fix.originalText)) {
        found = true;
        return bullet.replace(fix.originalText, fix.suggestedText);
      }
      return bullet;
    });

    if (found) {
      onChange({ ...entry, bullets: updatedBullets });
    } else {
      // If not found in bullets, pass to parent handler
      onAcceptFix?.(fix);
    }
  }, [entry, onChange, onAcceptFix]);

  const hasFeedback =
    feedback && (feedback.atsItems.length > 0 || feedback.hrItems.length > 0);

  // Can show analysis if we have scores
  const canShowAnalysis = atsScore && hrScore;

  // Role-specific content for analysis
  const roleContent = useMemo(() => {
    return `${entry.title} at ${entry.company}\n${entry.bullets.join("\n")}`;
  }, [entry.title, entry.company, entry.bullets]);

  // Calculate issue count for the button badge
  const issueCount = useMemo(() => {
    if (!feedback) return 0;
    return feedback.atsItems.filter(i => i.severity !== "success").length +
           feedback.hrItems.filter(i => i.severity !== "success").length;
  }, [feedback]);

  return (
    <div className="relative rounded-lg border bg-background p-4 group">
      {/* Delete button */}
      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
          aria-label="Delete experience"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}

      {/* Title and Company */}
      <div className="flex flex-col md:flex-row md:items-center gap-1 mb-2">
        <EditableField
          value={entry.title}
          onChange={(v) => updateField("title", v)}
          placeholder="Job Title"
          readOnly={readOnly}
          variant="subheading"
          className="flex-1"
        />
        <span className="hidden md:inline text-muted-foreground">at</span>
        <EditableField
          value={entry.company}
          onChange={(v) => updateField("company", v)}
          placeholder="Company Name"
          readOnly={readOnly}
          variant="subheading"
          className="flex-1"
        />
      </div>

      {/* Location and Dates */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
        <EditableField
          value={entry.location || ""}
          onChange={(v) => updateField("location", v)}
          placeholder="Location"
          readOnly={readOnly}
          variant="body"
          className="text-muted-foreground"
        />
        <span className="hidden md:inline">|</span>
        <div className="flex items-center gap-1">
          <EditableField
            value={entry.startDate}
            onChange={(v) => updateField("startDate", v)}
            placeholder="Start Date"
            readOnly={readOnly}
            variant="body"
            className="text-muted-foreground"
          />
          <span>-</span>
          <EditableField
            value={entry.endDate}
            onChange={(v) => updateField("endDate", v)}
            placeholder="End Date"
            readOnly={readOnly}
            variant="body"
            className="text-muted-foreground"
          />
        </div>
      </div>

      {/* Bullet Points */}
      <div className="space-y-1">
        {entry.bullets.map((bullet, index) => (
          <div key={index} className="flex items-start gap-2 group/bullet">
            <span className="text-muted-foreground mt-1">•</span>
            <EditableField
              value={bullet}
              onChange={(v) => updateBullet(index, v)}
              placeholder="Describe your achievement..."
              readOnly={readOnly}
              variant="body"
              multiline
              className="flex-1"
            />
            {!readOnly && entry.bullets.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover/bullet:opacity-100 transition-opacity"
                onClick={() => removeBullet(index)}
                aria-label="Remove bullet"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}

        {/* Add Bullet Button */}
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-muted-foreground hover:text-foreground"
            onClick={addBullet}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add bullet point
          </Button>
        )}
      </div>

      {/* View Analysis Button - Shows below bullets */}
      {canShowAnalysis && (
        <div className="mt-4 pt-3 border-t">
          <Button
            variant={showAnalysis ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowAnalysis(!showAnalysis)}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            {showAnalysis ? "Hide" : "View"} Role Analysis
            {!showAnalysis && issueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {issueCount}
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Per-Role Analysis Panel - BELOW content */}
      {showAnalysis && canShowAnalysis && (
        <div className="mt-4">
          <SectionAnalysisPanel
            sectionName={`${entry.title} @ ${entry.company}`}
            sectionContent={roleContent}
            atsScore={atsScore}
            hrScore={hrScore}
            onClose={() => setShowAnalysis(false)}
            onAcceptFix={handleAcceptEntryFix}
          />
        </div>
      )}

      {/* Role-specific Feedback Dropdown - Only show if analysis panel is hidden */}
      {!showAnalysis && hasFeedback && (
        <div className="mt-3 pt-3 border-t">
          <SectionFeedbackDropdown
            sectionName={`${entry.title} @ ${entry.company}`}
            atsScore={feedback.atsScore}
            hrScore={feedback.hrScore}
            atsFeedback={feedback.atsItems}
            hrFeedback={feedback.hrItems}
            isExpanded={feedbackExpanded}
            onToggle={() => setFeedbackExpanded(!feedbackExpanded)}
            className="border-dashed"
          />
        </div>
      )}
    </div>
  );
}

export function ExperienceDisplay({
  entries,
  onChange,
  readOnly = false,
  sectionFeedbackMap,
  atsScore,
  hrScore,
  onAcceptFix,
}: ExperienceDisplayProps) {
  const updateEntry = useCallback(
    (index: number, entry: ExperienceEntry) => {
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
    const newEntry: ExperienceEntry = {
      id: `exp-${Date.now()}`,
      company: "",
      title: "",
      startDate: "",
      endDate: "Present",
      bullets: [""],
    };
    onChange([...entries, newEntry]);
  }, [entries, onChange]);

  // Get overall experience section feedback (if not broken down by entry)
  const overallFeedback = sectionFeedbackMap?.get("experience");

  // Get combined section content
  const sectionContent = entries
    .map((e) => `${e.title} ${e.company} ${e.bullets.join(" ")}`)
    .join(" ");

  return (
    <ResumeSection
      title="Experience"
      collapsible
      sectionFeedback={overallFeedback}
      atsScore={atsScore}
      hrScore={hrScore}
      sectionContent={sectionContent}
      onAcceptFix={onAcceptFix}
    >
      <div className="space-y-4">
        {entries.map((entry, index) => {
          // Try to get entry-specific feedback
          const entryFeedback = sectionFeedbackMap?.get(`experience-${entry.id}`);

          return (
            <ExperienceEntryCard
              key={entry.id}
              entry={entry}
              onChange={(e) => updateEntry(index, e)}
              onDelete={() => deleteEntry(index)}
              readOnly={readOnly}
              feedback={entryFeedback}
              atsScore={atsScore}
              hrScore={hrScore}
              onAcceptFix={onAcceptFix}
            />
          );
        })}

        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            No experience entries yet
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
            Add Experience
          </Button>
        )}
      </div>
    </ResumeSection>
  );
}
