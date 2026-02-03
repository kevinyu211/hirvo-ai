"use client";

import type { SkillsSection } from "@/lib/types";
import { ResumeSection } from "./ResumeSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SkillsDisplayProps {
  skills: SkillsSection;
  onChange: (skills: SkillsSection) => void;
  readOnly?: boolean;
}

type SkillCategory = keyof SkillsSection;

interface SkillCategoryDisplayProps {
  category: SkillCategory;
  label: string;
  skills: string[];
  onChange: (skills: string[]) => void;
  readOnly?: boolean;
  colorClass: string;
}

function SkillCategoryDisplay({
  category,
  label,
  skills,
  onChange,
  readOnly,
  colorClass,
}: SkillCategoryDisplayProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = useCallback(() => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setNewSkill("");
    setIsAdding(false);
  }, [newSkill, skills, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      const newSkills = skills.filter((_, i) => i !== index);
      onChange(newSkills);
    },
    [skills, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      } else if (e.key === "Escape") {
        setIsAdding(false);
        setNewSkill("");
      }
    },
    [handleAdd]
  );

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </h4>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <Badge
            key={`${skill}-${index}`}
            variant="secondary"
            className={cn(
              "text-sm py-1 px-2.5 group",
              colorClass,
              !readOnly && "pr-1.5"
            )}
          >
            {skill}
            {!readOnly && (
              <button
                onClick={() => handleRemove(index)}
                className="ml-1.5 h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-background/50 opacity-50 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}

        {skills.length === 0 && readOnly && (
          <span className="text-sm text-muted-foreground italic">
            No {label.toLowerCase()} added
          </span>
        )}

        {/* Add skill inline */}
        {!readOnly && (
          <>
            {isAdding ? (
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (!newSkill.trim()) {
                      setIsAdding(false);
                    }
                  }}
                  placeholder="Type skill..."
                  className="h-7 w-32 rounded border border-primary/50 px-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleAdd}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function SkillsDisplay({
  skills,
  onChange,
  readOnly = false,
}: SkillsDisplayProps) {
  const updateCategory = useCallback(
    (category: SkillCategory, newSkills: string[]) => {
      onChange({ ...skills, [category]: newSkills });
    },
    [skills, onChange]
  );

  return (
    <ResumeSection title="Skills" collapsible>
      <div className="space-y-4">
        <SkillCategoryDisplay
          category="technical"
          label="Technical Skills"
          skills={skills.technical}
          onChange={(s) => updateCategory("technical", s)}
          readOnly={readOnly}
          colorClass="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        />

        <SkillCategoryDisplay
          category="tools"
          label="Tools & Platforms"
          skills={skills.tools}
          onChange={(s) => updateCategory("tools", s)}
          readOnly={readOnly}
          colorClass="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
        />

        <SkillCategoryDisplay
          category="soft"
          label="Soft Skills"
          skills={skills.soft}
          onChange={(s) => updateCategory("soft", s)}
          readOnly={readOnly}
          colorClass="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
        />

        <SkillCategoryDisplay
          category="languages"
          label="Languages"
          skills={skills.languages}
          onChange={(s) => updateCategory("languages", s)}
          readOnly={readOnly}
          colorClass="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        />
      </div>
    </ResumeSection>
  );
}
