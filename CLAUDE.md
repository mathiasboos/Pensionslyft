# Pensionslyft – notes for Claude

This repo is the website pensionslyft.se. It is a static Astro site deployed by
Cloudflare Pages: every merge to `main` goes live, and every PR gets a preview URL.
The owner is not a developer. They ask for changes in plain words and review them on
the Cloudflare preview link, so explain changes without jargon and always say what to
look at on the preview.

## Stack
- Astro (static output, `build.format: "file"`, `trailingSlash: "never"`). URLs have
  no trailing slash: `/artiklar`, `/pensionskalkylator`.
- Tailwind CSS v4. The design tokens are in `src/styles/global.css`. The look is that of
  ramp.com in Pensionslyft's colours, as the owner chose in October 2026: a white background,
  navy ink and buttons (`primary`), a bright gold highlight for the main call to action and
  figure chips (`highlight`), warm light grey panels (`muted`), sand (`secondary`) for notes,
  large Inter headings set a little tight (`font-display`), IBM Plex Mono for small uppercase
  labels (the `.eyebrow` and `.figure-chip` classes), and a dotted hero (`.dot-grid`). Use the
  token classes (`bg-primary`, `text-muted-foreground`, `font-display`, …), not raw hex values.
  There is no serif font any more.
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
  and commit the new file. The script also puts the site's colours into the app
  (`scripts/typfallsmodellen-theme.css`, which sets the app's colour and font variables and turns off its dark
  mode, plus the Google Fonts link of the site), so that the page looks like the other calculators; change
  colours and fonts there, never in the HTML. When the app gets new CSS variables (the tab "Bästa pensionsålder" added
  `--fig-pa-*`, `--fig-ag-*`), look at the new tab after a sync and map them in the theme too, validated with the dataviz
  validator; otherwise they keep the app's own palette. The engine of the old React port is back in `src/lib/typfall/`
  (with `src/data/typfall.json` and its tests `tests/typfall*.test.ts`), but only as the pension engine of the
  Pensionsöversikten; its UI is in git history up to commit a4c6971.
- **Pensionsöversikten** (`/pensionsoversikt`, `src/lib/pensionsoversikt.ts`, `PensionsoversiktCalculator.tsx`), after
  Wealthsimple's retirement calculator and next to the older Sparkalkylatorn (the former Pensionskalkylatorn, URL `/pensionskalkylator`, unchanged): the public
  pension and the tjänstepension come from `runTypfall` (or amounts the user enters), are taxed with `calcNettolon`
  (2026 rules, förhöjt grundavdrag from `xage`), and the budget's gap (minPension's Bas/Medel/Plus or an own amount)
  is taken from an ISK followed month by month. Everything is shown in today's money. "Det du behöver" is the capital
  at the retirement age that lasts to the life expectancy (bisection), and the forecast box compares it with what the
  user will have. `tests/pensionsoversikt.test.ts` pins the default and the Plus case.
  The chart and the tiles show **all capital**: the private savings and the *capital value* of inkomstpension,
  premiepension, tjänstepension and other income (garantipension is not counted as capital: with no real wage growth it comes only late in life; it stays in the monthly income and the forecast) (the present value of what each pays after tax
  to the life expectancy), against the capital that funds the whole budget. One discount rate is calibrated so that the
  budget's present value equals what the month-by-month savings run (fee, ISK tax) says funds the whole budget; then the
  capital view and the forecast box agree (`discount`, `capital`, `capitalDiff`, `monthlyDiff` in `kalkylera`).
  Surplus (`capitalDiff >= 0`): green "Kapitalöverskott", "Budgetöverskott" and "Du kan uppskattningsvis gå i pension
  vid YY"; deficit: red "Behövs", "Budgetunderskott" and "Du behöver uppskattningsvis jobba till YY" (`retireEstimate`,
  the earliest age 55–75 at which the capital reaches the need and the savings carry the budget until the pensions start). `calculatePension` in
  `src/lib/pension.ts` is still used by the Sparkalkylatorn and the home page.
- **Sparkalkylatorn's payout** (`calculatePayout` in `src/lib/pension.ts`, next to the untouched `calculatePension`):
  the saving phase is `calculatePension`'s; the payout is either "monthly" (the same annuity over `payoutYears`, the
  capital growing at half the net return meanwhile, followed year by year) or "lump" (everything at the retirement).
  The chart shows the capital falling to 0 and the payouts as bars; the table has a column "Utbetalning". Before tax.
