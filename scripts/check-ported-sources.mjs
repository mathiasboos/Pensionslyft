#!/usr/bin/env node
// Compares the files in github.com/mathiasboos/Calculators that the site's re-written calculators were ported from
// (src/data/ported-sources.json) with their latest commit on `main`, and says which have changed since the port was checked.
//
//   node scripts/check-ported-sources.mjs                        a list, and exit code 0
//   node scripts/check-ported-sources.mjs --json <file>          also writes { changed, issues } for the Action
//   node scripts/check-ported-sources.mjs --calculators <path>   uses a clone of Calculators you have (default: a fresh one)
//
// The GitHub Action .github/workflows/watch-calculators.yml runs it every hour and opens (or updates, or closes) one issue
// per file. Nothing is changed in the code: a changed original is ported by hand, and the `commit` of its entry in
// src/data/ported-sources.json is moved to the new commit with it.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { findChanged, issueBody, issueTitle } from "./lib/ported.mjs";

const site = resolve(import.meta.dirname, "..");
const { repository, branch, sources } = JSON.parse(readFileSync(join(site, "src/data/ported-sources.json"), "utf8"));
const args = process.argv.slice(2);
const valueOf = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);

const git = (gitArgs, cwd) => execFileSync("git", gitArgs, { cwd, encoding: "utf8", env: { ...process.env, GIT_LFS_SKIP_SMUDGE: "1" } });

let clone = valueOf("--calculators") ? resolve(valueOf("--calculators")) : undefined;
let temporary;
if (!clone) {
  temporary = mkdtempSync(join(tmpdir(), "calculators-"));
  clone = join(temporary, "calculators");
  // The history and the trees only, which is all `git log -- <file>` needs.
  git(["clone", "--quiet", "--filter=blob:none", "--no-checkout", "--branch", branch, repository, clone]);
}

try {
  // A clone you pass in is read at its remote `main`; the fresh one is on `main` already. (A shallow clone gives wrong
  // answers: it needs the whole history.)
  const rev = temporary ? "HEAD" : `origin/${branch}`;
  const latest = {};
  for (const { file } of sources) {
    const [commit, committedAt, subject] = git(["log", "-1", "--format=%H%n%cI%n%s", rev, "--", file], clone).trim().split("\n");
    if (commit) latest[file] = { commit, committedAt, subject };
  }
  const changed = findChanged(sources, latest);
  const issues = changed.map((source) => ({ calculator: source.calculator, title: issueTitle(source), body: issueBody(source, repository) }));

  for (const source of sources) {
    const hit = changed.find((c) => c.file === source.file);
    if (!hit) console.log(`  up to date  ${source.calculator} (${source.file}, ${source.commit.slice(0, 7)})`);
    else if (hit.missing) console.log(`  GONE        ${source.calculator}: ${source.file} is not on ${branch} any more`);
    else console.log(`  CHANGED     ${source.calculator}: ${source.file} ${source.commit.slice(0, 7)} → ${hit.latest.commit.slice(0, 7)} ${hit.latest.subject}`);
  }
  if (valueOf("--json")) writeFileSync(resolve(valueOf("--json")), `${JSON.stringify({ changed: changed.map((c) => c.file), issues }, null, 2)}\n`);
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
