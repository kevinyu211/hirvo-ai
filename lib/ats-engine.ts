import type { ATSScore, ATSIssue } from "@/lib/types";

// ============================================================================
// Job Type Detection & Dynamic Weight Profiles
// Different job types emphasize different resume aspects
// ============================================================================
export type JobType = "tech" | "senior" | "entry" | "general";

export const WEIGHT_PROFILES: Record<
  JobType,
  { keywords: number; formatting: number; sections: number }
> = {
  tech: { keywords: 0.45, formatting: 0.35, sections: 0.20 },
  senior: { keywords: 0.50, formatting: 0.30, sections: 0.20 },
  entry: { keywords: 0.35, formatting: 0.40, sections: 0.25 },
  general: { keywords: 0.50, formatting: 0.25, sections: 0.25 }, // current default
};

// Signals for detecting job type from job description
const TECH_SIGNALS = [
  "engineer",
  "developer",
  "programming",
  "software",
  "backend",
  "frontend",
  "devops",
  "data scientist",
  "machine learning",
  "full stack",
  "fullstack",
  "sre",
  "infrastructure",
  "platform",
];

const SENIOR_SIGNALS = [
  "senior",
  "lead",
  "principal",
  "staff",
  "architect",
  "director",
  "manager",
  "head of",
  "vp ",
  "vice president",
  "10+ years",
  "8+ years",
  "7+ years",
  "extensive experience",
];

const ENTRY_SIGNALS = [
  "junior",
  "entry",
  "entry-level",
  "intern",
  "internship",
  "graduate",
  "new grad",
  "associate",
  "0-2 years",
  "1-3 years",
  "0-3 years",
  "early career",
  "no experience required",
];

/**
 * Detect job type from job description text.
 * Used to apply appropriate weight profiles for scoring.
 */
export function detectJobType(jobDescription: string): JobType {
  const lower = jobDescription.toLowerCase();

  const techScore = TECH_SIGNALS.filter((s) => lower.includes(s)).length;
  const seniorScore = SENIOR_SIGNALS.filter((s) => lower.includes(s)).length;
  const entryScore = ENTRY_SIGNALS.filter((s) => lower.includes(s)).length;

  // Priority: senior > entry > tech > general
  // Senior roles are often tech roles too, so check senior first
  if (seniorScore >= 2) return "senior";
  if (entryScore >= 2) return "entry";
  if (techScore >= 2) return "tech";
  return "general";
}

// ============================================================================
// Stop Words — common words to exclude from keyword extraction
// ============================================================================
const STOP_WORDS = new Set([
  // Common English words
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "was", "are", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "must",
  "about", "above", "after", "again", "all", "also", "am", "any", "because",
  "before", "between", "both", "during", "each", "few", "further", "get",
  "got", "he", "her", "here", "him", "his", "how", "i", "if", "into", "it",
  "its", "just", "let", "like", "me", "more", "most", "my", "no", "nor",
  "not", "now", "only", "other", "our", "out", "over", "own", "same", "she",
  "so", "some", "such", "than", "that", "their", "them", "then", "there",
  "these", "they", "this", "those", "through", "too", "under", "until", "up",
  "us", "very", "we", "what", "when", "where", "which", "while", "who",
  "whom", "why", "you", "your", "able", "across", "already", "among",
  "around", "become", "within", "without", "work", "working", "including",
  "well", "using", "used", "use", "new", "make", "ensure", "based",
  "related", "per", "via", "etc", "e.g", "i.e",

  // Job posting filler words
  "experience", "role", "position", "team", "company", "opportunity",
  "responsibilities", "requirements", "qualifications", "candidate",
  "looking", "join", "apply", "ideal", "required", "preferred", "plus",
  "strong", "excellent", "proven", "ability", "skills", "knowledge",
  "understanding", "years", "minimum", "bachelor", "master", "degree",

  // Location terms
  "san", "francisco", "york", "los", "angeles", "chicago", "denver",
  "seattle", "austin", "boston", "atlanta", "dallas", "houston", "remote",
  "hybrid", "onsite", "on-site", "location", "located", "area",
  "region", "city", "state", "headquarters", "hq", "office", "bay",
  "california", "texas", "washington", "florida", "virginia", "colorado",
  "massachusetts", "georgia", "illinois", "oregon", "arizona", "carolina",

  // Compensation & benefits
  "salary", "salaries", "equity", "compensation", "bonus", "bonuses",
  "benefits", "perks", "package", "stock", "options", "rrsp", "401k",
  "pension", "insurance", "health", "dental", "vision", "pto", "vacation",
  "competitive", "range", "annual", "base", "total", "hourly", "pay",

  // Job posting metadata
  "posting", "posted", "applying", "application", "submit",
  "deadline", "asap", "immediately", "urgent", "available", "seeking",
  "hiring", "opportunities", "opening", "openings", "requisition",
  "employment", "employer", "employee", "employees", "staff", "workforce",

  // Generic fillers
  "approximately", "circa", "includes", "similar",
  "desired", "nice", "preparation", "assist", "support", "help",
  "provide", "create", "develop", "implement", "maintain", "manage",
  "build", "drive", "deliver", "execute", "lead", "partner", "collaborate",
  "effectively", "efficiently", "successfully", "consistently", "regularly",
]);

