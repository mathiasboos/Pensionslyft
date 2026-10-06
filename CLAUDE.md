# Pensionslyft – notes for Claude

This repo is the website pensionslyft.se. It is a static Astro site deployed by
Cloudflare Pages: every merge to `main` goes live, and every PR gets a preview URL.
The owner is not a developer. They ask for changes in plain words and review them on
the Cloudflare preview link, so explain changes without jargon and always say what to
look at on the preview.

## Stack
- Astro (static output, `build.format: "file"`, `trailingSlash: "never"`). URLs have
  no trailing slash: `/artiklar`, `/pensionskalkylator`.
- Tailwind CSS v4. The design tokens are in `src/styles/global.css` (navy primary,
  sand secondary, off-white background, Source Serif 4 for headings, Inter for body).
  Use the token classes (`bg-primary`, `text-muted-foreground`, `font-serif`, …), not
  raw hex values.
- React only for interactive parts (the calculators in `src/components/calculators/`,
  mounted with `client:load`). Everything else is `.astro`. Icons come from
  `lucide-react` and are rendered statically.
- shadcn/ui components live in `src/components/ui/`. To add one, copy its source from
  ui.shadcn.com into that folder.
- Articles are Markdown in `src/content/articles/`. The schema is in
  `src/content.config.ts`: title, category, excerpt, lead, reading_minutes,
  published_at, plus optional author, draft and slug. The lead paragraph is shown
  large above the body. Use `##` and `###` for headings inside the body.
- `src/layouts/BaseLayout.astro` sets the title, description, Open Graph tags, the
  canonical URL and optional JSON-LD. Every page uses it.

## Rules
- All site text is Swedish. Format numbers with `src/lib/format.ts`
  (`formatSek`, `formatPercent`, `formatDate`), never by hand.
- Keep the calculator math in `src/lib/pension.ts`. The values in
  `tests/pension.test.ts` are the reference: only change them when a change to the
  math is intended.
- The site must work at phone width (375 px) with no horizontal scrolling.
- **Typfallsmodellen is not ported to this site.** `/typfallsmodellen` shows the real web app of
  `github.com/mathiasboos/Typfallsmodellen` in a same-origin iframe the height of the window (the app
  uses `position: fixed`, a sticky input column and `100vh`, so it must not be auto-height). The app is one
  self-contained file, `public/typfallsmodellen-app.html`, built by `node scripts/sync-typfallsmodellen.mjs`
  (clones the project, builds `apps/web`, copies the file and writes `src/data/typfallsmodellen-source.json`,
  which the page shows as the version). Never edit the HTML by hand; to update the calculator, run the script
  and commit the new file. The app keeps its own look and follows the OS dark mode. The old React port
  (`src/lib/typfall/`) is in git history up to commit a4c6971.
- **Where the calculators come from.** The owner keeps the up-to-date sources of the calculators in two
  public repositories: `github.com/mathiasboos/Calculators` (standalone HTML files: `FIRE_Calculator .html`,
  `Salary_Exchange_Consumer.html`, and others, with the tax constants to check every December in its
  CLAUDE.md) and `github.com/mathiasboos/Typfallsmodellen` (the TypeScript engine and the web app that is
  built into `typfallsmodellen.html`). When a calculator on this site is added, changed or checked, read the
  current file in those repositories first (a read-only shallow clone is enough) and port from it, instead of
  working from an older copy. They are newer than anything uploaded to a chat.
- `src/lib/lonevaxling.ts`, `src/components/calculators/Lonevaxling*.tsx` and `src/styles/lonevaxling.css`
  are a port of `Salary_Exchange_Consumer.html`. The page keeps that file's own green look, scoped under
  `.lv`, instead of the site's tokens, and `tests/lonevaxling.test.ts` compares the calculation with what the
  original shows (`tests/fixtures/lonevaxling-web.json`). Its rules are for 2026.
- Never commit `.env` files or secrets. The repository is public.

## Before opening a PR
```sh
npm test
npm run build      # includes astro check (types + content schema)
npm run preview    # then take Playwright screenshots of the changed pages at 1280 px and 375 px
```
Chromium is preinstalled for Playwright (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
Open a PR into `main` and tell the owner that Cloudflare will post a preview link on it.
