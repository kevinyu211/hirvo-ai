import { describe, it, expect } from "vitest";
import { detectVisaStatus } from "@/lib/visa-detection";
import type { UserContext } from "@/lib/types";

describe("detectVisaStatus", () => {
  // =========================================================================
  // Context-based detection
  // =========================================================================
  describe("context-based detection", () => {
    it("flags H-1B visa status from user context", () => {
      const result = detectVisaStatus("", { visaStatus: "h1b" });
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("User selected H-1B visa status");
    });

    it("flags OPT/CPT visa status from user context", () => {
      const result = detectVisaStatus("", { visaStatus: "opt_cpt" });
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("User selected OPT/CPT visa status");
    });

    it("flags 'Other' visa status from user context", () => {
      const result = detectVisaStatus("", { visaStatus: "other" });
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("User selected 'Other' visa status");
    });

    it("does NOT flag US citizen status", () => {
      const result = detectVisaStatus("", { visaStatus: "us_citizen" });
      expect(result.visaFlagged).toBe(false);
      expect(result.signals).toHaveLength(0);
    });

    it("does NOT flag Green Card status", () => {
      const result = detectVisaStatus("", { visaStatus: "green_card" });
      expect(result.visaFlagged).toBe(false);
      expect(result.signals).toHaveLength(0);
    });

    it("does NOT flag 'Prefer not to say' status", () => {
      const result = detectVisaStatus("", { visaStatus: "prefer_not_to_say" });
      expect(result.visaFlagged).toBe(false);
      expect(result.signals).toHaveLength(0);
    });

    it("handles undefined user context", () => {
      const result = detectVisaStatus("No visa terms here");
      expect(result.visaFlagged).toBe(false);
    });

    it("handles null user context", () => {
      const result = detectVisaStatus("No visa terms here", null);
      expect(result.visaFlagged).toBe(false);
    });

    it("handles empty visaStatus in context", () => {
      const result = detectVisaStatus("", { visaStatus: "" });
      expect(result.visaFlagged).toBe(false);
    });

    it("handles undefined visaStatus in context", () => {
      const context: UserContext = { targetRole: "Engineer" };
      const result = detectVisaStatus("", context);
      expect(result.visaFlagged).toBe(false);
    });
  });

  // =========================================================================
  // Text-based detection — specific visa types
  // =========================================================================
  describe("text-based detection — visa types", () => {
    it("detects H-1B mention", () => {
      const result = detectVisaStatus("Currently on H-1B visa sponsored by employer");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("H-1B visa mention");
    });

    it("detects H1B without hyphen", () => {
      const result = detectVisaStatus("H1B visa holder");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("H-1B visa mention");
    });

    it("detects H-1B case-insensitively", () => {
      const result = detectVisaStatus("h-1b visa status");
      expect(result.visaFlagged).toBe(true);
    });

    it("detects F-1 visa", () => {
      const result = detectVisaStatus("International student on F-1 visa");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("F-1 visa mention");
    });

    it("detects J-1 visa", () => {
      const result = detectVisaStatus("J-1 exchange visitor program");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("J-1 visa mention");
    });

    it("detects L-1 visa", () => {
      const result = detectVisaStatus("Transferred on L-1A intra-company visa");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("L-1 visa mention");
    });

    it("detects O-1 visa", () => {
      const result = detectVisaStatus("O-1B extraordinary ability visa");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("O-1 visa mention");
    });

    it("detects E-2 visa", () => {
      const result = detectVisaStatus("E-2 treaty investor visa");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("E-2/E-3 visa mention");
    });

    it("detects H-4 visa", () => {
      const result = detectVisaStatus("H-4 dependent visa with EAD");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("H-4 visa mention");
    });
  });

  // =========================================================================
  // Text-based detection — work authorization terms
  // =========================================================================
  describe("text-based detection — work authorization", () => {
    it("detects OPT mention", () => {
      const result = detectVisaStatus("Currently on OPT after graduation");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("OPT (Optional Practical Training) mention");
    });

    it("detects CPT mention", () => {
      const result = detectVisaStatus("Working under CPT authorization");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("CPT (Curricular Practical Training) mention");
    });

    it("detects STEM OPT", () => {
      const result = detectVisaStatus("STEM-OPT extension approved");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("STEM OPT extension mention");
    });

    it("detects EAD mention", () => {
      const result = detectVisaStatus("EAD card holder");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("EAD (Employment Authorization Document) mention");
    });

    it("detects DACA mention", () => {
      const result = detectVisaStatus("DACA recipient with work authorization");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("DACA (Deferred Action for Childhood Arrivals) mention");
    });

    it("detects TPS mention", () => {
      const result = detectVisaStatus("Temporary Protected Status (TPS)");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("TPS (Temporary Protected Status) mention");
    });
  });

  // =========================================================================
  // Text-based detection — general immigration terms
  // =========================================================================
  describe("text-based detection — general terms", () => {
    it("detects 'work authorization' mention", () => {
      const result = detectVisaStatus("Work authorization: Requires sponsorship");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("Work authorization mention");
    });

    it("detects 'authorized to work'", () => {
      const result = detectVisaStatus("Authorized to work in the United States");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("Authorization to work mention");
    });

    it("detects 'visa sponsorship'", () => {
      const result = detectVisaStatus("Will require visa sponsorship");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("Visa sponsorship mention");
    });

    it("detects 'requires sponsorship'", () => {
      const result = detectVisaStatus("Requires sponsorship for employment");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("Requires sponsorship mention");
    });

    it("detects 'green card' mention", () => {
      const result = detectVisaStatus("Green card pending through employer");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("Green card mention");
    });

    it("detects 'permanent resident' mention", () => {
      const result = detectVisaStatus("Permanent resident of the United States");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("Permanent residency mention");
    });

    it("detects 'immigration status'", () => {
      const result = detectVisaStatus("Immigration status: Pending adjustment");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("Immigration status mention");
    });

    it("detects 'legally authorized'", () => {
      const result = detectVisaStatus("Legally authorized to work in the US");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("Legally authorized mention");
    });

    it("detects 'work permit'", () => {
      const result = detectVisaStatus("Work permit valid through 2025");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("Work permit mention");
    });

    it("detects USCIS mention", () => {
      const result = detectVisaStatus("Filed petition with USCIS");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("USCIS mention");
    });

    it("detects I-140 petition mention", () => {
      const result = detectVisaStatus("I-140 immigrant petition approved");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("I-140 petition mention");
    });

    it("detects I-485 mention", () => {
      const result = detectVisaStatus("I-485 adjustment of status pending");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("I-485 adjustment of status mention");
    });
  });

  // =========================================================================
  // Negative cases — should NOT flag domestic resumes
  // =========================================================================
  describe("negative cases — clean domestic resumes", () => {
    it("does NOT flag a standard domestic resume", () => {
      const resume = `
        John Smith
        john.smith@email.com | (555) 123-4567

        EXPERIENCE
        Software Engineer, Acme Corp — 2020-Present
        - Built React applications with TypeScript
        - Led team of 5 engineers

        EDUCATION
        BS Computer Science, MIT — 2020

        SKILLS
        JavaScript, TypeScript, React, Node.js, Python, SQL
      `;
      const result = detectVisaStatus(resume, { visaStatus: "us_citizen" });
      expect(result.visaFlagged).toBe(false);
      expect(result.signals).toHaveLength(0);
    });

    it("does NOT flag empty resume text", () => {
      const result = detectVisaStatus("");
      expect(result.visaFlagged).toBe(false);
      expect(result.signals).toHaveLength(0);
    });

    it("does NOT flag whitespace-only resume text", () => {
      const result = detectVisaStatus("   \n\n  \t  ");
      expect(result.visaFlagged).toBe(false);
    });

    it("does NOT flag unrelated use of 'F1' (not visa)", () => {
      // "F1" could appear in non-visa context like Formula 1
      // Our pattern requires F-1 (with hyphen) or F 1 (with space)
      // Standalone "F1" without separator should NOT match
      const result = detectVisaStatus("F1 racing team management experience");
      expect(result.visaFlagged).toBe(false);
    });
  });

  // =========================================================================
  // Multiple signals
  // =========================================================================
  describe("multiple signals", () => {
    it("detects multiple visa terms in resume text", () => {
      const resume = "H-1B visa holder with OPT experience. Filed I-140.";
      const result = detectVisaStatus(resume);
      expect(result.visaFlagged).toBe(true);
      expect(result.signals.length).toBeGreaterThanOrEqual(3);
      expect(result.signals).toContain("H-1B visa mention");
      expect(result.signals).toContain("OPT (Optional Practical Training) mention");
      expect(result.signals).toContain("I-140 petition mention");
    });

    it("combines context and text signals", () => {
      const resume = "Currently on H-1B visa";
      const context: UserContext = { visaStatus: "h1b" };
      const result = detectVisaStatus(resume, context);
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toContain("User selected H-1B visa status");
      expect(result.signals).toContain("H-1B visa mention");
    });

    it("deduplicates signals", () => {
      // Even if a pattern matches multiple times in text, label should appear once
      const resume = "H-1B visa since 2020. Renewed H-1B in 2023.";
      const result = detectVisaStatus(resume);
      const h1bSignals = result.signals.filter((s) => s === "H-1B visa mention");
      expect(h1bSignals).toHaveLength(1);
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================
  describe("edge cases", () => {
    it("handles context-only flagging (no resume text)", () => {
      const result = detectVisaStatus("", { visaStatus: "opt_cpt" });
      expect(result.visaFlagged).toBe(true);
      expect(result.signals).toHaveLength(1);
    });

    it("handles text-only flagging (no context)", () => {
      const result = detectVisaStatus("Work authorization: H-1B");
      expect(result.visaFlagged).toBe(true);
      expect(result.signals.length).toBeGreaterThanOrEqual(1);
    });

    it("returns empty signals array when no visa detected", () => {
      const result = detectVisaStatus("Regular resume with no visa info");
      expect(result.signals).toEqual([]);
    });

    it("OPT is case-sensitive (uppercase only)", () => {
      // "opt" in lowercase like "option" or "optimal" should NOT match
      const result = detectVisaStatus("This is an optimal solution with many options");
      expect(result.visaFlagged).toBe(false);
    });

    it("CPT is case-sensitive (uppercase only)", () => {
      // "cpt" in lowercase shouldn't match (e.g., "concept")
      const result = detectVisaStatus("The cpt analysis was thorough");
      expect(result.visaFlagged).toBe(false);
    });
  });
});
