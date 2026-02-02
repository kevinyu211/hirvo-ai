/**
 * Content pattern extraction for resume examples.
 *
 * Extracts quantifiable content patterns from resume text for the
 * self-improving optimization system. These patterns help identify
 * what differentiates successful resumes from rejected ones.
 */

export interface ContentPatterns {
  // Action verbs analysis
  actionVerbs: {
    verbs: string[];           // ['Led', 'Developed', 'Increased']
    strongVerbCount: number;
    weakVerbCount: number;     // ['Helped', 'Assisted', 'Worked on']
    verbDiversity: number;     // Unique verbs / total verbs
  };

  // Quantification (the #1 differentiator)
  quantification: {
    metricsCount: number;
    metricTypes: string[];     // ['percentage', 'dollar', 'headcount', 'time']
    avgMetricsPerBullet: number;
    examples: string[];
  };

  // Keyword analysis (relative to JD - computed separately)
  keywords?: {
    jdKeywordsFound: string[];
    jdKeywordsMissing: string[];
    keywordDensity: number;
    keywordInFirstHalf: number;  // % of keywords in top half of resume
  };

  // Achievement framing
  achievements: {
    resultsFirstCount: number;  // Bullets that lead with outcome
    carFormatCount: number;     // Challenge-Action-Result structure
    impactStatements: string[];
  };

  // Structure
  structure: {
    summaryLength: number;
    bulletCount: number;
    avgBulletLength: number;
    sectionOrder: string[];
    experienceEntries: number;
  };
}

// Strong action verbs that indicate leadership and impact
const STRONG_VERBS = new Set([
  // Leadership
  'led', 'directed', 'managed', 'supervised', 'orchestrated', 'spearheaded',
  'championed', 'pioneered', 'drove', 'headed', 'oversaw',
  // Achievement
  'achieved', 'exceeded', 'surpassed', 'delivered', 'accomplished',
  'attained', 'secured', 'won', 'earned',
  // Growth/Improvement
  'increased', 'improved', 'boosted', 'enhanced', 'elevated', 'grew',
  'expanded', 'accelerated', 'maximized', 'optimized', 'streamlined',
  // Creation/Innovation
  'created', 'developed', 'designed', 'built', 'established', 'launched',
  'initiated', 'introduced', 'implemented', 'engineered', 'architected',
  // Transformation
  'transformed', 'revamped', 'restructured', 'modernized', 'revolutionized',
  'overhauled', 'reengineered', 'redesigned',
  // Analysis/Strategy
  'analyzed', 'evaluated', 'assessed', 'identified', 'discovered',
  'formulated', 'devised', 'strategized',
  // Collaboration (strong)
  'partnered', 'collaborated', 'negotiated', 'influenced', 'persuaded',
  'mentored', 'coached', 'trained',
  // Cost/Revenue
  'reduced', 'saved', 'cut', 'generated', 'produced', 'captured',
]);

// Weak action verbs that should be replaced
const WEAK_VERBS = new Set([
  'helped', 'assisted', 'worked', 'supported', 'contributed', 'participated',
  'involved', 'responsible', 'handled', 'dealt', 'used', 'utilized',
  'did', 'made', 'got', 'had', 'was', 'were', 'been', 'being',
  'served', 'provided', 'performed', 'conducted', 'completed',
  'maintained', 'ensured', 'facilitated',
]);

// Result/outcome indicators that suggest impact-first writing
const RESULT_INDICATORS = [
  /^(?:achieved|delivered|generated|saved|reduced|increased|improved|grew|boosted|cut|drove|secured)/i,
  /^\d+%/,                          // Starts with percentage
  /^\$[\d,]+/,                      // Starts with dollar amount
  /^(?:resulting|leading|driving)\s+(?:in|to)/i,
  /(?:by|to)\s+\d+%/,               // "by 50%" or "to 95%"
];

// CAR (Challenge-Action-Result) format indicators
const CAR_INDICATORS = {
  challenge: /(?:faced|addressed|tackled|confronted|dealt with|responding to|in response to|challenged by|given|when)/i,
  action: /(?:implemented|developed|created|designed|built|established|led|managed|executed)/i,
  result: /(?:resulting in|leading to|which|achieving|delivered|saved|reduced|increased|improved)/i,
};

/**
 * Extract action verbs from resume text
 */
