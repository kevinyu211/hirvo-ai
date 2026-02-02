import { describe, it, expect } from "vitest";
import {
  extractKeywords,
  matchKeywords,
  checkFormatting,
  validateSections,
  computeATSScore,
  runATSAnalysis,
  stem,
} from "@/lib/ats-engine";

// ============================================================================
// stem()
// ============================================================================
describe("stem", () => {
  it("stems common suffixes", () => {
    expect(stem("running")).toBe("runn");
    expect(stem("managed")).toBe("manag");
    expect(stem("quickly")).toBe("quick");
  });

  it("returns short words unchanged", () => {
    expect(stem("go")).toBe("go");
    expect(stem("ai")).toBe("ai");
    expect(stem("css")).toBe("css");
  });

  it("handles -ing suffix", () => {
    expect(stem("developing")).toBe("develop");
    expect(stem("engineering")).toBe("engineer");
  });

  it("handles -tion and -ization suffixes", () => {
    // "optimization" matches -ization rule first → "optimize"
    expect(stem("optimization")).toBe("optimize");
    // "documentation" matches -tion rule → "documentat"
    expect(stem("documentation")).toBe("documentat");
  });

  it("handles -ness suffix", () => {
    expect(stem("effectiveness")).toBe("effective");
    expect(stem("awareness")).toBe("aware");
  });
});

// ============================================================================
// extractKeywords()
// ============================================================================
describe("extractKeywords", () => {
  it("extracts single keywords from a job description", () => {
    const jd =
      "We are looking for a software engineer with experience in Python, JavaScript, and React. Must have strong SQL skills.";
    const keywords = extractKeywords(jd);

    expect(keywords).toContain("python");
    expect(keywords).toContain("javascript");
    expect(keywords).toContain("react");
    expect(keywords).toContain("sql");
  });

  it("extracts multi-word phrases", () => {
    const jd =
      "The candidate should have experience with machine learning, data science, and natural language processing. CI/CD pipeline experience is a plus.";
    const keywords = extractKeywords(jd);

    expect(keywords).toContain("machine learning");
    expect(keywords).toContain("data science");
    expect(keywords).toContain("natural language processing");
  });

  it("filters out stop words", () => {
    const jd = "We are looking for a candidate with strong experience";
    const keywords = extractKeywords(jd);

    expect(keywords).not.toContain("we");
    expect(keywords).not.toContain("are");
    expect(keywords).not.toContain("for");
    expect(keywords).not.toContain("a");
    expect(keywords).not.toContain("the");
    expect(keywords).not.toContain("with");
  });

  it("deduplicates multi-word vs single word", () => {
    const jd = "Machine learning engineer for machine learning team";
    const keywords = extractKeywords(jd);

    // "machine" and "learning" should not appear separately if already in "machine learning"
    const machineCount = keywords.filter((k) => k === "machine").length;
    const learningCount = keywords.filter((k) => k === "learning").length;
    expect(machineCount).toBe(0);
    expect(learningCount).toBe(0);
    expect(keywords).toContain("machine learning");
  });

  it("handles empty job description", () => {
    const keywords = extractKeywords("");
    expect(keywords).toEqual([]);
  });

  it("extracts technical terms like CI/CD", () => {
    const jd = "Must have experience with CI/CD pipelines and REST API development.";
    const keywords = extractKeywords(jd);
    expect(keywords.some((k) => k.includes("ci") || k.includes("cd"))).toBe(true);
  });
});

