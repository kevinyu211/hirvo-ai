/**
 * Resume Serializer — Convert structured resume back to plain text
 *
 * Maintains formatting for ATS/HR analysis compatibility while
 * preserving the structure from the editor.
 */

import type {
  StructuredResume,
  ContactInfo,
  ExperienceEntry,
  EducationEntry,
  SkillsSection,
  ProjectEntry,
} from "@/lib/types";

// ── Section Formatters ────────────────────────────────────────────────

/**
 * Format contact information into a header block
 */
function formatContact(contact: ContactInfo): string {
  const lines: string[] = [];

  if (contact.fullName) {
    lines.push(contact.fullName);
  }

  const contactDetails: string[] = [];
  if (contact.email) contactDetails.push(contact.email);
  if (contact.phone) contactDetails.push(contact.phone);
  if (contact.location) contactDetails.push(contact.location);

  if (contactDetails.length > 0) {
    lines.push(contactDetails.join(" | "));
  }

  const links: string[] = [];
  if (contact.linkedin) links.push(contact.linkedin);
  if (contact.github) links.push(contact.github);
  if (contact.website) links.push(contact.website);

  if (links.length > 0) {
    lines.push(links.join(" | "));
  }

  return lines.join("\n");
}

/**
 * Format summary section
 */
function formatSummary(summary: string): string {
  return `SUMMARY\n${summary}`;
}

/**
 * Format a single experience entry
 */
function formatExperienceEntry(entry: ExperienceEntry): string {
  const lines: string[] = [];

  // Title and Company line
  const titleCompany = `${entry.title} | ${entry.company}`;
  lines.push(titleCompany);

  // Location and Dates line
  const dateLine = entry.location
    ? `${entry.location} | ${entry.startDate} - ${entry.endDate}`
    : `${entry.startDate} - ${entry.endDate}`;
  lines.push(dateLine);

  // Bullet points
  for (const bullet of entry.bullets) {
    lines.push(`• ${bullet}`);
  }

  return lines.join("\n");
}

/**
 * Format experience section
 */
function formatExperience(entries: ExperienceEntry[]): string {
  if (entries.length === 0) return "";

  const formatted = entries.map(formatExperienceEntry).join("\n\n");
  return `EXPERIENCE\n\n${formatted}`;
}

/**
 * Format a single education entry
 */
function formatEducationEntry(entry: EducationEntry): string {
  const lines: string[] = [];

  // School name
  lines.push(entry.school);

  // Degree and field
  const degreeField = entry.field
    ? `${entry.degree} in ${entry.field}`
    : entry.degree;
  const dateGpa = entry.gpa
    ? `${entry.endDate} | GPA: ${entry.gpa}`
    : entry.endDate;
  lines.push(`${degreeField} | ${dateGpa}`);

  // Highlights
  for (const highlight of entry.highlights) {
    lines.push(`• ${highlight}`);
  }

  return lines.join("\n");
}

/**
 * Format education section
 */
function formatEducation(entries: EducationEntry[]): string {
  if (entries.length === 0) return "";

  const formatted = entries.map(formatEducationEntry).join("\n\n");
  return `EDUCATION\n\n${formatted}`;
}

/**
 * Format skills section
 */
