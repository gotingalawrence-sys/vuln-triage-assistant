"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import type { TriageResult } from "../lib/schema";
import type { AdvisoryLink } from "../lib/advisory";
import type { Grounding } from "../lib/nvd";

type Severity = TriageResult["riskAssessment"]["severity"];
type ApiSuccess = {
  result: TriageResult;
  advisory: AdvisoryLink;
  grounding: Grounding;
};

const SCALE = ["Low", "Medium", "High", "Critical"] as const;
const SEGMENT_FILL = [
  "bg-sev-low",
  "bg-sev-medium",
  "bg-sev-high",
  "bg-sev-critical",
];
const SEVERITY_TEXT: Record<Severity, string> = {
  Low: "text-sev-low",
  Medium: "text-sev-medium",
  High: "text-sev-high",
  Critical: "text-sev-critical",
  Unknown: "text-sev-unknown",
};
const EXAMPLES = [
  "Microsoft Windows Security Update for November 2026",
  "CVE-2021-44228",
  "Google Chrome Security Update",
];

/* ---------- icons ---------- */

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1em] w-[1em] shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <IconBase>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </IconBase>
  );
}

function CheckIcon() {
  return (
    <IconBase>
      <path d="M5 12l4 4 10-10" />
    </IconBase>
  );
}

function InfoIcon() {
  return (
    <IconBase>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </IconBase>
  );
}

function ExternalIcon() {
  return (
    <IconBase>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </IconBase>
  );
}

function SpinnerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 animate-spin motion-reduce:animate-none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity=".25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------- small components ---------- */

