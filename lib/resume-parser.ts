/**
 * Resume Parser — Extracts structured content from raw resume text
 *
 * Uses a hybrid approach:
 * - Regex patterns for contact info and section detection
 * - LLM (GPT-4o) for semantic parsing of experience, education, skills
 */

import { openai } from "@/lib/openai";
import type {
  StructuredResume,
  ContactInfo,
  ExperienceEntry,
  EducationEntry,
  SkillsSection,
  ProjectEntry,
} from "@/lib/types";

// ── Contact Info Extraction (Regex-based) ─────────────────────────────

const EMAIL_REGEX = /[\w.+-]+@[\w.-]+\.\w{2,}/i;
const PHONE_REGEX =
  /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
const LINKEDIN_REGEX =
  /(?:linkedin\.com\/in\/|linkedin:\s*)([a-zA-Z0-9-]+)/i;
const GITHUB_REGEX =
  /(?:github\.com\/|github:\s*)([a-zA-Z0-9-]+)/i;
const LOCATION_REGEX =
  /([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s+\d{5})?)|([A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+)/;

/**
 * Extract contact information using regex patterns
 */
export function extractContactInfo(text: string): ContactInfo {
  const lines = text.split("\n").slice(0, 10); // Contact info is typically in first 10 lines
  const headerText = lines.join("\n");

  // Try to extract name from first non-empty line
  let fullName = "";
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip lines that look like section headers or contain contact info
    if (
      trimmed &&
      !EMAIL_REGEX.test(trimmed) &&
      !PHONE_REGEX.test(trimmed) &&
      !trimmed.includes("linkedin") &&
      !trimmed.includes("github") &&
      trimmed.length < 60 &&
      trimmed.length > 2
    ) {
      fullName = trimmed;
      break;
    }
  }

  const emailMatch = headerText.match(EMAIL_REGEX);
  const phoneMatch = headerText.match(PHONE_REGEX);
  const linkedinMatch = headerText.match(LINKEDIN_REGEX);
  const githubMatch = headerText.match(GITHUB_REGEX);
  const locationMatch = headerText.match(LOCATION_REGEX);

  // Try to find website
  const websiteRegex = /(?:portfolio|website|www\.)[\w.-]+\.\w{2,}/i;
  const websiteMatch = headerText.match(websiteRegex);

  return {
    fullName,
    email: emailMatch?.[0] || undefined,
    phone: phoneMatch?.[0] || undefined,
    linkedin: linkedinMatch?.[1]
      ? `linkedin.com/in/${linkedinMatch[1]}`
      : undefined,
    github: githubMatch?.[1] ? `github.com/${githubMatch[1]}` : undefined,
    location: locationMatch?.[0] || undefined,
    website: websiteMatch?.[0] || undefined,
  };
}

// ── Section Detection ─────────────────────────────────────────────────

const SECTION_PATTERNS: Record<string, RegExp> = {
  contact: /^(?:contact(?:\s*info(?:rmation)?)?|personal\s*(?:info(?:rmation)?|details)|how\s*to\s*reach\s*me)/im,
  summary: /^(?:summary|profile|objective|about\s*me?|professional\s*summary|career\s*summary|executive\s*summary|overview)/im,
  experience:
    /^(?:experience|work\s*experience|employment(?:\s*history)?|professional\s*experience|work\s*history|career\s*history|relevant\s*experience)/im,
  education: /^(?:education|academic(?:\s*background)?|educational\s*background|degrees?|qualifications?|schooling|academic\s*credentials)/im,
  skills:
    /^(?:skills?|technical\s*skills?|core\s*competencies|expertise|proficiencies|technologies|tech\s*stack|areas?\s*of\s*expertise|competencies|key\s*skills)/im,
  projects: /^(?:projects?|personal\s*projects?|portfolio|selected\s*projects?|side\s*projects?|key\s*projects?|notable\s*projects?)/im,
  certifications:
    /^(?:certifications?|certificates?|licenses?|credentials|professional\s*certifications?|accreditations?|training)/im,
};

interface SectionBoundary {
  name: string;
  startIndex: number;
  endIndex: number;
  content: string;
}

/**
 * Detect section boundaries in resume text
 */
