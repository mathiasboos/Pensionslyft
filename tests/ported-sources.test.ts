import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ISSUE_PREFIX, findChanged, issueBody, issueTitle } from "../scripts/lib/ported.mjs";

const root = join(import.meta.dirname, "..");
const data = JSON.parse(readFileSync(join(root, "src/data/ported-sources.json"), "utf8")) as {
  repository: string;
  branch: string;
  sources: { calculator: string; file: string; page: string; port: string[]; commit: string }[];
};

const A = "a".repeat(40);
const B = "b".repeat(40);
const source = { calculator: "Testkalkylatorn", file: "Test.html", page: "/test", port: ["src/lib/test.ts"], commit: A };
const newer = { commit: B, committedAt: "2026-10-16T12:00:00+00:00", subject: "Fix the rate" };

describe("findChanged", () => {
  it("finds nothing when every file is at the commit the port was checked against", () => {
    expect(findChanged([source], { "Test.html": { ...newer, commit: A } })).toEqual([]);
  });

  it("finds a file with a newer commit, and says what is new", () => {
    const [hit] = findChanged([source], { "Test.html": newer });
    expect(hit.calculator).toBe("Testkalkylatorn");
    expect(hit.latest).toEqual(newer);
    expect(hit.missing).toBeUndefined();
  });

  it("finds a file that is gone from main", () => {
    const [hit] = findChanged([source], {});
    expect(hit.missing).toBe(true);
  });

  it("finds only the files that changed", () => {
    const other = { ...source, calculator: "Andra", file: "Other.html" };
    const hits = findChanged([source, other], { "Test.html": { ...newer, commit: A }, "Other.html": newer });
    expect(hits.map((h: { file: string }) => h.file)).toEqual(["Other.html"]);
  });
});

describe("the issue", () => {
  const repository = "https://github.com/mathiasboos/Calculators";
  const [hit] = findChanged([source], { "Test.html": newer });

  it("is named after the calculator, so that the same one is found again", () => {
    expect(issueTitle(hit)).toBe(`${ISSUE_PREFIX}Testkalkylatorn`);
  });

  it("links the new commit and the comparison, and names the code to port", () => {
    const body = issueBody(hit, repository);
    expect(body).toContain(`${repository}/commit/${B}`);
    expect(body).toContain(`${repository}/compare/${A}...${B}`);
    expect(body).toContain("Fix the rate");
    expect(body).toContain("`src/lib/test.ts`");
  });

  it("is the same text for the same change, so that an open issue is not rewritten every hour", () => {
    expect(issueBody(hit, repository)).toBe(issueBody(findChanged([source], { "Test.html": newer })[0], repository));
  });

  it("says when the file is gone", () => {
    const [gone] = findChanged([source], {});
    expect(issueBody(gone, repository)).toContain("finns inte längre");
  });
});

describe("src/data/ported-sources.json", () => {
  it("lists each file once, at a full commit", () => {
    expect(data.sources.length).toBeGreaterThan(0);
    expect(new Set(data.sources.map((s) => s.file)).size).toBe(data.sources.length);
    for (const s of data.sources) expect(s.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("points at pages and ported code that exist on the site", () => {
    for (const s of data.sources) {
      expect(existsSync(join(root, "src/pages", `${s.page.slice(1)}.astro`)), `${s.page} is a page`).toBe(true);
      expect(s.port.length).toBeGreaterThan(0);
      for (const p of s.port) {
        const path = p.replace(/^.* in /, "");
        expect(existsSync(join(root, path)), `${path} exists`).toBe(true);
      }
    }
  });
});
