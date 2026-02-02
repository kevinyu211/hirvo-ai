// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateEmbedding,
  generateSectionEmbeddings,
  cosineSimilarity,
  computeSemanticScore,
  splitIntoSections,
  runSemanticAnalysis,
} from "@/lib/embeddings";
import type { SectionEmbedding } from "@/lib/embeddings";
import { openai } from "@/lib/openai";

// ============================================================================
// Mock OpenAI
// ============================================================================
vi.mock("@/lib/openai", () => ({
  openai: {
    embeddings: {
      create: vi.fn(),
    },
  },
}));

const mockEmbeddingsCreate = vi.mocked(openai.embeddings.create);

/** Helper to create a fake embedding vector of the given dimension */
function fakeEmbedding(seed: number, dims = 1536): number[] {
  const vec: number[] = [];
  for (let i = 0; i < dims; i++) {
    vec.push(Math.sin(seed + i * 0.01));
  }
  return vec;
}

/** Helper to set up the OpenAI mock to return a given embedding */
function mockOpenAIEmbedding(embedding: number[]) {
  mockEmbeddingsCreate.mockResolvedValueOnce({
    data: [{ embedding, index: 0, object: "embedding" as const }],
    model: "text-embedding-3-small",
    object: "list" as const,
    usage: { prompt_tokens: 10, total_tokens: 10 },
  });
}

// ============================================================================
// Tests: generateEmbedding
// ============================================================================
describe("generateEmbedding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call OpenAI with correct parameters", async () => {
    const embedding = fakeEmbedding(1);
    mockOpenAIEmbedding(embedding);

    const result = await generateEmbedding("Hello world");

    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: "Hello world",
      dimensions: 1536,
    });
    expect(result).toEqual(embedding);
  });

  it("should trim whitespace from input text", async () => {
    const embedding = fakeEmbedding(2);
    mockOpenAIEmbedding(embedding);

    await generateEmbedding("  some text with spaces  ");

    expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: "some text with spaces",
      })
    );
  });

  it("should throw for empty text", async () => {
    await expect(generateEmbedding("")).rejects.toThrow(
      "Cannot generate embedding for empty text"
    );
    expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
  });

  it("should throw for whitespace-only text", async () => {
    await expect(generateEmbedding("   ")).rejects.toThrow(
      "Cannot generate embedding for empty text"
    );
    expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
  });

  it("should truncate very long text", async () => {
    const embedding = fakeEmbedding(3);
    mockOpenAIEmbedding(embedding);

    // Create text longer than 8191 * 4 = 32764 chars
    const longText = "a".repeat(40000);
    await generateEmbedding(longText);

    const call = mockEmbeddingsCreate.mock.calls[0][0];
    expect((call.input as string).length).toBeLessThanOrEqual(32764);
  });

  it("should propagate OpenAI API errors", async () => {
    mockEmbeddingsCreate.mockRejectedValueOnce(
      new Error("OpenAI rate limit exceeded")
    );

    await expect(generateEmbedding("test text")).rejects.toThrow(
      "OpenAI rate limit exceeded"
    );
  });
});

