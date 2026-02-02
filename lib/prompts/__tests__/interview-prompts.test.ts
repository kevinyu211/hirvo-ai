/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
  HR_INTERVIEW_SYSTEM_PROMPT,
  buildInterviewFeedbackPrompt,
  validateInterviewFeedback,
  InterviewFeedbackSummary,
} from "../interview-prompts";

// ============================================================================
// HR_INTERVIEW_SYSTEM_PROMPT Tests
// ============================================================================

describe("HR_INTERVIEW_SYSTEM_PROMPT", () => {
  it("should define the role as HR interviewer", () => {
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("HR interviewer");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("mock interview");
  });

  it("should include interview flow steps", () => {
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Opening");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Ice Breaker");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Core Questions");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Closing");
  });

  it("should describe question types to use", () => {
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Behavioral");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Situational");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("STAR method");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Culture Fit");
  });

  it("should instruct to provide feedback after each answer", () => {
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("After Each Answer");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("constructive feedback");
  });

  it("should include feedback criteria", () => {
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Feedback Criteria");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Structure");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Specificity");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Relevance");
  });

  it("should specify what NOT to do", () => {
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Should NOT Do");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("illegal interview questions");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("harsh or discouraging");
  });

  it("should mention context that will be received", () => {
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("Context You Will Receive");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("job description");
    expect(HR_INTERVIEW_SYSTEM_PROMPT).toContain("resume");
  });
});

// ============================================================================
// buildInterviewFeedbackPrompt Tests
// ============================================================================

describe("buildInterviewFeedbackPrompt", () => {
  const sampleTranscript = [
    { role: "assistant", message: "Tell me about yourself." },
    { role: "user", message: "I'm a software engineer with 5 years of experience." },
    { role: "assistant", message: "Great! Why are you interested in this role?" },
    { role: "user", message: "I want to grow my career at a company with great culture." },
  ];

  it("should include the transcript in the prompt", () => {
    const prompt = buildInterviewFeedbackPrompt(sampleTranscript);

    expect(prompt).toContain("ASSISTANT: Tell me about yourself.");
    expect(prompt).toContain("USER: I'm a software engineer");
    expect(prompt).toContain("ASSISTANT: Great! Why are you interested");
  });

  it("should include job description when provided", () => {
    const jd = "We are looking for a Senior Software Engineer...";
    const prompt = buildInterviewFeedbackPrompt(sampleTranscript, jd);

    expect(prompt).toContain("Target Role Context");
    expect(prompt).toContain("Senior Software Engineer");
  });

  it("should NOT include job description section when not provided", () => {
    const prompt = buildInterviewFeedbackPrompt(sampleTranscript);

    expect(prompt).not.toContain("Target Role Context");
  });

  it("should truncate long job descriptions", () => {
    const longJD = "A".repeat(2000);
    const prompt = buildInterviewFeedbackPrompt(sampleTranscript, longJD);

    // Should be truncated to 1500 chars
    expect(prompt.indexOf("A".repeat(1500))).toBeGreaterThan(-1);
    expect(prompt.indexOf("A".repeat(2000))).toBe(-1);
  });

  it("should request JSON output format", () => {
    const prompt = buildInterviewFeedbackPrompt(sampleTranscript);

    expect(prompt).toContain("JSON format");
    expect(prompt).toContain("overallScore");
    expect(prompt).toContain("strengths");
    expect(prompt).toContain("areasForImprovement");
    expect(prompt).toContain("questionBreakdown");
    expect(prompt).toContain("recommendations");
  });

  it("should include scoring instructions", () => {
    const prompt = buildInterviewFeedbackPrompt(sampleTranscript);

    expect(prompt).toContain("Overall Score");
    expect(prompt).toContain("0-100");
    expect(prompt).toContain("Strengths");
    expect(prompt).toContain("Areas for Improvement");
  });
});

// ============================================================================
// validateInterviewFeedback Tests
// ============================================================================