// ============================================================================
// Simple Stemmer — Porter-style suffix stripping for English
// ============================================================================
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length <= 3) return w;

  // Step 1: common suffixes
  if (w.endsWith("iness")) w = w.slice(0, -5) + "y";
  else if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
  else if (w.endsWith("ational")) w = w.slice(0, -7) + "ate";
  else if (w.endsWith("ization")) w = w.slice(0, -7) + "ize";
  else if (w.endsWith("fulness")) w = w.slice(0, -7) + "ful";
  else if (w.endsWith("ousness")) w = w.slice(0, -7) + "ous";
  else if (w.endsWith("iveness")) w = w.slice(0, -7) + "ive";
  else if (w.endsWith("ement")) w = w.slice(0, -5);
  else if (w.endsWith("ment")) w = w.slice(0, -4);
  else if (w.endsWith("tion")) w = w.slice(0, -4) + "t";
  else if (w.endsWith("sion")) w = w.slice(0, -4) + "s";
  else if (w.endsWith("ness")) w = w.slice(0, -4);
  else if (w.endsWith("able")) w = w.slice(0, -4);
  else if (w.endsWith("ible")) w = w.slice(0, -4);
  else if (w.endsWith("ally")) w = w.slice(0, -4) + "al";
  else if (w.endsWith("ment")) w = w.slice(0, -4);
  else if (w.endsWith("ful")) w = w.slice(0, -3);
  else if (w.endsWith("ous")) w = w.slice(0, -3);
  else if (w.endsWith("ive")) w = w.slice(0, -3);
  else if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ied")) w = w.slice(0, -3) + "y";
  else if (w.endsWith("ted") && w.length > 5) w = w.slice(0, -2);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("ly") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("er") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("es") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("al") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) w = w.slice(0, -1);

  return w;
}

// ============================================================================
// Tokenizer — split text into words, preserving multi-word technical terms
// ============================================================================
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\/\+\#]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[-\/#+]+|[-\/#+]+$/g, "")) // strip leading/trailing special chars
    .filter((w) => w.length > 1)
    .filter((w) => !/^\d+$/.test(w)); // filter pure numbers (e.g., salary figures like "145", "185")
}

