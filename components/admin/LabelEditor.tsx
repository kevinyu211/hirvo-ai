"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import type { AutoLabelResult, Industry, RoleLevel } from "@/lib/auto-labeler";

interface LabelEditorProps {
  labels: AutoLabelResult;
  editedLabels: Partial<AutoLabelResult>;
  onEdit: (labels: Partial<AutoLabelResult>) => void;
}

const INDUSTRIES: Industry[] = [
  "technology",
  "finance",
  "healthcare",
  "retail",
  "manufacturing",
  "consulting",
  "other",
];

const ROLE_LEVELS: RoleLevel[] = ["entry", "mid", "senior", "executive"];

export function LabelEditor({ labels, editedLabels, onEdit }: LabelEditorProps) {
  const currentLabels = { ...labels, ...editedLabels };

  const updateField = <K extends keyof AutoLabelResult>(
    field: K,
    value: AutoLabelResult[K]
  ) => {
    onEdit({ ...editedLabels, [field]: value });
  };

  const removeSkill = (field: "required_skills" | "candidate_skills", skill: string) => {
    const current = currentLabels[field];
    updateField(field, current.filter((s) => s !== skill));
  };

  const addSkill = (
    field: "required_skills" | "candidate_skills",
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const value = input.value.trim();
      if (value && !currentLabels[field].includes(value)) {
        updateField(field, [...currentLabels[field], value]);
        input.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-2 block">Job Title</label>
          <Input
            value={currentLabels.job_title}
            onChange={(e) => updateField("job_title", e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Company Name</label>
          <Input
            value={currentLabels.company_name || ""}
            onChange={(e) => updateField("company_name", e.target.value || null)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium mb-2 block">Industry</label>
          <Select
            value={currentLabels.industry}
            onValueChange={(v: Industry) => updateField("industry", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((industry) => (
                <SelectItem key={industry} value={industry} className="capitalize">
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Role Level</label>
          <Select
            value={currentLabels.role_level}
            onValueChange={(v: RoleLevel) => updateField("role_level", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_LEVELS.map((level) => (
                <SelectItem key={level} value={level} className="capitalize">
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Experience */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Candidate Experience (years)
        </label>
        <Input
          type="number"
          min="0"
          max="50"
          step="0.5"
          value={currentLabels.candidate_experience_years}
          onChange={(e) =>
            updateField("candidate_experience_years", parseFloat(e.target.value) || 0)
          }
          className="w-32"
        />
      </div>

      {/* Required Skills */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Required Skills (from JD)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {currentLabels.required_skills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="gap-1 bg-accent/10 text-accent-foreground cursor-pointer hover:bg-accent/20"
              onClick={() => removeSkill("required_skills", skill)}
            >
              {skill}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Type a skill and press Enter to add"
          onKeyDown={(e) => addSkill("required_skills", e)}
        />
      </div>

      {/* Candidate Skills */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Candidate Skills (from Resume)
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {currentLabels.candidate_skills.map((skill) => (
            <Badge
              key={skill}
              variant="outline"
              className="gap-1 bg-violet-100 text-violet-700 cursor-pointer hover:bg-violet-200"
              onClick={() => removeSkill("candidate_skills", skill)}
            >
              {skill}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Type a skill and press Enter to add"
          onKeyDown={(e) => addSkill("candidate_skills", e)}
        />
      </div>

      {/* Skills Overlap */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Skills Analysis</h4>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Match:</span>{" "}
            <span className="font-medium text-emerald-600">
              {currentLabels.required_skills.filter((s) =>
                currentLabels.candidate_skills.some(
                  (cs) => cs.toLowerCase() === s.toLowerCase()
                )
              ).length}
              /{currentLabels.required_skills.length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Missing:</span>{" "}
            <span className="font-medium text-amber-600">
              {currentLabels.required_skills.filter(
                (s) =>
                  !currentLabels.candidate_skills.some(
                    (cs) => cs.toLowerCase() === s.toLowerCase()
                  )
              ).length}
            </span>
          </div>
        </div>
        {currentLabels.required_skills.filter(
          (s) =>
            !currentLabels.candidate_skills.some(
              (cs) => cs.toLowerCase() === s.toLowerCase()
            )
        ).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {currentLabels.required_skills
              .filter(
                (s) =>
                  !currentLabels.candidate_skills.some(
                    (cs) => cs.toLowerCase() === s.toLowerCase()
                  )
              )
              .map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                >
                  Missing: {skill}
                </Badge>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
