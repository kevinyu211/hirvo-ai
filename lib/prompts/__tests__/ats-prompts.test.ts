import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ATS_SUPPLEMENTARY_SYSTEM_PROMPT,
  buildATSUserPrompt,
  runSupplementaryATSAnalysis,
  type SupplementaryATSAnalysis,
} from "../ats-prompts";

// Mock the openai module
vi.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

import { openai } from "@/lib/openai";

const mockCreate = vi.mocked(openai.chat.completions.create);

// Sample data for tests
const sampleResumeText = `John Doe
john@email.com | (555) 123-4567 | linkedin.com/in/johndoe

Summary
Experienced full-stack developer with 5 years of experience building web applications using React, Node.js, and PostgreSQL.

Experience
Senior Software Engineer, TechCorp (January 2021 - Present)
- Built scalable microservices using Node.js and Express
- Developed frontend UIs with React and TypeScript
- Managed deployment pipelines with GitHub Actions
- Mentored junior developers on best practices

Software Engineer, StartupXYZ (June 2018 - December 2020)
- Developed RESTful APIs using Python and Flask
- Implemented CI/CD pipelines with Jenkins
- Used AWS services (EC2, S3, Lambda) for cloud infrastructure

Education
Bachelor of Science in Computer Science, State University, 2018

Skills
JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, AWS, Docker, Git`;

const sampleJobDescription = `Senior Full-Stack Engineer

We are looking for a Senior Full-Stack Engineer to join our team.

Requirements:
- 5+ years of experience in software development
- Strong proficiency in JavaScript/TypeScript and React
- Experience with Node.js and Express.js
- Proficiency with SQL databases (PostgreSQL preferred)
- Experience with cloud platforms (AWS, GCP, or Azure)
- Knowledge of containerization (Docker, Kubernetes)
- Experience with CI/CD pipelines
- Strong understanding of RESTful API design
- Experience with Agile/Scrum methodologies

Nice to have:
- Experience with GraphQL
- Knowledge of machine learning
- Open source contributions`;

const sampleMatchedKeywords = [
  "javascript",
  "typescript",
  "react",
  "node.js",
  "postgresql",
  "aws",
  "docker",
  "ci/cd",
  "restful api",
];
const sampleMissingKeywords = [
  "kubernetes",
  "express.js",
  "azure",
  "gcp",
  "graphql",
  "agile",
  "scrum",
];

const validMockResponse: SupplementaryATSAnalysis = {
  aliasMatches: [
    {
      original: "express.js",
      aliasFoundInResume: "Express",
      reasoning:
        "The resume mentions 'Express' which is the same as 'Express.js'",
    },
    {
      original: "agile",
      aliasFoundInResume: "best practices",
      reasoning:
        "Mentoring on best practices implies agile methodology familiarity, though this is a weak match",
    },
  ],
  keywordPriorities: [
    {
      keyword: "javascript",
      priority: "critical",
      reasoning: "Core language requirement listed first in the JD",
    },
    {
      keyword: "typescript",
      priority: "critical",
      reasoning: "Listed alongside JavaScript as primary language requirement",
    },
    {
      keyword: "react",
      priority: "critical",
      reasoning: "Primary frontend framework explicitly required",
    },
    {
      keyword: "node.js",
      priority: "critical",
      reasoning: "Primary backend runtime explicitly required",
    },
    {
      keyword: "graphql",
      priority: "nice_to_have",
      reasoning: "Listed under 'Nice to have' section",
    },
  ],
  weakUsages: [
    {
      keyword: "docker",
      currentContext: "Listed only in Skills section",
      issue:
        "Docker is mentioned only in the skills list without supporting experience showing actual usage",
      suggestedImprovement:
        "Add a bullet point describing Docker usage, e.g., 'Containerized microservices with Docker for consistent deployment environments'",
    },
  ],
  additionalKeywords: ["git version control", "code review", "unit testing"],
};