function extractActionVerbs(text: string): ContentPatterns['actionVerbs'] {
  const lines = text.split('\n');
  const bulletLines = lines.filter(line => /^\s*[-–—•·∙●○◦⦾*►▸→➤»]\s+/i.test(line.trim()) || /^\s*\d+[.)]\s+/.test(line.trim()));

  const allVerbs: string[] = [];
  const strongVerbs: string[] = [];
  const weakVerbs: string[] = [];

  // Extract verbs from bullet points (where action verbs matter most)
  for (const line of bulletLines) {
    // Get the first word after the bullet
    const cleaned = line.replace(/^\s*[-–—•·∙●○◦⦾*►▸→➤»\d.)]+\s*/, '').trim();
    const words = cleaned.split(/\s+/);

    if (words.length > 0) {
      const firstWord = words[0].toLowerCase().replace(/[^a-z]/g, '');

      if (firstWord.length > 2) {
        allVerbs.push(firstWord);

        if (STRONG_VERBS.has(firstWord)) {
          strongVerbs.push(words[0]);
        } else if (WEAK_VERBS.has(firstWord)) {
          weakVerbs.push(words[0]);
        }
      }
    }
  }

  const uniqueVerbs = new Set(allVerbs);

  return {
    verbs: Array.from(new Set(strongVerbs)).slice(0, 20), // Top unique strong verbs
    strongVerbCount: strongVerbs.length,
    weakVerbCount: weakVerbs.length,
    verbDiversity: allVerbs.length > 0 ? uniqueVerbs.size / allVerbs.length : 0,
  };
}

/**
 * Extract quantification patterns
 */
function extractQuantification(text: string): ContentPatterns['quantification'] {
  const lines = text.split('\n');
  const bulletLines = lines.filter(line => /^\s*[-–—•·∙●○◦⦾*►▸→➤»]\s+/i.test(line.trim()) || /^\s*\d+[.)]\s+/.test(line.trim()));

  const metricTypes = new Set<string>();
  const examples: string[] = [];
  let totalMetrics = 0;

  const patterns: { type: string; pattern: RegExp }[] = [
    { type: 'percentage', pattern: /\b\d{1,3}(?:\.\d+)?%/g },
    { type: 'dollar', pattern: /\$\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s*[MBKmk](?:illion)?)?/g },
    { type: 'multiplier', pattern: /\b\d+(?:\.\d+)?x\b/gi },
    { type: 'time', pattern: /\b\d+(?:\+)?\s*(?:hours?|days?|weeks?|months?|years?)\b/gi },
    { type: 'headcount', pattern: /\b\d+(?:\+)?\s*(?:engineers?|developers?|team\s*members?|employees?|people|reports?|direct\s*reports?)\b/gi },
    { type: 'count', pattern: /\b\d{1,3}(?:,\d{3})+\b/g }, // Large numbers like 1,000,000
    { type: 'users', pattern: /\b\d+(?:\+|k|K|m|M)?\s*(?:users?|customers?|clients?|subscribers?|visitors?|downloads?)\b/gi },
  ];

  for (const { type, pattern } of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      metricTypes.add(type);
      totalMetrics += matches.length;

      for (const m of matches) {
        if (examples.length < 15 && !examples.includes(m)) {
          examples.push(m);
        }
      }
    }
  }

  return {
    metricsCount: totalMetrics,
    metricTypes: Array.from(metricTypes),
    avgMetricsPerBullet: bulletLines.length > 0 ? totalMetrics / bulletLines.length : 0,
    examples,
  };
}

/**
 * Analyze achievement framing patterns
 */
function analyzeAchievements(text: string): ContentPatterns['achievements'] {
  const lines = text.split('\n');
  const bulletLines = lines.filter(line => /^\s*[-–—•·∙●○◦⦾*►▸→➤»]\s+/i.test(line.trim()) || /^\s*\d+[.)]\s+/.test(line.trim()));

  let resultsFirstCount = 0;
  let carFormatCount = 0;
  const impactStatements: string[] = [];

  for (const line of bulletLines) {
    const cleaned = line.replace(/^\s*[-–—•·∙●○◦⦾*►▸→➤»\d.)]+\s*/, '').trim();

    // Check if bullet leads with result/outcome
    for (const pattern of RESULT_INDICATORS) {
      if (pattern.test(cleaned)) {
        resultsFirstCount++;
        if (impactStatements.length < 5) {
          impactStatements.push(cleaned.slice(0, 100) + (cleaned.length > 100 ? '...' : ''));
        }
        break;
      }
    }

    // Check for CAR format (has all three elements)
    const hasChallenge = CAR_INDICATORS.challenge.test(cleaned);
    const hasAction = CAR_INDICATORS.action.test(cleaned);
    const hasResult = CAR_INDICATORS.result.test(cleaned);

    if ((hasChallenge || hasAction) && hasResult) {
      carFormatCount++;
    }
  }

  return {
    resultsFirstCount,
    carFormatCount,
    impactStatements,
  };
}

