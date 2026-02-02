import { describe, it, expect, vi } from "vitest";
import { analyzeFormatting, fetchReferenceResumes } from "@/lib/hr-engine";
import type { FormattingPatterns } from "@/lib/formatting-patterns";

// ── Helpers ──────────────────────────────────────────────────────────

function makeReferenceResume(
  overrides: Partial<FormattingPatterns> = {},
  meta: { id?: string; title?: string; industry?: string; role_level?: string } = {}
) {
  const patterns: FormattingPatterns = {
    pageCount: 1,
    sectionOrder: ["Contact", "Summary", "Experience", "Education", "Skills"],
    bulletStyle: { types: ["dot"], avgBulletsPerEntry: 4, totalBullets: 16 },
    hasSummary: true,
    quantifiedMetrics: { count: 6, examples: ["25%", "$1.2M", "10,000 users"] },
    headingStyle: { consistent: true, styles: ["ALL_CAPS"] },
    whiteSpaceRatio: 0.15,
    dateFormat: { formats: ["Month YYYY"], consistent: true },
    wordCount: 450,
    avgWordsPerLine: 8,
    ...overrides,
  };

  return {
    id: meta.id ?? "ref-1",
    title: meta.title ?? "Test Resume",
    industry: meta.industry ?? "tech",
    role_level: meta.role_level ?? "mid",
    formatting_patterns: patterns,
  };
}

function makeGoodResumeText(): string {
  return `John Doe
john.doe@email.com | (555) 123-4567

SUMMARY
Experienced software engineer with 5+ years building scalable web applications.

EXPERIENCE
Senior Software Engineer | Acme Corp | January 2020 - Present
- Led migration of monolithic app to microservices, reducing deploy time by 60%
- Built real-time analytics dashboard serving 10,000+ daily users
- Mentored team of 4 junior developers, improving code review turnaround by 40%
- Implemented CI/CD pipeline reducing release cycle from 2 weeks to 2 days

Software Engineer | TechStart Inc | June 2017 - December 2019
- Developed REST API handling $2.5M in daily transactions
- Reduced page load time by 45% through code splitting and lazy loading
- Wrote comprehensive test suite achieving 90% code coverage

EDUCATION
B.S. Computer Science | State University | 2017

SKILLS
JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, AWS, Docker`;
}