describe("ATS Supplementary Prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ATS_SUPPLEMENTARY_SYSTEM_PROMPT", () => {
    it("contains all four analysis categories", () => {
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("Alias Matches");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("Keyword Priorities");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain(
        "Weak Keyword Usages"
      );
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain(
        "Additional Keywords"
      );
    });

    it("specifies JSON output format", () => {
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("valid JSON");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("aliasMatches");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("keywordPriorities");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("weakUsages");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("additionalKeywords");
    });

    it("includes ATS analyst role", () => {
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("ATS");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("analyst");
    });

    it("mentions abbreviation and alias examples", () => {
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("JavaScript");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("Kubernetes");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("K8s");
    });

    it("defines priority levels", () => {
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("critical");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("important");
      expect(ATS_SUPPLEMENTARY_SYSTEM_PROMPT).toContain("nice_to_have");
    });
  });

  describe("buildATSUserPrompt", () => {
    it("includes job description", () => {
      const prompt = buildATSUserPrompt({
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        matchedKeywords: sampleMatchedKeywords,
        missingKeywords: sampleMissingKeywords,
        matchPct: 56,
      });
      expect(prompt).toContain("## Job Description");
      expect(prompt).toContain("Senior Full-Stack Engineer");
    });

    it("includes resume text", () => {
      const prompt = buildATSUserPrompt({
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        matchedKeywords: sampleMatchedKeywords,
        missingKeywords: sampleMissingKeywords,
        matchPct: 56,
      });
      expect(prompt).toContain("## Resume");
      expect(prompt).toContain("John Doe");
    });

    it("includes deterministic engine results", () => {
      const prompt = buildATSUserPrompt({
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        matchedKeywords: sampleMatchedKeywords,
        missingKeywords: sampleMissingKeywords,
        matchPct: 56,
      });
      expect(prompt).toContain("Match percentage: 56%");
      expect(prompt).toContain("Matched keywords (9)");
      expect(prompt).toContain("Missing keywords (7)");
      expect(prompt).toContain("javascript, typescript, react");
      expect(prompt).toContain("kubernetes, express.js");
    });

    it("handles empty matched keywords", () => {
      const prompt = buildATSUserPrompt({
        resumeText: "Short resume",
        jobDescription: "Short JD",
        matchedKeywords: [],
        missingKeywords: ["python"],
        matchPct: 0,
      });
      expect(prompt).toContain("Matched keywords (0): none");
    });

    it("handles empty missing keywords", () => {
      const prompt = buildATSUserPrompt({
        resumeText: "Full match resume",
        jobDescription: "Short JD",
        matchedKeywords: ["python"],
        missingKeywords: [],
        matchPct: 100,
      });
      expect(prompt).toContain("Missing keywords (0): none");
    });
  });

  describe("runSupplementaryATSAnalysis", () => {
    it("calls OpenAI with correct parameters", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: { content: JSON.stringify(validMockResponse) },
          },
        ],
      } as never);

      await runSupplementaryATSAnalysis({
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        matchedKeywords: sampleMatchedKeywords,
        missingKeywords: sampleMissingKeywords,
        matchPct: 56,
      });

      expect(mockCreate).toHaveBeenCalledOnce();
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe("gpt-4o");
      expect(callArgs.temperature).toBe(0.3);
      expect(callArgs.response_format).toEqual({ type: "json_object" });
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0].role).toBe("system");
      expect(callArgs.messages[0].content).toBe(
        ATS_SUPPLEMENTARY_SYSTEM_PROMPT
      );
      expect(callArgs.messages[1].role).toBe("user");
    });

    it("returns parsed supplementary analysis", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: { content: JSON.stringify(validMockResponse) },
          },
        ],
      } as never);

      const result = await runSupplementaryATSAnalysis({
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        matchedKeywords: sampleMatchedKeywords,
        missingKeywords: sampleMissingKeywords,
        matchPct: 56,
      });

      expect(result.aliasMatches).toHaveLength(2);
      expect(result.aliasMatches[0].original).toBe("express.js");
      expect(result.aliasMatches[0].aliasFoundInResume).toBe("Express");

      expect(result.keywordPriorities).toHaveLength(5);
      expect(result.keywordPriorities[0].priority).toBe("critical");
      expect(result.keywordPriorities[4].priority).toBe("nice_to_have");

      expect(result.weakUsages).toHaveLength(1);
      expect(result.weakUsages[0].keyword).toBe("docker");

      expect(result.additionalKeywords).toContain("unit testing");
    });

    it("throws error when OpenAI returns no content", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: { content: null },
          },
        ],
      } as never);

      await expect(
        runSupplementaryATSAnalysis({
          resumeText: sampleResumeText,
          jobDescription: sampleJobDescription,
          matchedKeywords: sampleMatchedKeywords,
          missingKeywords: sampleMissingKeywords,
          matchPct: 56,
        })
      ).rejects.toThrow("No response from GPT-4o");
    });

    it("throws error when OpenAI returns invalid JSON", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: { content: "this is not json" },
          },
        ],
      } as never);

      await expect(
        runSupplementaryATSAnalysis({
          resumeText: sampleResumeText,
          jobDescription: sampleJobDescription,
          matchedKeywords: sampleMatchedKeywords,
          missingKeywords: sampleMissingKeywords,
          matchPct: 56,
        })
      ).rejects.toThrow();
    });

    it("handles partial response with missing fields gracefully", async () => {
      const partialResponse = {
        aliasMatches: [
          {
            original: "k8s",
            aliasFoundInResume: "Kubernetes",
            reasoning: "K8s is the common abbreviation",
          },
        ],
        // Missing other fields
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: { content: JSON.stringify(partialResponse) },
          },
        ],
      } as never);

      const result = await runSupplementaryATSAnalysis({
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        matchedKeywords: sampleMatchedKeywords,
        missingKeywords: sampleMissingKeywords,
        matchPct: 56,
      });

      expect(result.aliasMatches).toHaveLength(1);
      expect(result.keywordPriorities).toEqual([]);
      expect(result.weakUsages).toEqual([]);
      expect(result.additionalKeywords).toEqual([]);
    });

    it("handles empty arrays in response", async () => {
      const emptyResponse: SupplementaryATSAnalysis = {
        aliasMatches: [],
        keywordPriorities: [],
        weakUsages: [],
        additionalKeywords: [],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: { content: JSON.stringify(emptyResponse) },
          },
        ],
      } as never);

      const result = await runSupplementaryATSAnalysis({
        resumeText: sampleResumeText,
        jobDescription: sampleJobDescription,
        matchedKeywords: sampleMatchedKeywords,
        missingKeywords: sampleMissingKeywords,
        matchPct: 56,
      });

      expect(result.aliasMatches).toEqual([]);
      expect(result.keywordPriorities).toEqual([]);
      expect(result.weakUsages).toEqual([]);
      expect(result.additionalKeywords).toEqual([]);
    });

    it("propagates OpenAI API errors", async () => {
      mockCreate.mockRejectedValueOnce(new Error("Rate limit exceeded"));

      await expect(
        runSupplementaryATSAnalysis({
          resumeText: sampleResumeText,
          jobDescription: sampleJobDescription,
          matchedKeywords: sampleMatchedKeywords,
          missingKeywords: sampleMissingKeywords,
          matchPct: 56,
        })
      ).rejects.toThrow("Rate limit exceeded");
    });
  });
});