function formatSkills(skills: SkillsSection): string {
  const lines: string[] = ["SKILLS"];

  if (skills.technical.length > 0) {
    lines.push(`Technical: ${skills.technical.join(", ")}`);
  }

  if (skills.tools.length > 0) {
    lines.push(`Tools: ${skills.tools.join(", ")}`);
  }

  if (skills.soft.length > 0) {
    lines.push(`Soft Skills: ${skills.soft.join(", ")}`);
  }

  if (skills.languages.length > 0) {
    lines.push(`Languages: ${skills.languages.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Format a single project entry
 */
function formatProjectEntry(entry: ProjectEntry): string {
  const lines: string[] = [];

  // Project name with URL if available
  if (entry.url) {
    lines.push(`${entry.name} (${entry.url})`);
  } else {
    lines.push(entry.name);
  }

  // Technologies
  if (entry.technologies.length > 0) {
    lines.push(`Technologies: ${entry.technologies.join(", ")}`);
  }

  // Description
  if (entry.description) {
    lines.push(entry.description);
  }

  // Bullet points
  for (const bullet of entry.bullets) {
    lines.push(`• ${bullet}`);
  }

  return lines.join("\n");
}

/**
 * Format projects section
 */
function formatProjects(entries: ProjectEntry[]): string {
  if (entries.length === 0) return "";

  const formatted = entries.map(formatProjectEntry).join("\n\n");
  return `PROJECTS\n\n${formatted}`;
}

/**
 * Format certifications section
 */
function formatCertifications(certifications: string[]): string {
  if (certifications.length === 0) return "";

  const bullets = certifications.map((c) => `• ${c}`).join("\n");
  return `CERTIFICATIONS\n${bullets}`;
}

// ── Main Serializer ───────────────────────────────────────────────────

/**
 * Section formatter map
 */
type SectionFormatter = (resume: StructuredResume) => string;

const SECTION_FORMATTERS: Record<string, SectionFormatter> = {
  contact: (r) => formatContact(r.contact),
  summary: (r) => (r.summary ? formatSummary(r.summary) : ""),
  experience: (r) => formatExperience(r.experience),
  education: (r) => formatEducation(r.education),
  skills: (r) => formatSkills(r.skills),
  projects: (r) => (r.projects ? formatProjects(r.projects) : ""),
  certifications: (r) =>
    r.certifications ? formatCertifications(r.certifications) : "",
};

/**
 * Convert structured resume back to plain text for ATS/HR analysis
 *
 * @param resume - Structured resume object
 * @returns Plain text representation
 */
export function structuredToText(resume: StructuredResume): string {
  const sections: string[] = [];

  // Process sections in the specified order
  for (const sectionName of resume.sectionOrder) {
    const formatter = SECTION_FORMATTERS[sectionName];
    if (formatter) {
      const content = formatter(resume);
      if (content) {
        sections.push(content);
      }
    }
  }

  // Add any sections that weren't in sectionOrder
  for (const [name, formatter] of Object.entries(SECTION_FORMATTERS)) {
    if (!resume.sectionOrder.includes(name)) {
      const content = formatter(resume);
      if (content) {
        sections.push(content);
      }
    }
  }

  return sections.join("\n\n");
}

/**
 * Convert structured resume to text with custom formatting options
 */
export interface SerializerOptions {
  /** Use all caps for section headers */
  uppercaseHeaders?: boolean;
  /** Separator between sections */
  sectionSeparator?: string;
  /** Bullet character to use */
  bulletChar?: string;
  /** Include section order from resume or use default */
  useSectionOrder?: boolean;
}

const DEFAULT_OPTIONS: SerializerOptions = {
  uppercaseHeaders: true,
  sectionSeparator: "\n\n",
  bulletChar: "•",
  useSectionOrder: true,
};

/**
 * Convert structured resume to text with formatting options
 *
 * @param resume - Structured resume object
 * @param options - Formatting options
 * @returns Plain text representation
 */
export function structuredToTextWithOptions(
  resume: StructuredResume,
  options: SerializerOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sections: string[] = [];

  const sectionOrder = opts.useSectionOrder
    ? resume.sectionOrder
    : ["contact", "summary", "experience", "education", "skills", "projects", "certifications"];

  for (const sectionName of sectionOrder) {
    const formatter = SECTION_FORMATTERS[sectionName];
    if (formatter) {
      let content = formatter(resume);
      if (content) {
        // Apply options
        if (opts.bulletChar && opts.bulletChar !== "•") {
          content = content.replace(/•/g, opts.bulletChar);
        }
        sections.push(content);
      }
    }
  }

  return sections.join(opts.sectionSeparator || "\n\n");
}

/**
 * Get a diff-friendly representation comparing original and modified resume
 *
 * @param original - Original structured resume
 * @param modified - Modified structured resume
 * @returns Object with changed sections
 */
export function getResumeChanges(
  original: StructuredResume,
  modified: StructuredResume
): Record<string, { original: string; modified: string }> {
  const changes: Record<string, { original: string; modified: string }> = {};

  for (const [name, formatter] of Object.entries(SECTION_FORMATTERS)) {
    const originalContent = formatter(original);
    const modifiedContent = formatter(modified);

    if (originalContent !== modifiedContent) {
      changes[name] = {
        original: originalContent,
        modified: modifiedContent,
      };
    }
  }

  return changes;
}