function makeWeakResumeText(): string {
  return `Jane Smith
jane@email.com

Work History
Did various tasks at Company A from 2020 to 2023
Worked on projects
Helped the team

Education
Some University 2019`;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("analyzeFormatting", () => {
  describe("standalone analysis (no reference resumes)", () => {
    it("returns a score, suggestions, and feedback", () => {
      const result = analyzeFormatting(makeGoodResumeText());

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.feedback).toBeInstanceOf(Array);
      expect(result.userPatterns).toBeDefined();
      expect(result.referenceCount).toBe(0);
    });

    it("gives a good resume a high standalone score", () => {
      const result = analyzeFormatting(makeGoodResumeText());
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it("gives a weak resume a lower standalone score", () => {
      const result = analyzeFormatting(makeWeakResumeText());
      // Weak resume: no summary, no bullets, no quantified metrics, missing Skills section
      expect(result.score).toBeLessThan(80);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("flags missing summary section", () => {
      const text = `John Doe
john@test.com

EXPERIENCE
Software Engineer at Company

EDUCATION
BS Computer Science`;
      const result = analyzeFormatting(text);
      const summarySuggestion = result.suggestions.find(
        (s) => s.aspect === "summary_section"
      );
      expect(summarySuggestion).toBeDefined();
      expect(summarySuggestion!.severity).toBe("warning");
    });

    it("flags missing bullet points as critical", () => {
      const text = `John Doe
john@test.com

Summary
Experienced engineer.

Experience
Worked at company doing things. Helped with projects and tasks.

Education
BS Computer Science`;
      const result = analyzeFormatting(text);
      const bulletSuggestion = result.suggestions.find(
        (s) => s.aspect === "bullet_points"
      );
      expect(bulletSuggestion).toBeDefined();
      expect(bulletSuggestion!.severity).toBe("critical");
    });

    it("flags zero quantified metrics as critical", () => {
      const text = `John Doe
john@test.com

Summary
Experienced engineer with years of experience.

Experience
Software Engineer | Company
- Worked on web applications
- Built features for the platform
- Collaborated with teammates

Education
BS Computer Science`;
      const result = analyzeFormatting(text);
      const metricsSuggestion = result.suggestions.find(
        (s) => s.aspect === "quantified_metrics"
      );
      expect(metricsSuggestion).toBeDefined();
      expect(metricsSuggestion!.severity).toBe("critical");
    });

    it("flags inconsistent heading styles", () => {
      const text = `John Doe
john@test.com

EXPERIENCE
Senior Developer at Corp

Education
BS Computer Science

SKILLS
JavaScript, Python`;
      const result = analyzeFormatting(text);
      const headingSuggestion = result.suggestions.find(
        (s) => s.aspect === "heading_consistency"
      );
      expect(headingSuggestion).toBeDefined();
    });

    it("flags inconsistent date formats", () => {
      const text = `John Doe
john@test.com

Summary
Experienced developer.

Experience
Company A | 01/2020 - Present
- Did work

Company B | January 2018 - December 2019
- Did more work

Education
BS Computer Science | 2017

Skills
JavaScript`;
      const result = analyzeFormatting(text);
      const dateSuggestion = result.suggestions.find(
        (s) => s.aspect === "date_consistency"
      );
      expect(dateSuggestion).toBeDefined();
    });

    it("flags excessive pages", () => {
      const result = analyzeFormatting(makeGoodResumeText(), {
        pageCount: 4,
      });
      const pageSuggestion = result.suggestions.find(
        (s) => s.aspect === "page_count"
      );
      expect(pageSuggestion).toBeDefined();
      expect(pageSuggestion!.message).toContain("4 pages");
    });

    it("flags missing key sections", () => {
      const text = `John Doe
john@test.com

Summary
Experienced developer.

Experience
Did things at company.`;
      const result = analyzeFormatting(text);
      const sectionSuggestion = result.suggestions.find(
        (s) => s.aspect === "missing_sections"
      );
      expect(sectionSuggestion).toBeDefined();
      expect(sectionSuggestion!.severity).toBe("critical");
    });

    it("does not flag too many bullets per entry for standalone", () => {
      // Build resume with many bullets per entry
      const text = `John Doe
john@test.com

Summary
Experienced engineer.

Experience
Company A | January 2020 - Present
- Task 1
- Task 2
- Task 3
- Task 4
- Task 5
- Task 6
- Task 7
- Task 8
- Task 9
- Task 10

Education
BS Computer Science

Skills
JavaScript`;
      const result = analyzeFormatting(text);
      const densitySuggestion = result.suggestions.find(
        (s) => s.aspect === "bullet_density"
      );
      expect(densitySuggestion).toBeDefined();
      expect(densitySuggestion!.severity).toBe("info");
    });

    it("clamps score to minimum 0", () => {
      // A terrible resume that triggers many deductions
      const result = analyzeFormatting("", { pageCount: 5 });
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("reference-based analysis", () => {
    it("compares against reference resumes when provided", () => {
      const refs = [
        makeReferenceResume(),
        makeReferenceResume({}, { id: "ref-2" }),
        makeReferenceResume({}, { id: "ref-3" }),
      ];

      const result = analyzeFormatting(makeGoodResumeText(), undefined, refs);

      expect(result.referenceCount).toBe(3);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("flags page count difference from reference set", () => {
      const refs = [
        makeReferenceResume({ pageCount: 1 }),
        makeReferenceResume({ pageCount: 1 }, { id: "ref-2" }),
        makeReferenceResume({ pageCount: 1 }, { id: "ref-3" }),
      ];

      // User has 3 pages but refs all have 1 page
      const result = analyzeFormatting(makeGoodResumeText(), { pageCount: 3 }, refs);
      const pageSuggestion = result.suggestions.find(
        (s) => s.aspect === "page_count"
      );
      expect(pageSuggestion).toBeDefined();
      expect(pageSuggestion!.message).toContain("100%");
      expect(pageSuggestion!.message).toContain("1 page(s)");
    });

    it("flags missing summary when references have it", () => {
      const refs = [
        makeReferenceResume({ hasSummary: true }),
        makeReferenceResume({ hasSummary: true }, { id: "ref-2" }),
        makeReferenceResume({ hasSummary: true }, { id: "ref-3" }),
      ];

      // Resume with no summary section
      const text = `John Doe
john@test.com

EXPERIENCE
Senior Developer at Corp
- Built things with 25% improvement

EDUCATION
BS Computer Science

SKILLS
JavaScript`;
      const result = analyzeFormatting(text, undefined, refs);
      const summarySuggestion = result.suggestions.find(
        (s) => s.aspect === "summary_section"
      );
      expect(summarySuggestion).toBeDefined();
      expect(summarySuggestion!.percentageSupport).toBe(100);
    });

    it("flags low quantified metrics compared to references", () => {
      const refs = [
        makeReferenceResume({ quantifiedMetrics: { count: 8, examples: [] } }),
        makeReferenceResume({ quantifiedMetrics: { count: 10, examples: [] } }, { id: "ref-2" }),
        makeReferenceResume({ quantifiedMetrics: { count: 6, examples: [] } }, { id: "ref-3" }),
      ];

      // Resume with only 1 metric (refs avg = 8)
      const text = `John Doe
john@test.com

Summary
Developer.

Experience
Company | January 2020 - Present
- Improved performance by 10%
- Worked on various projects
- Collaborated with team

Education
BS Computer Science

Skills
JavaScript`;
      const result = analyzeFormatting(text, undefined, refs);
      const metricsSuggestion = result.suggestions.find(
        (s) => s.aspect === "quantified_metrics"
      );
      expect(metricsSuggestion).toBeDefined();
    });

    it("flags section order mismatch", () => {
      const refs = [
        makeReferenceResume({
          sectionOrder: ["Contact", "Summary", "Experience", "Education", "Skills"],
        }),
        makeReferenceResume(
          { sectionOrder: ["Contact", "Summary", "Experience", "Education", "Skills"] },
          { id: "ref-2" }
        ),
        makeReferenceResume(
          { sectionOrder: ["Contact", "Summary", "Experience", "Education", "Skills"] },
          { id: "ref-3" }
        ),
      ];

      // Resume with Education before Experience (wrong order per refs)
      const text = `John Doe
john@test.com

Summary
Developer.

Education
BS Computer Science | 2017

Experience
Company | January 2020 - Present
- Built things with 25% improvement
- Did more with $50K savings
- Led team of 5 people

Skills
JavaScript`;
      const result = analyzeFormatting(text, undefined, refs);
      const orderSuggestion = result.suggestions.find(
        (s) => s.aspect === "section_order"
      );
      expect(orderSuggestion).toBeDefined();
      expect(orderSuggestion!.severity).toBe("info");
    });

    it("flags missing bullet points when references use them", () => {
      const refs = [
        makeReferenceResume({ bulletStyle: { types: ["dot"], avgBulletsPerEntry: 4, totalBullets: 16 } }),
        makeReferenceResume(
          { bulletStyle: { types: ["dash"], avgBulletsPerEntry: 3, totalBullets: 12 } },
          { id: "ref-2" }
        ),
      ];

      const text = `John Doe
john@test.com

Summary
Developer.

Experience
Worked at company doing various tasks and building features for clients.

Education
BS Computer Science

Skills
JavaScript`;
      const result = analyzeFormatting(text, undefined, refs);
      const bulletSuggestion = result.suggestions.find(
        (s) => s.aspect === "bullet_points"
      );
      expect(bulletSuggestion).toBeDefined();
      expect(bulletSuggestion!.severity).toBe("critical");
    });

    it("flags heading inconsistency when references are consistent", () => {
      const refs = [
        makeReferenceResume({ headingStyle: { consistent: true, styles: ["ALL_CAPS"] } }),
        makeReferenceResume(
          { headingStyle: { consistent: true, styles: ["ALL_CAPS"] } },
          { id: "ref-2" }
        ),
      ];

      // Resume with mixed heading styles
      const text = `John Doe
john@test.com

SUMMARY
Developer.

Experience
Company | January 2020 - Present
- Built things with 25% improvement
- Did work with $50K savings
- Led 5 people

EDUCATION
BS Computer Science

Skills
JavaScript`;
      const result = analyzeFormatting(text, undefined, refs);
      const headingSuggestion = result.suggestions.find(
        (s) => s.aspect === "heading_consistency"
      );
      expect(headingSuggestion).toBeDefined();
    });

    it("flags date format inconsistency when references are consistent", () => {
      const refs = [
        makeReferenceResume({ dateFormat: { formats: ["Month YYYY"], consistent: true } }),
        makeReferenceResume(
          { dateFormat: { formats: ["Month YYYY"], consistent: true } },
          { id: "ref-2" }
        ),
      ];

      // Resume with mixed date formats
      const text = `John Doe
john@test.com

Summary
Developer.

Experience
Company A | 01/2020 - Present
- Built things with 25% improvement
- Saved $50K in costs
- Led team of 5 people

Company B | January 2018 - December 2019
- Worked on projects

Education
BS Computer Science

Skills
JavaScript`;
      const result = analyzeFormatting(text, undefined, refs);
      const dateSuggestion = result.suggestions.find(
        (s) => s.aspect === "date_consistency"
      );
      expect(dateSuggestion).toBeDefined();
    });

    it("flags missing key sections with reference statistics", () => {
      const refs = [
        makeReferenceResume({
          sectionOrder: ["Contact", "Summary", "Experience", "Education", "Skills"],
        }),
        makeReferenceResume(
          { sectionOrder: ["Contact", "Summary", "Experience", "Education", "Skills"] },
          { id: "ref-2" }
        ),
      ];

      // Resume missing Skills section
      const text = `John Doe
john@test.com

Summary
Developer.

Experience
Company | January 2020 - Present
- Built things with 25% improvement
- Saved $50K in costs

Education
BS Computer Science`;
      const result = analyzeFormatting(text, undefined, refs);
      const sectionSuggestion = result.suggestions.find(
        (s) => s.aspect === "missing_sections"
      );
      expect(sectionSuggestion).toBeDefined();
      expect(sectionSuggestion!.message).toContain("Skills");
    });

    it("skips reference comparisons for null formatting_patterns", () => {
      const refs = [
        { id: "ref-1", title: "Test", industry: "tech", role_level: "mid", formatting_patterns: null },
      ];

      // Should fall back to standalone
      const result = analyzeFormatting(makeGoodResumeText(), undefined, refs);
      expect(result.referenceCount).toBe(0);
    });

    it("does not flag page count if no clear majority", () => {
      // References split evenly — no clear mode >= 60%
      const refs = [
        makeReferenceResume({ pageCount: 1 }),
        makeReferenceResume({ pageCount: 2 }, { id: "ref-2" }),
        makeReferenceResume({ pageCount: 3 }, { id: "ref-3" }),
      ];

      const result = analyzeFormatting(makeGoodResumeText(), { pageCount: 2 }, refs);
      const pageSuggestion = result.suggestions.find(
        (s) => s.aspect === "page_count"
      );
      // With an even split, no mode has >= 60% support, so no suggestion
      expect(pageSuggestion).toBeUndefined();
    });
  });

  describe("feedback conversion", () => {
    it("converts suggestions to HRFeedback format", () => {
      const result = analyzeFormatting(makeWeakResumeText());

      expect(result.feedback.length).toBeGreaterThan(0);
      for (const fb of result.feedback) {
        expect(fb.type).toBe("formatting");
        expect(fb.layer).toBe(1);
        expect(["critical", "warning", "info"]).toContain(fb.severity);
        expect(fb.message).toBeTruthy();
      }
    });

    it("includes actionable suggestions in feedback", () => {
      const result = analyzeFormatting(makeWeakResumeText());

      // At least some feedback items should have suggestion text
      const withSuggestions = result.feedback.filter((fb) => fb.suggestion);
      expect(withSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe("metadata handling", () => {
    it("accepts optional page count in metadata", () => {
      const result = analyzeFormatting(makeGoodResumeText(), { pageCount: 2 });
      expect(result.userPatterns.pageCount).toBe(2);
    });

    it("estimates page count when not provided", () => {
      const result = analyzeFormatting(makeGoodResumeText());
      expect(result.userPatterns.pageCount).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("fetchReferenceResumes", () => {
  it("fetches from reference_resumes table", async () => {
    const mockData = [makeReferenceResume()];
    const mockLimit = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockSelect = vi.fn().mockReturnValue({ limit: mockLimit, eq: vi.fn() });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockClient = { from: mockFrom };

    const result = await fetchReferenceResumes(mockClient);

    expect(mockFrom).toHaveBeenCalledWith("reference_resumes");
    expect(mockSelect).toHaveBeenCalledWith(
      "id, title, industry, role_level, formatting_patterns"
    );
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toEqual(mockData);
  });

  it("applies industry filter when provided", async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ limit: mockLimit, eq: vi.fn().mockReturnValue({ limit: mockLimit }) });
    const mockSelect = vi.fn().mockReturnValue({ limit: mockLimit, eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockClient = { from: mockFrom };

    await fetchReferenceResumes(mockClient, { industry: "tech" });

    expect(mockEq).toHaveBeenCalledWith("industry", "tech");
  });

  it("returns empty array on error", async () => {
    const mockLimit = vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") });
    const mockSelect = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockClient = { from: mockFrom };

    const result = await fetchReferenceResumes(mockClient);
    expect(result).toEqual([]);
  });
});
