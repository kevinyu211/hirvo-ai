/**
 * ResumeDoc Types
 *
 * Defines the versioned document format for resume storage with block-level IDs
 * for precise highlight anchoring and edit tracking.
 */

// =============================================================================
// Document Structure
// =============================================================================

/**
 * Top-level resume document with versioning metadata
 */
export interface ResumeDoc {
  version: "1.0";
  sections: ResumeSection[];
  metadata: ResumeDocMetadata;
}

/**
 * Document metadata for parsing and version tracking
 */
export interface ResumeDocMetadata {
  parsedAt: string; // ISO timestamp
  parserVersion: string;
  parseConfidence: number; // 0-1
  sourceFileName?: string;
  sourceFileType?: "pdf" | "docx" | "txt";
}

/**
 * A resume section containing blocks of content
 */
export interface ResumeSection {
  id: string; // e.g., "section-exp-0", "section-skills"
  type: ResumeSectionType;
  title?: string; // Display title if overridden
  blocks: ResumeBlock[];
}

export type ResumeSectionType =
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "custom";

/**
 * A block of content within a section
 * Each block has a unique ID for highlight anchoring
 */
export interface ResumeBlock {
  id: string; // e.g., "block-exp-0-bullet-3", "block-contact-email"
  type: ResumeBlockType;
  text: string;
  fieldType?: string; // For "field" blocks: "email", "phone", "company", etc.
  metadata?: Record<string, unknown>; // Additional data (dates, URLs, etc.)
}

export type ResumeBlockType =
  | "heading" // Section headers
  | "paragraph" // Multi-line text (summary, descriptions)
  | "bullet" // Bullet points
  | "field" // Single data field (email, phone, company name, etc.)
  | "skill-group" // Group of skills (technical, soft, etc.)
  | "entry-header"; // Entry header (job title + company, school name, etc.)

// =============================================================================
// Fix Actions
// =============================================================================

/**
 * Actions that can be applied to modify a resume document
 */
export interface FixAction {
  type: FixActionType;
  block_id: string;
  start?: number; // For replace_text: char start position
  end?: number; // For replace_text: char end position
  new_text?: string; // The new text to insert/replace
  expected_hash?: string; // SHA256 of expected substring for validation
  expected_block_hash?: string; // SHA256 of full block text for validation
  insert_after_block_id?: string; // For insert_bullet: insert after this block
}

export type FixActionType =
  | "replace_text" // Replace text at specific range within a block
  | "replace_block" // Replace entire block content
  | "append_to_block" // Add text to end of block
  | "insert_bullet" // Insert new bullet point
  | "delete_block"; // Remove a block entirely

// =============================================================================
// Highlight Types
// =============================================================================

/**
 * Highlight status lifecycle
 */
export type HighlightStatus = "OPEN" | "APPLIED" | "DISMISSED" | "STALE";

/**
 * What aspect of the resume this highlight affects
 */
export type HighlightAffects =
  | "ATS" // ATS searchability (keyword matching)
  | "FORMAT" // Document formatting issues
  | "ELIGIBILITY" // Job eligibility concerns
  | "SEMANTIC" // Semantic/meaning issues
  | "HR_APPEAL"; // Human reviewer appeal

/**
 * Highlight severity levels
 */
export type HighlightSeverity = "critical" | "warning" | "info";

/**
 * A highlight representing an issue in the resume
 */
export interface Highlight {
  id: string;
  version_id: string;

  // Block anchoring
  block_id: string;
  char_start: number;
  char_end: number;
  expected_text_hash?: string;
  expected_block_hash?: string;

  // Rule identification
  rule_id: string;
  fingerprint?: string; // For dismissed carry-forward

  // Status
  status: HighlightStatus;

  // Classification
  severity: HighlightSeverity;
  affects: HighlightAffects;
  source: "ats" | "hr" | "system";

  // Display content
  issue_title: string;
  issue_description: string;
  impact_explanation?: string;
  suggested_fix_text?: string;
  original_text?: string; // Original text at char_start:char_end for before/after display
  fix_action?: FixAction;

