"use client";

import type { StructuredResume, ResumeFormatId, FormatMetadata } from "@/lib/types";
import { FORMAT_METADATA } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FormatPreviewProps {
  resume: StructuredResume;
  formatId: ResumeFormatId;
}

/**
 * Live preview of the resume in the selected format
 */
export function FormatPreview({ resume, formatId }: FormatPreviewProps) {
  const metadata = FORMAT_METADATA[formatId];

  // Format-specific style mappings
  const formatStyles = getFormatStyles(formatId, metadata);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Preview: {metadata.name}</span>
          <span className="text-xs text-muted-foreground font-normal">
            {metadata.fontFamily.split(",")[0]}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className={cn(
            "p-6 text-xs leading-relaxed min-h-[400px] max-h-[600px] overflow-y-auto",
            "bg-white dark:bg-gray-50 text-gray-900",
            formatStyles.container
          )}
          style={{ fontFamily: metadata.fontFamily }}
        >
          {/* Contact Header */}
          <div className={cn("text-center mb-4", formatStyles.header)}>
            <h1 className={cn("text-lg mb-1", formatStyles.name)}>
              {resume.contact.fullName || "Your Name"}
            </h1>
            <div className={cn("text-[10px]", formatStyles.contactDetails)}>
              {[
                resume.contact.email,
                resume.contact.phone,
                resume.contact.location,
              ]
                .filter(Boolean)
                .join(" | ")}
            </div>
            {(resume.contact.linkedin || resume.contact.github) && (
              <div className={cn("text-[10px]", formatStyles.links)}>
                {[resume.contact.linkedin, resume.contact.github]
                  .filter(Boolean)
                  .join(" | ")}
              </div>
            )}
          </div>

          {/* Summary */}
          {resume.summary && (
            <div className="mb-3">
              <h2 className={formatStyles.sectionHeader}>Summary</h2>
              <p className={cn("text-[10px]", formatStyles.body)}>
                {resume.summary.slice(0, 200)}
                {resume.summary.length > 200 && "..."}
              </p>
            </div>
          )}

          {/* Experience */}
          {resume.experience.length > 0 && (
            <div className="mb-3">
              <h2 className={formatStyles.sectionHeader}>Experience</h2>
              {resume.experience.slice(0, 2).map((exp) => (
                <div key={exp.id} className="mb-2">
                  <div className={cn("flex justify-between", formatStyles.entryHeader)}>
                    <span className="font-semibold">{exp.title}</span>
                    <span className="text-[9px]">
                      {exp.startDate} - {exp.endDate}
                    </span>
                  </div>
                  <div className={cn("text-[9px] mb-1", formatStyles.entrySubheader)}>
                    {exp.company}
                    {exp.location && ` | ${exp.location}`}
                  </div>
                  <ul className={formatStyles.bulletList}>
                    {exp.bullets.slice(0, 2).map((bullet, i) => (
                      <li key={i} className={formatStyles.bullet}>
                        {bullet.slice(0, 80)}
                        {bullet.length > 80 && "..."}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <div className="mb-3">
              <h2 className={formatStyles.sectionHeader}>Education</h2>
              {resume.education.slice(0, 1).map((edu) => (
                <div key={edu.id}>
                  <div className={cn("flex justify-between", formatStyles.entryHeader)}>
                    <span className="font-semibold">{edu.school}</span>
                    <span className="text-[9px]">{edu.endDate}</span>
                  </div>
                  <div className={cn("text-[9px]", formatStyles.entrySubheader)}>
                    {edu.degree}
                    {edu.field && ` in ${edu.field}`}
                    {edu.gpa && ` | GPA: ${edu.gpa}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {(resume.skills.technical.length > 0 || resume.skills.tools.length > 0) && (
            <div>
              <h2 className={formatStyles.sectionHeader}>Skills</h2>
              <div className={cn("text-[10px]", formatStyles.skillsContainer)}>
                {resume.skills.technical.length > 0 && (
                  <div className={formatStyles.skillCategory}>
                    <span className="font-medium">Technical:</span>{" "}
                    {formatId === "technical" ? (
                      <span className="space-x-1">
                        {resume.skills.technical.slice(0, 5).map((skill, i) => (
                          <span
                            key={i}
                            className="inline-block px-1 py-0.5 bg-green-100 text-green-800 rounded text-[8px]"
                          >
                            {skill}
                          </span>
                        ))}
                      </span>
                    ) : (
                      resume.skills.technical.slice(0, 5).join(", ")
                    )}
                  </div>
                )}
                {resume.skills.tools.length > 0 && (
                  <div className={formatStyles.skillCategory}>
                    <span className="font-medium">Tools:</span>{" "}
                    {resume.skills.tools.slice(0, 4).join(", ")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Get format-specific CSS classes
 */
function getFormatStyles(formatId: ResumeFormatId, metadata: FormatMetadata) {
  const baseStyles = {
    container: "",
    header: "",
    name: "font-bold",
    contactDetails: "text-gray-600",
    links: "text-gray-500",
    sectionHeader: "text-xs font-bold uppercase mb-1 tracking-wide",
    body: "text-gray-700",
    entryHeader: "text-[10px]",
    entrySubheader: "text-gray-600",
    bulletList: "list-disc list-inside text-[9px] text-gray-700",
    bullet: "",
    skillsContainer: "",
    skillCategory: "mb-0.5",
  };

  switch (formatId) {
    case "classic":
      return {
        ...baseStyles,
        name: "font-bold underline",
        sectionHeader:
          "text-xs font-bold uppercase mb-1 tracking-wide border-b border-gray-400 pb-0.5",
      };

    case "modern":
      return {
        ...baseStyles,
        name: "font-semibold text-blue-600",
        sectionHeader: "text-xs font-semibold text-blue-600 mb-1",
        links: "text-blue-500",
      };

    case "minimalist":
      return {
        ...baseStyles,
        container: "tracking-wide",
        name: "font-light text-lg tracking-widest",
        sectionHeader: "text-[9px] font-light uppercase mb-1 tracking-[0.2em] text-gray-500",
        contactDetails: "text-gray-400",
      };

    case "technical":
      return {
        ...baseStyles,
        name: "font-mono font-bold text-green-700",
        sectionHeader: "text-xs font-mono font-bold text-green-700 mb-1",
        bulletList: "list-none text-[9px] text-gray-700",
        bullet: "before:content-['→'] before:mr-1 before:text-green-600",
      };

    case "executive":
      return {
        ...baseStyles,
        name: "font-serif font-bold text-gray-800",
        sectionHeader:
          "text-xs font-serif font-semibold text-gray-700 mb-1 border-b border-gray-300 pb-0.5",
        contactDetails: "text-gray-500 italic",
      };

    default:
      return baseStyles;
  }
}
