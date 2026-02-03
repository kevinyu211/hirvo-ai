"use client";

import type { ContactInfo } from "@/lib/types";
import { EditableField } from "./EditableField";
import { ResumeSection } from "./ResumeSection";
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContactDisplayProps {
  contact: ContactInfo;
  onChange: (contact: ContactInfo) => void;
  readOnly?: boolean;
}

interface ContactFieldProps {
  icon: React.ReactNode;
  value: string | undefined;
  placeholder: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

function ContactField({
  icon,
  value,
  placeholder,
  onChange,
  readOnly,
}: ContactFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <EditableField
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        variant="body"
        className="flex-1"
      />
    </div>
  );
}

export function ContactDisplay({
  contact,
  onChange,
  readOnly = false,
}: ContactDisplayProps) {
  const updateField = (field: keyof ContactInfo, value: string) => {
    onChange({ ...contact, [field]: value || undefined });
  };

  return (
    <ResumeSection title="Contact">
      <div className="space-y-4">
        {/* Name - centered and prominent */}
        <div className="text-center">
          <EditableField
            value={contact.fullName}
            onChange={(v) => updateField("fullName", v)}
            placeholder="Your Full Name"
            readOnly={readOnly}
            variant="heading"
            className="justify-center"
          />
        </div>

        {/* Contact details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ContactField
            icon={<Mail className="h-4 w-4" />}
            value={contact.email}
            placeholder="email@example.com"
            onChange={(v) => updateField("email", v)}
            readOnly={readOnly}
          />

          <ContactField
            icon={<Phone className="h-4 w-4" />}
            value={contact.phone}
            placeholder="(555) 123-4567"
            onChange={(v) => updateField("phone", v)}
            readOnly={readOnly}
          />

          <ContactField
            icon={<MapPin className="h-4 w-4" />}
            value={contact.location}
            placeholder="City, State"
            onChange={(v) => updateField("location", v)}
            readOnly={readOnly}
          />

          <ContactField
            icon={<Linkedin className="h-4 w-4" />}
            value={contact.linkedin}
            placeholder="linkedin.com/in/username"
            onChange={(v) => updateField("linkedin", v)}
            readOnly={readOnly}
          />

          <ContactField
            icon={<Github className="h-4 w-4" />}
            value={contact.github}
            placeholder="github.com/username"
            onChange={(v) => updateField("github", v)}
            readOnly={readOnly}
          />

          <ContactField
            icon={<Globe className="h-4 w-4" />}
            value={contact.website}
            placeholder="portfolio.com"
            onChange={(v) => updateField("website", v)}
            readOnly={readOnly}
          />
        </div>
      </div>
    </ResumeSection>
  );
}
