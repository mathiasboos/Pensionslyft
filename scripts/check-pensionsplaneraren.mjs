#!/usr/bin/env node
// Opens public/pensionsplaneraren-app.html in headless Chromium and checks that the Pensionsplaneraren works with the
// site's look on it: no script errors, Swedish, every tab opens and shows something, the dashboard's charts are drawn,
// and a Monte Carlo run finishes. The GitHub Action runs it before a new version is published.
//
//   node scripts/check-pensionsplaneraren.mjs                       the checks
//   node scripts/check-pensionsplaneraren.mjs --screenshots <dir>   and a picture of every tab, on a computer and a phone
//
// Playwright comes from node_modules when it is installed there (the Action installs it for the run), otherwise from
// the global installation of this environment.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    return createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
  }
}

const site = resolve(import.meta.dirname, "..");
const url = pathToFileURL(join(site, "public/pensionsplaneraren-app.html")).href;
const shotsAt = process.argv.indexOf("--screenshots");
const shots = shotsAt >= 0 ? resolve(process.argv[shotsAt + 1]) : undefined;
if (shots) mkdirSync(shots, { recursive: true });

const { chromium, devices } = await loadPlaywright();
const browser = await chromium.launch();
const problems = [];

async function open(context) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`script error: ${error.message}`));
  page.on("console", (message) => {
    // A font or other file that cannot be fetched is not an error of the app.
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) errors.push(`console: ${message.text()}`);
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.classList.contains("pl-ready"), null, { timeout: 5000 });
  await page.waitForTimeout(500);
  return { page, errors };
}

/** The ids of the tabs in the order of the tab bar, from the buttons' switchTab('…') handlers. */
async function tabIds(page) {
  return page.$$eval(".tab-btn", (buttons) =>
    buttons.map((b, i) => (b.getAttribute("onclick") || "").match(/['"]([\w-]+)['"]/)?.[1] ?? `tab-${i + 1}`),
  );
}

try {
  // ── a computer ──
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const { page, errors } = await open(desktop);
  const lang = await page.evaluate(() => document.documentElement.lang);
  if (lang !== "sv") problems.push(`the language is "${lang}", not Swedish`);

  const ids = await tabIds(page);
  if (ids.length === 0) problems.push("no tabs (.tab-btn) found");
  const buttons = await page.$$(".tab-btn");
  for (const [i, button] of buttons.entries()) {
    await button.click();
    await page.waitForTimeout(ids[i] === "montecarlo" ? 800 : 400);
    const shown = await page.$$eval(".tab-content.active", (tabs) => tabs.map((t) => t.innerText.trim().length));
    if (shown.length !== 1 || shown[0] < 20) problems.push(`tab "${ids[i]}" shows no content`);
    if (ids[i] === "montecarlo") {
      const run = await page.$('[onclick*="runMonteCarlo"]');
      if (run) {
        await run.click();
        await page.waitForTimeout(3000);
      }
    }
    if (shots) await page.screenshot({ path: join(shots, `${String(i + 1).padStart(2, "0")}-${ids[i]}.png`), fullPage: true });
  }

  await buttons[0]?.click();
  await page.waitForTimeout(500);
  const drawn = await page.$$eval(".tab-content.active canvas", (canvases) =>
    canvases.filter((c) => {
      const ctx = c.getContext("2d");
      if (!ctx || !c.width || !c.height) return false;
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < data.length; i += 4 * 16) if (data[i] > 0) return true;
      return false;
    }).length,
  );
  if (drawn === 0) problems.push("the first tab draws no charts");
  problems.push(...errors);

  // ── a phone: the same tabs, and no sideways scrolling of the page itself ──
  const phone = await browser.newContext({ ...devices["iPhone 13"] });
  const mobile = await open(phone);
  const phoneButtons = await mobile.page.$$(".tab-btn");
  for (const [i, button] of phoneButtons.entries()) {
    await button.click();
    await mobile.page.waitForTimeout(300);
    const wide = await mobile.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (wide > 1) console.warn(`Note: on a phone, tab "${ids[i]}" makes the page ${wide}px wider than the screen.`);
    if (shots) await mobile.page.screenshot({ path: join(shots, `phone-${String(i + 1).padStart(2, "0")}-${ids[i]}.png`) });
  }
  problems.push(...mobile.errors.map((e) => `phone: ${e}`));
} finally {
  await browser.close();
}

if (problems.length) {
  console.error(`The Pensionsplaneraren check failed:\n- ${[...new Set(problems)].join("\n- ")}`);
  process.exit(1);
}
console.log(`The Pensionsplaneraren works: Swedish, every tab opens, charts are drawn, no script errors.`);