// ============================================================================
// matchKeywords()
// ============================================================================
describe("matchKeywords", () => {
  it("matches exact keywords in resume text", () => {
    const resume = "Experienced Python developer with JavaScript and React skills.";
    const keywords = ["python", "javascript", "react", "sql"];
    const result = matchKeywords(resume, keywords);

    expect(result.matched).toContain("python");
    expect(result.matched).toContain("javascript");
    expect(result.matched).toContain("react");
    expect(result.missing).toContain("sql");
    expect(result.matchPct).toBe(75);
  });

  it("matches stemmed variations", () => {
    const resume = "Managed a team of developers and optimized database queries.";
    const keywords = ["management", "optimization", "developer"];
    const result = matchKeywords(resume, keywords);

    // "Managed" stems to match "management" stem, "optimized" stems to match "optimization" stem
    expect(result.matched.length).toBeGreaterThanOrEqual(2);
  });

  it("matches multi-word phrases when all words present", () => {
    const resume = "Built machine learning models and implemented deep learning algorithms.";
    const keywords = ["machine learning", "deep learning"];
    const result = matchKeywords(resume, keywords);

    expect(result.matched).toContain("machine learning");
    expect(result.matched).toContain("deep learning");
    expect(result.matchPct).toBe(100);
  });

  it("handles empty keyword list", () => {
    const result = matchKeywords("Some resume text", []);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual([]);
    expect(result.matchPct).toBe(100);
  });

  it("is case-insensitive", () => {
    const resume = "PYTHON developer with JAVASCRIPT experience";
    const keywords = ["python", "javascript"];
    const result = matchKeywords(resume, keywords);

    expect(result.matched).toContain("python");
    expect(result.matched).toContain("javascript");
    expect(result.matchPct).toBe(100);
  });

  it("handles resume with no matching keywords", () => {
    const resume = "I like cooking and gardening.";
    const keywords = ["python", "javascript", "react"];
    const result = matchKeywords(resume, keywords);

    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(["python", "javascript", "react"]);
    expect(result.matchPct).toBe(0);
  });
});

