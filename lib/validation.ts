export const TITLE_MIN = 3;
export const TITLE_MAX = 200;
export const NOTES_MAX = 2000;

const CVE_PATTERN = /^CVE-\d{4}-\d{4,}$/i;
const TITLE_ALLOWED = /^[\p{L}\p{N} \-_.,:()\[\]\/+]+$/u;
// Control characters, except tab (\t), line feed (\n) and carriage return (\r)
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export type ValidInput = {
  title: string;
  notes: string;
  cveId: string | null;
};

export type ValidationResult =
  | { ok: true; value: ValidInput }
  | { ok: false; error: string };

export function validateInput(
  rawTitle: unknown,
  rawNotes?: unknown
): ValidationResult {
  if (typeof rawTitle !== "string") {
    return { ok: false, error: "Title must be text." };
  }

  const title = rawTitle.trim();

  if (title.length === 0) {
    return { ok: false, error: "Please enter a vulnerability title or CVE ID." };
  }
  if (title.length < TITLE_MIN) {
    return { ok: false, error: `Title must be at least ${TITLE_MIN} characters.` };
  }
  if (title.length > TITLE_MAX) {
    return { ok: false, error: `Title must be at most ${TITLE_MAX} characters.` };
  }
  if (!TITLE_ALLOWED.test(title)) {
    return {
      ok: false,
      error:
        "Title contains unsupported characters. Use letters, numbers, spaces, and - _ . , : ( ) [ ] / +",
    };
  }

  let notes = "";
  if (rawNotes !== undefined && rawNotes !== null) {
    if (typeof rawNotes !== "string") {
      return { ok: false, error: "Extra notes must be text." };
    }
    notes = rawNotes.trim();
    if (notes.length > NOTES_MAX) {
      return { ok: false, error: `Extra notes must be at most ${NOTES_MAX} characters.` };
    }
    if (CONTROL_CHARS.test(notes)) {
      return { ok: false, error: "Extra notes contain unsupported characters." };
    }
  }

  const isCve = CVE_PATTERN.test(title);
  return {
    ok: true,
    value: {
      title: isCve ? title.toUpperCase() : title,
      notes,
      cveId: isCve ? title.toUpperCase() : null,
    },
  };
}