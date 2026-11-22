import type { ValidInput } from "./validation";

export type AdvisoryLink = {
  url: string;
  label: string;
};

const MICROSOFT_TITLE = /^microsoft\b/i;

export function buildAdvisoryLink(
  input: Pick<ValidInput, "title" | "cveId">
): AdvisoryLink {
  if (input.cveId) {
    return {
      url: `https://nvd.nist.gov/vuln/detail/${input.cveId}`,
      label: `NVD entry for ${input.cveId}`,
    };
  }

  if (MICROSOFT_TITLE.test(input.title)) {
    return {
      url: "https://msrc.microsoft.com/update-guide",
      label: "Microsoft Security Update Guide",
    };
  }

  const query = encodeURIComponent(input.title);
  return {
    url: `https://nvd.nist.gov/vuln/search/results?form_type=Basic&results_type=overview&query=${query}&search_type=all`,
    label: "Search NVD for this title",
  };
}