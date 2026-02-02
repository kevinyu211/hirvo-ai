import { openai } from "@/lib/openai";

// ============================================================================
// Embedding Generation — uses OpenAI text-embedding-3-small (1536 dimensions)
// ============================================================================

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_INPUT_TOKENS = 8191; // text-embedding-3-small max context

/**
 * Generate a single embedding vector for a text string.
 * Uses OpenAI text-embedding-3-small (1536 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  // Truncate if too long (rough estimate: ~4 chars per token)
  const maxChars = MAX_INPUT_TOKENS * 4;
  const inputText = text.length > maxChars ? text.slice(0, maxChars) : text;

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputText.trim(),
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

// ============================================================================
// Section Splitting — splits resume text into logical sections
// ============================================================================

/**
 * Section heading patterns for splitting resume text.
 * These match common resume section headings on their own line.
 */
const SECTION_HEADING_PATTERNS: { name: string; pattern: RegExp }[] = [
  {
    name: "summary",
    pattern:
      /^(?:summary|objective|profile|about\s*me|professional\s+summary|career\s+summary|personal\s+statement|executive\s+summary)\s*:?\s*$/im,
  },
  {
    name: "experience",
    pattern:
      /^(?:experience|employment|work\s+history|professional\s+experience|career\s+history|positions?\s+held|work\s+experience)\s*:?\s*$/im,
  },
  {
    name: "education",
    pattern:
      /^(?:education|academic|academic\s+background|educational\s+background|degrees?)\s*:?\s*$/im,
  },
  {
    name: "skills",
    pattern:
      /^(?:skills|technical\s+skills|competencies|proficiencies|technologies|tools|expertise|core\s+skills|key\s+skills|areas?\s+of\s+expertise)\s*:?\s*$/im,
  },
  {
    name: "projects",
    pattern: /^(?:projects|personal\s+projects|key\s+projects)\s*:?\s*$/im,
  },
  {
    name: "certifications",
    pattern:
      /^(?:certifications?|licenses?|credentials?|certifications?\s*(?:&|and)\s*licenses?)\s*:?\s*$/im,
  },
];

interface SectionSplit {
  name: string;
  content: string;
}

/**
 * Split resume text into named sections based on heading detection.
 * Returns an array of { name, content } for each detected section.
 * Any text before the first heading is returned as "header" (typically contact info).
 * If no sections are detected, returns the full text as a single "full" section.
 */
export function splitIntoSections(resumeText: string): SectionSplit[] {
  const lines = resumeText.split("\n");
  const sections: SectionSplit[] = [];
  let currentSection: string | null = null;
  let currentContent: string[] = [];
  const headerContent: string[] = [];
  let foundAnySection = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    let matchedSection: string | null = null;

    // Check if this line is a section heading
    for (const { name, pattern } of SECTION_HEADING_PATTERNS) {
      if (pattern.test(trimmedLine)) {
        matchedSection = name;
        break;
      }
    }

    if (matchedSection) {
      foundAnySection = true;

      // Save previous section content
      if (currentSection) {
        const content = currentContent.join("\n").trim();
        if (content.length > 0) {
          sections.push({ name: currentSection, content });
        }
      } else if (headerContent.length > 0) {
        // Save header content (text before first section)
        const content = headerContent.join("\n").trim();
        if (content.length > 0) {
          sections.push({ name: "header", content });
        }
      }

      currentSection = matchedSection;
      currentContent = [];
    } else {
      if (currentSection) {
        currentContent.push(line);
      } else {
        headerContent.push(line);
      }
    }
  }

  // Save the last section
  if (currentSection) {
    const content = currentContent.join("\n").trim();
    if (content.length > 0) {
      sections.push({ name: currentSection, content });
    }
  } else if (!foundAnySection) {
    // No sections found at all — return full text as single section
    const content = resumeText.trim();
    if (content.length > 0) {
      sections.push({ name: "full", content });
    }
  } else if (headerContent.length > 0) {
    // Found sections but there's trailing header content (unlikely but safe)
    const content = headerContent.join("\n").trim();
    if (content.length > 0) {
      sections.push({ name: "header", content });
    }
  }

  return sections;
}

