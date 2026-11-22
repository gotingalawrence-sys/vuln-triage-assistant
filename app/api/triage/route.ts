import { NextResponse } from "next/server";
import { validateInput } from "../../../lib/validation";
import { buildAdvisoryLink } from "../../../lib/advisory";
import { runTriage, TriageError } from "../../../lib/triage";
import { createRateLimiter } from "../../../lib/rateLimit";
import {
  applyNvdSeverity,
  lookupCve,
  type Grounding,
  type NvdLookup,
} from "../../../lib/nvd";

const MAX_BODY_CHARS = 10_000;
const isAllowed = createRateLimiter(10, 60_000);

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const clientId = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  if (!isAllowed(clientId)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const data = (typeof body === "object" && body !== null ? body : {}) as {
    title?: unknown;
    notes?: unknown;
  };

  const validation = validateInput(data.title, data.notes);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    // Only CVE IDs can be looked up in NVD. Titles like patch bundles skip this step.
    const lookup: NvdLookup | null = validation.value.cveId
      ? await lookupCve(validation.value.cveId)
      : null;
    const facts = lookup?.state === "found" ? lookup.facts : null;

    const aiResult = await runTriage(validation.value, facts);
    const result = applyNvdSeverity(aiResult, facts);
    const advisory = buildAdvisoryLink(validation.value);
    const grounding: Grounding = {
      lookup: lookup?.state ?? "skipped",
      cvss: facts?.cvss ?? null,
    };

    return NextResponse.json({ result, advisory, grounding });
  } catch (error) {
    const message =
      error instanceof TriageError
        ? error.message
        : "Something went wrong. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