// ============================================================================
// Tests: splitIntoSections
// ============================================================================
describe("splitIntoSections", () => {
  it("should split a resume with standard headings", () => {
    const resume = `John Doe
john@email.com
555-1234

Summary
Experienced software engineer with 5 years of expertise.

Experience
Senior Engineer at Acme Corp (2020 - Present)
- Led team of 5 engineers
- Built microservices architecture

Education
BS Computer Science, MIT, 2016

Skills
JavaScript, TypeScript, React, Node.js, Python`;

    const sections = splitIntoSections(resume);

    expect(sections).toHaveLength(5);
    expect(sections[0].name).toBe("header");
    expect(sections[0].content).toContain("John Doe");
    expect(sections[1].name).toBe("summary");
    expect(sections[1].content).toContain("Experienced software engineer");
    expect(sections[2].name).toBe("experience");
    expect(sections[2].content).toContain("Senior Engineer");
    expect(sections[3].name).toBe("education");
    expect(sections[3].content).toContain("MIT");
    expect(sections[4].name).toBe("skills");
    expect(sections[4].content).toContain("JavaScript");
  });

  it("should handle alternate section heading names", () => {
    const resume = `Professional Summary
Expert data scientist.

Work History
Data Scientist at Google (2021 - 2023)

Technical Skills
Python, R, SQL, TensorFlow`;

    const sections = splitIntoSections(resume);

    expect(sections.some((s) => s.name === "summary")).toBe(true);
    expect(sections.some((s) => s.name === "experience")).toBe(true);
    expect(sections.some((s) => s.name === "skills")).toBe(true);
  });

  it("should return full text as single section when no headings found", () => {
    const resume = `John Doe - Software Engineer
Worked at Acme Corp for 5 years building web applications.
Proficient in JavaScript and Python.`;

    const sections = splitIntoSections(resume);

    expect(sections).toHaveLength(1);
    expect(sections[0].name).toBe("full");
    expect(sections[0].content).toContain("John Doe");
  });

  it("should handle empty text", () => {
    const sections = splitIntoSections("");
    expect(sections).toHaveLength(0);
  });

  it("should handle headings with colons", () => {
    const resume = `Summary:
A skilled developer.

Experience:
Built many apps.`;

    const sections = splitIntoSections(resume);

    expect(sections.some((s) => s.name === "summary")).toBe(true);
    expect(sections.some((s) => s.name === "experience")).toBe(true);
  });

  it("should skip empty sections", () => {
    const resume = `Summary

Experience
Built many apps at Corp.`;

    const sections = splitIntoSections(resume);

    // Summary has no content, should be skipped
    expect(sections.find((s) => s.name === "summary")).toBeUndefined();
    expect(sections.some((s) => s.name === "experience")).toBe(true);
  });

  it("should detect projects and certifications sections", () => {
    const resume = `Projects
Built an open-source library used by 1000+ developers.

Certifications
AWS Solutions Architect, Certified Kubernetes Administrator`;

    const sections = splitIntoSections(resume);

    expect(sections.some((s) => s.name === "projects")).toBe(true);
    expect(sections.some((s) => s.name === "certifications")).toBe(true);
  });
});

// ============================================================================
// Tests: generateSectionEmbeddings
// ============================================================================
describe("generateSectionEmbeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate embeddings for each resume section", async () => {
    const resume = `Summary
Experienced software engineer with focus on web technologies.

Experience
Senior Engineer at Acme Corp building microservices.

Skills
JavaScript, TypeScript, React, Node.js, Python, SQL`;

    // Mock three embeddings (one per section)
    mockOpenAIEmbedding(fakeEmbedding(1));
    mockOpenAIEmbedding(fakeEmbedding(2));
    mockOpenAIEmbedding(fakeEmbedding(3));

    const result = await generateSectionEmbeddings(resume);

    expect(result).toHaveLength(3);
    expect(result[0].section).toBe("summary");
    expect(result[0].embedding).toEqual(fakeEmbedding(1));
    expect(result[0].content).toContain("Experienced software engineer");
    expect(result[1].section).toBe("experience");
    expect(result[2].section).toBe("skills");

    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(3);
  });

  it("should skip sections with less than 20 characters", async () => {
    const resume = `Summary
Short.

Experience
Senior Engineer at Acme Corp building distributed systems and microservices for high-traffic applications.`;

    // Only one embedding should be generated (experience)
    mockOpenAIEmbedding(fakeEmbedding(1));

    const result = await generateSectionEmbeddings(resume);

    expect(result).toHaveLength(1);
    expect(result[0].section).toBe("experience");
    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
  });

  it("should throw if no meaningful sections are found", async () => {
    await expect(generateSectionEmbeddings("")).rejects.toThrow(
      "No meaningful sections found"
    );
  });

  it("should handle resume with no section headings (full text)", async () => {
    const resume =
      "This is a simple resume without any section headings but it has enough content to generate an embedding for semantic analysis.";

    mockOpenAIEmbedding(fakeEmbedding(1));

    const result = await generateSectionEmbeddings(resume);

    expect(result).toHaveLength(1);
    expect(result[0].section).toBe("full");
    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
  });

  it("should propagate OpenAI errors", async () => {
    const resume = `Experience
Senior Engineer at Acme Corp building distributed systems.`;

    mockEmbeddingsCreate.mockRejectedValueOnce(
      new Error("API key invalid")
    );

    await expect(generateSectionEmbeddings(resume)).rejects.toThrow(
      "API key invalid"
    );
  });
});

