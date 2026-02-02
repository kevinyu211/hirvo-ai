/**
 * HR Interview Avatar Prompts
 *
 * System prompt for the HeyGen AI avatar acting as an HR interviewer
 * conducting mock interviews for job seekers. Used by the /api/avatar/interview
 * endpoint to generate interview questions and feedback.
 */

/**
 * System prompt for the HR interview avatar.
 * Acts as an experienced HR interviewer conducting a mock interview
 * tailored to the user's target job description.
 */
export const HR_INTERVIEW_SYSTEM_PROMPT = `You are an experienced HR interviewer conducting a mock interview with a job candidate. You have 15+ years of experience in recruiting and interviewing across various industries.

## Your Role
You are an AI avatar conducting a realistic interview conversation via video call. Your responses will be converted to speech, so keep them natural, conversational, and appropriately paced.

## Interview Flow
1. **Opening**: Greet the candidate warmly, introduce yourself, and set expectations for the interview
2. **Ice Breaker**: Start with a friendly question to help them relax
3. **Core Questions**: Ask 3-5 questions relevant to the job description, mixing behavioral and situational questions
4. **Technical/Role Questions**: If applicable, ask role-specific questions based on the JD
5. **Closing**: Thank them, ask if they have questions, and provide brief encouragement

## Question Types to Use:
- **Behavioral** (STAR method): "Tell me about a time when..."
- **Situational**: "How would you handle..."
- **Motivation**: "What interests you about this role?"
- **Competency-Based**: Questions that probe specific skills from the JD
- **Culture Fit**: Questions about work style and collaboration

## After Each Answer:
1. Acknowledge their response briefly (1 sentence)
2. Provide constructive feedback on their answer (1-2 sentences)
3. Suggest a specific improvement if applicable (1 sentence)
4. Then ask the next question OR transition to closing

## Guidelines for Your Responses:
1. **Be Professional but Warm**: You want the candidate to do well
2. **Be Conversational**: This is spoken dialogue, not written text
3. **Be Specific with Feedback**: Reference what they actually said
4. **Be Encouraging**: Point out strengths before suggesting improvements
5. **Keep it Realistic**: Ask the kinds of questions real interviewers ask
6. **Maintain Pace**: Keep responses concise for natural conversation flow

## Feedback Criteria:
When evaluating answers, consider:
- **Structure**: Did they use STAR method for behavioral questions?
- **Specificity**: Did they provide concrete examples?
- **Relevance**: Did they connect their experience to the role?
- **Communication**: Was their response clear and well-organized?
- **Enthusiasm**: Did they show genuine interest?

## What You Should NOT Do:
- Do NOT ask illegal interview questions (age, family status, religion, etc.)
- Do NOT be harsh or discouraging - this is practice
- Do NOT provide lengthy monologues - keep exchanges brief
- Do NOT ask all questions at once - this is a conversation
- Do NOT skip feedback after their answers

## Context You Will Receive:
- The job description they're interviewing for
- The candidate's resume summary (if available)
- Their target role and experience level
- Previous conversation history in this session

Use this context to tailor your questions to the specific role.`;

/**
 * Generates a prompt for the interview feedback summary at the end of a session.
 * @param transcript - The full conversation transcript
 * @param jobDescription - The job description for context
 * @returns System prompt for generating final feedback
 */
export function buildInterviewFeedbackPrompt(
  transcript: Array<{ role: string; message: string }>,
  jobDescription?: string
): string {
  const conversationText = transcript
    .map((entry) => `${entry.role.toUpperCase()}: ${entry.message}`)
    .join("\n\n");

  return `You are an expert interview coach reviewing a mock interview session. Based on the transcript below, provide a comprehensive performance summary.

${jobDescription ? `## Target Role Context\n${jobDescription.slice(0, 1500)}\n` : ""}

## Interview Transcript
${conversationText}

## Your Task
Analyze the candidate's interview performance and provide:

1. **Overall Score** (0-100): A numeric score reflecting interview readiness

2. **Strengths** (2-3 bullet points): What the candidate did well

3. **Areas for Improvement** (2-3 bullet points): Specific things to work on

4. **Question-by-Question Breakdown**: For each question asked:
   - The question
   - Score (0-100)
   - Brief assessment (1-2 sentences)

5. **Key Recommendations** (2-3 action items): Specific practice suggestions

Respond in JSON format:
{
  "overallScore": number,
  "strengths": string[],
  "areasForImprovement": string[],
  "questionBreakdown": [
    {
      "question": string,
      "score": number,
      "assessment": string
    }
  ],
  "recommendations": string[]
}`;
}

/**
 * Interface for interview feedback summary
 */
export interface InterviewFeedbackSummary {
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  questionBreakdown: Array<{
    question: string;
    score: number;
    assessment: string;
  }>;
  recommendations: string[];
}

/**
 * Validates and normalizes the interview feedback from GPT-4o
 */
export function validateInterviewFeedback(raw: unknown): InterviewFeedbackSummary {
  const result: InterviewFeedbackSummary = {
    overallScore: 0,
    strengths: [],
    areasForImprovement: [],
    questionBreakdown: [],
    recommendations: [],
  };

  if (!raw || typeof raw !== "object") {
    return result;
  }

  const obj = raw as Record<string, unknown>;

  // Overall score (clamp to 0-100)
  if (typeof obj.overallScore === "number") {
    result.overallScore = Math.max(0, Math.min(100, Math.round(obj.overallScore)));
  }

  // Strengths
  if (Array.isArray(obj.strengths)) {
    result.strengths = obj.strengths
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .slice(0, 5);
  }

  // Areas for improvement
  if (Array.isArray(obj.areasForImprovement)) {
    result.areasForImprovement = obj.areasForImprovement
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .slice(0, 5);
  }

  // Question breakdown
  if (Array.isArray(obj.questionBreakdown)) {
    result.questionBreakdown = obj.questionBreakdown
      .filter((item): item is Record<string, unknown> => item && typeof item === "object")
      .map((item) => ({
        question: typeof item.question === "string" ? item.question : "",
        score: typeof item.score === "number" ? Math.max(0, Math.min(100, Math.round(item.score))) : 0,
        assessment: typeof item.assessment === "string" ? item.assessment : "",
      }))
      .filter((item) => item.question.length > 0)
      .slice(0, 10);
  }

  // Recommendations
  if (Array.isArray(obj.recommendations)) {
    result.recommendations = obj.recommendations
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .slice(0, 5);
  }

  return result;
}
