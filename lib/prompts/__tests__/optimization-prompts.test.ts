import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OPTIMIZATION_SYSTEM_PROMPT,
  buildOptimizationUserPrompt,
  runOptimizationAnalysis,
  validateOptimizationResult,
} from "@/lib/prompts/optimization-prompts";
import { openai } from "@/lib/openai";
import type { ATSIssue, HRFeedback } from "@/lib/types";

// Mock OpenAI
vi.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

const mockCreate = vi.mocked(openai.chat.completions.create);

const SAMPLE_RESUME = `John Doe
john@example.com | (555) 123-4567

Summary
Experienced software engineer with 5 years of experience building web applications.

Experience
Software Engineer at TechCorp (2020-2024)
- Built React applications for enterprise clients
- Managed CI/CD pipelines using Jenkins
- Led code reviews and mentored junior developers

Education
BS Computer Science, MIT, 2020

Skills
JavaScript, React, Node.js, Python, SQL`;

const SAMPLE_JD = `Senior Frontend Engineer
Requirements:
- 5+ years experience with React and TypeScript
- Experience with Next.js and server-side rendering
- Strong understanding of web performance optimization
- Experience with testing frameworks (Jest, Playwright)`;

const SAMPLE_ATS_ISSUES: ATSIssue[] = [
  {
    type: "missing_keyword",
    severity: "critical",
    message: 'Missing keyword: "TypeScript"',
    suggestion: 'Add "TypeScript" to your skills or experience section.',
  },
  {
    type: "missing_keyword",
    severity: "critical",
    message: 'Missing keyword: "Next.js"',
    suggestion: 'Add "Next.js" to a relevant section.',
  },
  {
    type: "weak_keyword",
    severity: "warning",
    message: 'Weak usage of "React": mentioned but not demonstrated with impact.',
    suggestion: "Quantify your React experience with specific achievements.",
  },
];

const SAMPLE_HR_FEEDBACK: HRFeedback[] = [
  {
    type: "semantic",
    layer: 2,
    severity: "warning",
    message:
      'Your "experience" section has moderate semantic match (55%) with the job description.',
    suggestion:
      "Strengthen the alignment of your experience section with the job requirements.",
  },
  {
    type: "llm_review",
    layer: 3,
    severity: "warning",
    message: "Achievement strength: Bullet points lack quantified impact metrics.",
    suggestion: "Add specific numbers, percentages, and outcomes to your achievements.",
  },
];

describe("OPTIMIZATION_SYSTEM_PROMPT", () => {
  it("instructs the model to generate text-level suggestions", () => {
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain("text-level suggestions");
  });

  it("defines valid ATS categories", () => {
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain("missing_keyword");
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain("weak_keyword");
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain("formatting");
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain("section");
  });

  it("defines valid HR categories", () => {
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain("semantic");
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain("llm_review");
  });

  it("specifies JSON output format", () => {
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain("Return a JSON object");
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain('"suggestions"');
  });

  it("limits suggestion count to 25", () => {
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain("Do not exceed 25");
  });

  it("requires originalText to be an exact substring", () => {
    expect(OPTIMIZATION_SYSTEM_PROMPT).toContain(
      "MUST be an exact substring"
    );
  });
});

describe("buildOptimizationUserPrompt", () => {
  it("includes resume text and job description", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
    });

    expect(prompt).toContain("## Resume Text");
    expect(prompt).toContain(SAMPLE_RESUME);
    expect(prompt).toContain("## Job Description");
    expect(prompt).toContain(SAMPLE_JD);
  });

  it("includes ATS issues when provided", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: SAMPLE_ATS_ISSUES,
      hrFeedback: [],
    });

    expect(prompt).toContain("## ATS Issues Found");
    expect(prompt).toContain("[CRITICAL] missing_keyword");
    expect(prompt).toContain('Missing keyword: "TypeScript"');
    expect(prompt).toContain("[WARNING] weak_keyword");
  });

  it("includes HR feedback when provided", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: SAMPLE_HR_FEEDBACK,
    });

    expect(prompt).toContain("## HR Feedback");
    expect(prompt).toContain("Layer 2 (semantic)");
    expect(prompt).toContain("Layer 3 (llm_review)");
  });

  it("omits ATS section when no issues", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: SAMPLE_HR_FEEDBACK,
    });

    expect(prompt).not.toContain("## ATS Issues Found");
  });

  it("omits HR section when no feedback", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: SAMPLE_ATS_ISSUES,
      hrFeedback: [],
    });

    expect(prompt).not.toContain("## HR Feedback");
  });

  it("includes suggestion text from issues", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: SAMPLE_ATS_ISSUES,
      hrFeedback: [],
    });

    expect(prompt).toContain("Suggestion:");
    expect(prompt).toContain(
      'Add "TypeScript" to your skills or experience section.'
    );
  });
});

