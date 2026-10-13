#!/usr/bin/env node
// Fetches the Pensionsplaneraren – Retirement_Planner.html in github.com/mathiasboos/Calculators – and puts it in
// public/, where /pensionsplaneraren shows it, with the site's look put on it on the way: the site's colours instead of
// the app's (scripts/pensionsplaneraren-colors.mjs, applied by scripts/lib/recolor.mjs), the site's fonts,
// scripts/pensionsplaneraren-theme.css and scripts/pensionsplaneraren-site.js (Swedish by default). It also writes which
// version of the file it took to src/data/pensionsplaneraren-source.json, which the page shows.
//
//   node scripts/sync-pensionsplaneraren.mjs                the latest version on main
//   node scripts/sync-pensionsplaneraren.mjs --ref <ref>    the version at a branch, tag or commit
//   node scripts/sync-pensionsplaneraren.mjs --reapply      the version the site has now, with the site's current look
//                                                           (after a change to the colours, the theme or the script)
//   node scripts/sync-pensionsplaneraren.mjs <path>         a clone of Calculators you have, or the HTML file itself
//
// The GitHub Action .github/workflows/pensionsplaneraren.yml runs it every hour and publishes a new version by itself.
// The file is the same for the same version and the same site files, so a run that finds nothing new changes nothing.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { colors, fonts, vars } from "./pensionsplaneraren-colors.mjs";
import { injectSiteChanges, setTitle } from "./lib/embed.mjs";
import { recolor } from "./lib/recolor.mjs";

const REPOSITORY = "https://github.com/mathiasboos/Calculators";
const FILE = "Retirement_Planner.html";
const TITLE = "Pensionsplaneraren – Pensionslyft";
const site = resolve(import.meta.dirname, "..");
const output = join(site, "public/pensionsplaneraren-app.html");
const sourceFile = join(site, "src/data/pensionsplaneraren-source.json");

const git = (args, cwd) =>
  execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" } });

/** The app's HTML and where it comes from: { html, source }. */
function fetchApp(argv) {
  const refAt = argv.indexOf("--ref");
  let ref = refAt >= 0 ? argv[refAt + 1] : undefined;
  if (argv.includes("--reapply")) {
    if (!existsSync(sourceFile)) throw new Error(`--reapply needs ${sourceFile}; run the script without it first.`);
    ref = JSON.parse(readFileSync(sourceFile, "utf8")).commit;
  }
  const path = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--ref");

  if (path && existsSync(path) && statSync(path).isFile()) {
    return { html: readFileSync(path, "utf8"), source: { repository: REPOSITORY, path: FILE, commit: "local", committedAt: null, subject: path } };
  }

  let clone = path ? resolve(path) : undefined;
  let temporary;
  if (!clone) {
    temporary = mkdtempSync(join(tmpdir(), "calculators-"));
    clone = join(temporary, "calculators");
    // Only the history and the trees; the one file needed is fetched by `git show`.
    git(["clone", "--quiet", "--filter=blob:none", "--no-checkout", REPOSITORY, clone]);
  }
  try {
    const rev = resolveRev(clone, ref);
    const html = git(["show", `${rev}:${FILE}`], clone);
    const [commit, committedAt, subject] = git(["log", "-1", "--format=%H%n%cI%n%s", rev, "--", FILE], clone).trim().split("\n");
    return { html, source: { repository: REPOSITORY, path: FILE, commit, committedAt, subject } };
  } finally {
    if (temporary) rmSync(temporary, { recursive: true, force: true });
  }
}

function resolveRev(clone, ref) {
  if (!ref) return "HEAD";
  for (const candidate of [ref, `origin/${ref}`]) {
    try {
      return git(["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`], clone).trim();
    } catch {
      /* try the next */
    }
  }
  throw new Error(`Cannot find "${ref}" in ${REPOSITORY}.`);
}

/** The app with the site's look. */
export function withSiteLook(html) {
  const { html: recoloured, counts, unmapped } = recolor(html, { colors, vars, fonts });
  const page = injectSiteChanges(setTitle(recoloured, TITLE), {
    css: readFileSync(join(site, "scripts/pensionsplaneraren-theme.css"), "utf8"),
    js: readFileSync(join(site, "scripts/pensionsplaneraren-site.js"), "utf8"),
    name: "the Pensionsplaneraren",
  });
  return { page, counts, unmapped };
}

const { html, source } = fetchApp(process.argv.slice(2));
for (const needed of ["setLang", "tab-btn"]) {
  if (!html.includes(needed)) console.warn(`Warning: the app no longer has "${needed}"; check the page (language, tabs).`);
}
const { page, counts, unmapped } = withSiteLook(html);
writeFileSync(output, page);
writeFileSync(sourceFile, `${JSON.stringify(source, null, 2)}\n`);

const replaced = Object.values(counts).reduce((a, b) => a + b, 0);
const missing = Object.entries(unmapped).sort((a, b) => b[1] - a[1]);
console.log(`Pensionsplaneraren from ${source.commit.slice(0, 7)} (${source.committedAt ?? "local file"}): ${source.subject}`);
console.log(`${replaced} colours replaced with the site's.`);
if (missing.length) {
  const list = missing.map(([key, n]) => `#${key} (${n})`).join(", ");
  console.log(`Colours not in scripts/pensionsplaneraren-colors.mjs, kept as they are: ${list}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Pensionsplaneraren: colours without a site colour\n\nThese keep the app's own colour until they are added to \`scripts/pensionsplaneraren-colors.mjs\`: ${list}\n`,
    );
  }
}