/**
 * Analyze structure patterns
 */
function analyzeStructure(text: string): ContentPatterns['structure'] {
  const lines = text.split('\n');
  const bulletLines = lines.filter(line => /^\s*[-–—•·∙●○◦⦾*►▸→➤»]\s+/i.test(line.trim()) || /^\s*\d+[.)]\s+/.test(line.trim()));

  // Detect section order
  const sectionPatterns: { name: string; pattern: RegExp }[] = [
    { name: 'Contact', pattern: /^(?:contact(?:\s+info(?:rmation)?)?|personal\s+info(?:rmation)?)\s*$/im },
    { name: 'Summary', pattern: /^(?:summary|objective|profile|about\s*me|professional\s+summary|career\s+summary|personal\s+statement|executive\s+summary)\s*$/im },
    { name: 'Experience', pattern: /^(?:experience|employment|work\s+history|professional\s+experience|career\s+history|positions?\s+held|work\s+experience)\s*$/im },
    { name: 'Education', pattern: /^(?:education|academic(?:\s+background)?|degrees?|certifications?(?:\s+and\s+education)?)\s*$/im },
    { name: 'Skills', pattern: /^(?:skills|technical\s+skills|core\s+(?:competencies|skills)|proficiencies|technologies|tools?\s+(?:and|&)\s+technologies|expertise|key\s+skills)\s*$/im },
    { name: 'Projects', pattern: /^(?:projects|personal\s+projects|key\s+projects|selected\s+projects)\s*$/im },
    { name: 'Certifications', pattern: /^(?:certifications?|licenses?(?:\s+and\s+certifications?)?|professional\s+certifications?)\s*$/im },
  ];

  const sectionOrder: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    for (const { name, pattern } of sectionPatterns) {
      if (pattern.test(trimmed) && !sectionOrder.includes(name)) {
        sectionOrder.push(name);
        break;
      }
    }
  }

  // Detect summary length
  let summaryLength = 0;
  const summaryMatch = text.match(/(?:summary|objective|profile|about\s*me|professional\s+summary)[\s\S]*?(?=\n(?:experience|education|skills|$))/i);
  if (summaryMatch) {
    summaryLength = summaryMatch[0].split(/\s+/).filter(Boolean).length;
  }

  // Count experience entries (by date patterns)
  const datePattern = /(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b\s*\d{4})/gi;
  const dates = text.match(datePattern);
  const experienceEntries = dates ? Math.ceil(dates.length / 2) : 0;

  // Calculate average bullet length
  const totalBulletWords = bulletLines.reduce((sum, line) => {
    const cleaned = line.replace(/^\s*[-–—•·∙●○◦⦾*►▸→➤»\d.)]+\s*/, '').trim();
    return sum + cleaned.split(/\s+/).filter(Boolean).length;
  }, 0);

  return {
    summaryLength,
    bulletCount: bulletLines.length,
    avgBulletLength: bulletLines.length > 0 ? Math.round(totalBulletWords / bulletLines.length) : 0,
    sectionOrder,
    experienceEntries,
  };
}

/**
 * Analyze keyword presence relative to job description
 */
