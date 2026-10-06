#!/usr/bin/env node
// Builds the Typfallsmodellen web app from github.com/mathiasboos/Typfallsmodellen and puts the one self-contained
// HTML file it makes in public/, where /typfallsmodellen shows it. The site's colours (scripts/typfallsmodellen-theme.css)
// are put into the file on the way, and the dark mode of the app is turned off. It also writes which version of the
// project the file was built from to src/data/typfallsmodellen-source.json, which the page shows.
//
//   node scripts/sync-typfallsmodellen.mjs                 clones the project (shallow) into a temporary folder
//   node scripts/sync-typfallsmodellen.mjs /path/to/clone  uses a clone you have already updated (git pull)
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

/** The app with the site's colours: the theme after the app's own style, and the app's dark mode off. */
function withSiteTheme(html) {
  const theme = readFileSync(join(site, "scripts/typfallsmodellen-theme.css"), "utf8");
  if (!html.includes("</head>") || !html.includes('<html lang="sv">')) {
    throw new Error("The app's HTML is not as expected (no </head> or <html lang=\"sv\">), so the theme cannot be put in.");
  }
  return html
    .replace('<html lang="sv">', '<html lang="sv" data-theme="light">')
    .replace("</head>", () => `<style id="pensionslyft-theme">\n${theme}</style>\n</head>`);
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
  writeFileSync(join(site, "public/typfallsmodellen-app.html"), withSiteTheme(app));

  const [commit, committedAt, subject] = read("git", ["log", "-1", "--format=%H%n%cI%n%s"], clone).split("\n");
  const source = { repository: REPOSITORY, commit, committedAt, subject };
  writeFileSync(join(site, "src/data/typfallsmodellen-source.json"), `${JSON.stringify(source, null, 2)}\n`);
  console.log(`\nBuilt from ${commit.slice(0, 7)} (${committedAt}): ${subject}`);
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
