# Vulnerability Triage Assistant

[![CI](https://github.com/gotingalawrence-sys/vuln-triage-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/gotingalawrence-sys/vuln-triage-assistant/actions/workflows/ci.yml)

An AI-powered web app that turns a vulnerability title or CVE ID into a structured, workflow-ready analysis in seconds: a plain-language explanation, an executive summary, a risk assessment, remediation steps, and text ready to paste into a ServiceNow ticket.

- **Live app:** https://vuln-triage-assistant.vercel.app/- 
- **2-minute demo:** https://drive.google.com/file/d/1mm0qu1ikAE7CnpfXqk-HDF6Pcf02LFLz/view?usp=sharing
- **Author:** Lawrence Godfrey Gotinga
- **Context:** Week 4 Graded Assignment 4.2, AI-Powered Web Application

## The problem

Workstation vulnerability specialists receive scan exports with hundreds of findings. Scanners such as Qualys find and route vulnerabilities, but the specialist still has to research each one, understand it, and work out how to fix it by hand. In the author's own workflow that is roughly 20-30 unique vulnerability titles per week (about 100k findings) and about 30-60 minutes of triage per title (firsthand estimates).

## Who it is for

A workstation vulnerability specialist who needs to decide quickly what a vulnerability means and how to remediate it. Information security analysts and server remediation teams are secondary users.

## What it does

Enter a vulnerability title (for example, `Microsoft Windows Security Update for November 2026`) or a CVE ID (for example, `CVE-2021-44228`), optionally add notes such as scanner solution text or KB numbers, and get:

1. **Explanation:** what the vulnerability or update is, in plain language
2. **Executive summary:** 2-3 sentences on business impact for a non-technical reader
3. **Risk assessment:** severity (Low, Medium, High, Critical, or Unknown) with a rationale; for CVE IDs, the severity comes from the official NVD CVSS score
4. **Remediation steps:** ordered, concrete actions
5. **Ticket-ready text:** formatted for a ServiceNow ticket, with a copy button

Every result also shows a **"verify before deploying"** note and an **advisory link built by the app** (never by the AI).

### Grounded in official NVD data

For a CVE ID, the app looks up the official record in the [NVD](https://nvd.nist.gov/) and gives the description, CVSS score, and affected version ranges to the AI, so it explains facts instead of recalling them from memory. The severity is set from the CVSS score in code, not by the model. The UI says where the data came from:

- **Source: NVD record:** the analysis is grounded in the official record
- **Not scored yet:** NVD has the CVE but has not published a CVSS score
- **Not verified:** NVD has no record for the ID or could not be reached, so the analysis relies on the AI alone
- **Not rated:** the input is not a CVE ID (for example, a monthly patch bundle), so there is nothing to look up

### Success metric

Reduce triage time per vulnerability title by at least 50% (from a 30-60 minute baseline).

**Measured result:** about 3 minutes per vulnerability title with the tool, compared with the 30-60 minute manual baseline, which is roughly a 90-95% reduction. This is the author's own estimate from real use, not a controlled study.

## How it works

```
Browser UI -> Next.js API route -> input validation
          -> NVD lookup (CVE IDs only) -> Gemini (via Vercel AI SDK)
          -> schema check (zod) -> severity from NVD CVSS -> advisory link builder
          -> result and source note back to the UI
```

See [architecture.md](architecture.md) for components, the request lifecycle, trust boundaries, and design decisions.

## Tech stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Vercel AI SDK with the Google Gemini API (free tier)
- NVD CVE API 2.0 for official CVE data
- zod for input and output schemas
- Vitest for unit tests
- GitHub Actions for CI; Vercel for hosting
- Vercel Analytics and Vercel Logs for monitoring

## Getting started

### Prerequisites

- A current LTS release of Node.js (CI runs on Node 24)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Setup

```bash
git clone https://github.com/gotingalawrence-sys/vuln-triage-assistant.git
cd vuln-triage-assistant
npm install
```

Create a file named `.env.local` in the project root:

```
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here

# Optional: override the default Gemini model (default: gemini-3.5-flash-lite)
# GEMINI_MODEL=

# Optional: NVD API key. Raises NVD rate limits; the app works without it.
# NVD_API_KEY=
```

`.env.local` is git-ignored. Never commit a real key. `.env.example` shows the expected variables with placeholders only.

### Run

```bash
npm run dev
```

Open http://localhost:3000.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | Lint the code |
| `npm test` | Run the unit tests |

## Testing

40 unit tests (Vitest) cover:

- Input validation (titles, CVE IDs, extra notes, control characters, length limits)
- Advisory link building (CVE page, Microsoft Security Update Guide, search fallback)
- Prompt building (including escaping to resist prompt injection through notes and NVD text)
- NVD parsing, severity override, and lookup fallbacks (using mocked responses, so tests never call the live API)
- The output schema (valid results, missing sections, invalid severity, empty steps)
- The rate limiter

The same lint, test, and build steps run automatically on every push through GitHub Actions (`.github/workflows/ci.yml`).

## Security and safeguards

- **No hardcoded secrets.** The API key is read from a server-side environment variable only. It is set in Vercel's dashboard for production and in `.env.local` for development. GitHub push protection also scans every push.
- **Server-side input validation.** Titles are limited to 3-200 characters and an allowed character set. Notes are limited to 2000 characters. Request bodies over 10,000 characters are rejected.
- **AI output is validated.** Responses must match the zod schema or the user sees a friendly error. AI text is rendered as plain text, never as HTML.
- **Prompt-injection resistance.** User input and NVD text are passed as data inside tags, angle brackets are escaped, and the system prompt tells the model to ignore instructions found there.
- **Severity comes from data.** When NVD has a CVSS score, the app sets the severity itself instead of trusting the model.
- **App-built advisory links.** The model never generates URLs, so links cannot be fabricated.
- **Rate limiting.** 10 requests per minute per client on the API route (best effort, see limitations).
- **Public data only.** The UI reminds users to submit public vulnerability titles only, because free AI tiers may use inputs to improve provider products.

## CI/CD, deployment, and monitoring

- **CI:** GitHub Actions runs `npm ci`, lint, tests, and a production build on every push to `main` and on pull requests.
- **Deployment:** Vercel is connected to this repository and deploys automatically on every push to `main`. The API key is stored as an environment variable in Vercel.
- **Monitoring:** Vercel Analytics tracks page visits (not user input), and Vercel's Logs tab shows server-side errors from the API route.

## Known limitations

- **The AI can still be wrong.** For CVE IDs, NVD data reduces the risk of an incorrect fixed version, but results must still be checked against the vendor advisory. For titles without a CVE ID (such as patch bundles), there is no grounding data, so the AI may state an incorrect fixed version or lack knowledge of very recent releases. The app mitigates this with the verify-before-deploying note, an advisory link, an optional notes field, and the `Unknown` severity for bundles.
- **NVD limits.** NVD may not have scored a new CVE yet, and unauthenticated NVD requests are heavily rate limited. The app times out after 8 seconds, caches lookups for an hour, and falls back to an AI-only answer labeled "not verified." An optional `NVD_API_KEY` raises the limit.
- **Version ranges need judgment.** A range such as "versions before 2.17.0 are affected" is read as "2.17.0 is the first fixed version of that release line," which should still be confirmed in the vendor advisory.
- **NVD search fallback is limited.** For titles without a CVE ID (other than Microsoft titles), the link is an NVD keyword search. NVD requires all keywords to match, so long titles may return nothing. NIST has also changed its search URLs before, so this link format may need updating.
- **Rate limiting is in-memory.** On a serverless host each instance keeps its own counters, so the limit is best effort.
- **Free-tier model limits.** The Gemini free tier has per-minute and per-day request limits, and model names change over time (see `GEMINI_MODEL`).
- **Generic remediation.** Remediation steps can be generic and are not tailored to a specific endpoint management tool yet.

## Roadmap (v2 ideas)

- Ground titles without a CVE ID (for example, monthly patch bundles) with vendor data such as the Microsoft Security Update Guide
- Device-level remediation tracking
- Spreadsheet upload for scan exports
- Saved history and user accounts
- Tune remediation steps for enterprise deployment tools

See the open GitHub issue for the planned v2 improvement: https://github.com/gotingalawrence-sys/vuln-triage-assistant/issues/1.

## Project documents

- [docs/](docs/): product requirements document (PRD)
- [spec.md](spec.md): specification (with revision log)
- [architecture.md](architecture.md): architecture notes
- [CLAUDE.md](CLAUDE.md) and [.cursorrules](.cursorrules): instructions for AI coding assistants
- [REFLECTION_LINK_HERE]: - [reflection.pdf](reflection.pdf): one-page reflection

## AI-assisted development

This project was planned and built with AI assistance (Claude). The PRD, spec, and assistant instruction files were written first, and the code was built in small, tested commits that the author reviewed and ran.