export function analyzeKeywords(
  resumeText: string,
  jdKeywords: string[]
): ContentPatterns['keywords'] {
  const resumeLower = resumeText.toLowerCase();
  const midpoint = Math.floor(resumeText.length / 2);
  const firstHalf = resumeText.slice(0, midpoint).toLowerCase();

  const found: string[] = [];
  const missing: string[] = [];
  let firstHalfCount = 0;

  for (const keyword of jdKeywords) {
    const keywordLower = keyword.toLowerCase();
    if (resumeLower.includes(keywordLower)) {
      found.push(keyword);
      if (firstHalf.includes(keywordLower)) {
        firstHalfCount++;
      }
    } else {
      missing.push(keyword);
    }
  }

  // Calculate keyword density (keywords per 100 words)
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  const totalKeywordOccurrences = found.reduce((sum, kw) => {
    const regex = new RegExp(kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = resumeText.match(regex);
    return sum + (matches ? matches.length : 0);
  }, 0);

  return {
    jdKeywordsFound: found,
    jdKeywordsMissing: missing,
    keywordDensity: wordCount > 0 ? (totalKeywordOccurrences / wordCount) * 100 : 0,
    keywordInFirstHalf: found.length > 0 ? (firstHalfCount / found.length) * 100 : 0,
  };
}

/**
 * Extract all content patterns from a resume text.
 *
 * @param resumeText - The full text of the resume
 * @param jdKeywords - Optional array of keywords from job description
 */
export function extractContentPatterns(
  resumeText: string,
  jdKeywords?: string[]
): ContentPatterns {
  const patterns: ContentPatterns = {
    actionVerbs: extractActionVerbs(resumeText),
    quantification: extractQuantification(resumeText),
    achievements: analyzeAchievements(resumeText),
    structure: analyzeStructure(resumeText),
  };

  if (jdKeywords && jdKeywords.length > 0) {
    patterns.keywords = analyzeKeywords(resumeText, jdKeywords);
  }

  return patterns;
}

/**
 * Compare two content patterns and identify key differences
 */
export function comparePatterns(
  userPatterns: ContentPatterns,
  referencePatterns: ContentPatterns
): { metric: string; userValue: number; refValue: number; delta: number; insight: string }[] {
  const comparisons: { metric: string; userValue: number; refValue: number; delta: number; insight: string }[] = [];

  // Quantification comparison
  const userMetrics = userPatterns.quantification.avgMetricsPerBullet;
  const refMetrics = referencePatterns.quantification.avgMetricsPerBullet;
  if (refMetrics > 0) {
    comparisons.push({
      metric: 'metrics_per_bullet',
      userValue: Math.round(userMetrics * 10) / 10,
      refValue: Math.round(refMetrics * 10) / 10,
      delta: Math.round((userMetrics - refMetrics) * 10) / 10,
      insight: userMetrics < refMetrics
        ? `Add more quantified metrics. Successful resumes average ${refMetrics.toFixed(1)} metrics per bullet (you have ${userMetrics.toFixed(1)}).`
        : `Your quantification is strong with ${userMetrics.toFixed(1)} metrics per bullet.`,
    });
  }

  // Strong verbs comparison
  const userStrong = userPatterns.actionVerbs.strongVerbCount;
  const refStrong = referencePatterns.actionVerbs.strongVerbCount;
  const userWeak = userPatterns.actionVerbs.weakVerbCount;
  if (userWeak > 0) {
    comparisons.push({
      metric: 'weak_verbs',
      userValue: userWeak,
      refValue: 0,
      delta: -userWeak,
      insight: `Replace ${userWeak} weak verbs (helped, assisted, worked) with strong action verbs.`,
    });
  }

  // Results-first framing
  const userResultsFirst = userPatterns.achievements.resultsFirstCount;
  const userBullets = userPatterns.structure.bulletCount;
  const resultsFirstPct = userBullets > 0 ? (userResultsFirst / userBullets) * 100 : 0;
  const refResultsFirst = referencePatterns.achievements.resultsFirstCount;
  const refBullets = referencePatterns.structure.bulletCount;
  const refResultsFirstPct = refBullets > 0 ? (refResultsFirst / refBullets) * 100 : 0;

  if (refResultsFirstPct > resultsFirstPct) {
    comparisons.push({
      metric: 'results_first_pct',
      userValue: Math.round(resultsFirstPct),
      refValue: Math.round(refResultsFirstPct),
      delta: Math.round(resultsFirstPct - refResultsFirstPct),
      insight: `Lead more bullets with results. Successful resumes start ${Math.round(refResultsFirstPct)}% of bullets with outcomes (you: ${Math.round(resultsFirstPct)}%).`,
    });
  }

  // Verb diversity
  const userDiversity = userPatterns.actionVerbs.verbDiversity;
  const refDiversity = referencePatterns.actionVerbs.verbDiversity;
  if (userDiversity < 0.5 && refDiversity > userDiversity) {
    comparisons.push({
      metric: 'verb_diversity',
      userValue: Math.round(userDiversity * 100),
      refValue: Math.round(refDiversity * 100),
      delta: Math.round((userDiversity - refDiversity) * 100),
      insight: `Vary your action verbs more. You're repeating the same verbs too often.`,
    });
  }

  return comparisons;
}
