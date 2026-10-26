import { describe, expect, it } from "vitest";
import { nextIndex } from "../src/lib/slider";

describe("nextIndex", () => {
  it("moves forward and wraps to the first slide", () => {
    expect(nextIndex(0, 3, 1)).toBe(1);
    expect(nextIndex(2, 3, 1)).toBe(0);
  });
  it("moves back and wraps to the last slide", () => {
    expect(nextIndex(1, 3, -1)).toBe(0);
    expect(nextIndex(0, 3, -1)).toBe(2);
  });
  it("stays put with one slide and handles none", () => {
    expect(nextIndex(0, 1, 1)).toBe(0);
    expect(nextIndex(0, 0, 1)).toBe(0);
  });
});
