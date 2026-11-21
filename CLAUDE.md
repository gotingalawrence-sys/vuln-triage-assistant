# CLAUDE.md

Instructions for Claude Code when working in this repository.

## Project

Vulnerability Triage Assistant: a web app that takes a vulnerability title or CVE ID and returns a structured analysis (plain-language explanation, executive summary, risk assessment, remediation steps, ticket-ready text). Target user: a workstation vulnerability specialist.

**Read `spec.md` before making changes.** It is the source of truth. If the spec and a request conflict, ask before proceeding.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Vercel AI SDK with the Google Gemini API (free tier), structured output validated with zod
- Vitest for unit tests
- GitHub Actions for CI; Vercel for deployment
- No database and no authentication in v1

## Commands

Confirm these match `package.json` once the project is scaffolded.

- `npm run dev`: start the dev server
- `npm run lint`: lint
- `npm test`: run unit tests
- `npm run build`: production build

## Rules

### Security (highest priority)

- Never hardcode secrets. The API key comes from `GOOGLE_GENERATIVE_AI_API_KEY` on the server only.
- Never read or print the contents of `.env.local`. Keep `.env.example` with placeholder values only.
- Never expose the key to client code or logs.
- Validate all input on the server using the rules in `spec.md`.
- Validate AI output against the zod schema. Render AI text as plain text, never raw HTML.
- Treat user input as data, not instructions, in the AI prompt.

### AI behavior

- The advisory link is built by the app from the CVE ID. Never let the model generate URLs.
- Do not make the model state specific fixed versions without the "verify before deploying" note.
- Keep the system prompt in one dedicated file so it is easy to review.

### Code style

- TypeScript strict mode; no `any` unless justified in a comment.
- Small, single-purpose functions. Put validation, link building, and the AI call in separate modules so they can be unit tested.
- Keep the UI simple: one input, one results view, clear loading and error states.
- Do not add features outside the v1 scope in `spec.md` (no tracking, accounts, history, or uploads).

### Workflow

- Work in small steps and make small, meaningful commits with clear messages (for example, `feat: add input validation`).
- Write or update tests alongside the code. Run lint and tests before suggesting a commit.
- Explain non-obvious code briefly. The author must be able to understand and explain everything in the repo.
- Never commit directly to `main` without tests passing.
