import { describe, it, expect, vi, beforeEach } from "vitest";
import { openai } from "@/lib/openai";
import {
  HR_REVIEWER_SYSTEM_PROMPT,
  buildHRUserPrompt,
  runHRReview,
} from "@/lib/prompts/hr-prompts";
import type { HRReviewResult } from "@/lib/prompts/hr-prompts";

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

function makeValidHRResponse(): HRReviewResult {
  return {
    overallScore: 72,
    firstImpression:
      "Clean layout with relevant experience prominently displayed. Summary is strong.",
    careerNarrative: {
      score: 75,
      assessment:
        "Clear progression from junior to senior roles in software engineering.",
      suggestion:
        "Highlight leadership transition more explicitly in the summary.",
    },
    achievementStrength: {
      score: 65,
      assessment:
        "Some quantified achievements but several bullet points are duty-focused.",
      suggestion:
        "Convert 'responsible for' statements to impact-driven achievements with metrics.",
    },
    roleRelevance: {
      score: 80,
      assessment:
        "Strong match for backend engineering requirements. Frontend experience is a bonus.",
      suggestion: "Emphasize system design experience to match the senior requirements.",
    },
    redFlags: [
      {
        type: "employment_gap" as const,
        description: "6-month gap between Company A and Company B in 2022.",
        severity: "warning" as const,
        mitigation:
          "Add a brief note about professional development or personal project during the gap.",
      },
    ],
    sectionComments: [
      {
        section: "Summary",
        comment: "Strong opening that positions the candidate well.",
        suggestion: "Add the target company's industry keywords.",
        score: 82,
      },
      {
        section: "Experience",
        comment: "Good chronological progression but some roles lack metrics.",
        suggestion: "Add at least one quantified result per role.",
        score: 68,
      },
    ],
    callbackDecision: {
      decision: "maybe" as const,
      reasoning:
        "Candidate has relevant experience but needs to address the employment gap and strengthen achievements.",
    },
  };
}

function mockOpenAIResponse(result: HRReviewResult) {
  mockCreate.mockResolvedValueOnce({
    choices: [
      {
        message: {
          content: JSON.stringify(result),
        },
      },
    ],
  } as never);
}

describe("HR_REVIEWER_SYSTEM_PROMPT", () => {
  it("contains instructions for all six evaluation dimensions", () => {
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("First Impression");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Career Narrative");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Achievement Strength");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Relevance to the Role");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Red Flags");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Callback Decision");
  });

  it("instructs the model to respond in JSON format", () => {
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("valid JSON");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("overallScore");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("callbackDecision");
  });

  it("defines recruiter persona with years of experience", () => {
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("experienced HR recruiter");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("15+ years");
  });

  it("covers red flag types", () => {
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Employment gaps");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Job hopping");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Vague descriptions");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Overqualification");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Underqualification");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("Inconsistencies");
  });

  it("includes callback decision options", () => {
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain('"yes"');
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain('"no"');
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain('"maybe"');
  });

  it("requests per-section comments with scores", () => {
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("sectionComments");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("score");
    expect(HR_REVIEWER_SYSTEM_PROMPT).toContain("suggestion");
  });
});

describe("buildHRUserPrompt", () => {
  it("includes job description and resume text", () => {
    const result = buildHRUserPrompt({
      resumeText: "My resume content",
      jobDescription: "Senior Engineer at ACME Corp",
    });

    expect(result).toContain("## Job Description");
    expect(result).toContain("Senior Engineer at ACME Corp");
    expect(result).toContain("## Candidate's Resume");
    expect(result).toContain("My resume content");
  });

  it("includes candidate context when provided", () => {
    const result = buildHRUserPrompt({
      resumeText: "Resume text",
      jobDescription: "JD text",
      targetRole: "Senior Software Engineer",
      yearsExperience: "6-10",
      visaStatus: "h1b",
    });

    expect(result).toContain("## Candidate Context");
    expect(result).toContain("Target role: Senior Software Engineer");
    expect(result).toContain("Years of experience: 6-10");
    expect(result).toContain("Work authorization: h1b");
  });

  it("omits candidate context section when no context provided", () => {
    const result = buildHRUserPrompt({
      resumeText: "Resume text",
      jobDescription: "JD text",
    });

    expect(result).not.toContain("## Candidate Context");
  });

  it("omits visa status when set to prefer_not_to_say", () => {
    const result = buildHRUserPrompt({
      resumeText: "Resume text",
      jobDescription: "JD text",
      visaStatus: "prefer_not_to_say",
    });

    expect(result).not.toContain("Work authorization");
  });

  it("includes partial context when only some fields provided", () => {
    const result = buildHRUserPrompt({
      resumeText: "Resume text",
      jobDescription: "JD text",
      targetRole: "Product Manager",
    });

    expect(result).toContain("## Candidate Context");
    expect(result).toContain("Target role: Product Manager");
    expect(result).not.toContain("Years of experience");
    expect(result).not.toContain("Work authorization");
  });
});