export function detectSections(text: string): SectionBoundary[] {
  const sections: SectionBoundary[] = [];
  const lines = text.split("\n");

  // Find section headers
  const sectionMatches: { name: string; lineIndex: number; charIndex: number }[] =
    [];

  let charIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    for (const [name, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(line)) {
        sectionMatches.push({ name, lineIndex: i, charIndex });
        break;
      }
    }

    charIndex += lines[i].length + 1; // +1 for newline
  }

  // Build section boundaries
  for (let i = 0; i < sectionMatches.length; i++) {
    const current = sectionMatches[i];
    const next = sectionMatches[i + 1];

    const startIndex = current.charIndex;
    const endIndex = next ? next.charIndex : text.length;
    const content = text.slice(startIndex, endIndex).trim();

    sections.push({
      name: current.name,
      startIndex,
      endIndex,
      content,
    });
  }

  return sections;
}

// ── LLM Parsing ───────────────────────────────────────────────────────

const PARSE_SYSTEM_PROMPT = `You are an expert resume parser. Your job is to extract structured data from resume text.

You will receive resume text (possibly with section boundaries already identified) and must extract ALL of the following sections, even if they are not explicitly labeled:

1. Summary/Objective - Look for introductory text that describes the candidate
2. Work Experience - ALL job entries with company, title, dates, location, and bullet points
3. Education - ALL education entries including school, degree, field, dates, GPA, and highlights
4. Skills - Extract ALL mentioned skills and categorize them appropriately
5. Projects - Personal or work projects (if present)
6. Certifications - Professional certifications, licenses, credentials (if present)

## Critical Rules
1. Extract EVERYTHING from the resume - do not leave any section empty if data exists
2. For dates, normalize to formats like "Jan 2020", "2020", or "Present"
3. Keep bullet points as-is, preserving the original wording
4. For skills, categorize based on type:
   - technical: programming languages, frameworks, databases, cloud services (e.g., JavaScript, React, Python, AWS, SQL)
   - tools: software tools, IDEs, platforms (e.g., Git, Docker, VS Code, Jira)
   - soft: leadership, communication, problem-solving
   - languages: spoken/written languages (e.g., English, Spanish, Mandarin)
5. Generate unique IDs for each experience, education, and project entry (use format like "exp-1", "edu-1", "proj-1")
6. If a section header is missing but content exists, still extract it (e.g., skills listed without a "Skills" header)
7. Look for skills mentioned within experience bullets and add them to the skills section

## Output Format
Return a JSON object with this structure:
{
  "summary": "string or null if not present",
  "experience": [
    {
      "id": "exp-1",
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State or Remote",
      "startDate": "Jan 2020",
      "endDate": "Present",
      "bullets": ["bullet 1", "bullet 2"]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "school": "University Name",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "endDate": "May 2020",
      "gpa": "3.8",
      "highlights": ["Dean's List", "Relevant coursework"]
    }
  ],
  "skills": {
    "technical": ["JavaScript", "Python", "React"],
    "soft": ["Leadership", "Communication"],
    "tools": ["Git", "Docker", "VS Code"],
    "languages": ["English", "Spanish"]
  },
  "projects": [
    {
      "id": "proj-1",
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["React", "Node.js"],
      "url": "github.com/user/project",
      "bullets": ["Implemented X", "Achieved Y"]
    }
  ],
  "certifications": ["AWS Solutions Architect", "PMP"]
}`;

interface ParsedSections {
  summary?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillsSection;
  projects?: ProjectEntry[];
  certifications?: string[];
}

/**
 * Use LLM to parse resume sections into structured format
 */
