#!/usr/bin/env node
// Builds the Typfallsmodellen web app from github.com/mathiasboos/Typfallsmodellen and puts the one self-contained
// HTML file it makes in public/, where /typfallsmodellen shows it. What the site adds is put into the file on the way:
// its colours and fonts (scripts/typfallsmodellen-theme.css) and the fold-in of the table "Månadsinkomster"
// (scripts/typfallsmodellen-site.js), and the dark mode of the app is turned off. It also writes which version of the
// project the file was built from to src/data/typfallsmodellen-source.json, which the page shows.
//
//   node scripts/sync-typfallsmodellen.mjs                 clones `main` of the project (shallow) into a temporary folder
//   node scripts/sync-typfallsmodellen.mjs --ref <ref>     the project at a branch, tag or commit instead of `main`
//   node scripts/sync-typfallsmodellen.mjs --if-changed    does nothing (and builds nothing) when `main` is the commit the site
//                                                          already has, see src/data/typfallsmodellen-source.json
//   node scripts/sync-typfallsmodellen.mjs /path/to/clone  uses a clone you have already updated (git pull)
//   node scripts/sync-typfallsmodellen.mjs --reapply       puts the site's changes into the file that is in public/ now,
//                                                          after the theme or the script has been edited (no build)
//
// It always takes `main`, never the default branch of the project, which can be some other branch. The GitHub Action
// .github/workflows/typfallsmodellen.yml runs it with --if-changed every hour and publishes a new version by itself, after
// scripts/check-typfallsmodellen.mjs, the tests and the build have passed.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { injectSiteChanges, stripSiteChanges } from "./lib/embed.mjs";

const REPOSITORY = "https://github.com/mathiasboos/Typfallsmodellen";
const site = resolve(import.meta.dirname, "..");
const sourceFile = join(site, "src/data/typfallsmodellen-source.json");
const env = { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" };

const run = (command, args, cwd) => execFileSync(command, args, { cwd, env, stdio: "inherit" });
const read = (command, args, cwd) => execFileSync(command, args, { cwd, env, encoding: "utf8" }).trim();

/** The app without what the site added, also in the file from before the two comments existed. */
function withoutSiteChanges(html) {
  return stripSiteChanges(html)
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
  return injectSiteChanges(html.replace('<html lang="sv">', '<html lang="sv" data-theme="light">'), {
    css: theme,
    js: script,
    name: "Typfallsmodellen",
  });
}

const args = process.argv.slice(2);
const refAt = args.indexOf("--ref");
const ref = refAt >= 0 ? args[refAt + 1] : "main";
if (refAt >= 0 && !ref) throw new Error("--ref needs a branch, tag or commit.");
const pathArg = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--ref");

if (args.includes("--reapply")) {
  const file = join(site, "public/typfallsmodellen-app.html");
  writeFileSync(file, withSiteChanges(readFileSync(file, "utf8")));
  console.log("The site's changes are put into public/typfallsmodellen-app.html again.");
  process.exit(0);
}

if (args.includes("--if-changed")) {
  const latest = read("git", ["ls-remote", REPOSITORY, `refs/heads/${ref}`]).split(/\s/)[0];
  if (!latest) throw new Error(`${REPOSITORY} has no branch "${ref}".`);
  const have = JSON.parse(readFileSync(sourceFile, "utf8")).commit;
  if (latest === have) {
    console.log(`Nothing new: the site already has ${ref} (${have.slice(0, 7)}) of the Typfallsmodellen.`);
    process.exit(0);
  }
  console.log(`${ref} is at ${latest.slice(0, 7)}, the site has ${have.slice(0, 7)}.`);
}

let clone = pathArg ? resolve(pathArg) : undefined;
let temporary;
if (!clone) {
  temporary = mkdtempSync(join(tmpdir(), "typfallsmodellen-"));
  clone = join(temporary, "project");
  if (/^[0-9a-f]{40}$/i.test(ref)) {
    // A commit (the whole 40 characters; GitHub does not fetch an abbreviation) cannot be cloned with --branch; fetch just that one.
    run("git", ["init", "--quiet", clone]);
    run("git", ["remote", "add", "origin", REPOSITORY], clone);
    run("git", ["fetch", "--quiet", "--depth", "1", "origin", ref], clone);
    run("git", ["checkout", "--quiet", "FETCH_HEAD"], clone);
  } else {
    run("git", ["clone", "--depth", "1", "--branch", ref, REPOSITORY, clone]);
  }
}

try {
  run("npm", ["install", "--no-audit", "--no-fund"], clone);
  run("npm", ["run", "build", "-w", "@typfallsmodellen/web"], clone);
  const app = readFileSync(join(clone, "apps/web/dist/typfallsmodellen.html"), "utf8");
  writeFileSync(join(site, "public/typfallsmodellen-app.html"), withSiteChanges(app));

  const [commit, committedAt, subject] = read("git", ["log", "-1", "--format=%H%n%cI%n%s"], clone).split("\n");
  const source = { repository: REPOSITORY, commit, committedAt, subject };
  writeFileSync(sourceFile, `${JSON.stringify(source, null, 2)}\n`);
  console.log(`\nBuilt from ${commit.slice(0, 7)} (${committedAt}): ${subject}`);
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
