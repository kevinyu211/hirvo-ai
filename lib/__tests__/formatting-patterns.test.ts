import { describe, it, expect } from "vitest";
import { extractFormattingPatterns } from "@/lib/formatting-patterns";

describe("extractFormattingPatterns", () => {
  const SAMPLE_RESUME = `John Doe
john@example.com | (555) 123-4567 | linkedin.com/in/johndoe

SUMMARY
Senior Software Engineer with 8+ years of experience building scalable web applications.
Led teams of 5-10 engineers and delivered products serving 1,000,000+ users.

EXPERIENCE

Senior Software Engineer, Acme Corp
January 2020 - Present
- Architected microservices platform handling 50,000 requests per second
- Reduced deployment time by 75% through CI/CD pipeline improvements
- Mentored 5 junior engineers and conducted 100+ code reviews
- Managed $2M annual cloud infrastructure budget

Software Engineer, StartupXYZ
June 2017 - December 2019
- Built React frontend serving 500,000 monthly active users
- Implemented real-time data pipeline processing 10M events daily
- Improved API response times by 40% through database optimization

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley — May 2017

SKILLS
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, Redis`;

  it("should extract correct page count", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME, 1);
    expect(patterns.pageCount).toBe(1);
  });

  it("should estimate page count from word count when not provided", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.pageCount).toBeGreaterThanOrEqual(1);
  });

  it("should detect section order", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.sectionOrder).toContain("Contact");
    expect(patterns.sectionOrder).toContain("Summary");
    expect(patterns.sectionOrder).toContain("Experience");
    expect(patterns.sectionOrder).toContain("Education");
    expect(patterns.sectionOrder).toContain("Skills");

    // Verify order: Summary before Experience before Education before Skills
    const summaryIdx = patterns.sectionOrder.indexOf("Summary");
    const expIdx = patterns.sectionOrder.indexOf("Experience");
    const eduIdx = patterns.sectionOrder.indexOf("Education");
    const skillsIdx = patterns.sectionOrder.indexOf("Skills");
    expect(summaryIdx).toBeLessThan(expIdx);
    expect(expIdx).toBeLessThan(eduIdx);
    expect(eduIdx).toBeLessThan(skillsIdx);
  });

  it("should detect Contact section from email/phone in first lines", () => {
    const noHeadingResume = `John Doe
john@example.com | (555) 123-4567

Experience
Software Engineer at Company`;
    const patterns = extractFormattingPatterns(noHeadingResume);
    expect(patterns.sectionOrder[0]).toBe("Contact");
  });

  it("should detect bullet styles", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.bulletStyle.types).toContain("dash");
    expect(patterns.bulletStyle.totalBullets).toBeGreaterThan(0);
  });

  it("should detect dot bullets", () => {
    const dotResume = `Experience
• Built a REST API
• Deployed to AWS
• Managed databases`;
    const patterns = extractFormattingPatterns(dotResume);
    expect(patterns.bulletStyle.types).toContain("dot");
    expect(patterns.bulletStyle.totalBullets).toBe(3);
  });

  it("should detect numbered bullets", () => {
    const numberedResume = `Skills
1. JavaScript
2. TypeScript
3. React`;
    const patterns = extractFormattingPatterns(numberedResume);
    expect(patterns.bulletStyle.types).toContain("number");
  });

  it("should detect hasSummary correctly", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.hasSummary).toBe(true);
  });

  it("should detect missing summary", () => {
    const noSummary = `John Doe
john@example.com

Experience
Software Engineer at Company

Education
BS Computer Science`;
    const patterns = extractFormattingPatterns(noSummary);
    expect(patterns.hasSummary).toBe(false);
  });

  it("should detect quantified metrics", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.quantifiedMetrics.count).toBeGreaterThan(0);
    // Should find percentages like 75%, 40%
    const hasPercentage = patterns.quantifiedMetrics.examples.some((e) =>
      e.includes("%")
    );
    expect(hasPercentage).toBe(true);
  });

  it("should detect dollar amounts", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    const hasDollar = patterns.quantifiedMetrics.examples.some((e) =>
      e.includes("$")
    );
    expect(hasDollar).toBe(true);
  });

  it("should detect ALL_CAPS heading style", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.headingStyle.styles).toContain("ALL_CAPS");
  });

  it("should detect Title Case heading style", () => {
    const titleCaseResume = `John Doe
john@example.com

Professional Summary
Experienced engineer.

Work Experience
Software Engineer at Company`;
    const patterns = extractFormattingPatterns(titleCaseResume);
    expect(patterns.headingStyle.styles).toContain("Title Case");
  });

  it("should determine heading consistency", () => {
    // All-caps headings — consistent
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.headingStyle.consistent).toBe(true);
  });

  it("should calculate white space ratio", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.whiteSpaceRatio).toBeGreaterThanOrEqual(0);
    expect(patterns.whiteSpaceRatio).toBeLessThanOrEqual(1);
  });

  it("should detect date formats", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    // The sample has "January 2020", "June 2017", "May 2017" — "Month YYYY" format
    expect(patterns.dateFormat.formats).toContain("Month YYYY");
  });

  it("should detect consistent dates", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.dateFormat.consistent).toBe(true);
  });

  it("should detect inconsistent dates", () => {
    const mixed = `Experience
Senior Engineer — January 2020 - Present
Junior Engineer — 06/2017 - 12/2019`;
    const patterns = extractFormattingPatterns(mixed);
    expect(patterns.dateFormat.consistent).toBe(false);
  });

  it("should calculate word count", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.wordCount).toBeGreaterThan(50);
  });

  it("should calculate average words per line", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    expect(patterns.avgWordsPerLine).toBeGreaterThan(0);
  });

  it("should handle empty text", () => {
    const patterns = extractFormattingPatterns("");
    expect(patterns.pageCount).toBe(1);
    expect(patterns.sectionOrder).toEqual([]);
    expect(patterns.bulletStyle.totalBullets).toBe(0);
    expect(patterns.wordCount).toBe(0);
    expect(patterns.whiteSpaceRatio).toBe(0);
  });

  it("should handle minimal resume", () => {
    const minimal = "John Doe\njohn@email.com";
    const patterns = extractFormattingPatterns(minimal);
    expect(patterns.pageCount).toBe(1);
    expect(patterns.sectionOrder).toContain("Contact");
    expect(patterns.wordCount).toBeGreaterThan(0);
  });

  it("should detect average bullets per entry", () => {
    const patterns = extractFormattingPatterns(SAMPLE_RESUME);
    // Two job entries, 7 bullets total → ~3-4 per entry
    expect(patterns.bulletStyle.avgBulletsPerEntry).toBeGreaterThan(0);
  });
});
