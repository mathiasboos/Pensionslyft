#!/usr/bin/env node
// Builds the Typfallsmodellen web app from github.com/mathiasboos/Typfallsmodellen and puts the one self-contained
// HTML file it makes in public/, where /typfallsmodellen shows it. What the site adds is put into the file on the way:
// its colours and fonts (scripts/typfallsmodellen-theme.css) and the fold-in of the table "Månadsinkomster"
// (scripts/typfallsmodellen-site.js), and the dark mode of the app is turned off. It also writes which version of the
// project the file was built from to src/data/typfallsmodellen-source.json, which the page shows.
//
//   node scripts/sync-typfallsmodellen.mjs                 clones the project (shallow) into a temporary folder
//   node scripts/sync-typfallsmodellen.mjs /path/to/clone  uses a clone you have already updated (git pull)
//   node scripts/sync-typfallsmodellen.mjs --reapply       puts the site's changes into the file that is in public/ now,
//                                                          after the theme or the script has been edited (no build)
//
// Run it when the project on GitHub has changed, then look at the page on the preview and merge.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPOSITORY = "https://github.com/mathiasboos/Typfallsmodellen";
const site = resolve(import.meta.dirname, "..");
const env = { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" };

const run = (command, args, cwd) => execFileSync(command, args, { cwd, env, stdio: "inherit" });
const read = (command, args, cwd) => execFileSync(command, args, { cwd, env, encoding: "utf8" }).trim();

// The fonts of the site, the same link as in src/layouts/BaseLayout.astro (the app uses 700 for its bold text).
const FONTS = [
  '<link rel="preconnect" href="https://fonts.googleapis.com" />',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=IBM+Plex+Mono:wght@400;500&display=swap" />',
].join("\n");

// What the site adds sits between these two comments, so that it can be taken out and put in again.
const BEGIN = "<!-- pensionslyft:begin -->";
const END = "<!-- pensionslyft:end -->";

/** The app without what the site added, also in the file from before the two comments existed. */
function withoutSiteChanges(html) {
  return html
    .replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}\\n?`), "")
    .replace(
      /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>\n<link rel="preconnect"[^>]*>\n<link rel="stylesheet"[^>]*>\n<style id="pensionslyft-theme">[\s\S]*?<\/style>\n/,
      "",
    );
}

/** The app with the site's colours and fonts, the dark mode of the app off, and the fold-in of the table of monthly incomes. */
function withSiteChanges(app) {
  const html = withoutSiteChanges(app);
  const theme = readFileSync(join(site, "scripts/typfallsmodellen-theme.css"), "utf8");
  const script = readFileSync(join(site, "scripts/typfallsmodellen-site.js"), "utf8");
  if (!html.includes("</head>") || !(html.includes('<html lang="sv">') || html.includes('<html lang="sv" data-theme="light">'))) {
    throw new Error("The app's HTML is not as expected (no </head> or <html lang=\"sv\">), so the site's changes cannot be put in.");
  }
  if (script.includes("</script")) throw new Error("scripts/typfallsmodellen-site.js must not contain </script.");
  return html
    .replace('<html lang="sv">', '<html lang="sv" data-theme="light">')
    .replace(
      "</head>",
      () => `${BEGIN}\n${FONTS}\n<style id="pensionslyft-theme">\n${theme}</style>\n<script id="pensionslyft-site">\n${script}</script>\n${END}\n</head>`,
    );
}

if (process.argv[2] === "--reapply") {
  const file = join(site, "public/typfallsmodellen-app.html");
  writeFileSync(file, withSiteChanges(readFileSync(file, "utf8")));
  console.log("The site's changes are put into public/typfallsmodellen-app.html again.");
  process.exit(0);
}

let clone = process.argv[2] ? resolve(process.argv[2]) : undefined;
let temporary;
if (!clone) {
  temporary = mkdtempSync(join(tmpdir(), "typfallsmodellen-"));
  clone = join(temporary, "project");
  run("git", ["clone", "--depth", "1", REPOSITORY, clone]);
}

try {
  run("npm", ["install", "--no-audit", "--no-fund"], clone);
  run("npm", ["run", "build", "-w", "@typfallsmodellen/web"], clone);
  const app = readFileSync(join(clone, "apps/web/dist/typfallsmodellen.html"), "utf8");
  writeFileSync(join(site, "public/typfallsmodellen-app.html"), withSiteChanges(app));

  const [commit, committedAt, subject] = read("git", ["log", "-1", "--format=%H%n%cI%n%s"], clone).split("\n");
  const source = { repository: REPOSITORY, commit, committedAt, subject };
  writeFileSync(join(site, "src/data/typfallsmodellen-source.json"), `${JSON.stringify(source, null, 2)}\n`);
  console.log(`\nBuilt from ${commit.slice(0, 7)} (${committedAt}): ${subject}`);
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