// ============================================================================
// checkFormatting()
// ============================================================================
describe("checkFormatting", () => {
  const wellFormattedResume = `
John Doe
john.doe@email.com | (555) 123-4567 | linkedin.com/in/johndoe

Summary
Experienced software engineer with 5+ years of experience in web development.

Experience
Senior Software Engineer, Acme Corp
January 2020 - Present
- Led team of 5 engineers to deliver microservices platform
- Reduced API response time by 40% through optimization
- Implemented CI/CD pipeline using GitHub Actions

Skills
JavaScript, TypeScript, React, Node.js, PostgreSQL, AWS, Docker

Education
BS Computer Science, MIT, 2018
  `.trim();

  it("returns high score for well-formatted resume", () => {
    const result = checkFormatting(wellFormattedResume);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("flags missing email", () => {
    const resume = "John Doe\n(555) 123-4567\nExperience\nSoftware Engineer at Acme Corp for 3 years doing development work on various projects and systems.";
    const result = checkFormatting(resume);
    expect(result.issues.some((i) => i.message.includes("email"))).toBe(true);
  });

  it("flags missing phone number", () => {
    const resume = "John Doe\njohn@email.com\nExperience\nSoftware Engineer at Acme Corp for 3 years doing development work on various projects and systems.";
    const result = checkFormatting(resume);
    expect(result.issues.some((i) => i.message.includes("phone"))).toBe(true);
  });

  it("flags table-based layouts", () => {
    const resume = "Name\t\t\tEmail\t\t\tPhone\njohn@email.com\n(555) 123-4567\nExperience at various companies";
    const result = checkFormatting(resume);
    expect(result.issues.some((i) => i.message.includes("table"))).toBe(true);
  });

  it("flags inconsistent date formats", () => {
    const resume = `john@email.com
(555) 123-4567
Experience
Senior Engineer, 01/2020 - Present
Junior Engineer, January 2018 - December 2019
Built systems and managed teams and delivered projects across multiple platforms.`;
    const result = checkFormatting(resume);
    expect(result.issues.some((i) => i.message.includes("date format"))).toBe(true);
  });

  it("flags very long resumes", () => {
    const result = checkFormatting(wellFormattedResume, { pageCount: 4 });
    expect(result.issues.some((i) => i.message.includes("pages"))).toBe(true);
  });

  it("flags extremely short resumes", () => {
    const resume = "John Doe\njohn@email.com\nSoftware Engineer";
    const result = checkFormatting(resume);
    expect(result.issues.some((i) => i.message.includes("too short"))).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it("flags image/graphic content", () => {
    const resume = `john@email.com
(555) 123-4567
[image] Company Logo
Experience at various companies doing multiple different types of software development work across platforms.`;
    const result = checkFormatting(resume);
    expect(result.issues.some((i) => i.message.includes("Image"))).toBe(true);
  });

  it("score never goes below 0", () => {
    // Terrible resume that triggers many issues
    const resume = "[image] [graphic] Hi";
    const result = checkFormatting(resume, { pageCount: 10 });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// validateSections()
// ============================================================================
describe("validateSections", () => {
  it("detects all standard sections", () => {
    const resume = `
Contact: john@email.com
Summary: Experienced developer
Experience: 5 years at Acme Corp
Education: BS Computer Science
Skills: JavaScript, Python
    `;
    const result = validateSections(resume);

    expect(result.score).toBe(100);
    expect(result.sections.every((s) => s.found)).toBe(true);
  });

  it("detects sections with alternate headings", () => {
    const resume = `
Email: john@test.com
Professional Summary
Work History at various companies
Academic background from university
Technical Skills and tools
    `;
    const result = validateSections(resume);

    expect(result.sections.find((s) => s.name === "Contact")?.found).toBe(true);
    expect(result.sections.find((s) => s.name === "Summary")?.found).toBe(true);
    expect(result.sections.find((s) => s.name === "Experience")?.found).toBe(true);
    expect(result.sections.find((s) => s.name === "Skills")?.found).toBe(true);
  });

  it("flags missing sections", () => {
    const resume = "Some random text without any clear sections";
    const result = validateSections(resume);

    expect(result.score).toBeLessThan(100);
    const missingCount = result.sections.filter((s) => !s.found).length;
    expect(missingCount).toBeGreaterThan(0);
  });

  it("returns correct section names", () => {
    const resume = "just some text";
    const result = validateSections(resume);

    const sectionNames = result.sections.map((s) => s.name);
    expect(sectionNames).toContain("Contact");
    expect(sectionNames).toContain("Summary");
    expect(sectionNames).toContain("Experience");
    expect(sectionNames).toContain("Education");
    expect(sectionNames).toContain("Skills");
  });

  it("score matches proportion of found sections", () => {
    const resume = "email: test@email.com\nExperience at various companies";
    const result = validateSections(resume);

    const foundCount = result.sections.filter((s) => s.found).length;
    const totalSections = result.sections.length;
    expect(result.score).toBe(Math.round((foundCount / totalSections) * 100));
  });
});

// ============================================================================
// computeATSScore()
// ============================================================================
describe("computeATSScore", () => {
  it("computes weighted score correctly", () => {
    const keywordResult = { matched: ["python", "react"], missing: ["sql"], matchPct: 67 };
    const formattingResult = { score: 80, issues: [] };
    const sectionResult = { score: 100, sections: [{ name: "Contact", found: true }] };

    const result = computeATSScore(keywordResult, formattingResult, sectionResult);

    // 67*0.5 + 80*0.25 + 100*0.25 = 33.5 + 20 + 25 = 78.5 → 79
    expect(result.overall).toBe(79);
    expect(result.passed).toBe(true);
  });

  it("marks as failed when below 75", () => {
    const keywordResult = { matched: ["python"], missing: ["react", "sql", "node"], matchPct: 25 };
    const formattingResult = { score: 60, issues: [] };
    const sectionResult = { score: 40, sections: [] };

    const result = computeATSScore(keywordResult, formattingResult, sectionResult);

    // 25*0.5 + 60*0.25 + 40*0.25 = 12.5 + 15 + 10 = 37.5 → 38
    expect(result.overall).toBe(38);
    expect(result.passed).toBe(false);
  });

  it("includes all issues from sub-results", () => {
    const keywordResult = { matched: [], missing: ["python", "sql"], matchPct: 0 };
    const formattingResult = {
      score: 80,
      issues: [{ type: "formatting" as const, severity: "warning" as const, message: "format issue" }],
    };
    const sectionResult = {
      score: 60,
      sections: [
        { name: "Contact", found: false },
        { name: "Experience", found: true },
      ],
    };

    const result = computeATSScore(keywordResult, formattingResult, sectionResult);

    // Should include formatting issues + missing keyword issues + missing section issues
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
    expect(result.issues.some((i) => i.type === "formatting")).toBe(true);
    expect(result.issues.some((i) => i.type === "missing_keyword")).toBe(true);
    expect(result.issues.some((i) => i.type === "section")).toBe(true);
  });

  it("populates matchedKeywords and missingKeywords", () => {
    const keywordResult = { matched: ["python", "react"], missing: ["sql"], matchPct: 67 };
    const formattingResult = { score: 100, issues: [] };
    const sectionResult = { score: 100, sections: [] };

    const result = computeATSScore(keywordResult, formattingResult, sectionResult);

    expect(result.matchedKeywords).toEqual(["python", "react"]);
    expect(result.missingKeywords).toEqual(["sql"]);
    expect(result.keywordMatchPct).toBe(67);
  });
});

// ============================================================================
// runATSAnalysis() — full pipeline integration
// ============================================================================
describe("runATSAnalysis", () => {
  it("runs the full ATS pipeline and returns a valid ATSScore", () => {
    const resume = `
John Doe
john.doe@email.com | (555) 123-4567

Summary
Full stack software engineer with 5+ years building React and Python applications.

Experience
Senior Software Engineer, TechCo
January 2020 - Present
- Built RESTful APIs using Python and FastAPI
- Developed React front-end with TypeScript
- Managed PostgreSQL databases and Redis caching
- Led team of 4 engineers in agile environment

Education
BS Computer Science, State University, 2018

Skills
Python, JavaScript, TypeScript, React, Node.js, PostgreSQL, Redis, Docker, AWS, Git
    `.trim();

    const jd = `
We are looking for a Senior Software Engineer with experience in:
- Python and JavaScript/TypeScript
- React for front-end development
- PostgreSQL and database management
- RESTful API design
- Docker and cloud services (AWS preferred)
- Agile development practices
    `.trim();

    const result = runATSAnalysis(resume, jd);

    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.matchedKeywords.length).toBeGreaterThan(0);
    expect(result.formattingScore).toBeGreaterThan(0);
    expect(result.sectionScore).toBeGreaterThan(0);
    expect(typeof result.passed).toBe("boolean");
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it("gives a low score for a poorly matched resume", () => {
    const resume = `
Jane Smith
Chef and restaurant manager with 10 years culinary experience.
Managed kitchen operations and menu development.
Education: Culinary Institute of America
    `.trim();

    const jd = `
Senior Software Engineer needed with Python, React, TypeScript, PostgreSQL,
Docker, Kubernetes, and CI/CD pipeline experience. Must have cloud (AWS/GCP)
and microservices architecture experience.
    `.trim();

    const result = runATSAnalysis(resume, jd);

    expect(result.overall).toBeLessThan(50);
    expect(result.missingKeywords.length).toBeGreaterThan(3);
    expect(result.passed).toBe(false);
  });

  it("handles edge case of empty inputs", () => {
    const result = runATSAnalysis("", "");
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("passes metadata through to formatting check", () => {
    const resume = `john@email.com
(555) 123-4567
Summary: Experienced developer
Experience: Built systems
Education: BS CS
Skills: JavaScript`;

    const result = runATSAnalysis(resume, "javascript developer", { pageCount: 5 });
    expect(result.issues.some((i) => i.message.includes("pages"))).toBe(true);
  });
});
