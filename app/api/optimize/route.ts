import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import Fuse from "fuse.js";
import { runOptimizationAnalysis, type PreIdentifiedIssue } from "@/lib/prompts/optimization-prompts";
import { extractContentPatterns } from "@/lib/content-patterns";
import { getLearnedInsightsForResume } from "@/lib/success-matching";
import {
  contrastiveInsightsToSuggestions,
} from "@/lib/contrastive-analysis";
import {
  findSynonymInText,
  getCanonicalForm,
  checkKeywordPresence,
  findAllAbbreviationsInText,
} from "@/lib/keyword-synonyms";
import type { ATSIssue, HRFeedback, Suggestion } from "@/lib/types";

// =============================================================================
// Pre-Processing Functions
// =============================================================================

/**
 * Common weak action verbs that should be replaced with stronger alternatives
 */
const WEAK_VERBS = [
  "responsible for",
  "helped with",
  "worked on",
  "assisted with",
  "participated in",
  "was involved in",
  "handled",
  "dealt with",
  "tasked with",
];

/**
 * Pre-process the resume to identify EXACT text issues with positions.
 * These are issues we can detect deterministically before calling GPT-4o.
 */
function extractPotentialIssues(
  resumeText: string,
  atsIssues: ATSIssue[],
  jobDescription: string
): PreIdentifiedIssue[] {
  const issues: PreIdentifiedIssue[] = [];

  // 1. Find abbreviations that should be spelled out
  const abbreviations = findAllAbbreviationsInText(resumeText);
  for (const { found, canonical } of abbreviations) {
    // Check if the canonical form appears in the job description
    // Only suggest expansion if the JD uses the full form
    const jdLower = jobDescription.toLowerCase();
    if (jdLower.includes(canonical.toLowerCase())) {
      const regex = new RegExp(`\\b${escapeRegexString(found)}\\b`, "gi");
      let match;
      while ((match = regex.exec(resumeText)) !== null) {
        issues.push({
          exactText: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          issueType: "abbreviation",
          targetKeyword: capitalizeWords(canonical),
          suggestedReplacement: capitalizeWords(canonical),
        });
        // Only take first occurrence to avoid duplicates
        break;
      }
    }
  }

  // 2. Find weak action verbs
  for (const verb of WEAK_VERBS) {
    const regex = new RegExp(`\\b${escapeRegexString(verb)}\\b`, "gi");
    let match;
    while ((match = regex.exec(resumeText)) !== null) {
      issues.push({
        exactText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        issueType: "weak_verb",
        suggestedReplacement: getStrongVerbSuggestion(verb),
      });
    }
  }

  // 3. Extract missing keywords from ATS issues and check if synonyms exist
  for (const issue of atsIssues) {
    if (issue.type === "missing_keyword") {
      const missingKeyword = extractKeywordFromMessage(issue.message);
      if (missingKeyword) {
        // Check if there's a synonym/abbreviation in the resume
        const presence = checkKeywordPresence(missingKeyword, resumeText);
        if (presence.found && presence.form === "synonym" && presence.matchedText) {
          // Find exact position of the synonym
          const exactPos = findExactPosition(resumeText, presence.matchedText);
          if (exactPos) {
            issues.push({
              exactText: presence.matchedText,
              position: exactPos,
              issueType: "abbreviation",
              targetKeyword: missingKeyword,
              suggestedReplacement: missingKeyword,
            });
          }
        }
      }
    }
  }

  // Deduplicate by position
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.position.start}-${issue.position.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Find exact position of text in resume
 */
function findExactPosition(
  resumeText: string,
  searchText: string
): { start: number; end: number } | null {
  const regex = new RegExp(`\\b${escapeRegexString(searchText)}\\b`, "gi");
  const match = regex.exec(resumeText);
  if (match) {
    return { start: match.index, end: match.index + match[0].length };
  }
  return null;
}

/**
 * Get a stronger verb suggestion for weak verbs
 */
function getStrongVerbSuggestion(weakVerb: string): string {
  const suggestions: Record<string, string> = {
    "responsible for": "Led",
    "helped with": "Contributed to",
    "worked on": "Developed",
    "assisted with": "Supported",
    "participated in": "Contributed to",
    "was involved in": "Executed",
    "handled": "Managed",
    "dealt with": "Resolved",
    "tasked with": "Delivered",
  };
  return suggestions[weakVerb.toLowerCase()] || "Executed";
}

/**
 * Capitalize first letter of each word
 */
function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// Request Schema
// =============================================================================

const optimizeRequestSchema = z.object({
  resumeText: z.string().min(1, "Resume text is required"),
  jobDescription: z.string().min(1, "Job description is required"),
  atsIssues: z.array(
    z.object({
      type: z.enum(["missing_keyword", "weak_keyword", "formatting", "section"]),
      severity: z.enum(["critical", "warning", "info"]),
      message: z.string(),
      suggestion: z.string().optional(),
      textRange: z
        .object({
          start: z.number(),
          end: z.number(),
        })
        .optional(),
    })
  ),
  hrFeedback: z.array(
    z.object({
      type: z.enum(["formatting", "semantic", "llm_review"]),
      layer: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      severity: z.enum(["critical", "warning", "info"]),
      message: z.string(),
      suggestion: z.string().optional(),
      textRange: z
        .object({
          start: z.number(),
          end: z.number(),
        })
        .optional(),
    })
  ),
  analysisId: z.string().uuid("Invalid analysis ID").optional(),
  visaFlagged: z.boolean().optional(),
  visaSignals: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = optimizeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { resumeText, jobDescription, atsIssues, hrFeedback, analysisId, visaFlagged, visaSignals } =
    parsed.data;

  try {
    // ==========================================================================
    // PHASE 1: Pre-process to find EXACT text issues BEFORE calling GPT-4o
    // ==========================================================================

    // Extract pre-identified issues with exact positions (abbreviations, weak verbs)
    const preIdentifiedIssues = extractPotentialIssues(
      resumeText,
      atsIssues as ATSIssue[],
      jobDescription
    );

    // Detect synonym opportunities FIRST (guaranteed valid positions)
    // These are the most reliable suggestions - run before GPT-4o
    const synonymSuggestions = detectSynonymOpportunities(
      resumeText,
      atsIssues as ATSIssue[]
    );

    // ==========================================================================
    // PHASE 2: Run GPT-4o with pre-identified issues for additional suggestions
    // ==========================================================================

    // Run GPT-4o optimization analysis (with visa-aware rules if flagged)
    // Also extract content patterns in parallel for performance
    const [result, userPatterns] = await Promise.all([
      runOptimizationAnalysis({
        resumeText,
        jobDescription,
        atsIssues: atsIssues as ATSIssue[],
        hrFeedback: hrFeedback as HRFeedback[],
        visaFlagged,
        visaSignals,
        preIdentifiedIssues, // Pass pre-identified issues to GPT-4o
      }),
      // Extract content patterns from user's resume for comparison
      Promise.resolve(extractContentPatterns(resumeText)),
    ]);

    // ==========================================================================
    // PHASE 3: Combine and deduplicate suggestions
    // ==========================================================================

    // Start with synonym suggestions FIRST (most reliable, have exact positions)
    const suggestions: Suggestion[] = [];
    const processedOriginalTexts = new Set<string>();

    // Add synonym-based suggestions first
    for (const synSuggestion of synonymSuggestions) {
      const key = synSuggestion.originalText.toLowerCase();
      if (!processedOriginalTexts.has(key)) {
        processedOriginalTexts.add(key);
        suggestions.push({
          ...synSuggestion,
          id: `synonym-${suggestions.length}-${Date.now()}`,
        });
      }
    }

    // Add validated GPT-4o suggestions (filter out those with invalid positions)
    for (const raw of result.suggestions) {
      const textRange = findTextRange(resumeText, raw.originalText);

      // Skip suggestions with invalid positions (not found in resume)
      if (textRange.start === 0 && textRange.end === 0 && raw.originalText.length > 0) {
        continue;
      }

      const key = raw.originalText.toLowerCase();
      if (!processedOriginalTexts.has(key)) {
        processedOriginalTexts.add(key);
        suggestions.push({
          id: `gpt-${suggestions.length}-${Date.now()}`,
          type: raw.type,
          category: raw.category,
          originalText: raw.originalText,
          suggestedText: raw.suggestedText,
          reasoning: raw.reasoning,
          textRange,
          severity: raw.severity,
          // Include impact explanations from GPT-4o
          atsImpact: raw.atsImpact,
          hrImpact: raw.hrImpact,
        });
      }
    }

    // Try to get learned insights (graceful degradation if no examples exist)
    let learnedInsightsData = null;
    try {
      learnedInsightsData = await getLearnedInsightsForResume(
        resumeText,
        jobDescription,
        userPatterns
      );

      // If we have both positive and negative examples, add contrastive suggestions
      if (
        learnedInsightsData.positiveExamples > 0 &&
        learnedInsightsData.negativeExamples > 0 &&
        learnedInsightsData.patterns
      ) {
        // Fetch content patterns from similar jobs for contrastive analysis
        const contrastiveSuggestions = contrastiveInsightsToSuggestions(
          userPatterns,
          {
            hasContrastiveData: true,
            positiveCount: learnedInsightsData.positiveExamples,
            negativeCount: learnedInsightsData.negativeExamples,
            insights: learnedInsightsData.insights.map((i) => ({
              pattern: i.type,
              metric: i.type,
              positiveAvg: 0,
              negativeAvg: 0,
              delta: 0,
              percentDiff: 0,
              insight: i.message,
              importance: i.importance,
              confidence: 0.8,
            })),
            summary: "",
          }
        );

        // Add learned suggestions to the main suggestions array
        for (const learned of contrastiveSuggestions) {
          suggestions.push({
            id: `learned-${suggestions.length}-${Date.now()}`,
            type: "hr", // Learned insights are HR-related
            category: learned.type,
            originalText: "",
            suggestedText: "",
            reasoning: learned.message,
            textRange: { start: 0, end: 0 },
            severity: learned.importance === "high" ? "warning" : "info",
          });
        }
      }
    } catch (learnedError) {
      // Don't fail the whole request if learned patterns fail
      console.warn("Learned patterns retrieval failed:", learnedError);
    }

    // Save optimized text hint to the analysis record if analysisId is provided
    if (analysisId) {
      try {
        await supabase
          .from("resume_analyses")
          .update({
            optimized_text: resumeText, // Will be updated when user applies suggestions
          })
          .eq("id", analysisId)
          .eq("user_id", user.id);
      } catch {
        // Log but don't fail — suggestions are still returned
        console.error("Failed to save optimization state to database");
      }
    }

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
      learnedInsights: learnedInsightsData
        ? {
            similarJobsFound: learnedInsightsData.similarJobsFound,
            positiveExamples: learnedInsightsData.positiveExamples,
            negativeExamples: learnedInsightsData.negativeExamples,
            patterns: learnedInsightsData.patterns,
            insights: learnedInsightsData.insights,
          }
        : null,
    });
  } catch (error) {
    console.error("Optimization failed:", error);
    return NextResponse.json(
      { error: "Optimization failed. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Find the start and end indices of a text span in the resume text.
 * Uses multiple matching strategies:
 * 1. Exact match
 * 2. Case-insensitive match
 * 3. Whitespace-normalized match
 * 4. Fuzzy match for abbreviations/synonyms
 */
function findTextRange(
  resumeText: string,
  originalText: string
): { start: number; end: number } {
  // 1. Try exact match first
  const exactIndex = resumeText.indexOf(originalText);
  if (exactIndex !== -1) {
    return { start: exactIndex, end: exactIndex + originalText.length };
  }

  // 2. Try case-insensitive match
  const lowerResume = resumeText.toLowerCase();
  const lowerOriginal = originalText.toLowerCase();
  const ciIndex = lowerResume.indexOf(lowerOriginal);
  if (ciIndex !== -1) {
    return { start: ciIndex, end: ciIndex + originalText.length };
  }

  // 3. Try whitespace-normalized match (handles line breaks, multiple spaces)
  const normalizedResume = resumeText.replace(/\s+/g, " ");
  const normalizedOriginal = originalText.replace(/\s+/g, " ");
  const normalizedIndex = normalizedResume
    .toLowerCase()
    .indexOf(normalizedOriginal.toLowerCase());
  if (normalizedIndex !== -1) {
    // Map back to original text position (approximate)
    const beforeNormalized = normalizedResume.slice(0, normalizedIndex);
    const originalPortion = resumeText.slice(0, resumeText.length);
    let charCount = 0;
    let originalStart = 0;

    // Find approximate start in original text
    for (let i = 0; i < originalPortion.length && charCount < beforeNormalized.length; i++) {
      if (!/\s/.test(originalPortion[i]) || (i > 0 && !/\s/.test(originalPortion[i - 1]))) {
        charCount++;
      }
      originalStart = i;
    }

    return { start: originalStart, end: originalStart + originalText.length };
  }

  // 4. Try fuzzy match for short text (abbreviations, keywords)
  if (originalText.length <= 50) {
    const fuzzyResult = fuzzyFindInText(resumeText, originalText);
    if (fuzzyResult) {
      return fuzzyResult;
    }
  }

  // If no match found, return 0,0 — the suggestion won't have a visible highlight
  return { start: 0, end: 0 };
}

/**
 * Fuzzy search for text in a document.
 * Useful for finding abbreviations and slight variations.
 */
function fuzzyFindInText(
  text: string,
  searchText: string
): { start: number; end: number } | null {
  // Split text into searchable segments (sentences/phrases)
  const segments: Array<{ text: string; start: number }> = [];
  const segmentRegex = /[^.!?\n]+[.!?\n]?/g;
  let match: RegExpExecArray | null;

  while ((match = segmentRegex.exec(text)) !== null) {
    segments.push({
      text: match[0].trim(),
      start: match.index,
    });
  }

  // Also add individual words for very short search terms
  if (searchText.length <= 10) {
    const wordRegex = /\b\w+\b/g;
    while ((match = wordRegex.exec(text)) !== null) {
      segments.push({
        text: match[0],
        start: match.index,
      });
    }
  }

  // Use Fuse.js for fuzzy matching
  const fuse = new Fuse(segments, {
    keys: ["text"],
    threshold: 0.4, // Allow 40% difference
    includeMatches: true,
    minMatchCharLength: Math.min(3, searchText.length),
  });

  const results = fuse.search(searchText);

  if (results.length > 0) {
    const bestMatch = results[0];
    const matchedSegment = bestMatch.item;
    const matchedText = matchedSegment.text;
    const matchStart = matchedSegment.start;

    // For word-level matches, find the actual word position
    if (matchedText.length <= searchText.length * 1.5) {
      return {
        start: matchStart,
        end: matchStart + matchedText.length,
      };
    }

    // For sentence-level matches, try to find the specific portion
    const lowerMatched = matchedText.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    const subIndex = lowerMatched.indexOf(lowerSearch);

    if (subIndex !== -1) {
      return {
        start: matchStart + subIndex,
        end: matchStart + subIndex + searchText.length,
      };
    }

    // Return the whole segment as a fallback
    return {
      start: matchStart,
      end: matchStart + matchedText.length,
    };
  }

  return null;
}

/**
 * Extract a keyword from an ATS issue message.
 * Handles messages like "Missing keyword: Machine Learning" or "Consider adding 'Python'"
 */
function extractKeywordFromMessage(message: string): string | null {
  // Try various patterns
  const patterns = [
    /missing keyword[:\s]+["']?([^"'\.,]+)["']?/i,
    /keyword[:\s]+["']?([^"'\.,]+)["']?/i,
    /add[ing]?\s+["']([^"']+)["']/i,
    /["']([^"']+)["']\s+(?:is|was|not)/i,
    /"([^"]+)"/,
    /'([^']+)'/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Detect opportunities where the resume uses an abbreviation/synonym
 * instead of the full keyword that ATS systems need.
 *
 * For example: Resume says "ML" but job description says "Machine Learning"
 * This creates a specific suggestion to expand the abbreviation.
 */
function detectSynonymOpportunities(
  resumeText: string,
  atsIssues: ATSIssue[]
): Omit<Suggestion, "id">[] {
  const suggestions: Omit<Suggestion, "id">[] = [];
  const processedKeywords = new Set<string>();

  for (const issue of atsIssues) {
    // Only process missing keyword issues
    if (issue.type !== "missing_keyword") continue;

    // Extract the missing keyword from the message
    const missingKeyword = extractKeywordFromMessage(issue.message);
    if (!missingKeyword || processedKeywords.has(missingKeyword.toLowerCase())) {
      continue;
    }

    // Check if there's a synonym/abbreviation in the resume
    const presence = checkKeywordPresence(missingKeyword, resumeText);

    if (presence.found && presence.form === "synonym" && presence.matchedText) {
      processedKeywords.add(missingKeyword.toLowerCase());

      // Find the exact position of the synonym in the resume
      const textRange = findTextRange(resumeText, presence.matchedText);

      // Find the context around the abbreviation (the full sentence/bullet)
      const contextMatch = findSurroundingContext(resumeText, textRange.start);
      const originalText = contextMatch || presence.matchedText;
      const originalTextRange = contextMatch
        ? findTextRange(resumeText, contextMatch)
        : textRange;

      // Create the replacement text (expand the abbreviation in context)
      const suggestedText = originalText.replace(
        new RegExp(`\\b${escapeRegexString(presence.matchedText)}\\b`, "gi"),
        missingKeyword
      );

      suggestions.push({
        type: "ats",
        category: "weak_keyword",
        originalText,
        suggestedText,
        reasoning: `ATS systems require "${missingKeyword}" spelled out. Found "${presence.matchedText}" which is semantically equivalent, but ATS keyword matching is literal and won't match abbreviations.`,
        textRange: originalTextRange,
        severity: "warning",
        // Additional metadata for semantic display
        semanticMatch: true,
        targetKeyword: missingKeyword,
        matchedSynonym: presence.matchedText,
        // Impact explanations
        atsImpact: `ATS keyword matching requires exact phrase "${missingKeyword}" - abbreviation "${presence.matchedText}" will not be indexed`,
        hrImpact: `Standard terminology "${missingKeyword}" is clearer for recruiters scanning resumes quickly`,
      });
    }
  }

  return suggestions;
}

/**
 * Find the surrounding context (sentence or bullet point) for a position.
 */
function findSurroundingContext(text: string, position: number): string | null {
  // Find the start of the current line/sentence
  let start = position;
  while (start > 0 && !["\n", ".", "!", "?"].includes(text[start - 1])) {
    start--;
  }

  // Find the end of the current line/sentence
  let end = position;
  while (end < text.length && !["\n", ".", "!", "?"].includes(text[end])) {
    end++;
  }

  const context = text.slice(start, end).trim();

  // Only return if it's a reasonable length (not too short, not too long)
  if (context.length >= 10 && context.length <= 200) {
    return context;
  }

  return null;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegexString(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