// ============================================================================
// Multi-word Phrase Extraction
// Known technical phrases and patterns to look for
// ============================================================================
const MULTI_WORD_PATTERNS: RegExp[] = [
  /machine\s+learning/gi,
  /deep\s+learning/gi,
  /artificial\s+intelligence/gi,
  /natural\s+language\s+processing/gi,
  /computer\s+vision/gi,
  /data\s+science/gi,
  /data\s+engineering/gi,
  /data\s+analysis/gi,
  /data\s+analytics/gi,
  /data\s+pipeline/gi,
  /data\s+warehouse/gi,
  /data\s+modeling/gi,
  /project\s+management/gi,
  /product\s+management/gi,
  /full\s+stack/gi,
  /front\s+end/gi,
  /back\s+end/gi,
  /user\s+experience/gi,
  /user\s+interface/gi,
  /quality\s+assurance/gi,
  /continuous\s+integration/gi,
  /continuous\s+delivery/gi,
  /continuous\s+deployment/gi,
  /version\s+control/gi,
  /cloud\s+computing/gi,
  /software\s+engineering/gi,
  /software\s+development/gi,
  /web\s+development/gi,
  /mobile\s+development/gi,
  /api\s+development/gi,
  /test\s+driven/gi,
  /cross[\s-]+functional/gi,
  /object[\s-]+oriented/gi,
  /event[\s-]+driven/gi,
  /micro[\s-]?services/gi,
  /rest(?:ful)?\s+api/gi,
  /supply\s+chain/gi,
  /business\s+intelligence/gi,
  /business\s+analysis/gi,
  /customer\s+service/gi,
  /customer\s+success/gi,
  /human\s+resources/gi,
  /real[\s-]+time/gi,
  /open[\s-]+source/gi,
  /unit\s+test(?:ing|s)?/gi,
  /end[\s-]+to[\s-]+end/gi,
  /a\/b\s+test(?:ing|s)?/gi,
  /ci[\s\/]+cd/gi,
];

function extractMultiWordPhrases(text: string): string[] {
  const phrases: string[] = [];
  for (const pattern of MULTI_WORD_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const normalized = m.toLowerCase().replace(/\s+/g, " ").trim();
        if (!phrases.includes(normalized)) {
          phrases.push(normalized);
        }
      }
    }
  }
  return phrases;
}

// ============================================================================
// extractKeywords — extract significant keywords/phrases from a job description
// Uses TF-IDF-style logic: remove stop words, extract multi-word phrases, stem words
// ============================================================================
export function extractKeywords(jobDescription: string): string[] {
  const text = jobDescription.toLowerCase();

  // 1. Extract multi-word phrases first
  const multiWordPhrases = extractMultiWordPhrases(text);

  // 2. Tokenize and filter single words
  const words = tokenize(text);
  const wordFreq = new Map<string, number>();

  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    if (word.length <= 2 && !/^[a-z]{1,2}$/i.test(word)) continue;
    // Keep short technical terms like "ai", "ml", "ui", "ux", "qa", "ci", "cd"
    if (word.length <= 2 && !["ai", "ml", "ui", "ux", "qa", "ci", "cd", "db", "os", "it", "bi", "hr"].includes(word)) continue;

    const count = wordFreq.get(word) || 0;
    wordFreq.set(word, count + 1);
  }

  // 3. Sort by frequency (TF-IDF approximation — higher frequency in JD = more important)
  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  // 4. Combine multi-word phrases + top single keywords, deduplicated
  const keywords: string[] = [...multiWordPhrases];

  for (const word of sortedWords) {
    // Skip if already part of a multi-word phrase
    const isPartOfPhrase = multiWordPhrases.some((phrase) =>
      phrase.split(/\s+/).includes(word)
    );
    if (!isPartOfPhrase) {
      keywords.push(word);
    }
  }

  return keywords;
}

// ============================================================================
// matchKeywords — match JD keywords against resume text
//
// STRICT MODE (default, mimics real ATS):
//   - Exact word boundary matching only
//   - No stemming, no fuzzy matching
//   - This is how Workday, Greenhouse, Taleo, iCIMS actually work
//
// FUZZY MODE (for HR layer / semantic analysis):
//   - Includes stemmed matching
//   - More lenient, catches variations
// ============================================================================
export interface KeywordMatchResult {
  matched: string[];
  missing: string[];
  matchPct: number;
}

export interface MatchKeywordsOptions {
  /** Use strict exact matching only (default: true for ATS accuracy) */
  strictMode?: boolean;
}

/**
 * Check if a keyword exists in resume text using exact word boundary matching.
 * This mimics how real ATS systems work — they're simple pattern matchers.
 */
function matchKeywordExact(keyword: string, resumeText: string): boolean {
  // Escape special regex characters
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Word boundary matching, case-insensitive
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(resumeText);
}

/**
 * Check if a multi-word phrase exists in resume text.
 * For phrases, we check if all words appear as exact matches.
 */
function matchPhraseExact(phrase: string, resumeText: string): boolean {
  const words = phrase.split(/\s+/);
  // For single words, use exact boundary matching
  if (words.length === 1) {
    return matchKeywordExact(phrase, resumeText);
  }
  // For phrases, check if the exact phrase appears
  return matchKeywordExact(phrase, resumeText);
}

