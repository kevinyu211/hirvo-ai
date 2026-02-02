import { describe, it, expect } from "vitest";
import {
  VISA_OPTIMIZATION_RULES,
  VISA_OPTIMIZATION_CATEGORY,
  getVisaOptimizationRules,
  buildVisaContextSection,
} from "@/lib/prompts/visa-prompts";

// =============================================================================
// VISA_OPTIMIZATION_RULES constant
// =============================================================================

describe("VISA_OPTIMIZATION_RULES", () => {
  it("contains Rule 1: Never Remove Work Authorization Information", () => {
    expect(VISA_OPTIMIZATION_RULES).toContain(
      "Never Remove Work Authorization Information"
    );
    expect(VISA_OPTIMIZATION_RULES).toContain(
      "Do NOT suggest removing, hiding, or downplaying"
    );
  });

  it("contains Rule 2: Frame Authorization Positively", () => {
    expect(VISA_OPTIMIZATION_RULES).toContain(
      "Frame Authorization Positively"
    );
    expect(VISA_OPTIMIZATION_RULES).toContain(
      "Authorized to work in the United States"
    );
  });

  it("contains Rule 3: Suggest Optimal Placement", () => {
    expect(VISA_OPTIMIZATION_RULES).toContain(
      "Suggest Optimal Placement for Authorization Details"
    );
    expect(VISA_OPTIMIZATION_RULES).toContain("header/contact section");
  });

  it("contains Rule 4: Avoid Misrepresenting Employment Eligibility", () => {
    expect(VISA_OPTIMIZATION_RULES).toContain(
      "Avoid Misrepresenting Employment Eligibility"
    );
    expect(VISA_OPTIMIZATION_RULES).toContain(
      "NEVER suggest language that could misrepresent"
    );
  });

  it("contains Rule 5: Visa-Specific Category", () => {
    expect(VISA_OPTIMIZATION_RULES).toContain("visa_optimization");
    expect(VISA_OPTIMIZATION_RULES).toContain('type "hr"');
  });

  it("mentions H-1B, OPT, CPT, EAD visa types", () => {
    expect(VISA_OPTIMIZATION_RULES).toContain("H-1B");
    expect(VISA_OPTIMIZATION_RULES).toContain("OPT");
    expect(VISA_OPTIMIZATION_RULES).toContain("CPT");
    expect(VISA_OPTIMIZATION_RULES).toContain("EAD");
  });

  it("emphasizes preservation over modification", () => {
    expect(VISA_OPTIMIZATION_RULES).toContain(
      "err on the side of preserving the original text"
    );
  });
});

// =============================================================================
// VISA_OPTIMIZATION_CATEGORY
// =============================================================================

describe("VISA_OPTIMIZATION_CATEGORY", () => {
  it('equals "visa_optimization"', () => {
    expect(VISA_OPTIMIZATION_CATEGORY).toBe("visa_optimization");
  });
});

// =============================================================================
// getVisaOptimizationRules
// =============================================================================

describe("getVisaOptimizationRules", () => {
  it("returns the visa rules when visaFlagged is true", () => {
    const rules = getVisaOptimizationRules(true);
    expect(rules).toBe(VISA_OPTIMIZATION_RULES);
    expect(rules.length).toBeGreaterThan(0);
  });

  it("returns an empty string when visaFlagged is false", () => {
    const rules = getVisaOptimizationRules(false);
    expect(rules).toBe("");
  });
});

// =============================================================================
// buildVisaContextSection
// =============================================================================

describe("buildVisaContextSection", () => {
  it("returns an empty string when visaFlagged is false", () => {
    const section = buildVisaContextSection(false, ["H-1B visa mention"]);
    expect(section).toBe("");
  });

  it("returns a visa context section when visaFlagged is true", () => {
    const section = buildVisaContextSection(true, ["H-1B visa mention"]);
    expect(section).toContain("## Visa / Work Authorization Context");
    expect(section).toContain("H-1B visa mention");
  });

  it("includes all provided signals", () => {
    const signals = [
      "H-1B visa mention",
      "Work authorization mention",
      "Visa sponsorship mention",
    ];
    const section = buildVisaContextSection(true, signals);

    for (const signal of signals) {
      expect(section).toContain(`- ${signal}`);
    }
  });

  it("handles empty signals array", () => {
    const section = buildVisaContextSection(true, []);
    expect(section).toContain("## Visa / Work Authorization Context");
    expect(section).toContain(
      "Visa-related content detected (specific signals not available)"
    );
  });

  it("handles undefined signals", () => {
    const section = buildVisaContextSection(true);
    expect(section).toContain("## Visa / Work Authorization Context");
    expect(section).toContain(
      "Visa-related content detected (specific signals not available)"
    );
  });

  it("includes instruction to apply visa-aware rules", () => {
    const section = buildVisaContextSection(true, ["OPT mention"]);
    expect(section).toContain(
      "Apply the visa-aware optimization rules from the system prompt"
    );
  });
});