- **Pensionsplaneraren is not ported either, and it updates itself.** `/pensionsplaneraren` shows
  `Retirement_Planner.html` of `github.com/mathiasboos/Calculators` (11 tabs, Chart.js and SheetJS inline, EN/SV)
  in a same-origin iframe like Typfallsmodellen. The owner develops it there and wants every change, a parameter or a
  tab added or removed, on the site without porting: Calculators `main` is the source of truth. The GitHub Action
  `.github/workflows/pensionsplaneraren.yml` runs every hour (and on "Run workflow"):
  `node scripts/sync-pensionsplaneraren.mjs` fetches the file (a blob-less clone, no token: the repo is public)
  and writes `public/pensionsplaneraren-app.html` and `src/data/pensionsplaneraren-source.json` (the file's last
  commit, shown on the page). If they changed, `scripts/check-pensionsplaneraren.mjs` (Playwright: no script errors,
  Swedish, every tab opens, charts drawn, Monte Carlo runs), `npm test` and the build must pass. Then it commits to
  `main` and Cloudflare deploys. A failure publishes nothing and opens the issue "Pensionsplaneraren kunde inte
  uppdateras". Never edit the HTML by hand. The site's part is in `scripts/`:
  - `pensionsplaneraren-colors.mjs` maps every colour the app writes into its code to a site colour, by use (text,
    area or chart series), and is applied by `scripts/lib/recolor.mjs`.
  - `pensionsplaneraren-theme.css` holds the app's CSS variables and its main parts in the site's style.
  - `pensionsplaneraren-site.js` holds Swedish by default (the visitor's EN/SV click is remembered), white tooltips
    and chart fonts.

  After changing one of them, run the sync script with `--reapply`. The Action would also redo it on its next run.
  Colours the app starts to use later keep their own colour until added to the map; the sync prints them and the
  Action lists them in its summary. New texts in the planner need Swedish in its own `LANG.sv`. The shared
  injection (`<!-- pensionslyft:begin/end -->`, the site's fonts) is `scripts/lib/embed.mjs`, also used by the
  Typfallsmodellen script.
- **One palette and one typeface for all calculators.** The owner wants every calculator in the colours and fonts
  of the Sparkalkylatorn: the tokens in `src/styles/global.css` (navy, gold, sand, white; the `chart-*`
  colours in diagrams), Inter for text and Inter `font-display` for headings and big numbers. A
  calculator taken from GitHub keeps its calculation, texts and layout, but not its own palette or fonts: map
  them to the site's, and check diagram colours with the dataviz validator.
- **Where the calculators come from.** The owner keeps the up-to-date sources of the calculators in two
  public repositories (Calculators was made public in October 2026 so the planner can be fetched without a token): `github.com/mathiasboos/Calculators` (standalone HTML files: `FIRE_Calculator .html`,
  `Salary_Exchange_Consumer.html`, `Net_Salary_2026.html`, and others, with the tax constants to check every December in its
  CLAUDE.md) and `github.com/mathiasboos/Typfallsmodellen` (the TypeScript engine and the web app that is
  built into `typfallsmodellen.html`). When a calculator on this site is added, changed or checked, read the
  current file in those repositories first (a read-only shallow clone is enough) and port from it, instead of
  working from an older copy. They are newer than anything uploaded to a chat.
- `src/lib/lonevaxling.ts` is a port of `Salary_Exchange_Consumer.html`, and `tests/lonevaxling.test.ts` compares
  the calculation with what the original shows (`tests/fixtures/lonevaxling-web.json`). Its rules are for 2026.
  The page (`LonevaxlingCalculator.tsx`) keeps the original's texts and behaviour but is built like the
  Sparkalkylatorn, in the site's own components: inputs in a frame to the left, results and a Recharts chart to
  the right (`AmountSliderField` is in `fields.tsx`). There is no separate stylesheet or canvas chart any more.
- **Ränta på ränta** (`calculateCompound` in `src/lib/pension.ts`, `CompoundCalculator.tsx`): the capital grows at the
  gross return and the tax (Avkastningsskatt, default 1,05 %) and the fee are taken each year as a share of the
  year-end capital, like the FIRE calculator, so the KPI boxes add up (Startkapital + Månadssparande + Ränta − Årlig
  avgift − Avkastningsskatt = Slutkapital). A typed Sparmål gives the monthly saving through `requiredMonthlyDeposit`
  (the final capital is linear in the saving). The charts write amounts in kronor, never "tkr".
- **Amount fields** (`fields.tsx`): `AmountField`, `NumberField` and `AmountSliderField` write the amount with thousands
  separators as it is typed ("100 000") and take `stepBy` for the − / + buttons (hold to repeat, arrow keys in the field,
  snapping to the step; `stepValue` in `src/lib/format.ts`). Give every field in kronor a `stepBy` (100 for a monthly
  saving, 1 000 for a salary, 10 000 for a capital); fields in % get none. FIRE has only sliders, and the embedded
  Typfallsmodellen page is its own app.
- **Tables and fold-outs.** Every fold-out in the calculators is `Collapsible` (an arrow at the far left, then the name; closed
  from the start). A table of the result year by year is `YearTable` (a `Collapsible` with CSV and Excel buttons in its
  header; `src/lib/export.ts` writes the files): Sparkalkylatorn, Ränta på ränta and FIRE use it, so a new calculator with a
  table should too. The embedded Typfallsmodellen app is built from another project, so the fold-in of its table
  "Månadsinkomster" is added by `scripts/typfallsmodellen-site.js` and `scripts/typfallsmodellen-theme.css`, which the sync script
  puts into the file (`node scripts/sync-typfallsmodellen.mjs --reapply` does it again after an edit, with no build).
- `src/lib/nettolon.ts`, `src/components/calculators/NettolonCalculator.tsx` and `src/data/kommunalskatt-2026.json`
  are a port of `Net_Salary_2026.html`. The calculation and its rounding are the original's, and
  `tests/nettolon.test.ts` compares it with what the original shows for 190 sets of inputs
  (`tests/fixtures/nettolon-web.json`). The page itself is built in the site's own components, colours and
  fonts (`AmountField`, `SelectField` and `SwitchRow` are in `fields.tsx`), not in the original's look. The rules
  are for income year 2026 and the list of municipalities is SCB's of 2025-12-15: check both every December.
- **The dots ripple.** The dotted hero background (`.dot-grid`: home, `/kalkylatorer`, `/rapporter`) is drawn on a canvas by
  `src/scripts/dot-ripple.ts` (loaded from `BaseLayout.astro`) so that a click or tap on a surface where nothing happens
  sends a wave out from the click point through the dots (`rippleAt`, `dotLook`; tested in `tests/dot-ripple.test.ts`).
  Links, buttons, fields and the like (`isInteractive`) do not ripple. Without JavaScript, and with
  `prefers-reduced-motion: reduce`, the CSS dots (`.dot-grid::before` in `global.css`) stay as they were; the canvas has the
  same grid, colour and mask. The animation runs only while a ripple is alive. The other dotted places (article covers)
  are CSS only.
- **Navigation.** `src/lib/site-nav.ts` is the one list of the site's pages (the calculators in their groups, and
  Insikter: Artiklar, Rapporter). The header, its menus, the footer, the home page and `/kalkylatorer` are built from
  it, so a new page is added there once. The header (`SiteHeader.astro`) has Ramp-style menus: on a computer a panel
  opens when the pointer rests on its title and stays open while the pointer travels into it; a click, a tap, Enter or
  Space toggles it, and Escape closes it. On a phone a hamburger opens a sheet with the same links. Test a change to
  the header with hover, keyboard and touch (Playwright, with an iPhone profile for touch).
- **Articles** (`src/content/articles/*.md`, page `src/pages/artiklar/[slug].astro`). Pictures go in `public/artiklar/` and
  are linked from the Markdown as `/artiklar/<name>.png`. A reading meter (`data-read-progress`) sits under the header
  on every article; it is at `top-[65px]` because the header is 64 px plus its border, so change both together.
- `/rapporter` lists links to the authorities' reports from `src/data/rapporter.ts`. Link to a page that lists every
  edition rather than to one year's PDF, and only add a link that has been checked to work.
- The articles have no images: `ArticleCover.astro` draws a cover from the category (colour) and the article (the
  shape of the rising line). The home page's example figures and key figures are computed at build time from
  `src/lib/pension.ts`, `src/lib/nettolon.ts` and `src/data/kommunalskatt-2026.json`, so they follow those files.
  The home page's salary field opens `/nettolonkalkylator?lon=…`, which the Nettolön calculator reads.
- Sliders are native range inputs (`SliderField` in `fields.tsx`, the `.range` class in `global.css`). The
  Radix slider that was used before did not follow a finger on a phone, so do not bring it back; test any
  new slider with touch events (Playwright with an iPhone profile and CDP `Input.dispatchTouchEvent`).
- Never commit `.env` files or secrets. The repository is public.

## Before opening a PR
```sh
npm test
npm run build      # includes astro check (types + content schema)
npm run preview    # then take Playwright screenshots of the changed pages at 1280 px and 375 px
```
Chromium is preinstalled for Playwright (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`).
Open a PR into `main` and tell the owner that Cloudflare will post a preview link on it.