async function llmParseResumeSections(
  text: string,
  sectionBoundaries: SectionBoundary[]
): Promise<ParsedSections> {
  // Build context about detected sections
  const sectionContext =
    sectionBoundaries.length > 0
      ? `\n\nDetected sections:\n${sectionBoundaries.map((s) => `- ${s.name}`).join("\n")}`
      : "";

  const userPrompt = `Parse this resume and extract structured data:

\`\`\`
${text}
\`\`\`
${sectionContext}

Return the structured JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1, // Low temperature for consistent extraction
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PARSE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      return getDefaultParsedSections();
    }

    const parsed = JSON.parse(content);
    return validateParsedSections(parsed);
  } catch (error) {
    console.error("LLM parsing error:", error);
    return getDefaultParsedSections();
  }
}

/**
 * Get default empty sections
 */
function getDefaultParsedSections(): ParsedSections {
  return {
    experience: [],
    education: [],
    skills: {
      technical: [],
      soft: [],
      tools: [],
      languages: [],
    },
  };
}

/**
 * Validate and normalize LLM output
 */
function validateParsedSections(raw: unknown): ParsedSections {
  if (!raw || typeof raw !== "object") {
    return getDefaultParsedSections();
  }

  const obj = raw as Record<string, unknown>;

  // Validate experience
  const experience: ExperienceEntry[] = [];
  if (Array.isArray(obj.experience)) {
    for (const exp of obj.experience) {
      if (exp && typeof exp === "object") {
        const e = exp as Record<string, unknown>;
        experience.push({
          id: String(e.id || `exp-${experience.length + 1}`),
          company: String(e.company || ""),
          title: String(e.title || ""),
          location: e.location ? String(e.location) : undefined,
          startDate: String(e.startDate || ""),
          endDate: String(e.endDate || "Present"),
          bullets: Array.isArray(e.bullets)
            ? e.bullets.map((b) => String(b))
            : [],
        });
      }
    }
  }

  // Validate education
  const education: EducationEntry[] = [];
  if (Array.isArray(obj.education)) {
    for (const edu of obj.education) {
      if (edu && typeof edu === "object") {
        const e = edu as Record<string, unknown>;
        education.push({
          id: String(e.id || `edu-${education.length + 1}`),
          school: String(e.school || ""),
          degree: String(e.degree || ""),
          field: e.field ? String(e.field) : undefined,
          endDate: String(e.endDate || ""),
          gpa: e.gpa ? String(e.gpa) : undefined,
          highlights: Array.isArray(e.highlights)
            ? e.highlights.map((h) => String(h))
            : [],
        });
      }
    }
  }

  // Validate skills
  const skills: SkillsSection = {
    technical: [],
    soft: [],
    tools: [],
    languages: [],
  };
  if (obj.skills && typeof obj.skills === "object") {
    const s = obj.skills as Record<string, unknown>;
    if (Array.isArray(s.technical))
      skills.technical = s.technical.map((t) => String(t));
    if (Array.isArray(s.soft)) skills.soft = s.soft.map((t) => String(t));
    if (Array.isArray(s.tools)) skills.tools = s.tools.map((t) => String(t));
    if (Array.isArray(s.languages))
      skills.languages = s.languages.map((t) => String(t));
  }

  // Validate projects
  let projects: ProjectEntry[] | undefined;
  if (Array.isArray(obj.projects) && obj.projects.length > 0) {
    projects = [];
    for (const proj of obj.projects) {
      if (proj && typeof proj === "object") {
        const p = proj as Record<string, unknown>;
        projects.push({
          id: String(p.id || `proj-${projects.length + 1}`),
          name: String(p.name || ""),
          description: p.description ? String(p.description) : undefined,
          technologies: Array.isArray(p.technologies)
            ? p.technologies.map((t) => String(t))
            : [],
          url: p.url ? String(p.url) : undefined,
          bullets: Array.isArray(p.bullets)
            ? p.bullets.map((b) => String(b))
            : [],
        });
      }
    }
  }

  // Validate certifications
  let certifications: string[] | undefined;
  if (Array.isArray(obj.certifications) && obj.certifications.length > 0) {
    certifications = obj.certifications.map((c) => String(c));
  }

  return {
    summary: obj.summary ? String(obj.summary) : undefined,
    experience,
    education,
    skills,
    projects,
    certifications,
  };
}

// ── Fallback Skill Extraction ─────────────────────────────────────────

/**
 * Common technical skills to look for as fallback
 */
const COMMON_TECH_SKILLS = [
  // Programming Languages
  "JavaScript", "TypeScript", "Python", "Java", "C\\+\\+", "C#", "Ruby", "Go", "Rust", "Swift", "Kotlin", "PHP", "Scala",
  // Frontend
  "React", "Vue", "Angular", "Next\\.js", "Svelte", "HTML", "CSS", "SASS", "Tailwind", "Bootstrap",
  // Backend
  "Node\\.js", "Express", "Django", "Flask", "Spring", "Rails", "FastAPI", "GraphQL", "REST",
  // Databases
  "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Firebase",
  // Cloud & DevOps
  "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Jenkins", "Terraform", "Linux",
  // Tools
  "Git", "GitHub", "Jira", "Figma", "Slack", "VS Code",
];

const COMMON_SOFT_SKILLS = [
  "Leadership", "Communication", "Problem.solving", "Teamwork", "Collaboration",
  "Project Management", "Agile", "Scrum", "Time Management", "Critical Thinking",
];

/**
 * Extract skills from raw text as fallback
 */
function extractSkillsFallback(text: string): SkillsSection {
  const foundTechnical: string[] = [];
  const foundSoft: string[] = [];
  const textLower = text.toLowerCase();

  // Check for technical skills
  for (const skill of COMMON_TECH_SKILLS) {
    const regex = new RegExp(`\\b${skill}\\b`, "i");
    if (regex.test(text)) {
      const match = text.match(regex);
      if (match) {
        foundTechnical.push(match[0]);
      }
    }
  }

  // Check for soft skills
  for (const skill of COMMON_SOFT_SKILLS) {
    const regex = new RegExp(`\\b${skill}\\b`, "i");
    if (regex.test(text)) {
      const match = text.match(regex);
      if (match) {
        foundSoft.push(match[0]);
      }
    }
  }

  // Deduplicate
  return {
    technical: Array.from(new Set(foundTechnical)),
    soft: Array.from(new Set(foundSoft)),
    tools: [],
    languages: [],
  };
}

// ── Main Parser Function ──────────────────────────────────────────────

/**
 * Parse raw resume text into a structured format
 *
 * @param text - Raw resume text
 * @returns Structured resume object
 */
export async function parseToStructured(text: string): Promise<StructuredResume> {
  // 1. Extract contact info with regex patterns
  const contact = extractContactInfo(text);

  // 2. Detect sections using patterns
  const sectionBoundaries = detectSections(text);

  // 3. Use GPT-4o to parse experience/education/skills into structured format
  const parsedSections = await llmParseResumeSections(text, sectionBoundaries);

  // 4. Fallback skill extraction if skills are empty
  let skills = parsedSections.skills;
  const hasSkills = skills.technical.length > 0 || skills.soft.length > 0 || skills.tools.length > 0;
  if (!hasSkills) {
    const fallbackSkills = extractSkillsFallback(text);
    skills = {
      technical: fallbackSkills.technical.length > 0 ? fallbackSkills.technical : skills.technical,
      soft: fallbackSkills.soft.length > 0 ? fallbackSkills.soft : skills.soft,
      tools: skills.tools,
      languages: skills.languages,
    };
  }

  // 5. Determine section order based on detected sections or defaults
  const sectionOrder = sectionBoundaries.length > 0
    ? sectionBoundaries.map((s) => s.name)
    : ["contact", "summary", "experience", "education", "skills"];

  // Ensure contact is first if not already
  if (!sectionOrder.includes("contact")) {
    sectionOrder.unshift("contact");
  }

  // Add projects/certifications to section order if they exist
  if (parsedSections.projects && parsedSections.projects.length > 0 && !sectionOrder.includes("projects")) {
    sectionOrder.push("projects");
  }
  if (parsedSections.certifications && parsedSections.certifications.length > 0 && !sectionOrder.includes("certifications")) {
    sectionOrder.push("certifications");
  }

  return {
    contact,
    summary: parsedSections.summary,
    experience: parsedSections.experience,
    education: parsedSections.education,
    skills,
    projects: parsedSections.projects,
    certifications: parsedSections.certifications,
    sectionOrder,
    rawText: text,
  };
}

/**
 * Quick parse that only extracts contact info (no LLM call)
 * Useful for preview or when LLM parsing is not needed
 */
export function parseContactOnly(text: string): ContactInfo {
  return extractContactInfo(text);
}