/**
 * Match keywords against resume text.
 *
 * @param resumeText - The resume text to search in
 * @param keywords - Keywords extracted from job description
 * @param options - Matching options (strictMode defaults to true)
 */
export function matchKeywords(
  resumeText: string,
  keywords: string[],
  options: MatchKeywordsOptions = {}
): KeywordMatchResult {
  const { strictMode = true } = options;

  if (keywords.length === 0) {
    return { matched: [], missing: [], matchPct: 100 };
  }

  const resumeLower = resumeText.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  // For fuzzy mode, prepare stemmed tokens
  const resumeTokens = strictMode ? [] : tokenize(resumeText);
  const resumeStemmed = strictMode ? new Set<string>() : new Set(resumeTokens.map(stem));

  for (const keyword of keywords) {
    // STRICT MODE: Exact word boundary matching only
    if (strictMode) {
      if (matchPhraseExact(keyword, resumeText)) {
        matched.push(keyword);
      } else {
        missing.push(keyword);
      }
      continue;
    }

    // FUZZY MODE: Original hybrid matching (for HR layer)
    // Check exact match first (case-insensitive substring)
    if (resumeLower.includes(keyword.toLowerCase())) {
      matched.push(keyword);
      continue;
    }

    // For multi-word phrases, check if all individual words appear
    const keywordWords = keyword.split(/\s+/);
    if (keywordWords.length > 1) {
      const allWordsPresent = keywordWords.every(
        (w) => resumeLower.includes(w) || resumeStemmed.has(stem(w))
      );
      if (allWordsPresent) {
        matched.push(keyword);
        continue;
      }
    }

    // Check stemmed match for single words
    if (keywordWords.length === 1) {
      const keywordStem = stem(keyword);
      if (resumeStemmed.has(keywordStem)) {
        matched.push(keyword);
        continue;
      }
    }

    missing.push(keyword);
  }

  const matchPct =
    keywords.length > 0
      ? Math.round((matched.length / keywords.length) * 100)
      : 100;

  return { matched, missing, matchPct };
}

// ============================================================================
// checkFormatting — check for formatting issues that break real ATS systems
// ============================================================================
export interface FormattingResult {
  score: number;
  issues: ATSIssue[];
}

