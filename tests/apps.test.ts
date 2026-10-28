import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { apps } from "../scripts/lib/apps.mjs";
import { stripSiteChanges } from "../scripts/lib/embed.mjs";
import { withSiteLook } from "../scripts/sync-apps.mjs";
import { PAIRS, switchTarget } from "../src/lib/i18n";
import { calculators, navItem } from "../src/lib/site-nav";

const root = join(import.meta.dirname, "..");
const source = JSON.parse(readFileSync(join(root, "src/data/apps-source.json"), "utf8"));

describe("calculators shown from GitHub", () => {
  it.each(apps)("$slug has a page in both languages, a menu entry and an English twin", (app) => {
    expect(existsSync(join(root, `src/pages${app.sv}.astro`))).toBe(true);
    expect(existsSync(join(root, `src/pages${app.en}.astro`))).toBe(true);
    const item = calculators.find((c) => c.href === app.sv);
    expect(item?.enHref).toBe(app.en);
    expect(navItem(item!, "en")).toMatchObject({ href: app.en, english: true });
    expect(PAIRS).toContainEqual([app.sv, app.en]);
    expect(switchTarget(app.sv)).toBe(app.en);
    expect(switchTarget(app.en)).toBe(app.sv);
  });

  it.each(apps)("$slug is pinned and the file on the site is the pinned version with the site's look", (app) => {
    const pin = source.apps[app.slug];
    expect(pin.file).toBe(app.file);
    expect(pin.commit).toMatch(/^[0-9a-f]{40}$/);
    const html = readFileSync(join(root, `public/app/${app.slug}.html`), "utf8");
    expect(html).toContain("pensionslyft:begin");
    // The site's part can be taken out again and put back: the same file comes out.
    const original = stripSiteChanges(html);
    expect(withSiteLook(app, original.replace(/<title>[^<]*<\/title>/, "<title>x</title>")).page).toBe(html);
  });

  it("has no duplicate slugs or pages", () => {
    expect(new Set(apps.map((a) => a.slug)).size).toBe(apps.length);
    expect(new Set(apps.flatMap((a) => [a.sv, a.en])).size).toBe(apps.length * 2);
  });
});
