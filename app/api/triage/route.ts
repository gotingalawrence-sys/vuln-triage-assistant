import { NextResponse } from "next/server";
import { validateInput } from "../../../lib/validation";
import { buildAdvisoryLink } from "../../../lib/advisory";
import { runTriage, TriageError } from "../../../lib/triage";
import { createRateLimiter } from "../../../lib/rateLimit";

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
    const result = await runTriage(validation.value);
    const advisory = buildAdvisoryLink(validation.value);
    return NextResponse.json({ result, advisory });
  } catch (error) {
    const message =
      error instanceof TriageError
        ? error.message
        : "Something went wrong. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}