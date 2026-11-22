import { describe, it, expect } from "vitest";
import { triageResultSchema } from "../lib/schema";

const validResult = {
  explanation: "This update fixes several security flaws in Windows.",
  executiveSummary: "Unpatched computers could be taken over by attackers.",
  riskAssessment: {
    severity: "High",
    rationale: "The update bundles fixes for remotely exploitable flaws.",
  },
  remediationSteps: ["Deploy the November update.", "Restart affected devices."],
  ticketText: "Please deploy the November 2026 Windows security update.",
};

describe("triageResultSchema", () => {
  it("accepts a complete, valid result", () => {
    expect(triageResultSchema.safeParse(validResult).success).toBe(true);
  });

  it("accepts Unknown as a severity for patch bundles", () => {
    const result = {
      ...validResult,
      riskAssessment: { ...validResult.riskAssessment, severity: "Unknown" },
    };
    expect(triageResultSchema.safeParse(result).success).toBe(true);
  });

  it("rejects a result with a missing section", () => {
    const incomplete: Partial<typeof validResult> = { ...validResult };
    delete incomplete.ticketText;
    expect(triageResultSchema.safeParse(incomplete).success).toBe(false);
  });

  it("rejects an invalid severity level", () => {
    const result = {
      ...validResult,
      riskAssessment: { ...validResult.riskAssessment, severity: "Catastrophic" },
    };
    expect(triageResultSchema.safeParse(result).success).toBe(false);
  });

  it("rejects empty remediation steps", () => {
    const result = { ...validResult, remediationSteps: [] };
    expect(triageResultSchema.safeParse(result).success).toBe(false);
  });
});