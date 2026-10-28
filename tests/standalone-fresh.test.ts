import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// public/pensionssparkalkylatorn.html is generated from standalone/ and src/lib/pension.ts; this fails when someone
// changes the model (or the page) and forgets to run `npm run build:standalone`.
describe("the standalone Pensionssparkalkylatorn", () => {
  it("is up to date with its sources", () => {
    expect(() => execFileSync("node", ["scripts/build-standalone.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });
});
