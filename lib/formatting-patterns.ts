/**
 * Formatting pattern extraction for reference resumes (HR Layer 1).
 *
 * Extracts deterministic formatting metadata from a resume text string.
 * These patterns are stored in the reference_resumes table and used to
 * compare against user resumes during HR formatting analysis.
 */

export interface FormattingPatterns {
  pageCount: number;
  sectionOrder: string[];
  bulletStyle: {
    types: string[]; // e.g., ["dash", "dot", "number"]
    avgBulletsPerEntry: number;
    totalBullets: number;
  };
  hasSummary: boolean;
  quantifiedMetrics: {
    count: number;
    examples: string[];
  };
  headingStyle: {
    consistent: boolean;
    styles: string[]; // e.g., ["ALL_CAPS", "Title Case", "bold_implied"]
  };
  whiteSpaceRatio: number; // ratio of empty lines to total lines
  dateFormat: {
    formats: string[];
    consistent: boolean;
  };
  wordCount: number;
  avgWordsPerLine: number;
}

// Section heading patterns — ordered by typical resume placement
const SECTION_HEADINGS: { name: string; pattern: RegExp }[] = [
  { name: "Contact", pattern: /^(?:contact(?:\s+info(?:rmation)?)?|personal\s+info(?:rmation)?)\s*$/im },
  { name: "Summary", pattern: /^(?:summary|objective|profile|about\s*me|professional\s+summary|career\s+summary|personal\s+statement|executive\s+summary)\s*$/im },
  { name: "Experience", pattern: /^(?:experience|employment|work\s+history|professional\s+experience|career\s+history|positions?\s+held|work\s+experience)\s*$/im },
  { name: "Education", pattern: /^(?:education|academic(?:\s+background)?|degrees?|certifications?(?:\s+and\s+education)?)\s*$/im },
  { name: "Skills", pattern: /^(?:skills|technical\s+skills|core\s+(?:competencies|skills)|proficiencies|technologies|tools?\s+(?:and|&)\s+technologies|expertise|key\s+skills)\s*$/im },
  { name: "Projects", pattern: /^(?:projects|personal\s+projects|key\s+projects|selected\s+projects)\s*$/im },
  { name: "Certifications", pattern: /^(?:certifications?|licenses?(?:\s+and\s+certifications?)?|professional\s+certifications?)\s*$/im },
  { name: "Awards", pattern: /^(?:awards?|honors?|achievements?|recognition)\s*$/im },
  { name: "Publications", pattern: /^(?:publications?|papers?|research)\s*$/im },
  { name: "Volunteer", pattern: /^(?:volunteer(?:ing)?|community\s+(?:service|involvement))\s*$/im },
];

/**
 * Detect the order of sections as they appear in the resume text.
 */
function detectSectionOrder(text: string): string[] {
  const lines = text.split("\n");
  const sections: { name: string; lineIndex: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const { name, pattern } of SECTION_HEADINGS) {
      if (pattern.test(line)) {
        // Avoid duplicate section detections
        if (!sections.some((s) => s.name === name)) {
          sections.push({ name, lineIndex: i });
        }
        break;
      }
    }
  }

  // If no explicit Contact heading, check if contact info appears in the first few lines
  if (!sections.some((s) => s.name === "Contact")) {
    const firstLines = lines.slice(0, 5).join(" ");
    const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(firstLines);
    const hasPhone = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(firstLines);
    if (hasEmail || hasPhone) {
      sections.unshift({ name: "Contact", lineIndex: 0 });
    }
  }

  // Sort by line index and return names
  return sections.sort((a, b) => a.lineIndex - b.lineIndex).map((s) => s.name);
}

/**
 * Detect bullet point styles used in the resume.
 */
function detectBulletStyle(text: string): FormattingPatterns["bulletStyle"] {
  const lines = text.split("\n");
  const types = new Set<string>();
  let totalBullets = 0;

  // Bullet patterns
  const bulletPatterns: { type: string; pattern: RegExp }[] = [
    { type: "dash", pattern: /^\s*[-–—]\s+/ },
    { type: "dot", pattern: /^\s*[•·∙●○◦⦾]\s*/ },
    { type: "asterisk", pattern: /^\s*\*\s+/ },
    { type: "number", pattern: /^\s*\d+[.)]\s+/ },
    { type: "arrow", pattern: /^\s*[►▸→➤»]\s*/ },
  ];

  for (const line of lines) {
    for (const { type, pattern } of bulletPatterns) {
      if (pattern.test(line)) {
        types.add(type);
        totalBullets++;
        break;
      }
    }
  }

  // Estimate average bullets per job entry
  // Count experience entries (lines starting with dates or company-like patterns)
  const entryPattern = /(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\b\s*\d{4}|\b\d{1,2}\/\d{4}\b)/gi;
  const entries = text.match(entryPattern);
  const entryCount = entries ? Math.ceil(entries.length / 2) : 1; // pairs of start/end dates

  return {
    types: Array.from(types),
    totalBullets,
    avgBulletsPerEntry: entryCount > 0 ? Math.round(totalBullets / entryCount) : totalBullets,
  };
}