  // Semantic matching fields (for abbreviation/synonym detection)
  semantic_match?: boolean; // True if this was found via synonym detection
  target_keyword?: string; // The JD keyword we're trying to match (e.g., "Machine Learning")
  matched_synonym?: string; // The synonym found in resume (e.g., "ML")

  // Impact explanations for UI display (specific text explaining WHY this affects scores)
  ats_impact?: string; // e.g., "ATS requires 'Machine Learning' spelled out for keyword matching"
  hr_impact?: string; // e.g., "Recruiters prefer standard terminology over abbreviations"
  fit_impact?: string; // e.g., "Better alignment with job description requirements"

  // Calculated score impact predictions
  score_impact?: {
    ats?: number; // Percentage point improvement to ATS score
    hr?: number; // Percentage point improvement to HR score
    fit?: number; // Percentage point improvement to FIT score
  };

  // Ordering
  priority_order: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Version Types
// =============================================================================

/**
 * A version of the resume document
 */
export interface ResumeVersion {
  id: string;
  analysis_id: string;
  parent_version_id: string | null;
  version_number: number;
  resume_doc: ResumeDoc;
  scores: VersionScores;
  created_at: string;
  created_by: "user" | "system" | "ai";
}

/**
 * Cached scores for a version
 */
export interface VersionScores {
  ats?: {
    overall: number;
    keywordMatchPct: number;
    formattingScore: number;
    sectionScore: number;
  };
  hr?: {
    overall: number;
    formattingScore: number;
    semanticScore: number;
    llmScore: number;
  };
  fit?: number;
}

/**
 * Version chain item for display
 */
export interface VersionChainItem {
  version_id: string;
  version_number: number;
  parent_version_id: string | null;
  created_at: string;
  created_by: string;
  is_current: boolean;
  scores: VersionScores;
  open_highlight_count: number;
  applied_highlight_count: number;
}

// =============================================================================
// Applied Fix Record
// =============================================================================

/**
 * Audit record of an applied fix
 */
export interface AppliedFix {
  id: string;
  highlight_id: string;
  source_version_id: string;
  target_version_id: string;
  fix_action: FixAction;
  original_text: string;
  new_text: string;
  score_delta?: {
    ats?: number;
    hr?: number;
    fit?: number;
  };
  applied_at: string;
  applied_by: string;
}

// =============================================================================
// Conversion Utilities
// =============================================================================

import type { StructuredResume, ExperienceEntry, EducationEntry, ProjectEntry } from "../types";

/**
 * Generate a unique block ID
 */
export function generateBlockId(
  sectionType: string,
  sectionIndex: number,
  blockType: string,
  blockIndex: number
): string {
  return `block-${sectionType}-${sectionIndex}-${blockType}-${blockIndex}`;
}

/**
 * Generate a section ID
 */
export function generateSectionId(sectionType: string, index: number = 0): string {
  return `section-${sectionType}-${index}`;
}

/**
 * Convert a StructuredResume to ResumeDoc format
 */
export function structuredResumeToDoc(
  resume: StructuredResume,
  metadata?: Partial<ResumeDocMetadata>
): ResumeDoc {
  const sections: ResumeSection[] = [];
  let sectionIndex = 0;

  // Contact section
  const contactBlocks: ResumeBlock[] = [];
  let blockIndex = 0;

  if (resume.contact.fullName) {
    contactBlocks.push({
      id: generateBlockId("contact", 0, "field", blockIndex++),
      type: "field",
      text: resume.contact.fullName,
      fieldType: "fullName",
    });
  }
  if (resume.contact.email) {
    contactBlocks.push({
      id: generateBlockId("contact", 0, "field", blockIndex++),
      type: "field",
      text: resume.contact.email,
      fieldType: "email",
    });
  }
  if (resume.contact.phone) {
    contactBlocks.push({
      id: generateBlockId("contact", 0, "field", blockIndex++),
      type: "field",
      text: resume.contact.phone,
      fieldType: "phone",
    });
  }
  if (resume.contact.location) {
    contactBlocks.push({
      id: generateBlockId("contact", 0, "field", blockIndex++),
      type: "field",
      text: resume.contact.location,
      fieldType: "location",
    });
  }
  if (resume.contact.linkedin) {
    contactBlocks.push({
      id: generateBlockId("contact", 0, "field", blockIndex++),
      type: "field",
      text: resume.contact.linkedin,
      fieldType: "linkedin",
    });
  }
  if (resume.contact.github) {
    contactBlocks.push({
      id: generateBlockId("contact", 0, "field", blockIndex++),
      type: "field",
      text: resume.contact.github,
      fieldType: "github",
    });
  }
  if (resume.contact.website) {
    contactBlocks.push({
      id: generateBlockId("contact", 0, "field", blockIndex++),
      type: "field",
      text: resume.contact.website,
      fieldType: "website",
    });
  }

  sections.push({
    id: generateSectionId("contact", sectionIndex++),
    type: "contact",
    blocks: contactBlocks,
  });

  // Summary section
  if (resume.summary) {
    sections.push({
      id: generateSectionId("summary", sectionIndex++),
      type: "summary",
      blocks: [
        {
          id: generateBlockId("summary", 0, "paragraph", 0),
          type: "paragraph",
          text: resume.summary,
        },
      ],
    });
  }

  // Experience sections
  resume.experience.forEach((exp: ExperienceEntry, expIndex: number) => {
    const expBlocks: ResumeBlock[] = [];
    let expBlockIndex = 0;

    // Entry header
    expBlocks.push({
      id: generateBlockId("exp", expIndex, "header", expBlockIndex++),
      type: "entry-header",
      text: `${exp.title} | ${exp.company}`,
      metadata: {
        title: exp.title,
        company: exp.company,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
      },
    });

    // Bullets
    exp.bullets.forEach((bullet: string, bulletIndex: number) => {
      expBlocks.push({
        id: generateBlockId("exp", expIndex, "bullet", bulletIndex),
        type: "bullet",
        text: bullet,
      });
    });

    sections.push({
      id: generateSectionId("experience", expIndex),
      type: "experience",
      blocks: expBlocks,
    });
  });

  // Education sections
  resume.education.forEach((edu: EducationEntry, eduIndex: number) => {
    const eduBlocks: ResumeBlock[] = [];
    let eduBlockIndex = 0;

    // Entry header
    const degreeText = edu.field ? `${edu.degree} in ${edu.field}` : edu.degree;
    eduBlocks.push({
      id: generateBlockId("edu", eduIndex, "header", eduBlockIndex++),
      type: "entry-header",
      text: `${degreeText} | ${edu.school}`,
      metadata: {
        school: edu.school,
        degree: edu.degree,
        field: edu.field,
        endDate: edu.endDate,
        gpa: edu.gpa,
      },
    });

    // Highlights
    edu.highlights.forEach((highlight: string, highlightIndex: number) => {
      eduBlocks.push({
        id: generateBlockId("edu", eduIndex, "bullet", highlightIndex),
        type: "bullet",
        text: highlight,
      });
    });

    sections.push({
      id: generateSectionId("education", eduIndex),
      type: "education",
      blocks: eduBlocks,
    });
  });

  // Skills section
  const skillsBlocks: ResumeBlock[] = [];
  let skillsBlockIndex = 0;

  if (resume.skills.technical.length > 0) {
    skillsBlocks.push({
      id: generateBlockId("skills", 0, "group", skillsBlockIndex++),
      type: "skill-group",
      text: resume.skills.technical.join(", "),
      fieldType: "technical",
    });
  }
  if (resume.skills.tools.length > 0) {
    skillsBlocks.push({
      id: generateBlockId("skills", 0, "group", skillsBlockIndex++),
      type: "skill-group",
      text: resume.skills.tools.join(", "),
      fieldType: "tools",
    });
  }
  if (resume.skills.soft.length > 0) {
    skillsBlocks.push({
      id: generateBlockId("skills", 0, "group", skillsBlockIndex++),
      type: "skill-group",
      text: resume.skills.soft.join(", "),
      fieldType: "soft",
    });
  }
  if (resume.skills.languages.length > 0) {
    skillsBlocks.push({
      id: generateBlockId("skills", 0, "group", skillsBlockIndex++),
      type: "skill-group",
      text: resume.skills.languages.join(", "),
      fieldType: "languages",
    });
  }

  if (skillsBlocks.length > 0) {
    sections.push({
      id: generateSectionId("skills", sectionIndex++),
      type: "skills",
      blocks: skillsBlocks,
    });
  }

  // Projects section
  if (resume.projects && resume.projects.length > 0) {
    resume.projects.forEach((project: ProjectEntry, projIndex: number) => {
      const projBlocks: ResumeBlock[] = [];
      let projBlockIndex = 0;

      // Entry header
      projBlocks.push({
        id: generateBlockId("proj", projIndex, "header", projBlockIndex++),
        type: "entry-header",
        text: project.name,
        metadata: {
          name: project.name,
          url: project.url,
          technologies: project.technologies,
        },
      });

      // Description
      if (project.description) {
        projBlocks.push({
          id: generateBlockId("proj", projIndex, "paragraph", projBlockIndex++),
          type: "paragraph",
          text: project.description,
        });
      }

      // Bullets
      project.bullets.forEach((bullet: string, bulletIndex: number) => {
        projBlocks.push({
          id: generateBlockId("proj", projIndex, "bullet", bulletIndex),
          type: "bullet",
          text: bullet,
        });
      });

      sections.push({
        id: generateSectionId("projects", projIndex),
        type: "projects",
        blocks: projBlocks,
      });
    });
  }

  // Certifications section
  if (resume.certifications && resume.certifications.length > 0) {
    const certBlocks: ResumeBlock[] = resume.certifications.map((cert: string, certIndex: number) => ({
      id: generateBlockId("cert", 0, "bullet", certIndex),
      type: "bullet" as const,
      text: cert,
    }));

    sections.push({
      id: generateSectionId("certifications", sectionIndex++),
      type: "certifications",
      blocks: certBlocks,
    });
  }

  return {
    version: "1.0",
    sections,
    metadata: {
      parsedAt: new Date().toISOString(),
      parserVersion: "1.0.0",
      parseConfidence: 1.0,
      ...metadata,
    },
  };
}

/**
 * Convert a ResumeDoc back to StructuredResume format
 */
export function docToStructuredResume(doc: ResumeDoc): StructuredResume {
  const resume: StructuredResume = {
    contact: {
      fullName: "",
    },
    experience: [],
    education: [],
    skills: {
      technical: [],
      soft: [],
      tools: [],
      languages: [],
    },
    sectionOrder: [],
    rawText: "",
  };

  for (const section of doc.sections) {
    resume.sectionOrder.push(section.type);

    switch (section.type) {
      case "contact":
        for (const block of section.blocks) {
          if (block.type === "field" && block.fieldType) {
            switch (block.fieldType) {
              case "fullName":
                resume.contact.fullName = block.text;
                break;
              case "email":
                resume.contact.email = block.text;
                break;
              case "phone":
                resume.contact.phone = block.text;
                break;
              case "location":
                resume.contact.location = block.text;
                break;
              case "linkedin":
                resume.contact.linkedin = block.text;
                break;
              case "github":
                resume.contact.github = block.text;
                break;
              case "website":
                resume.contact.website = block.text;
                break;
            }
          }
        }
        break;

      case "summary":
        const summaryBlock = section.blocks.find((b) => b.type === "paragraph");
        if (summaryBlock) {
          resume.summary = summaryBlock.text;
        }
        break;

      case "experience":
        const expHeader = section.blocks.find((b) => b.type === "entry-header");
        const expBullets = section.blocks.filter((b) => b.type === "bullet");
        if (expHeader?.metadata) {
          resume.experience.push({
            id: section.id,
            title: (expHeader.metadata.title as string) || "",
            company: (expHeader.metadata.company as string) || "",
            location: expHeader.metadata.location as string | undefined,
            startDate: (expHeader.metadata.startDate as string) || "",
            endDate: (expHeader.metadata.endDate as string) || "",
            bullets: expBullets.map((b) => b.text),
          });
        }
        break;

      case "education":
        const eduHeader = section.blocks.find((b) => b.type === "entry-header");
        const eduHighlights = section.blocks.filter((b) => b.type === "bullet");
        if (eduHeader?.metadata) {
          resume.education.push({
            id: section.id,
            school: (eduHeader.metadata.school as string) || "",
            degree: (eduHeader.metadata.degree as string) || "",
            field: eduHeader.metadata.field as string | undefined,
            endDate: (eduHeader.metadata.endDate as string) || "",
            gpa: eduHeader.metadata.gpa as string | undefined,
            highlights: eduHighlights.map((b) => b.text),
          });
        }
        break;

      case "skills":
        for (const block of section.blocks) {
          if (block.type === "skill-group" && block.fieldType) {
            const skills = block.text.split(",").map((s) => s.trim()).filter(Boolean);
            switch (block.fieldType) {
              case "technical":
                resume.skills.technical = skills;
                break;
              case "tools":
                resume.skills.tools = skills;
                break;
              case "soft":
                resume.skills.soft = skills;
                break;
              case "languages":
                resume.skills.languages = skills;
                break;
            }
          }
        }
        break;

      case "projects":
        const projHeader = section.blocks.find((b) => b.type === "entry-header");
        const projDesc = section.blocks.find((b) => b.type === "paragraph");
        const projBullets = section.blocks.filter((b) => b.type === "bullet");
        if (projHeader) {
          const project: ProjectEntry = {
            id: section.id,
            name: (projHeader.metadata?.name as string) || projHeader.text,
            technologies: (projHeader.metadata?.technologies as string[]) || [],
            bullets: projBullets.map((b) => b.text),
          };
          if (projHeader.metadata?.url) {
            project.url = projHeader.metadata.url as string;
          }
          if (projDesc) {
            project.description = projDesc.text;
          }
          if (!resume.projects) resume.projects = [];
          resume.projects.push(project);
        }
        break;

      case "certifications":
        const certBullets = section.blocks.filter((b) => b.type === "bullet");
        resume.certifications = certBullets.map((b) => b.text);
        break;
    }
  }

  // Deduplicate section order
  resume.sectionOrder = Array.from(new Set(resume.sectionOrder));

  return resume;
}

/**
 * Find a block by ID in a ResumeDoc
 */
export function findBlockById(doc: ResumeDoc, blockId: string): ResumeBlock | null {
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      if (block.id === blockId) {
        return block;
      }
    }
  }
  return null;
}

