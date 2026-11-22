import { describe, it, expect } from "vitest";
import { buildAdvisoryLink } from "../lib/advisory";

describe("buildAdvisoryLink", () => {
  it("links to the NVD detail page when a CVE ID is present", () => {
    const link = buildAdvisoryLink({
      title: "CVE-2026-12345",
      cveId: "CVE-2026-12345",
    });
    expect(link.url).toBe("https://nvd.nist.gov/vuln/detail/CVE-2026-12345");
  });

  it("links to the Microsoft Security Update Guide for Microsoft titles without a CVE ID", () => {
    const link = buildAdvisoryLink({
      title: "Microsoft Windows Security Update for November 2026",
      cveId: null,
    });
    expect(link.url).toBe("https://msrc.microsoft.com/update-guide");
  });

  it("falls back to an encoded NVD search for other titles", () => {
    const link = buildAdvisoryLink({
      title: "Google Chrome Security Update",
      cveId: null,
    });
    expect(link.url).toContain("https://nvd.nist.gov/vuln/search/results");
    expect(link.url).toContain("query=Google%20Chrome%20Security%20Update");
  });

  it("does not treat titles that merely contain 'Microsoft' later as Microsoft titles", () => {
    const link = buildAdvisoryLink({
      title: "Adobe Update for Microsoft Edge Extension",
      cveId: null,
    });
    expect(link.url).toContain("nvd.nist.gov");
  });
});