export function checkFormatting(
  resumeText: string,
  metadata?: { pageCount?: number }
): FormattingResult {
  const issues: ATSIssue[] = [];
  let score = 100;

  // 1. Check for contact info presence
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
  const hasPhone = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(resumeText);

  if (!hasEmail) {
    issues.push({
      type: "formatting",
      severity: "critical",
      message: "No email address detected. ATS systems require contact information to process your application.",
      suggestion: "Add your email address to the top of your resume in the contact section.",
    });
    score -= 15;
  }

  if (!hasPhone) {
    issues.push({
      type: "formatting",
      severity: "warning",
      message: "No phone number detected. Most ATS systems extract phone numbers as a required contact field.",
      suggestion: "Add your phone number to your contact section.",
    });
    score -= 5;
  }

  // 2. Check for table-based layout indicators
  const tableIndicators = [
    /\t{2,}/g, // Multiple consecutive tabs (table-like layout)
    /\|.*\|.*\|/g, // Pipe-delimited content (table structure)
  ];
  for (const pattern of tableIndicators) {
    if (pattern.test(resumeText)) {
      issues.push({
        type: "formatting",
        severity: "warning",
        message: "Possible table-based layout detected. ATS systems often fail to parse tables correctly, resulting in garbled text.",
        suggestion: "Replace table layouts with simple left-aligned text and standard headings.",
      });
      score -= 10;
      break;
    }
  }

  // 3. Check for multi-column layout indicators
  const hasMultiColumn = /\s{5,}\S+.*\s{5,}\S+/m.test(resumeText);
  if (hasMultiColumn) {
    issues.push({
      type: "formatting",
      severity: "warning",
      message: "Possible multi-column layout detected. ATS may merge columns, scrambling your content order.",
      suggestion: "Use a single-column layout for maximum ATS compatibility.",
    });
    score -= 10;
  }

  // 4. Check for inconsistent date formats
  const datePatterns = {
    mmSlashYyyy: /\b\d{1,2}\/\d{4}\b/g,
    mmDashYyyy: /\b\d{1,2}-\d{4}\b/g,
    monthYyyy: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    monYyyy: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{4}\b/gi,
  };

  let dateFormatCount = 0;
  for (const pattern of Object.values(datePatterns)) {
    if (pattern.test(resumeText)) {
      dateFormatCount++;
    }
  }

  if (dateFormatCount > 1) {
    issues.push({
      type: "formatting",
      severity: "warning",
      message: "Inconsistent date formats detected. ATS systems may fail to parse dates in different formats.",
      suggestion: "Use a consistent date format throughout your resume (e.g., 'Month YYYY' like 'January 2024').",
    });
    score -= 5;
  }

  // 5. Check page count
  const pageCount = metadata?.pageCount || 1;
  if (pageCount > 2) {
    issues.push({
      type: "formatting",
      severity: "warning",
      message: `Resume is ${pageCount} pages. Most ATS systems and recruiters prefer 1-2 pages. Longer resumes may have content truncated.`,
      suggestion: "Condense your resume to 1-2 pages by focusing on the most relevant experience.",
    });
    score -= 10;
  }

  // 6. Check for special characters / unicode that may break parsing
  const specialChars = /[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25CB\u25A0\u25A1]/g;
  const specialMatches = resumeText.match(specialChars);
  if (specialMatches && specialMatches.length > 0) {
    // Only flag if using many different types of bullets
    const uniqueBullets = new Set(specialMatches);
    if (uniqueBullets.size > 2) {
      issues.push({
        type: "formatting",
        severity: "info",
        message: "Multiple special bullet characters detected. Some ATS systems may not render these correctly.",
        suggestion: "Use standard hyphens (-) or asterisks (*) as bullet points for maximum compatibility.",
      });
      score -= 3;
    }
  }

  // 7. Check for extremely short resume
  const wordCount = resumeText.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount < 100) {
    issues.push({
      type: "formatting",
      severity: "critical",
      message: "Resume appears too short (fewer than 100 words). ATS systems may flag this as incomplete.",
      suggestion: "Expand your resume with detailed work experience, skills, and achievements.",
    });
    score -= 20;
  }

  // 8. Check for very long paragraphs (wall of text — no bullet points)
  const lines = resumeText.split("\n").filter((l) => l.trim().length > 0);
  const longParagraphs = lines.filter((l) => l.split(/\s+/).length > 50);
  if (longParagraphs.length > 0) {
    issues.push({
      type: "formatting",
      severity: "info",
      message: "Long paragraphs detected. ATS systems parse bullet points more reliably than dense paragraphs.",
      suggestion: "Break long paragraphs into bullet points starting with action verbs.",
    });
    score -= 5;
  }

  // 9. Check for presence of images/graphics indicators
  const imageIndicators = /\[image\]|\[graphic\]|\[logo\]|\[photo\]/gi;
  if (imageIndicators.test(resumeText)) {
    issues.push({
      type: "formatting",
      severity: "critical",
      message: "Image or graphic content detected. ATS systems cannot read images, charts, or graphics — this content will be completely ignored.",
      suggestion: "Replace all images and graphics with plain text equivalents.",
    });
    score -= 15;
  }

  return { score: Math.max(0, score), issues };
}

// ============================================================================
// validateSections — verify standard resume sections are present and detectable
// ============================================================================
export interface SectionValidationResult {
  score: number;
  sections: { name: string; found: boolean }[];
}

const SECTION_PATTERNS: Record<string, RegExp> = {
  Contact: /(?:email|phone|address|linkedin|github|portfolio|contact|website|www\.|@)/i,
  Summary: /(?:summary|objective|profile|about\s*me|professional\s+summary|career\s+summary|personal\s+statement)/i,
  Experience: /(?:experience|employment|work\s+history|professional\s+experience|career\s+history|positions?\s+held)/i,
  Education: /(?:education|academic|university|college|degree|bachelor|master|phd|mba|diploma|certifications?)/i,
  Skills: /(?:skills|technical\s+skills|competencies|proficiencies|technologies|tools|expertise|core\s+skills)/i,
};