/**
 * Apply a fix action to a ResumeDoc
 * Returns a new ResumeDoc with the fix applied
 */
export function applyFixAction(doc: ResumeDoc, action: FixAction): ResumeDoc {
  const newDoc: ResumeDoc = JSON.parse(JSON.stringify(doc)); // Deep clone

  for (const section of newDoc.sections) {
    for (let i = 0; i < section.blocks.length; i++) {
      const block = section.blocks[i];

      if (block.id === action.block_id) {
        switch (action.type) {
          case "replace_text":
            if (action.start !== undefined && action.end !== undefined && action.new_text !== undefined) {
              block.text =
                block.text.substring(0, action.start) +
                action.new_text +
                block.text.substring(action.end);
            }
            break;

          case "replace_block":
            if (action.new_text !== undefined) {
              block.text = action.new_text;
            }
            break;

          case "append_to_block":
            if (action.new_text !== undefined) {
              block.text = block.text + action.new_text;
            }
            break;

          case "delete_block":
            section.blocks.splice(i, 1);
            break;

          case "insert_bullet":
            if (action.new_text !== undefined) {
              const newBlock: ResumeBlock = {
                id: `${action.block_id}-inserted-${Date.now()}`,
                type: "bullet",
                text: action.new_text,
              };
              section.blocks.splice(i + 1, 0, newBlock);
            }
            break;
        }
        break;
      }
    }
  }

  return newDoc;
}
