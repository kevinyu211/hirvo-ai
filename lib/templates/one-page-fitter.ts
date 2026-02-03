/**
 * One-Page Fitter
 *
 * Algorithm to fit resume content to a single page by progressively
 * trimming content while maintaining quality.
 */

import type { StructuredResume, ResumeFormatId } from "@/lib/types";
import type { TemplateStyle } from "./types";
import { getTemplateStyle } from "./types";

export interface FitResult {
  fittedResume: StructuredResume;
  adjustedStyle: TemplateStyle;
  removedContent: string[];
  fitConfidence: number; // 0-100, how confident we are it fits
}

// Estimated line heights and character widths for content estimation
const ESTIMATES = {
  lineHeight: 14, // points
  charWidth: 6, // points per character average
  pageHeight: 792, // Letter page height in points (11 inches)
  pageWidth: 612, // Letter page width in points (8.5 inches)
  marginTop: 36,
  marginBottom: 48,
  marginHorizontal: 54,
  sectionGap: 14,
  headerHeight: 60, // Name + contact info
};

const USABLE_HEIGHT =
  ESTIMATES.pageHeight - ESTIMATES.marginTop - ESTIMATES.marginBottom;

/**
 * Estimate the height a resume will take based on content
 */
function estimateContentHeight(
  resume: StructuredResume,
  style: TemplateStyle
): number {
  let height = ESTIMATES.headerHeight; // Name and contact

  // Summary
  if (resume.summary) {
    const lines = Math.ceil(resume.summary.length / 80);
    height += lines * ESTIMATES.lineHeight + ESTIMATES.sectionGap;
  }

  // Experience
  height += ESTIMATES.sectionGap; // Section header
  for (const exp of resume.experience) {
    height += ESTIMATES.lineHeight * 2; // Title, company, dates
    height += exp.bullets.length * ESTIMATES.lineHeight * 1.5; // Bullets
    height += ESTIMATES.sectionGap / 2; // Gap between entries
  }

  // Education
  height += ESTIMATES.sectionGap;
  for (const edu of resume.education) {
    height += ESTIMATES.lineHeight * 2; // School, degree
    height += edu.highlights.length * ESTIMATES.lineHeight;
    height += ESTIMATES.sectionGap / 2;
  }

  // Skills
  height += ESTIMATES.sectionGap;
  const totalSkills =
    resume.skills.technical.length +
    resume.skills.soft.length +
    resume.skills.tools.length +
    resume.skills.languages.length;
  height += Math.ceil(totalSkills / 6) * ESTIMATES.lineHeight; // ~6 skills per line

  // Projects
  if (resume.projects?.length) {
    height += ESTIMATES.sectionGap;
    for (const proj of resume.projects) {
      height += ESTIMATES.lineHeight * 1.5; // Name, description
      height += proj.bullets.length * ESTIMATES.lineHeight;
    }
  }

  // Certifications
  if (resume.certifications?.length) {
    height += ESTIMATES.sectionGap;
    height += resume.certifications.length * ESTIMATES.lineHeight;
  }

  return height;
}

/**
 * Trim bullets from experience entries (keep most recent, max 4 per role)
 */
function trimExperienceBullets(
  resume: StructuredResume,
  maxBulletsPerRole: number
): { trimmed: StructuredResume; removed: string[] } {
  const removed: string[] = [];

  const trimmedExperience = resume.experience.map((exp) => {
    if (exp.bullets.length <= maxBulletsPerRole) {
      return exp;
    }

    const kept = exp.bullets.slice(0, maxBulletsPerRole);
    const cut = exp.bullets.slice(maxBulletsPerRole);
    removed.push(...cut.map((b) => `[${exp.company}] ${b.substring(0, 50)}...`));

    return { ...exp, bullets: kept };
  });

  return {
    trimmed: { ...resume, experience: trimmedExperience },
    removed,
  };
}

/**
 * Remove older experience entries (keep most recent N)
 */
function trimOlderExperience(
  resume: StructuredResume,
  keepCount: number
): { trimmed: StructuredResume; removed: string[] } {
  if (resume.experience.length <= keepCount) {
    return { trimmed: resume, removed: [] };
  }

  const kept = resume.experience.slice(0, keepCount);
  const cut = resume.experience.slice(keepCount);
  const removed = cut.map((e) => `Removed: ${e.title} @ ${e.company}`);

  return {
    trimmed: { ...resume, experience: kept },
    removed,
  };
}

/**
 * Shorten the summary
 */
function shortenSummary(
  resume: StructuredResume,
  maxChars: number
): { trimmed: StructuredResume; removed: string[] } {
  if (!resume.summary || resume.summary.length <= maxChars) {
    return { trimmed: resume, removed: [] };
  }

  // Try to cut at a sentence boundary
  let shortened = resume.summary.substring(0, maxChars);
  const lastPeriod = shortened.lastIndexOf(".");
  if (lastPeriod > maxChars * 0.6) {
    shortened = shortened.substring(0, lastPeriod + 1);
  } else {
    shortened = shortened.trim() + "...";
  }

  return {
    trimmed: { ...resume, summary: shortened },
    removed: ["Summary shortened"],
  };
}

/**
 * Trim skills to most important ones
 */