// ============================================================================
// Tests: cosineSimilarity
// ============================================================================
describe("cosineSimilarity", () => {
  it("should return 1 for identical vectors", () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
  });

  it("should return -1 for opposite vectors", () => {
    const vecA = [1, 0, 0];
    const vecB = [-1, 0, 0];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
  });

  it("should return 0 for orthogonal vectors", () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
  });

  it("should handle vectors with different magnitudes", () => {
    const vecA = [1, 0, 0];
    const vecB = [100, 0, 0];
    // Same direction, different magnitude → similarity = 1
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
  });

  it("should throw for vectors of different lengths", () => {
    expect(() => cosineSimilarity([1, 2, 3], [1, 2])).toThrow(
      "Vector length mismatch"
    );
  });

  it("should throw for empty vectors", () => {
    expect(() => cosineSimilarity([], [])).toThrow(
      "Cannot compute cosine similarity of empty vectors"
    );
  });

  it("should return 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(0);
  });

  it("should compute correct similarity for known vectors", () => {
    // cos(45°) ≈ 0.7071
    const vecA = [1, 0];
    const vecB = [1, 1];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(
      1 / Math.sqrt(2),
      5
    );
  });

  it("should handle negative values", () => {
    const vecA = [1, -1, 1];
    const vecB = [-1, 1, -1];
    // These are opposite directions
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
  });

  it("should work with large dimensional vectors (1536-d)", () => {
    const vecA = fakeEmbedding(1, 1536);
    const vecB = fakeEmbedding(1, 1536);
    // Same seed → same vector → similarity = 1
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
  });

  it("should return value between -1 and 1 for random vectors", () => {
    const vecA = fakeEmbedding(42, 100);
    const vecB = fakeEmbedding(99, 100);
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// Tests: computeSemanticScore
// ============================================================================
describe("computeSemanticScore", () => {
  it("should return 0 scores for empty embeddings", () => {
    const result = computeSemanticScore([], fakeEmbedding(1, 3));
    expect(result.overallScore).toBe(0);
    expect(result.sectionScores).toHaveLength(0);
  });

  it("should compute per-section scores from cosine similarity", () => {
    // Use identical vectors for high similarity
    const jdEmb = [1, 0, 0];
    const resumeEmbeddings: SectionEmbedding[] = [
      { section: "experience", embedding: [1, 0, 0], content: "test content" },
      { section: "skills", embedding: [0, 1, 0], content: "test content" },
    ];

    const result = computeSemanticScore(resumeEmbeddings, jdEmb);

    expect(result.sectionScores).toHaveLength(2);

    // experience has identical vector → similarity 1.0 → score 100
    const expScore = result.sectionScores.find(
      (s) => s.section === "experience"
    );
    expect(expScore?.score).toBe(100);

    // skills is orthogonal → similarity 0.0 → score 0
    const skillsScore = result.sectionScores.find(
      (s) => s.section === "skills"
    );
    expect(skillsScore?.score).toBe(0);
  });

  it("should apply section weights in overall score", () => {
    // experience (weight 3) at 100, education (weight 1) at 0
    const jdEmb = [1, 0, 0];
    const resumeEmbeddings: SectionEmbedding[] = [
      { section: "experience", embedding: [1, 0, 0], content: "test content" },
      { section: "education", embedding: [0, 1, 0], content: "test content" },
    ];

    const result = computeSemanticScore(resumeEmbeddings, jdEmb);

    // Weighted: (100 * 3 + 0 * 1) / (3 + 1) = 300 / 4 = 75
    expect(result.overallScore).toBe(75);
  });

  it("should use default weight of 1 for unknown sections", () => {
    const jdEmb = [1, 0, 0];
    const resumeEmbeddings: SectionEmbedding[] = [
      {
        section: "unknown_section",
        embedding: [1, 0, 0],
        content: "test content",
      },
    ];

    const result = computeSemanticScore(resumeEmbeddings, jdEmb);

    // Unknown section gets weight 1, similarity 1.0 → score 100
    expect(result.overallScore).toBe(100);
  });

  it("should clamp scores to 0-100 range", () => {
    // Cosine similarity can be negative, but scores should be 0 min
    const jdEmb = [1, 0, 0];
    const resumeEmbeddings: SectionEmbedding[] = [
      {
        section: "experience",
        embedding: [-1, 0, 0],
        content: "test content",
      },
    ];

    const result = computeSemanticScore(resumeEmbeddings, jdEmb);

    // Similarity = -1 → score should be clamped to 0
    const expScore = result.sectionScores.find(
      (s) => s.section === "experience"
    );
    expect(expScore?.score).toBe(0);
  });

  it("should weight skills higher than education", () => {
    // skills (weight 2.5) vs education (weight 1) — both at 100
    const jdEmb = [1, 0, 0];
    const resumeEmbeddings: SectionEmbedding[] = [
      { section: "skills", embedding: [1, 0, 0], content: "test" },
      { section: "education", embedding: [1, 0, 0], content: "test" },
    ];

    const result = computeSemanticScore(resumeEmbeddings, jdEmb);

    // Both at 100 with different weights → still 100
    expect(result.overallScore).toBe(100);

    // Now test with different scores: skills at 100, education at 0
    const resumeEmbeddings2: SectionEmbedding[] = [
      { section: "skills", embedding: [1, 0, 0], content: "test" },
      { section: "education", embedding: [0, 1, 0], content: "test" },
    ];

    const result2 = computeSemanticScore(resumeEmbeddings2, jdEmb);

    // (100 * 2.5 + 0 * 1) / (2.5 + 1) = 250 / 3.5 ≈ 71
    expect(result2.overallScore).toBe(71);
  });
});

// ============================================================================
// Tests: runSemanticAnalysis (integration with mocked OpenAI)
// ============================================================================
describe("runSemanticAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should run full pipeline and return scores + embeddings", async () => {
    const resume = `Experience
Senior engineer at tech company building scalable web applications.

Skills
JavaScript, TypeScript, React, Node.js`;

    const jd = "Looking for a senior engineer with JavaScript and React experience.";

    // 2 section embeddings + 1 JD embedding = 3 calls
    const expEmb = fakeEmbedding(1);
    const skillsEmb = fakeEmbedding(2);
    const jdEmb = fakeEmbedding(3);

    mockOpenAIEmbedding(expEmb);
    mockOpenAIEmbedding(skillsEmb);
    mockOpenAIEmbedding(jdEmb);

    const result = await runSemanticAnalysis(resume, jd);

    expect(result.resumeEmbeddings).toHaveLength(2);
    expect(result.jdEmbedding).toEqual(jdEmb);
    expect(result.score.sectionScores).toHaveLength(2);
    expect(result.score.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.score.overallScore).toBeLessThanOrEqual(100);

    expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(3);
  });

  it("should propagate errors from embedding generation", async () => {
    const resume = `Experience
Building web apps with modern technologies and frameworks.`;

    const jd = "Need a web developer.";

    mockEmbeddingsCreate.mockRejectedValue(new Error("API error"));

    await expect(runSemanticAnalysis(resume, jd)).rejects.toThrow("API error");
  });
});
