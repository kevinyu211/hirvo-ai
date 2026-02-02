"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserContext } from "@/lib/types";

const YEARS_OPTIONS = [
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "6-10", label: "6–10 years" },
  { value: "10+", label: "10+ years" },
];

const VISA_OPTIONS = [
  { value: "us_citizen", label: "US Citizen" },
  { value: "green_card", label: "Green Card" },
  { value: "h1b", label: "H1B" },
  { value: "opt_cpt", label: "OPT/CPT" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

interface ContextCaptureFormProps {
  value: UserContext;
  onChange: (value: UserContext) => void;
}

export function ContextCaptureForm({
  value,
  onChange,
}: ContextCaptureFormProps) {
  const handleTargetRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, targetRole: e.target.value });
    },
    [value, onChange]
  );

  const handleYearsChange = useCallback(
    (selected: string) => {
      onChange({ ...value, yearsExperience: selected });
    },
    [value, onChange]
  );

  const handleVisaChange = useCallback(
    (selected: string) => {
      onChange({ ...value, visaStatus: selected });
    },
    [value, onChange]
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="target-role">Target Role / Title</Label>
        <Input
          id="target-role"
          value={value.targetRole || ""}
          onChange={handleTargetRoleChange}
          placeholder="e.g. Senior Software Engineer"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="years-experience">Years of Experience</Label>
        <Select
          value={value.yearsExperience || ""}
          onValueChange={handleYearsChange}
        >
          <SelectTrigger id="years-experience">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {YEARS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visa-status">Work Authorization</Label>
        <Select
          value={value.visaStatus || ""}
          onValueChange={handleVisaChange}
        >
          <SelectTrigger id="visa-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {VISA_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
