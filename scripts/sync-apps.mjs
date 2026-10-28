#!/usr/bin/env node
// Fetches the calculators in github.com/mathiasboos/Calculators that the site shows as they are (the list is
// scripts/lib/apps.mjs) and puts them in public/app/, where the pages of the site show them in a frame, with the site's
// look put on them on the way: scripts/apps-theme.css, scripts/apps/<slug>.css, the colours of scripts/apps-colors.mjs
// and scripts/apps-site.js (language and height). It also writes which version of each file it took to
// src/data/apps-source.json.
//
//   node scripts/sync-apps.mjs                  every calculator, the latest version on main
//   node scripts/sync-apps.mjs --only fire      one calculator (the slug), or several: --only fire,nettolon
//   node scripts/sync-apps.mjs --if-changed     only the calculators whose file has a newer commit than the site's
//   node scripts/sync-apps.mjs --reapply        the versions the site has now, with the site's current look
//                                               (after a change to the theme, the colours or the script)
//   node scripts/sync-apps.mjs --ref <ref>      the version at a branch, tag or commit
//   node scripts/sync-apps.mjs <path>           a clone of Calculators you have
//
// The GitHub Action .github/workflows/apps.yml runs it every hour and publishes a new version by itself. The files are the
// same for the same version and the same site files, so a run that finds nothing new changes nothing.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { apps, REPOSITORY } from "./lib/apps.mjs";
import { injectSiteChanges, setTitle } from "./lib/embed.mjs";
import { recolor } from "./lib/recolor.mjs";
import { colors, fonts, vars } from "./apps-colors.mjs";

const site = resolve(import.meta.dirname, "..");
const outputDir = join(site, "public/app");
const sourceFile = join(site, "src/data/apps-source.json");

const git = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" } });

const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");
const pins = () => (existsSync(sourceFile) ? JSON.parse(readFileSync(sourceFile, "utf8")).apps ?? {} : {});

/** The calculator's HTML with the site's look. */
export function withSiteLook(app, html) {
  const { html: recoloured, counts, unmapped } = recolor(html, {
    colors: colors[app.slug] ?? {},
    vars: vars[app.slug] ?? {},
    fonts: fonts[app.slug] ?? {},
  });
  const css = [read(join(site, "scripts/apps-theme.css")), read(join(site, `scripts/apps/${app.slug}.css`))]
    .filter(Boolean)
    .join("\n");
  const page = injectSiteChanges(setTitle(recoloured, "Pensionslyft"), {
    css,
    js: read(join(site, "scripts/apps-site.js")),
    name: app.file,
  });
  return { page, counts, unmapped };
}

function main(argv) {
  const value = (flag) => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const only = value("--only")?.split(",");
  const ifChanged = argv.includes("--if-changed");
  const reapply = argv.includes("--reapply");
  const flagValues = new Set([value("--only"), value("--ref")]);
  const path = argv.find((a) => !a.startsWith("--") && !flagValues.has(a));
  let ref = value("--ref");

  const known = pins();
  if (reapply && !existsSync(sourceFile)) throw new Error(`--reapply needs ${sourceFile}; run the script without it first.`);
  const chosen = apps.filter((a) => !only || only.includes(a.slug));
  if (only) for (const slug of only) if (!apps.some((a) => a.slug === slug)) throw new Error(`Unknown calculator "${slug}".`);

  let clone = path ? resolve(path) : undefined;
  let temporary;
  if (!clone) {
    temporary = mkdtempSync(join(tmpdir(), "calculators-"));
    clone = join(temporary, "calculators");
    // Only the history and the trees; the files needed are fetched by `git show`.
    git(["clone", "--quiet", "--filter=blob:none", "--no-checkout", REPOSITORY, clone]);
  }
  try {
    const rev = (r) => {
      for (const candidate of [r, `origin/${r}`]) {
        try {
          return git(["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`], clone).trim();
        } catch {
          /* try the next */
        }
      }
      throw new Error(`Cannot find "${r}" in ${REPOSITORY}.`);
    };
    const head = rev(ref ?? "HEAD");
    mkdirSync(outputDir, { recursive: true });
    const next = { ...known };
    const summary = [];
    for (const app of chosen) {
      const pinned = reapply ? known[app.slug]?.commit : undefined;
      if (reapply && !pinned) throw new Error(`${app.slug} has no pinned commit; run the script without --reapply first.`);
      const at = pinned ?? head;
      const [commit, committedAt, subject] = git(["log", "-1", "--format=%H%n%cI%n%s", at, "--", app.file], clone).trim().split("\n");
      if (!commit) throw new Error(`${app.file} is not in ${REPOSITORY} at ${at}.`);
      if (ifChanged && known[app.slug]?.commit === commit) {
        summary.push(`${app.slug}: nothing new (${commit.slice(0, 7)})`);
        continue;
      }
      const html = git(["show", `${at}:${app.file}`], clone);
      if (!/lang-btn|setLang/.test(html)) console.warn(`Warning: ${app.file} has no language switch any more; check the page (language).`);
      const { page, counts, unmapped } = withSiteLook(app, html);
      writeFileSync(join(outputDir, `${app.slug}.html`), page);
      next[app.slug] = { file: app.file, commit, committedAt, subject };
      const replaced = Object.values(counts).reduce((a, b) => a + b, 0);
      summary.push(`${app.slug}: ${commit.slice(0, 7)} ${subject} (${replaced} colours replaced)`);
      const missing = Object.entries(unmapped).sort((a, b) => b[1] - a[1]);
      if (missing.length && !app.native) {
        const list = missing.map(([key, n]) => `#${key} (${n})`).join(", ");
        summary.push(`  colours not in scripts/apps-colors.mjs, kept as they are: ${list}`);
        if (process.env.GITHUB_STEP_SUMMARY) {
          appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${app.slug}: colours without a site colour\n\n${list}\n`);
        }
      }
    }
    const ordered = Object.fromEntries(apps.filter((a) => next[a.slug]).map((a) => [a.slug, next[a.slug]]));
    writeFileSync(sourceFile, `${JSON.stringify({ repository: REPOSITORY, apps: ordered }, null, 2)}\n`);
    console.log(summary.join("\n"));
  } finally {
    if (temporary) rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main(process.argv.slice(2));
