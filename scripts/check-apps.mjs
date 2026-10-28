#!/usr/bin/env node
// Opens the calculators in public/app/ (scripts/lib/apps.mjs) in headless Chromium, in Swedish and in English, on a
// computer and on a phone, and checks that each works with the site's look on it: no script errors, the language of
// the page is the one asked for, the file's own header is hidden, it has a heading and some numbers, and nothing
// sticks out sideways. The GitHub Action .github/workflows/apps.yml runs it before a new version is published.
//
//   node scripts/check-apps.mjs                       every calculator
//   node scripts/check-apps.mjs --only pensionsmal    one (or several, comma-separated)
//   node scripts/check-apps.mjs --screenshots <dir>   and a picture of each
//
// Playwright comes from node_modules when it is installed there (the Action installs it for the run), otherwise from the
// global installation of this environment.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { apps } from "./lib/apps.mjs";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    return createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
  }
}

const site = resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1].split(",") : undefined;
const shotsAt = argv.indexOf("--screenshots");
const shots = shotsAt >= 0 ? resolve(argv[shotsAt + 1]) : undefined;
if (shots) mkdirSync(shots, { recursive: true });

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const problems = [];

try {
  for (const app of apps.filter((a) => !only || only.includes(a.slug))) {
    for (const [device, viewport] of [["computer", { width: 1440, height: 1000 }], ["phone", { width: 390, height: 844 }]]) {
      for (const lang of app.en ? ["sv", "en"] : ["sv"]) {
        const label = `${app.slug} (${lang}, ${device})`;
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(`script error: ${error.message}`));
        page.on("console", (message) => {
          // A font or library that cannot be fetched is not an error of the calculator.
          if (message.type() === "error" && !/Failed to load resource|net::/.test(message.text())) errors.push(`console: ${message.text()}`);
        });
        await page.goto(`${pathToFileURL(join(site, `public/app/${app.slug}.html`)).href}?lang=${lang}`, { waitUntil: "load" });
        try {
          await page.waitForFunction(() => document.documentElement.classList.contains("pl-ready"), null, { timeout: 5000 });
        } catch {
          problems.push(`${label}: the page was never shown (scripts/apps-site.js did not finish)`);
        }
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => ({
          heading: document.querySelector("h1")?.textContent?.trim() ?? "",
          // The switch marks the language in use: a button with the class "active", or a part of it that has it; the page's
          // own lang attribute is the fallback.
          active:
            (document.querySelector(".lang-btn.active") ?? document.querySelector(".lang-btn .active"))?.textContent?.trim().toLowerCase() ??
            document.documentElement.lang,
          header: document.querySelector("header.top") ? getComputedStyle(document.querySelector("header.top")).display : "none",
          figures: (document.body.innerText.match(/\d[\d  ]{2,}/g) ?? []).length,
          wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        if (!state.heading) problems.push(`${label}: no heading`);
        if (state.active !== lang) problems.push(`${label}: the language is "${state.active}"`);
        if (state.header !== "none") problems.push(`${label}: the file's own header is shown`);
        if (state.figures < 3) problems.push(`${label}: no figures on the page`);
        if (state.wide > 1) problems.push(`${label}: ${state.wide} px too wide`);
        for (const error of errors) problems.push(`${label}: ${error}`);
        if (shots) await page.screenshot({ path: join(shots, `${app.slug}-${lang}-${device}.png`), fullPage: true });
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

if (problems.length) {
  console.error(`The calculators have ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Checked ${only ?? apps.map((a) => a.slug)} in Swedish and English on a computer and a phone: no problems.`);
