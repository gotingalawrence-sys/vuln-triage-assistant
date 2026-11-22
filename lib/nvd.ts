import { z } from "zod";
import type { TriageResult } from "./schema";

const NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_DESCRIPTION_CHARS = 1500;
const MAX_RANGES = 10;

/* ---------- types ---------- */

export type NvdSeverity = "Low" | "Medium" | "High" | "Critical";

export type NvdFacts = {
  cveId: string;
  status: string | null;
  description: string | null;
  cvss: { version: string; score: number; severity: NvdSeverity } | null;
  affectedRanges: string[];
};

export type NvdLookup =
  | { state: "found"; facts: NvdFacts }
  | { state: "not_found" }
  | { state: "unavailable" };

// What the API sends to the UI so it can explain where the data came from.
export type Grounding = {
  lookup: "skipped" | "found" | "not_found" | "unavailable";
  cvss: NvdFacts["cvss"];
};

/* ---------- response shape (only the fields we use) ---------- */

const cvssMetricSchema = z.object({
  type: z.string().optional(),
  baseSeverity: z.string().optional(),
  cvssData: z
    .object({
      baseScore: z.number().optional(),
      baseSeverity: z.string().optional(),
    })
    .optional(),
});

const cpeMatchSchema = z.object({
  vulnerable: z.boolean().optional(),
  criteria: z.string().optional(),
  versionEndExcluding: z.string().optional(),
  versionEndIncluding: z.string().optional(),
});

const cveSchema = z.object({
  id: z.string(),
  vulnStatus: z.string().optional(),
  descriptions: z
    .array(z.object({ lang: z.string(), value: z.string() }))
    .default([]),
  metrics: z
    .object({
      cvssMetricV31: z.array(cvssMetricSchema).optional(),
      cvssMetricV40: z.array(cvssMetricSchema).optional(),
      cvssMetricV30: z.array(cvssMetricSchema).optional(),
      cvssMetricV2: z.array(cvssMetricSchema).optional(),
    })
    .optional(),
  configurations: z
    .array(
      z.object({
        nodes: z
          .array(z.object({ cpeMatch: z.array(cpeMatchSchema).default([]) }))
          .default([]),
      })
    )
    .default([]),
});

const responseSchema = z.object({
  vulnerabilities: z.array(z.object({ cve: cveSchema })).default([]),
});

type Cve = z.infer<typeof cveSchema>;
type CvssMetric = z.infer<typeof cvssMetricSchema>;

/* ---------- parsing ---------- */

function toSeverity(value: string | undefined): NvdSeverity | null {
  switch (value?.toUpperCase()) {
    case "LOW":
      return "Low";
    case "MEDIUM":
      return "Medium";
    case "HIGH":
      return "High";
    case "CRITICAL":
      return "Critical";
    default:
      return null;
  }
}

function pickCvss(metrics: Cve["metrics"]): NvdFacts["cvss"] {
  if (!metrics) return null;

  const groups: [string, CvssMetric[] | undefined][] = [
    ["3.1", metrics.cvssMetricV31],
    ["4.0", metrics.cvssMetricV40],
    ["3.0", metrics.cvssMetricV30],
    ["2.0", metrics.cvssMetricV2],
  ];

  for (const [version, list] of groups) {
    if (!list || list.length === 0) continue;
    const metric = list.find((m) => m.type === "Primary") ?? list[0];
    const score = metric.cvssData?.baseScore;
    const severity = toSeverity(
      metric.cvssData?.baseSeverity ?? metric.baseSeverity
    );
    if (score !== undefined && severity) {
      return { version, score, severity };
    }
  }
  return null;
}

function extractRanges(cve: Cve): string[] {
  const lines = new Set<string>();

  for (const config of cve.configurations) {
    for (const node of config.nodes) {
      for (const match of node.cpeMatch) {
        if (match.vulnerable === false) continue;

        // cpe:2.3:<part>:<vendor>:<product>:...
        const parts = (match.criteria ?? "").split(":");
        const product =
          parts.length > 4 ? `${parts[3]} ${parts[4]}` : "unknown product";

        if (match.versionEndExcluding) {
          lines.add(
            `${product}: versions before ${match.versionEndExcluding} are affected`
          );
        } else if (match.versionEndIncluding) {
          lines.add(
            `${product}: versions up to and including ${match.versionEndIncluding} are affected (fixed version not stated)`
          );
        }
      }
    }
  }
  return Array.from(lines).slice(0, MAX_RANGES);
}

export function parseNvdResponse(json: unknown, cveId: string): NvdLookup {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) return { state: "unavailable" };

  const cve = parsed.data.vulnerabilities
    .map((entry) => entry.cve)
    .find((entry) => entry.id.toUpperCase() === cveId.toUpperCase());
  if (!cve) return { state: "not_found" };

  const english = cve.descriptions.find((d) => d.lang === "en")?.value;

  return {
    state: "found",
    facts: {
      cveId: cve.id,
      status: cve.vulnStatus ?? null,
      description: english ? english.slice(0, MAX_DESCRIPTION_CHARS) : null,
      cvss: pickCvss(cve.metrics),
      affectedRanges: extractRanges(cve),
    },
  };
}

/* ---------- lookup (never throws) ---------- */

const cache = new Map<string, { at: number; lookup: NvdLookup }>();

export async function lookupCve(
  cveId: string,
  options: { fetchImpl?: typeof fetch; now?: number } = {}
): Promise<NvdLookup> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now();
  const key = cveId.toUpperCase();

  const cached = cache.get(key);
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.lookup;

  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.NVD_API_KEY;
  if (apiKey) headers.apiKey = apiKey;

  try {
    const response = await fetchImpl(
      `${NVD_URL}?cveId=${encodeURIComponent(key)}`,
      { headers, signal: AbortSignal.timeout(TIMEOUT_MS) }
    );

    if (response.status === 404) return { state: "not_found" };
    if (!response.ok) return { state: "unavailable" };

    const lookup = parseNvdResponse(await response.json(), key);
    if (lookup.state !== "unavailable") {
      if (cache.size > 500) cache.clear();
      cache.set(key, { at: now, lookup });
    }
    return lookup;
  } catch {
    return { state: "unavailable" };
  }
}

/* ---------- using the facts ---------- */

// The severity comes from NVD's CVSS data, not from the model's judgment.
export function applyNvdSeverity(
  result: TriageResult,
  facts: NvdFacts | null
): TriageResult {
  if (!facts) return result;
  const severity: TriageResult["riskAssessment"]["severity"] = facts.cvss
    ? facts.cvss.severity
    : "Unknown";
  return {
    ...result,
    riskAssessment: { ...result.riskAssessment, severity },
  };
}

export function formatFactsForPrompt(facts: NvdFacts): string {
  const lines = [
    `CVE: ${facts.cveId}`,
    `Status: ${facts.status ?? "not stated"}`,
    facts.cvss
      ? `CVSS ${facts.cvss.version} base score: ${facts.cvss.score} (${facts.cvss.severity})`
      : "CVSS: no score has been published for this CVE yet",
    `Description: ${facts.description ?? "not available"}`,
  ];

  if (facts.affectedRanges.length > 0) {
    lines.push("Affected version ranges:");
    for (const range of facts.affectedRanges) lines.push(`- ${range}`);
  } else {
    lines.push("Affected version ranges: none listed");
  }
  return lines.join("\n");
}