/**
 * Detect heading style patterns (ALL CAPS, Title Case, etc.)
 */
function detectHeadingStyle(text: string): FormattingPatterns["headingStyle"] {
  const lines = text.split("\n");
  const styles = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 50) continue;

    // Check if this line looks like a heading
    const isLikelySectionHeading = SECTION_HEADINGS.some(({ pattern }) => pattern.test(trimmed));
    if (!isLikelySectionHeading) continue;

    if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      styles.add("ALL_CAPS");
    } else if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed)) {
      styles.add("Title Case");
    } else if (/^[A-Z][a-z]/.test(trimmed)) {
      styles.add("Sentence case");
    }
  }

  const styleArr = Array.from(styles);
  return {
    styles: styleArr,
    consistent: styleArr.length <= 1,
  };
}

/**
 * Detect quantified metrics (numbers, percentages, dollar amounts).
 */
function detectQuantifiedMetrics(text: string): FormattingPatterns["quantifiedMetrics"] {
  const patterns = [
    /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%/g,              // percentages: 15%, 100%, 3.5%
    /\$\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s*[MBKmk])?/g, // dollar amounts: $50K, $1.2M
    /\b\d{1,3}(?:,\d{3})+\b/g,                          // large numbers: 1,000 10,000
    /\b\d+x\b/gi,                                        // multipliers: 3x, 10x
    /\b\d+\+?\s*(?:users?|clients?|customers?|employees?|team\s*members?|people|projects?|applications?|servers?|repositories|repos)\b/gi, // counts with context
  ];

  const examples: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        if (examples.length < 10 && !examples.includes(m)) {
          examples.push(m);
        }
      }
    }
  }

  return {
    count: examples.length,
    examples,
  };
}

/**
 * Detect date formats used and whether they are consistent.
 */
function detectDateFormats(text: string): FormattingPatterns["dateFormat"] {
  const formats: Set<string> = new Set();

  if (/\b\d{1,2}\/\d{4}\b/.test(text)) formats.add("MM/YYYY");
  if (/\b\d{1,2}-\d{4}\b/.test(text)) formats.add("MM-YYYY");
  // Full month names (4+ letters to avoid matching abbreviated "Mon YYYY" for May, etc.)
  if (/\b(?:January|February|March|April|June|July|August|September|October|November|December)\s+\d{4}\b/i.test(text)) {
    formats.add("Month YYYY");
  }
  // Abbreviated month names (3 letters, optionally with period)
  // "May" is ambiguous — only count as abbreviated if there are other abbreviated months
  const abbrMonths = text.match(/\b(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{4}\b/gi);
  if (abbrMonths) {
    formats.add("Mon YYYY");
  }
  // "May YYYY" is ambiguous — it could be either full or abbreviated.
  // Count it as "Month YYYY" (full name), since "May" IS the full month name.
  if (/\bMay\s+\d{4}\b/i.test(text) && !formats.has("Month YYYY")) {
    formats.add("Month YYYY");
  }
  if (/\b\d{4}\b/.test(text) && formats.size === 0) {
    formats.add("YYYY");
  }

  const formatArr = Array.from(formats);
  return {
    formats: formatArr,
    consistent: formatArr.length <= 1,
  };
}

/**
 * Extract all formatting patterns from a resume text.
 */
export function extractFormattingPatterns(
  text: string,
  pageCount?: number
): FormattingPatterns {
  const lines = text.split("\n");
  // An empty string split by "\n" yields [""] — treat this as zero lines
  const hasContent = text.trim().length > 0;
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  const emptyLines = hasContent ? lines.filter((l) => l.trim().length === 0) : [];

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const estimatedPageCount = pageCount ?? Math.max(1, Math.ceil(wordCount / 500));

  const totalWords = nonEmptyLines.reduce(
    (sum, line) => sum + line.trim().split(/\s+/).filter(Boolean).length,
    0
  );
  const avgWordsPerLine = nonEmptyLines.length > 0
    ? Math.round(totalWords / nonEmptyLines.length)
    : 0;

  const sectionOrder = detectSectionOrder(text);
  const hasSummary = sectionOrder.includes("Summary");

  return {
    pageCount: estimatedPageCount,
    sectionOrder,
    bulletStyle: detectBulletStyle(text),
    hasSummary,
    quantifiedMetrics: detectQuantifiedMetrics(text),
    headingStyle: detectHeadingStyle(text),
    whiteSpaceRatio: hasContent && lines.length > 0
      ? Math.round((emptyLines.length / lines.length) * 100) / 100
      : 0,
    dateFormat: detectDateFormats(text),
    wordCount,
    avgWordsPerLine,
  };
}
