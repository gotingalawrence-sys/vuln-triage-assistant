import { describe, it, expect } from "vitest";
import { createRateLimiter } from "../lib/rateLimit";

describe("createRateLimiter", () => {
  it("allows requests up to the limit and then blocks", () => {
    const isAllowed = createRateLimiter(3, 60_000);
    expect(isAllowed("a", 0)).toBe(true);
    expect(isAllowed("a", 1)).toBe(true);
    expect(isAllowed("a", 2)).toBe(true);
    expect(isAllowed("a", 3)).toBe(false);
  });

  it("allows requests again after the window passes", () => {
    const isAllowed = createRateLimiter(1, 1000);
    expect(isAllowed("a", 0)).toBe(true);
    expect(isAllowed("a", 500)).toBe(false);
    expect(isAllowed("a", 1500)).toBe(true);
  });

  it("tracks each client separately", () => {
    const isAllowed = createRateLimiter(1, 60_000);
    expect(isAllowed("a", 0)).toBe(true);
    expect(isAllowed("b", 0)).toBe(true);
    expect(isAllowed("a", 1)).toBe(false);
  });
});