// ============================================================================
// Section Embeddings — generate an embedding for each resume section
// ============================================================================

export interface SectionEmbedding {
  section: string;
  embedding: number[];
  content: string;
}

/**
 * Split resume into sections and generate an embedding for each.
 * Returns an array of { section, embedding, content } objects.
 * Sections with very little content (<20 chars) are skipped.
 */
export async function generateSectionEmbeddings(
  resumeText: string
): Promise<SectionEmbedding[]> {
  const sections = splitIntoSections(resumeText);

  // Filter out sections that are too short to be meaningful
  const meaningfulSections = sections.filter((s) => s.content.length >= 20);

  if (meaningfulSections.length === 0) {
    throw new Error(
      "No meaningful sections found in resume text for embedding generation"
    );
  }

  // Generate embeddings for all sections concurrently
  const results = await Promise.all(
    meaningfulSections.map(async (section) => {
      const embedding = await generateEmbedding(section.content);
      return {
        section: section.name,
        embedding,
        content: section.content,
      };
    })
  );

  return results;
}

// ============================================================================
// Cosine Similarity — vector comparison
// ============================================================================

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction, 0 = orthogonal, -1 = opposite).
 * Both vectors must have the same length.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(
      `Vector length mismatch: vecA has ${vecA.length} dimensions, vecB has ${vecB.length}`
    );
  }

  if (vecA.length === 0) {
    throw new Error("Cannot compute cosine similarity of empty vectors");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  // Avoid division by zero (zero vectors)
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

// ============================================================================
// Semantic Score Computation
// ============================================================================

export interface SemanticSectionScore {
  section: string;
  score: number;
}

export interface SemanticScore {
  overallScore: number;
  sectionScores: SemanticSectionScore[];
}

/**
 * Compute the semantic similarity score between resume section embeddings
 * and a job description embedding.
 *
 * Returns an overall score (0-100) and per-section scores (0-100).
 * The overall score is a weighted average where longer sections contribute more.
 */
export function computeSemanticScore(
  resumeEmbeddings: SectionEmbedding[],
  jdEmbedding: number[]
): SemanticScore {
  if (resumeEmbeddings.length === 0) {
    return { overallScore: 0, sectionScores: [] };
  }

  const sectionScores: SemanticSectionScore[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  // Section weights: experience and skills are more important for job matching
  const sectionWeights: Record<string, number> = {
    experience: 3,
    skills: 2.5,
    summary: 2,
    projects: 1.5,
    education: 1,
    certifications: 1,
    header: 0.5,
    full: 1,
  };

  for (const sectionEmb of resumeEmbeddings) {
    const similarity = cosineSimilarity(sectionEmb.embedding, jdEmbedding);

    // Convert cosine similarity (-1 to 1) to a 0-100 score
    // Cosine similarity for text embeddings typically ranges from 0.5 to 1.0
    // Map this range to 0-100 for a more intuitive score
    const score = Math.round(Math.max(0, Math.min(100, similarity * 100)));

    sectionScores.push({
      section: sectionEmb.section,
      score,
    });

    const weight = sectionWeights[sectionEmb.section] ?? 1;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  const overallScore =
    totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    overallScore,
    sectionScores,
  };
}

// ============================================================================
// Full Semantic Analysis Pipeline
// ============================================================================

/**
 * Run the full semantic analysis pipeline:
 * 1. Split resume into sections and generate embeddings
 * 2. Generate JD embedding
 * 3. Compute semantic similarity scores
 *
 * Returns the overall and per-section semantic scores plus the raw embeddings.
 */
export async function runSemanticAnalysis(
  resumeText: string,
  jobDescription: string
): Promise<{
  score: SemanticScore;
  resumeEmbeddings: SectionEmbedding[];
  jdEmbedding: number[];
}> {
  // Generate embeddings concurrently
  const [resumeEmbeddings, jdEmbedding] = await Promise.all([
    generateSectionEmbeddings(resumeText),
    generateEmbedding(jobDescription),
  ]);

  // Compute semantic scores
  const score = computeSemanticScore(resumeEmbeddings, jdEmbedding);

  return {
    score,
    resumeEmbeddings,
    jdEmbedding,
  };
}
