import { describe, it, expect, vi } from "vitest";
import {
  parseNvdResponse,
  applyNvdSeverity,
  lookupCve,
  type NvdFacts,
} from "../lib/nvd";
import type { TriageResult } from "../lib/schema";

// A made-up CVE in the NVD response shape, so the tests never depend on the live API.
const sampleResponse = {
  vulnerabilities: [
    {
      cve: {
        id: "CVE-2099-0001",
        vulnStatus: "Analyzed",
        descriptions: [
          { lang: "es", value: "Descripcion en espanol." },
          { lang: "en", value: "A flaw in ExampleLib allows remote code execution." },
        ],
        metrics: {
          cvssMetricV31: [
            {
              type: "Secondary",
              cvssData: { version: "3.1", baseScore: 5.0, baseSeverity: "MEDIUM" },
            },
            {
              type: "Primary",
              cvssData: { version: "3.1", baseScore: 9.8, baseSeverity: "CRITICAL" },
            },
          ],
        },
        configurations: [
          {
            nodes: [
              {
                cpeMatch: [
                  {
                    vulnerable: true,
                    criteria: "cpe:2.3:a:example:examplelib:*:*:*:*:*:*:*:*",
                    versionEndExcluding: "2.5.1",
                  },
                  {
                    vulnerable: false,
                    criteria: "cpe:2.3:o:example:os:-:*:*:*:*:*:*:*",
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

const modelResult: TriageResult = {
  explanation: "A flaw that allows remote code execution.",
  executiveSummary: "Attackers could take over affected systems.",
  riskAssessment: { severity: "Medium", rationale: "Model guess." },
  remediationSteps: ["Update ExampleLib."],
  ticketText: "Please update ExampleLib.",
};

function factsWith(cvss: NvdFacts["cvss"]): NvdFacts {
  return {
    cveId: "CVE-2099-0001",
    status: "Analyzed",
    description: "A flaw.",
    cvss,
    affectedRanges: [],
  };
}

describe("parseNvdResponse", () => {
  it("extracts the English description, primary CVSS score, and affected ranges", () => {
    const lookup = parseNvdResponse(sampleResponse, "CVE-2099-0001");
    expect(lookup.state).toBe("found");
    if (lookup.state !== "found") return;

    expect(lookup.facts.description).toBe(
      "A flaw in ExampleLib allows remote code execution."
    );
    expect(lookup.facts.cvss).toEqual({
      version: "3.1",
      score: 9.8,
      severity: "Critical",
    });
    expect(lookup.facts.affectedRanges).toEqual([
      "example examplelib: versions before 2.5.1 are affected",
    ]);
  });

  it("falls back to an older CVSS version when newer ones are missing", () => {
    const response = {
      vulnerabilities: [
        {
          cve: {
            id: "CVE-2099-0002",
            metrics: {
              cvssMetricV2: [
                {
                  type: "Primary",
                  baseSeverity: "HIGH",
                  cvssData: { baseScore: 7.5 },
                },
              ],
            },
          },
        },
      ],
    };
    const lookup = parseNvdResponse(response, "CVE-2099-0002");
    expect(lookup.state === "found" && lookup.facts.cvss).toEqual({
      version: "2.0",
      score: 7.5,
      severity: "High",
    });
  });

  it("returns found with no CVSS when NVD has not scored the CVE", () => {
    const response = { vulnerabilities: [{ cve: { id: "CVE-2099-0003" } }] };
    const lookup = parseNvdResponse(response, "CVE-2099-0003");
    expect(lookup.state === "found" && lookup.facts.cvss).toBeNull();
  });

  it("returns not_found when the CVE is not in the response", () => {
    expect(parseNvdResponse({ vulnerabilities: [] }, "CVE-2099-0004")).toEqual({
      state: "not_found",
    });
  });

  it("returns unavailable for a malformed response", () => {
    expect(parseNvdResponse({ vulnerabilities: "nope" }, "CVE-2099-0005")).toEqual({
      state: "unavailable",
    });
  });
});

describe("applyNvdSeverity", () => {
  it("replaces the model's severity with the CVSS severity from NVD", () => {
    const result = applyNvdSeverity(
      modelResult,
      factsWith({ version: "3.1", score: 9.8, severity: "Critical" })
    );
    expect(result.riskAssessment.severity).toBe("Critical");
  });

  it("forces Unknown when NVD has no CVSS score", () => {
    const result = applyNvdSeverity(modelResult, factsWith(null));
    expect(result.riskAssessment.severity).toBe("Unknown");
  });

  it("leaves the result unchanged when there are no NVD facts", () => {
    expect(applyNvdSeverity(modelResult, null)).toBe(modelResult);
  });
});

describe("lookupCve", () => {
  it("returns facts and caches the result for repeat lookups", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(sampleResponse), { status: 200 })
    );
    const first = await lookupCve("CVE-2099-0001", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const second = await lookupCve("CVE-2099-0001", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(first.state).toBe("found");
    expect(second.state).toBe("found");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns unavailable when NVD responds with an error status", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const lookup = await lookupCve("CVE-2099-0010", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(lookup.state).toBe("unavailable");
  });

  it("returns unavailable when the request fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const lookup = await lookupCve("CVE-2099-0011", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(lookup.state).toBe("unavailable");
  });

  it("returns not_found when NVD responds with 404", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404 }));
    const lookup = await lookupCve("CVE-2099-0012", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(lookup.state).toBe("not_found");
  });
});