describe("runOptimizationAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GPT-4o with correct parameters", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ suggestions: [] }),
          },
        },
      ],
    } as never);

    await runOptimizationAnalysis({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: SAMPLE_ATS_ISSUES,
      hrFeedback: SAMPLE_HR_FEEDBACK,
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
    });
    expect(callArgs.messages).toHaveLength(2);
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[1].role).toBe("user");
  });

  it("returns parsed suggestions on success", async () => {
    const mockSuggestions = [
      {
        originalText: "JavaScript, React, Node.js, Python, SQL",
        suggestedText:
          "JavaScript, TypeScript, React, Next.js, Node.js, Python, SQL",
        category: "missing_keyword",
        reasoning: "Adding TypeScript and Next.js keywords from the JD",
        severity: "critical",
        type: "ats",
      },
    ];

    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ suggestions: mockSuggestions }),
          },
        },
      ],
    } as never);

    const result = await runOptimizationAnalysis({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: SAMPLE_ATS_ISSUES,
      hrFeedback: [],
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].originalText).toBe(
      "JavaScript, React, Node.js, Python, SQL"
    );
    expect(result.suggestions[0].category).toBe("missing_keyword");
    expect(result.suggestions[0].type).toBe("ats");
  });

  it("returns empty suggestions when GPT-4o returns no content", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    } as never);

    const result = await runOptimizationAnalysis({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
    });

    expect(result.suggestions).toEqual([]);
  });

  it("returns empty suggestions when GPT-4o returns invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not json" } }],
    } as never);

    const result = await runOptimizationAnalysis({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
    });

    expect(result.suggestions).toEqual([]);
  });

  it("returns empty suggestions when GPT-4o throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("API rate limited"));

    await expect(
      runOptimizationAnalysis({
        resumeText: SAMPLE_RESUME,
        jobDescription: SAMPLE_JD,
        atsIssues: [],
        hrFeedback: [],
      })
    ).rejects.toThrow("API rate limited");
  });
});

describe("validateOptimizationResult", () => {
  const resumeText = SAMPLE_RESUME;

  it("validates correct suggestions", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "Built React applications",
            suggestedText:
              "Built React and TypeScript applications with Next.js",
            category: "missing_keyword",
            reasoning: "Adding TypeScript and Next.js",
            severity: "critical",
            type: "ats",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(1);
    expect(result[0].originalText).toBe("Built React applications");
    expect(result[0].category).toBe("missing_keyword");
    expect(result[0].type).toBe("ats");
    expect(result[0].severity).toBe("critical");
  });

  it("filters out suggestions with originalText not in resume", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "This text does not exist in the resume at all xyz",
            suggestedText: "Some fix",
            category: "formatting",
            reasoning: "Some reason",
            severity: "warning",
            type: "hr",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(0);
  });

  it("allows case-insensitive matching of originalText", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "john doe",
            suggestedText: "John Doe, Senior Software Engineer",
            category: "formatting",
            reasoning: "Add title to name",
            severity: "info",
            type: "hr",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(1);
    expect(result[0].originalText).toBe("john doe");
  });

  it("normalizes invalid categories to 'formatting'", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "John Doe",
            suggestedText: "John Doe, PE",
            category: "invalid_category",
            reasoning: "Testing normalization",
            severity: "info",
            type: "hr",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("formatting");
  });

  it("normalizes invalid types to 'ats'", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "John Doe",
            suggestedText: "John Doe, PE",
            category: "formatting",
            reasoning: "Testing type normalization",
            severity: "info",
            type: "unknown_type",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("ats");
  });

  it("normalizes invalid severities to 'info'", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "John Doe",
            suggestedText: "John Doe, PE",
            category: "formatting",
            reasoning: "Testing severity normalization",
            severity: "extreme",
            type: "hr",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("info");
  });

  it("filters out suggestions with empty originalText", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "",
            suggestedText: "Some fix",
            category: "formatting",
            reasoning: "Reason",
            severity: "warning",
            type: "ats",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(0);
  });

  it("filters out suggestions with no suggestedText and no reasoning", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "John Doe",
            suggestedText: "",
            category: "formatting",
            reasoning: "",
            severity: "warning",
            type: "ats",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(0);
  });

  it("keeps suggestions with suggestedText but no reasoning", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "John Doe",
            suggestedText: "John Doe, Senior Engineer",
            category: "formatting",
            reasoning: "",
            severity: "info",
            type: "hr",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(1);
  });

  it("keeps suggestions with reasoning but no suggestedText", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "John Doe",
            suggestedText: "",
            category: "formatting",
            reasoning: "Consider adding a title after your name",
            severity: "info",
            type: "hr",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(1);
  });

  it("caps suggestions at 25", () => {
    const suggestions = Array.from({ length: 30 }, (_, i) => ({
      originalText: "John Doe",
      suggestedText: `Suggestion ${i}`,
      category: "formatting",
      reasoning: `Reason ${i}`,
      severity: "info",
      type: "hr",
    }));

    const result = validateOptimizationResult(
      { suggestions },
      resumeText
    );

    expect(result).toHaveLength(25);
  });

  it("returns empty array for null input", () => {
    expect(validateOptimizationResult(null, resumeText)).toEqual([]);
  });

  it("returns empty array when suggestions is not an array", () => {
    expect(
      validateOptimizationResult({ suggestions: "not array" }, resumeText)
    ).toEqual([]);
  });

  it("skips non-object items in suggestions array", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          null,
          "string item",
          42,
          {
            originalText: "John Doe",
            suggestedText: "John Doe, PE",
            category: "formatting",
            reasoning: "Valid item",
            severity: "info",
            type: "hr",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(1);
  });

  it("handles multiple valid suggestions", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "Built React applications",
            suggestedText: "Built React and TypeScript applications",
            category: "missing_keyword",
            reasoning: "Add TypeScript keyword",
            severity: "critical",
            type: "ats",
          },
          {
            originalText: "Managed CI/CD pipelines",
            suggestedText:
              "Managed CI/CD pipelines, reducing deployment time by 40%",
            category: "llm_review",
            reasoning: "Add quantified impact",
            severity: "warning",
            type: "hr",
          },
        ],
      },
      resumeText
    );

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("ats");
    expect(result[1].type).toBe("hr");
  });

  it("normalizes visa_optimization to formatting when NOT visa-flagged", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "John Doe",
            suggestedText: "John Doe — Authorized to work in the US",
            category: "visa_optimization",
            reasoning: "Add work authorization info",
            severity: "warning",
            type: "hr",
          },
        ],
      },
      resumeText,
      false
    );

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("formatting");
  });

  it("accepts visa_optimization category when visa-flagged", () => {
    const result = validateOptimizationResult(
      {
        suggestions: [
          {
            originalText: "John Doe",
            suggestedText: "John Doe — Authorized to work in the US",
            category: "visa_optimization",
            reasoning: "Add work authorization info",
            severity: "warning",
            type: "hr",
          },
        ],
      },
      resumeText,
      true
    );

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("visa_optimization");
  });
});

