import { describe, it, expect } from "vitest";
import { validateInput, TITLE_MAX, NOTES_MAX } from "../lib/validation";

describe("validateInput: titles", () => {
  it("accepts a normal patch-bundle title", () => {
    const result = validateInput("Microsoft Windows Security Update for November 2026");
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Microsoft Windows Security Update for November 2026",
        notes: "",
        cveId: null,
      },
    });
  });

  it("accepts brackets and parentheses", () => {
    const result = validateInput("Adobe Acrobat Reader Update (APSB26-01) [Critical]");
    expect(result.ok).toBe(true);
  });

  it("trims whitespace and normalizes a CVE ID to uppercase", () => {
    const result = validateInput("  cve-2026-12345  ");
    expect(result).toEqual({
      ok: true,
      value: { title: "CVE-2026-12345", notes: "", cveId: "CVE-2026-12345" },
    });
  });

  it("rejects empty and whitespace-only input", () => {
    expect(validateInput("").ok).toBe(false);
    expect(validateInput("     ").ok).toBe(false);
  });

  it("rejects titles that are too short or too long", () => {
    expect(validateInput("ab").ok).toBe(false);
    expect(validateInput("a".repeat(TITLE_MAX + 1)).ok).toBe(false);
  });

  it("rejects unsupported characters and control characters", () => {
    expect(validateInput("<script>alert(1)</script>").ok).toBe(false);
    expect(validateInput("Bad\u0000Title").ok).toBe(false);
  });

  it("rejects non-string titles", () => {
    expect(validateInput(12345).ok).toBe(false);
    expect(validateInput(undefined).ok).toBe(false);
  });
});

describe("validateInput: extra notes", () => {
  it("treats notes as optional", () => {
    const result = validateInput("Some Valid Title");
    expect(result.ok && result.value.notes).toBe("");
  });

  it("allows line breaks in notes", () => {
    const result = validateInput("Some Valid Title", "Line one\nLine two");
    expect(result.ok && result.value.notes).toBe("Line one\nLine two");
  });

  it("rejects notes that are too long or contain control characters", () => {
    expect(validateInput("Some Valid Title", "x".repeat(NOTES_MAX + 1)).ok).toBe(false);
    expect(validateInput("Some Valid Title", "bad\u0000notes").ok).toBe(false);
  });
});