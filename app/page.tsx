"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { TriageResult } from "../lib/schema";
import type { AdvisoryLink } from "../lib/advisory";

type ApiSuccess = { result: TriageResult; advisory: AdvisoryLink };

const SEVERITY_STYLES: Record<TriageResult["riskAssessment"]["severity"], string> = {
  Low: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High: "bg-orange-100 text-orange-800",
  Critical: "bg-red-100 text-red-800",
  Unknown: "bg-gray-200 text-gray-800",
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    setCopied(false);

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
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyTicket() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.result.ticketText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy automatically. Select the text and copy it manually.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold">Vulnerability Triage Assistant</h1>
        <p className="mt-2 text-gray-600">
          Enter a vulnerability title or CVE ID to get a plain-language explanation,
          an executive summary, a risk assessment, remediation steps, and
          ticket-ready text.
        </p>

        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Only submit public vulnerability titles or CVE IDs. Never enter internal
          company or device data.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              Vulnerability title or CVE ID
            </label>
            <input
              id="title"
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Microsoft Windows Security Update for November 2026"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium">
              Extra notes (optional)
            </label>
            <textarea
              id="notes"
              rows={4}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste scanner solution text, KB numbers, or version details"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-md border border-red-300 bg-red-50 p-3 text-red-800"
          >
            {error}
          </div>
        )}

        {data && (
          <div className="mt-8 space-y-4">
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Verify the fixed version against the vendor advisory before deploying.{" "}
              <a
                href={data.advisory.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 underline"
              >
                {data.advisory.label}
              </a>
            </p>

            <Card title="Explanation">
              <p className="whitespace-pre-wrap">{data.result.explanation}</p>
            </Card>

            <Card title="Executive summary">
              <p className="whitespace-pre-wrap">{data.result.executiveSummary}</p>
            </Card>

            <Card title="Risk assessment">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${SEVERITY_STYLES[data.result.riskAssessment.severity]}`}
              >
                {data.result.riskAssessment.severity}
              </span>
              <p className="mt-2 whitespace-pre-wrap">
                {data.result.riskAssessment.rationale}
              </p>
            </Card>

            <Card title="Remediation steps">
              <ol className="list-decimal space-y-1 pl-5">
                {data.result.remediationSteps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </Card>

            <Card title="Ticket-ready text">
              <pre className="whitespace-pre-wrap rounded-md bg-gray-100 p-3 font-sans text-sm">
                {data.result.ticketText}
              </pre>
              <button
                type="button"
                onClick={copyTicket}
                className="mt-3 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium hover:bg-gray-100"
              >
                {copied ? "Copied!" : "Copy ticket text"}
              </button>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}