export function validateSections(resumeText: string): SectionValidationResult {
  const sections: { name: string; found: boolean }[] = [];
  let foundCount = 0;

  for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
    const found = pattern.test(resumeText);
    sections.push({ name, found });
    if (found) foundCount++;
  }

  // Score: each section is worth 20 points (5 sections × 20 = 100)
  const score = Math.round((foundCount / Object.keys(SECTION_PATTERNS).length) * 100);

  return { score, sections };
}

// ============================================================================
// computeATSScore — weighted overall ATS score
// Weights are dynamic based on job type:
//   - Tech: keywords 45%, formatting 35%, sections 20%
//   - Senior: keywords 50%, formatting 30%, sections 20%
//   - Entry: keywords 35%, formatting 40%, sections 25%
//   - General: keywords 50%, formatting 25%, sections 25%
// Pass threshold: 75
// ============================================================================
export interface ComputeATSScoreOptions {
  /** Job type for dynamic weight selection */
  jobType?: JobType;
}

export function computeATSScore(
  keywordResult: KeywordMatchResult,
  formattingResult: FormattingResult,
  sectionResult: SectionValidationResult,
  options: ComputeATSScoreOptions = {}
): ATSScore {
  const { jobType = "general" } = options;
  const weights = WEIGHT_PROFILES[jobType];

  const keywordScore = keywordResult.matchPct;
  const formattingScore = formattingResult.score;
  const sectionScore = sectionResult.score;

  // Dynamic weighted average based on job type
  const overall = Math.round(
    keywordScore * weights.keywords +
    formattingScore * weights.formatting +
    sectionScore * weights.sections
  );

  // Collect all issues
  // NOTE: We no longer generate individual issues for each missing keyword.
  // Missing keywords are tracked in missingKeywords[] and displayed in ThingsToAddSection.
  // This prevents UI bloat (e.g., 30 missing keywords = 30 "critical" issues).
  const issues: ATSIssue[] = [...formattingResult.issues];

  // Add section validation issues
  for (const section of sectionResult.sections) {
    if (!section.found) {
      issues.push({
        type: "section",
        severity: section.name === "Contact" || section.name === "Experience" ? "critical" : "warning",
        message: `"${section.name}" section not detected. ATS systems expect standard resume sections to properly categorize your information.`,
        suggestion: `Add a clearly labeled "${section.name}" section with a standard heading.`,
      });
    }
  }

  return {
    overall,
    keywordMatchPct: keywordScore,
    formattingScore,
    sectionScore,
    matchedKeywords: keywordResult.matched,
    missingKeywords: keywordResult.missing,
    issues,
    passed: overall >= 75,
  };
}

// ============================================================================
// runATSAnalysis — convenience function that runs the full ATS pipeline
// ============================================================================
export interface ATSAnalysisOptions {
  /** Page count from resume metadata */
  pageCount?: number;
  /** Use strict exact matching (default: true for ATS accuracy) */
  strictMode?: boolean;
  /** Override detected job type */
  jobType?: JobType;
}

export interface ATSAnalysisResult extends ATSScore {
  /** Detected or provided job type */
  jobType: JobType;
  /** Weights used for scoring */
  weights: { keywords: number; formatting: number; sections: number };
}

export function runATSAnalysis(
  resumeText: string,
  jobDescription: string,
  options: ATSAnalysisOptions = {}
): ATSAnalysisResult {
  const { pageCount, strictMode = true, jobType: providedJobType } = options;

  // Detect job type from JD (or use provided override)
  const jobType = providedJobType ?? detectJobType(jobDescription);
  const weights = WEIGHT_PROFILES[jobType];

  // Extract keywords and match against resume
  const keywords = extractKeywords(jobDescription);
  const keywordResult = matchKeywords(resumeText, keywords, { strictMode });

  // Check formatting and sections
  const formattingResult = checkFormatting(resumeText, { pageCount });
  const sectionResult = validateSections(resumeText);

  // Compute score with dynamic weights
  const score = computeATSScore(keywordResult, formattingResult, sectionResult, { jobType });

  return {
    ...score,
    jobType,
    weights,
  };
}