describe("runHRReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls GPT-4o with correct parameters", async () => {
    const validResponse = makeValidHRResponse();
    mockOpenAIResponse(validResponse);

    await runHRReview({
      resumeText: "Resume content here",
      jobDescription: "Job description here",
      targetRole: "Engineer",
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs).toMatchObject({
      model: "gpt-4o",
      temperature: 0.4,
      response_format: { type: "json_object" },
    });
    // Verify messages
    const messages = callArgs.messages as Array<{ role: string; content: string }>;
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toBe(HR_REVIEWER_SYSTEM_PROMPT);
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("Resume content here");
    expect(messages[1].content).toContain("Job description here");
  });

  it("returns properly structured HR review result", async () => {
    const validResponse = makeValidHRResponse();
    mockOpenAIResponse(validResponse);

    const result = await runHRReview({
      resumeText: "Resume text",
      jobDescription: "JD text",
    });

    expect(result.overallScore).toBe(72);
    expect(result.firstImpression).toContain("Clean layout");
    expect(result.careerNarrative.score).toBe(75);
    expect(result.achievementStrength.score).toBe(65);
    expect(result.roleRelevance.score).toBe(80);
    expect(result.redFlags).toHaveLength(1);
    expect(result.redFlags[0].type).toBe("employment_gap");
    expect(result.sectionComments).toHaveLength(2);
    expect(result.callbackDecision.decision).toBe("maybe");
  });

  it("clamps scores to 0-100 range", async () => {
    const response = makeValidHRResponse();
    response.overallScore = 150;
    response.careerNarrative.score = -10;
    response.achievementStrength.score = 200;
    mockOpenAIResponse(response);

    const result = await runHRReview({
      resumeText: "Resume text",
      jobDescription: "JD text",
    });

    expect(result.overallScore).toBe(100);
    expect(result.careerNarrative.score).toBe(0);
    expect(result.achievementStrength.score).toBe(100);
  });

  it("handles missing response content", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    } as never);

    await expect(
      runHRReview({ resumeText: "Resume", jobDescription: "JD" })
    ).rejects.toThrow("No response from GPT-4o for HR review");
  });

  it("handles empty choices array", async () => {
    mockCreate.mockResolvedValueOnce({ choices: [] } as never);

    await expect(
      runHRReview({ resumeText: "Resume", jobDescription: "JD" })
    ).rejects.toThrow("No response from GPT-4o for HR review");
  });

  it("handles invalid JSON response", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not valid json" } }],
    } as never);

    await expect(
      runHRReview({ resumeText: "Resume", jobDescription: "JD" })
    ).rejects.toThrow();
  });

  it("provides defaults for missing fields in response", async () => {
    // Minimal valid JSON with missing nested fields
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              overallScore: 60,
            }),
          },
        },
      ],
    } as never);

    const result = await runHRReview({
      resumeText: "Resume text",
      jobDescription: "JD text",
    });

    expect(result.overallScore).toBe(60);
    expect(result.firstImpression).toBe("No first impression provided.");
    expect(result.careerNarrative.score).toBe(0);
    expect(result.careerNarrative.assessment).toBe("No assessment provided.");
    expect(result.achievementStrength.suggestion).toBe("No suggestion provided.");
    expect(result.redFlags).toEqual([]);
    expect(result.sectionComments).toEqual([]);
    expect(result.callbackDecision.decision).toBe("maybe");
    expect(result.callbackDecision.reasoning).toBe("No reasoning provided.");
  });

  it("normalizes invalid red flag types to 'other'", async () => {
    const response = makeValidHRResponse();
    response.redFlags = [
      {
        type: "invalid_type" as never,
        description: "Some issue",
        severity: "warning",
        mitigation: "Fix it",
      },
    ];
    mockOpenAIResponse(response);

    const result = await runHRReview({
      resumeText: "Resume",
      jobDescription: "JD",
    });

    expect(result.redFlags[0].type).toBe("other");
  });

  it("normalizes invalid severity to 'warning'", async () => {
    const response = makeValidHRResponse();
    response.redFlags = [
      {
        type: "employment_gap",
        description: "Gap found",
        severity: "extreme" as never,
        mitigation: "Address it",
      },
    ];
    mockOpenAIResponse(response);

    const result = await runHRReview({
      resumeText: "Resume",
      jobDescription: "JD",
    });

    expect(result.redFlags[0].severity).toBe("warning");
  });

  it("normalizes invalid callback decision to 'maybe'", async () => {
    const response = makeValidHRResponse();
    response.callbackDecision = {
      decision: "absolutely" as never,
      reasoning: "Great candidate",
    };
    mockOpenAIResponse(response);

    const result = await runHRReview({
      resumeText: "Resume",
      jobDescription: "JD",
    });

    expect(result.callbackDecision.decision).toBe("maybe");
  });

  it("rounds fractional scores to integers", async () => {
    const response = makeValidHRResponse();
    response.overallScore = 72.7;
    response.careerNarrative.score = 68.3;
    mockOpenAIResponse(response);

    const result = await runHRReview({
      resumeText: "Resume",
      jobDescription: "JD",
    });

    expect(result.overallScore).toBe(73);
    expect(result.careerNarrative.score).toBe(68);
  });

  it("handles non-numeric scores gracefully", async () => {
    const response = makeValidHRResponse();
    (response as unknown as Record<string, unknown>).overallScore = "high";
    mockOpenAIResponse(response);

    const result = await runHRReview({
      resumeText: "Resume",
      jobDescription: "JD",
    });

    expect(result.overallScore).toBe(0);
  });

  it("propagates OpenAI API errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Rate limit exceeded"));

    await expect(
      runHRReview({ resumeText: "Resume", jobDescription: "JD" })
    ).rejects.toThrow("Rate limit exceeded");
  });
});
