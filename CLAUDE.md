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
- `src/lib/typfall/` is a line-by-line port of the VBA in Pensionsmyndighetens typfallsmodell
  (ver. 4.8), with data in `src/data/typfall.json`. `tests/typfall.test.ts` compares it with the
  model's own output, so keep the VBA's rounding and quirks when changing it. The settings from the
  sheet Adv_settings are `TypfallAdvanced` in `model.ts`; at their defaults the result must stay
  identical to the model's run. See `scripts/typfall/README.md` for how to refresh the data.
- Never commit `.env` files or secrets. The repository is public.

## Before opening a PR
```sh
npm test
npm run build      # includes astro check (types + content schema)
npm run preview    # then take Playwright screenshots of the changed pages at 1280 px and 375 px
```
Chromium is preinstalled for Playwright (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
Open a PR into `main` and tell the owner that Cloudflare will post a preview link on it.