describe("buildOptimizationUserPrompt — visa integration", () => {
  it("does not include visa context when visaFlagged is false", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
      visaFlagged: false,
    });

    expect(prompt).not.toContain("Visa / Work Authorization Context");
  });

  it("does not include visa context when visaFlagged is undefined", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
    });

    expect(prompt).not.toContain("Visa / Work Authorization Context");
  });

  it("includes visa context section when visaFlagged is true", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
      visaFlagged: true,
      visaSignals: ["H-1B visa mention", "Work authorization mention"],
    });

    expect(prompt).toContain("## Visa / Work Authorization Context");
    expect(prompt).toContain("H-1B visa mention");
    expect(prompt).toContain("Work authorization mention");
  });

  it("includes visa context with fallback when no signals provided", () => {
    const prompt = buildOptimizationUserPrompt({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
      visaFlagged: true,
    });

    expect(prompt).toContain("## Visa / Work Authorization Context");
    expect(prompt).toContain("Visa-related content detected");
  });
});

describe("runOptimizationAnalysis — visa integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appends visa rules to system prompt when visa-flagged", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ suggestions: [] }),
          },
        },
      ],
    } as never);

    await runOptimizationAnalysis({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
      visaFlagged: true,
      visaSignals: ["H-1B visa mention"],
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const systemPrompt = callArgs.messages[0].content as string;
    expect(systemPrompt).toContain("Visa-Aware Optimization Rules");
    expect(systemPrompt).toContain("Never Remove Work Authorization");
    expect(systemPrompt).toContain("Frame Authorization Positively");
  });

  it("does not append visa rules when not visa-flagged", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ suggestions: [] }),
          },
        },
      ],
    } as never);

    await runOptimizationAnalysis({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
      visaFlagged: false,
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const systemPrompt = callArgs.messages[0].content as string;
    expect(systemPrompt).not.toContain("Visa-Aware Optimization Rules");
  });

  it("includes visa context in user prompt when visa-flagged", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ suggestions: [] }),
          },
        },
      ],
    } as never);

    await runOptimizationAnalysis({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
      visaFlagged: true,
      visaSignals: ["OPT mention"],
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const userPrompt = callArgs.messages[1].content as string;
    expect(userPrompt).toContain("Visa / Work Authorization Context");
    expect(userPrompt).toContain("OPT mention");
  });

  it("accepts visa_optimization category from GPT-4o when visa-flagged", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  originalText: "John Doe",
                  suggestedText:
                    "John Doe | Authorized to work in the United States",
                  category: "visa_optimization",
                  reasoning:
                    "Add clear work authorization statement to header",
                  severity: "warning",
                  type: "hr",
                },
              ],
            }),
          },
        },
      ],
    } as never);

    const result = await runOptimizationAnalysis({
      resumeText: SAMPLE_RESUME,
      jobDescription: SAMPLE_JD,
      atsIssues: [],
      hrFeedback: [],
      visaFlagged: true,
    });

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].category).toBe("visa_optimization");
  });
});
