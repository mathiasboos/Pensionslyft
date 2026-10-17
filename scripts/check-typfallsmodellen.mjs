#!/usr/bin/env node
// Opens public/typfallsmodellen-app.html in headless Chromium and checks that the Typfallsmodellen works with the site's
// look on it: no script errors, every screen of the app opens and shows something, the first screen's KPI values are
// numbers, the site's (+/−) buttons are on the number fields, and on a phone the page does not scroll sideways. The GitHub
// Action runs it before a new version is published.
//
//   node scripts/check-typfallsmodellen.mjs                       the checks
//   node scripts/check-typfallsmodellen.mjs --screenshots <dir>   and a picture of every screen, on a computer and a phone
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
const url = pathToFileURL(join(site, "public/typfallsmodellen-app.html")).href;
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
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector(".screen-toggle button[data-screen]", { timeout: 5000 });
  await page.waitForTimeout(500);
  return { page, errors };
}

/** What one screen shows: its button is the active one, and the page has text, charts and tables. */
const snapshot = (page) =>
  page.evaluate(() => ({
    active: document.querySelector(".screen-toggle .active")?.getAttribute("data-screen"),
    text: document.body.innerText.trim().length,
    charts: document.querySelectorAll("svg").length,
    tables: document.querySelectorAll("table").length,
    steps: document.querySelectorAll(".pl-step").length,
    fields: document.querySelectorAll("label.field > input[type=number][step]").length,
    wide: document.documentElement.scrollWidth - window.innerWidth,
  }));

/** Opens every screen in turn: the first one is the forecast (the app's start screen). */
async function walk(page, label, { screenshotPrefix } = {}) {
  const screens = await page.$$eval(".screen-toggle button[data-screen]", (buttons) => buttons.map((b) => b.getAttribute("data-screen")));
  if (screens.length < 3) problems.push(`${label}: only ${screens.length} screens found (${screens.join(", ")}), expected at least 3`);
  for (const [i, screen] of screens.entries()) {
    await page.click(`.screen-toggle button[data-screen="${screen}"]`);
    await page.waitForTimeout(700);
    const shown = await snapshot(page);
    if (shown.active !== screen) problems.push(`${label}: the screen "${screen}" does not open`);
    if (shown.text < 500) problems.push(`${label}: the screen "${screen}" shows almost nothing (${shown.text} characters)`);
    if (shown.charts === 0) problems.push(`${label}: the screen "${screen}" draws no chart`);
    if (shown.fields > 0 && shown.steps === 0) problems.push(`${label}: the screen "${screen}" has number fields but no (+/−) buttons`);
    if (label === "phone" && shown.wide > 1) problems.push(`phone: the screen "${screen}" makes the page ${shown.wide}px wider than the screen`);
    if (shots) await page.screenshot({ path: join(shots, `${screenshotPrefix}${String(i + 1).padStart(2, "0")}-${screen}.png`), fullPage: true });
  }
  return screens;
}

try {
  // ── a computer ──
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const { page, errors } = await open(desktop);
  const kpis = await page.$$eval(".kpi-value", (nodes) => nodes.map((n) => n.textContent.trim()));
  if (kpis.length === 0) problems.push("the first screen shows no KPI values");
  for (const kpi of kpis) if (!/\d/.test(kpi)) problems.push(`a KPI value on the first screen is not a number: "${kpi}"`);
  const screens = await walk(page, "computer", { screenshotPrefix: "" });
  problems.push(...errors);

  // ── a phone ──
  const phone = await browser.newContext({ ...devices["iPhone 13"] });
  const mobile = await open(phone);
  await walk(mobile.page, "phone", { screenshotPrefix: "phone-" });
  problems.push(...mobile.errors.map((e) => `phone: ${e}`));
  console.log(`Screens opened: ${screens.join(", ")}.`);
} finally {
  await browser.close();
}

if (problems.length) {
  console.error(`The Typfallsmodellen check failed:\n- ${[...new Set(problems)].join("\n- ")}`);
  process.exit(1);
}
console.log("The Typfallsmodellen works: every screen opens and shows its charts, the KPIs are numbers, the (+/−) buttons are there, no script errors.");