function trimSkills(
  resume: StructuredResume,
  maxPerCategory: number
): { trimmed: StructuredResume; removed: string[] } {
  const removed: string[] = [];

  const trimCategory = (skills: string[], category: string): string[] => {
    if (skills.length <= maxPerCategory) return skills;
    removed.push(
      `Removed ${skills.length - maxPerCategory} ${category} skills`
    );
    return skills.slice(0, maxPerCategory);
  };

  const trimmedSkills = {
    technical: trimCategory(resume.skills.technical, "technical"),
    soft: trimCategory(resume.skills.soft, "soft"),
    tools: trimCategory(resume.skills.tools, "tools"),
    languages: trimCategory(resume.skills.languages, "languages"),
  };

  return {
    trimmed: { ...resume, skills: trimmedSkills },
    removed,
  };
}

/**
 * Remove projects section
 */
function removeProjects(
  resume: StructuredResume
): { trimmed: StructuredResume; removed: string[] } {
  if (!resume.projects?.length) {
    return { trimmed: resume, removed: [] };
  }

  return {
    trimmed: { ...resume, projects: undefined },
    removed: ["Removed Projects section"],
  };
}

/**
 * Adjust style for tighter spacing
 */
function adjustStyleForFit(style: TemplateStyle): TemplateStyle {
  return {
    ...style,
    bodyFontSize: Math.max(9.5, style.bodyFontSize - 0.5),
    headingFontSize: Math.max(10, style.headingFontSize - 1),
    sectionGap: Math.max(8, style.sectionGap - 4),
  };
}

/**
 * Main function to fit resume to one page
 */
export function fitToOnePage(
  resume: StructuredResume,
  templateId: ResumeFormatId
): FitResult {
  const originalStyle = getTemplateStyle(templateId);
  let style = { ...originalStyle };
  let current = { ...resume };
  const allRemoved: string[] = [];

  // Step 1: Check if already fits
  let height = estimateContentHeight(current, style);
  if (height <= USABLE_HEIGHT) {
    return {
      fittedResume: current,
      adjustedStyle: style,
      removedContent: [],
      fitConfidence: 95,
    };
  }

  // Step 2: Reduce bullets per role (max 4)
  const step2 = trimExperienceBullets(current, 4);
  current = step2.trimmed;
  allRemoved.push(...step2.removed);

  height = estimateContentHeight(current, style);
  if (height <= USABLE_HEIGHT) {
    return {
      fittedResume: current,
      adjustedStyle: style,
      removedContent: allRemoved,
      fitConfidence: 90,
    };
  }

  // Step 3: Reduce bullets per role (max 3)
  const step3 = trimExperienceBullets(current, 3);
  current = step3.trimmed;
  allRemoved.push(...step3.removed);

  height = estimateContentHeight(current, style);
  if (height <= USABLE_HEIGHT) {
    return {
      fittedResume: current,
      adjustedStyle: style,
      removedContent: allRemoved,
      fitConfidence: 85,
    };
  }

  // Step 4: Shorten summary
  const step4 = shortenSummary(current, 200);
  current = step4.trimmed;
  allRemoved.push(...step4.removed);

  height = estimateContentHeight(current, style);
  if (height <= USABLE_HEIGHT) {
    return {
      fittedResume: current,
      adjustedStyle: style,
      removedContent: allRemoved,
      fitConfidence: 80,
    };
  }

  // Step 5: Adjust style for tighter spacing
  style = adjustStyleForFit(style);

  height = estimateContentHeight(current, style);
  if (height <= USABLE_HEIGHT) {
    return {
      fittedResume: current,
      adjustedStyle: style,
      removedContent: allRemoved,
      fitConfidence: 75,
    };
  }

  // Step 6: Remove projects section
  const step6 = removeProjects(current);
  current = step6.trimmed;
  allRemoved.push(...step6.removed);

  height = estimateContentHeight(current, style);
  if (height <= USABLE_HEIGHT) {
    return {
      fittedResume: current,
      adjustedStyle: style,
      removedContent: allRemoved,
      fitConfidence: 70,
    };
  }

  // Step 7: Trim skills
  const step7 = trimSkills(current, 8);
  current = step7.trimmed;
  allRemoved.push(...step7.removed);

  height = estimateContentHeight(current, style);
  if (height <= USABLE_HEIGHT) {
    return {
      fittedResume: current,
      adjustedStyle: style,
      removedContent: allRemoved,
      fitConfidence: 65,
    };
  }

  // Step 8: Remove older experience (keep 3)
  const step8 = trimOlderExperience(current, 3);
  current = step8.trimmed;
  allRemoved.push(...step8.removed);

  height = estimateContentHeight(current, style);
  if (height <= USABLE_HEIGHT) {
    return {
      fittedResume: current,
      adjustedStyle: style,
      removedContent: allRemoved,
      fitConfidence: 55,
    };
  }

  // Step 9: Final aggressive trimming
  const step9a = trimExperienceBullets(current, 2);
  current = step9a.trimmed;
  allRemoved.push(...step9a.removed);

  const step9b = trimOlderExperience(current, 2);
  current = step9b.trimmed;
  allRemoved.push(...step9b.removed);

  return {
    fittedResume: current,
    adjustedStyle: style,
    removedContent: allRemoved,
    fitConfidence: 40,
  };
}

/**
 * Check if content likely fits on one page
 */
export function willFitOnePage(
  resume: StructuredResume,
  templateId: ResumeFormatId
): boolean {
  const style = getTemplateStyle(templateId);
  const height = estimateContentHeight(resume, style);
  return height <= USABLE_HEIGHT;
}

/**
 * Get estimated page count for content
 */
export function estimatePageCount(
  resume: StructuredResume,
  templateId: ResumeFormatId
): number {
  const style = getTemplateStyle(templateId);
  const height = estimateContentHeight(resume, style);
  return Math.ceil(height / USABLE_HEIGHT);
}