describe("validateInterviewFeedback", () => {
  it("should return default values for null input", () => {
    const result = validateInterviewFeedback(null);

    expect(result).toEqual({
      overallScore: 0,
      strengths: [],
      areasForImprovement: [],
      questionBreakdown: [],
      recommendations: [],
    });
  });

  it("should return default values for non-object input", () => {
    const result = validateInterviewFeedback("not an object");

    expect(result).toEqual({
      overallScore: 0,
      strengths: [],
      areasForImprovement: [],
      questionBreakdown: [],
      recommendations: [],
    });
  });

  it("should validate and return well-formed feedback", () => {
    const validFeedback = {
      overallScore: 75,
      strengths: ["Good communication", "Clear examples"],
      areasForImprovement: ["More STAR format", "Be more concise"],
      questionBreakdown: [
        { question: "Tell me about yourself", score: 80, assessment: "Good intro" },
      ],
      recommendations: ["Practice behavioral questions", "Prepare more examples"],
    };

    const result = validateInterviewFeedback(validFeedback);

    expect(result.overallScore).toBe(75);
    expect(result.strengths).toEqual(["Good communication", "Clear examples"]);
    expect(result.areasForImprovement).toEqual(["More STAR format", "Be more concise"]);
    expect(result.questionBreakdown).toHaveLength(1);
    expect(result.questionBreakdown[0].question).toBe("Tell me about yourself");
    expect(result.recommendations).toHaveLength(2);
  });

  it("should clamp overallScore to 0-100 range", () => {
    expect(validateInterviewFeedback({ overallScore: -10 }).overallScore).toBe(0);
    expect(validateInterviewFeedback({ overallScore: 150 }).overallScore).toBe(100);
    expect(validateInterviewFeedback({ overallScore: 85.7 }).overallScore).toBe(86); // Rounded
  });

  it("should filter non-string items from strengths array", () => {
    const feedback = {
      strengths: ["Valid", 123, null, "Also valid", "", "  "],
    };

    const result = validateInterviewFeedback(feedback);

    expect(result.strengths).toEqual(["Valid", "Also valid"]);
  });

  it("should filter non-string items from areasForImprovement array", () => {
    const feedback = {
      areasForImprovement: ["Work on X", undefined, { not: "string" }, "Improve Y"],
    };

    const result = validateInterviewFeedback(feedback);

    expect(result.areasForImprovement).toEqual(["Work on X", "Improve Y"]);
  });

  it("should limit arrays to 5 items", () => {
    const feedback = {
      strengths: ["A", "B", "C", "D", "E", "F", "G"],
      areasForImprovement: ["1", "2", "3", "4", "5", "6"],
      recommendations: ["R1", "R2", "R3", "R4", "R5", "R6", "R7"],
    };

    const result = validateInterviewFeedback(feedback);

    expect(result.strengths).toHaveLength(5);
    expect(result.areasForImprovement).toHaveLength(5);
    expect(result.recommendations).toHaveLength(5);
  });

  it("should validate questionBreakdown items", () => {
    const feedback = {
      questionBreakdown: [
        { question: "Valid question", score: 80, assessment: "Good" },
        { question: "", score: 90, assessment: "Empty question - should be filtered" },
        { question: "Another valid", score: -10, assessment: "Low score - should clamp" },
        { score: 70, assessment: "Missing question - should be filtered" },
        { question: "High score", score: 200, assessment: "Should clamp to 100" },
        "not an object",
        null,
      ],
    };

    const result = validateInterviewFeedback(feedback);

    expect(result.questionBreakdown).toHaveLength(3);
    expect(result.questionBreakdown[0].question).toBe("Valid question");
    expect(result.questionBreakdown[0].score).toBe(80);
    expect(result.questionBreakdown[1].score).toBe(0); // Clamped from -10
    expect(result.questionBreakdown[2].score).toBe(100); // Clamped from 200
  });

  it("should limit questionBreakdown to 10 items", () => {
    const feedback = {
      questionBreakdown: Array.from({ length: 15 }, (_, i) => ({
        question: `Question ${i}`,
        score: 50,
        assessment: `Assessment ${i}`,
      })),
    };

    const result = validateInterviewFeedback(feedback);

    expect(result.questionBreakdown).toHaveLength(10);
  });

  it("should handle missing nested fields gracefully", () => {
    const feedback = {
      overallScore: 60,
      // Missing all arrays
    };

    const result = validateInterviewFeedback(feedback);

    expect(result.overallScore).toBe(60);
    expect(result.strengths).toEqual([]);
    expect(result.areasForImprovement).toEqual([]);
    expect(result.questionBreakdown).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it("should handle questionBreakdown with missing fields", () => {
    const feedback = {
      questionBreakdown: [
        { question: "Test question" }, // Missing score and assessment
      ],
    };

    const result = validateInterviewFeedback(feedback);

    expect(result.questionBreakdown[0]).toEqual({
      question: "Test question",
      score: 0,
      assessment: "",
    });
  });
});

// ============================================================================
// InterviewFeedbackSummary Type Tests (compile-time)
// ============================================================================

describe("InterviewFeedbackSummary type", () => {
  it("should conform to expected shape", () => {
    const feedback: InterviewFeedbackSummary = {
      overallScore: 75,
      strengths: ["strength1"],
      areasForImprovement: ["improvement1"],
      questionBreakdown: [
        { question: "Q1", score: 80, assessment: "Good" },
      ],
      recommendations: ["recommendation1"],
    };

    // Type assertion that this compiles
    expect(feedback.overallScore).toBe(75);
    expect(feedback.strengths[0]).toBe("strength1");
    expect(feedback.questionBreakdown[0].question).toBe("Q1");
  });
});