function CopyButton({ text, idleLabel }: { text: string; idleLabel: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-md border border-rule bg-white px-3 py-1.5 text-sm font-medium text-ink hover:border-cobalt hover:text-cobalt"
    >
      {state === "copied" ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Copy failed. Select the text instead."
            : idleLabel}
      </span>
    </button>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-medium">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SeverityScale({ severity }: { severity: Severity }) {
  const index = SCALE.findIndex((level) => level === severity);

  return (
    <div
      role="img"
      aria-label={
        index >= 0 ? `Severity scale: ${severity}` : "Severity not rated"
      }
    >
      <div className="flex gap-1.5">
        {SCALE.map((level, i) => (
          <div
            key={level}
            style={{ "--i": i } as CSSProperties}
            className={`h-3 flex-1 rounded-sm ${
              index >= i ? `${SEGMENT_FILL[i]} segment-in` : "bg-rule"
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 text-sm text-ink-soft">
        {SCALE.map((level) => (
          <span
            key={level}
            className={`flex-1 ${level === severity ? "font-semibold text-ink" : ""}`}
          >
            {level}
          </span>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true">
      <p className="mb-4 text-ink-soft">
        Analyzing. This usually takes a few seconds.
      </p>
      <div className="space-y-4 motion-safe:animate-pulse">
        <div className="h-40 rounded-lg border border-rule bg-white" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="h-64 rounded-lg border border-rule bg-white" />
          <div className="h-64 rounded-lg border border-rule bg-white" />
        </div>
      </div>
    </div>
  );
}

function severityLabel(severity: Severity, grounding: Grounding): string {
  if (severity !== "Unknown") return severity;
  if (grounding.lookup === "found") return "Not scored yet";
  if (grounding.lookup === "skipped") return "Not rated";
  return "Not verified";
}

function GroundingNote({ grounding }: { grounding: Grounding }) {
  let text: string | null = null;

  if (grounding.lookup === "found") {
    text = grounding.cvss
      ? `Source: NVD record, CVSS ${grounding.cvss.version} base score ${grounding.cvss.score}.`
      : "Source: NVD record. NVD has not published a CVSS score for this CVE yet.";
  } else if (grounding.lookup === "not_found") {
    text = "NVD has no record for this CVE ID, so this analysis is not verified.";
  } else if (grounding.lookup === "unavailable") {
    text = "NVD could not be reached, so this analysis is not verified.";
  }

  if (!text) return null;
  return <p className="mt-3 text-sm text-ink-soft">{text}</p>;
}

/* ---------- page ---------- */

export default function Home() {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [submittedTitle, setSubmittedTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiSuccess | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    setSubmittedTitle(title.trim());

    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
      } else {
        setData(json as ApiSuccess);
      }
    } catch {
      setError(
        "Could not reach the server. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4 sm:px-8">
          <span className="text-cobalt">
            <ShieldIcon />
          </span>
          <p className="font-serif text-lg font-medium">
            Vulnerability Triage Assistant
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 sm:px-8">
        <section className="pt-10 sm:pt-14">
          <h1 className="max-w-2xl font-serif text-4xl font-medium leading-tight sm:text-5xl">
            Triage a vulnerability in minutes
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">
            Enter a vulnerability title or CVE ID. Get a plain-language
            explanation, a risk rating, fix steps, and text you can paste into
            a ticket.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-lg border border-rule bg-white p-5 sm:p-6"
          >
            <label htmlFor="title" className="block font-medium">
              Vulnerability title or CVE ID
            </label>
            <input
              id="title"
              ref={inputRef}
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Microsoft Windows Security Update for November 2026"
              className="mt-2 h-12 w-full rounded-md border border-rule bg-white px-3 text-base placeholder:text-ink-soft/70"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-soft">Examples:</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setTitle(example);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-rule px-3 py-1 text-left text-sm hover:border-cobalt hover:text-cobalt"
                >
                  {example}
                </button>
              ))}
            </div>

            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-medium text-cobalt hover:text-cobalt-deep">
                Add scanner notes (optional)
              </summary>
              <label
                htmlFor="notes"
                className="mt-3 block text-sm text-ink-soft"
              >
                Paste solution text, KB numbers, or version details from your
                scanner. The AI uses them for fix details.
              </label>
              <textarea
                id="notes"
                rows={4}
                maxLength={2000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 w-full rounded-md border border-rule bg-white px-3 py-2 text-base"
              />
              <p className="mt-1 text-right text-xs text-ink-soft">
                {notes.length}/2000
              </p>
            </details>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-cobalt px-5 font-medium text-white hover:bg-cobalt-deep disabled:opacity-70"
              >
                {loading && <SpinnerIcon />}
                {loading ? "Analyzing" : "Analyze vulnerability"}
              </button>
              <p className="flex items-start gap-2 text-sm text-ink-soft">
                <span className="mt-1">
                  <InfoIcon />
                </span>
                <span>
                  Public titles and CVE IDs only. Do not enter internal company
                  or device data.
                </span>
              </p>
            </div>
          </form>
        </section>

        <div aria-live="polite" className="mt-10">
          {loading && <LoadingSkeleton />}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rule border-l-4 border-l-sev-critical bg-white p-4"
            >
              <p className="font-medium">Could not analyze this input</p>
              <p className="mt-1 text-ink-soft">{error}</p>
            </div>
          )}

          {data && (
            <div>
              <div className="rounded-lg border border-rule bg-white p-5 sm:p-7">
                <h2 className="break-words font-serif text-2xl font-medium sm:text-3xl">
                  {submittedTitle}
                </h2>
                <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,18rem)_1fr] md:items-start">
                  <div>
                    <p
                      className={`font-serif text-4xl font-semibold ${SEVERITY_TEXT[data.result.riskAssessment.severity]}`}
                    >
                      {severityLabel(
                        data.result.riskAssessment.severity,
                        data.grounding
                      )}
                    </p>
                    <div className="mt-3">
                      <SeverityScale
                        severity={data.result.riskAssessment.severity}
                      />
                    </div>
                    <GroundingNote grounding={data.grounding} />
                  </div>
                  <p className="max-w-prose whitespace-pre-wrap">
                    {data.result.riskAssessment.rationale}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-8">
                  <Section title="What it is">
                    <p className="max-w-prose whitespace-pre-wrap">
                      {data.result.explanation}
                    </p>
                  </Section>

                  <Section
                    title="Executive summary"
                    action={
                      <CopyButton
                        text={data.result.executiveSummary}
                        idleLabel="Copy summary"
                      />
                    }
                  >
                    <p className="max-w-prose whitespace-pre-wrap">
                      {data.result.executiveSummary}
                    </p>
                  </Section>

                  <Section title="How to fix it">
                    <ol className="space-y-3">
                      {data.result.remediationSteps.map((step, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                            {index + 1}
                          </span>
                          <span className="max-w-prose">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </Section>
                </div>

                <aside className="space-y-6">
                  <div className="rounded-lg border border-rule border-l-4 border-l-sev-medium bg-white p-4">
                    <h2 className="font-serif text-lg font-medium">
                      Before you deploy
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      The AI can get fixed versions wrong. Check the version
                      against the vendor advisory.
                    </p>
                    <a
                      href={data.advisory.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
                    >
                      {data.advisory.label}
                      <ExternalIcon />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>

                  <div className="rounded-lg border border-rule bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-serif text-lg font-medium">
                        Ticket text
                      </h2>
                      <CopyButton
                        text={data.result.ticketText}
                        idleLabel="Copy ticket text"
                      />
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      Ready to paste into ServiceNow.
                    </p>
                    <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-fog p-3 font-sans text-sm leading-relaxed">
                      {data.result.ticketText}
                    </pre>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-rule bg-white">
        <p className="mx-auto max-w-5xl px-5 py-4 text-sm text-ink-soft sm:px-8">
          AI-generated analysis. Always verify fixed versions and severity
          against the vendor advisory before you act.
        </p>
      </footer>
    </div>
  );
}
