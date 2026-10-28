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
  which the page shows as the version). Never edit the HTML by hand. A link can open a tab: `/typfallsmodellen#retirement`
  ("Bästa pensionsålder?") and `#lasts` ("Hur länge räcker pensionen?"), `#amount` ("Hur mycket får jag?"), the names being the app's `data-screen` names; the
  site script reads the hash and the check script tests it, so the articles can link to a tab. It updates itself: the GitHub Action
  `.github/workflows/typfallsmodellen.yml` runs `node scripts/sync-typfallsmodellen.mjs --if-changed` every hour, which
  looks at `main` of the project (never its default branch, which can be another branch) and does nothing unless `main`
  is a commit the site does not have; then it builds, `scripts/check-typfallsmodellen.mjs` opens every screen in a browser,
  the tests and the build run, and the bot commits the new file to `main` (an issue "Typfallsmodellen kunde inte
  uppdateras" if anything fails). By hand: the same script, or `--ref <full commit>`. The script also puts the site's colours into the app
  (`scripts/typfallsmodellen-theme.css`, which sets the app's colour and font variables and turns off its dark
  mode, plus the Google Fonts link of the site), so that the page looks like the other calculators; change
  colours and fonts there, never in the HTML. When the app gets new CSS variables (the tab "Bästa pensionsålder" added
  `--fig-pa-*`, `--fig-ag-*`, the tab "Hur länge räcker pensionen?" `--fig-pu-*`), look at the new tab after a sync and map them in the theme too, validated with the dataviz
  validator; otherwise they keep the app's own palette. (The old React port of the Typfall model, `src/lib/typfall/`, was the pension engine of the Pensionsöversikten;
  it went when that calculator moved to GitHub, see git history before the "Pensionsöversikten: visa GitHub-filen" commit.)
- **How a change on GitHub reaches the site.** The owner expects a change in `github.com/mathiasboos/Calculators` or
  `github.com/mathiasboos/Typfallsmodellen` to show up here without anyone asking. Every calculator is in one of these groups, and a
  new one must be put in one of them (and in this table) when it is added:

  | Calculator | Kept up to date by |
  |---|---|
  | Pensionsplaneraren | `.github/workflows/pensionsplaneraren.yml`, hourly: fetches `Retirement_Planner.html`, checks it, publishes by itself |
  | FIRE (`FIRE_Calculator .html`), Nettolön (`Net_Salary_2026.html`), Löneväxling (`Salary_Exchange.html`), Pensionsöversikt (`Pension Overview.html`), Ränta på ränta (`Compound Interest Calculator.html`), Pensionssparkalkylatorn (`Pension Savings Calculator.html`), Pensionsmålkalkylatorn (`Replacement rate goal calculator.html`) | `.github/workflows/apps.yml`, hourly: `scripts/sync-apps.mjs --if-changed` fetches every file listed in `scripts/lib/apps.mjs` whose commit is newer than the pin in `src/data/apps-source.json`, `scripts/check-apps.mjs` checks it in a browser, the Action publishes by itself |
  | Typfallsmodellen | `.github/workflows/typfallsmodellen.yml`, hourly: builds `main`, checks it, publishes by itself |

- **Calculators shown straight from GitHub** (`scripts/lib/apps.mjs`; today the Pensionsmålkalkylatorn, `/pensionsmalkalkylatorn`
  and `/en/replacement-rate-calculator`, the Pensionssparkalkylatorn, `/pensionskalkylator` and `/en/pension-savings-calculator`, Ränta på ränta, `/ranta-pa-ranta` and `/en/compound-interest`, the Pensionsöversikten, `/pensionsoversikt` and `/en/pension-overview`, the Löneväxlingskalkylatorn, `/lonevaxlingskalkylator` and `/en/salary-exchange`, FIRE, `/fire-kalkylator` and `/en/fire-calculator`, and the Nettolönkalkylatorn, `/nettolonkalkylator` and `/en/net-salary`). The file in Calculators is the master and is never edited here: `node
  scripts/sync-apps.mjs [--only slug] [--if-changed] [--reapply]` puts it in `public/app/<slug>.html` (disallowed in
  robots.txt) with `scripts/apps-theme.css` (hides the file's own header and SV | EN switch), `scripts/apps-site.js`
  (language from `?lang=`, links) and, when the file does not have the site's palette, its colours in
  `scripts/apps-colors.mjs` (`native: false` in the list). The page is `src/components/AppFrame.astro` (an iframe as
  high as the file) plus a Swedish page and an English twin; the menu item has `enHref` in `src/lib/site-nav.ts`. To
  move another calculator over: add it to `apps.mjs`, its pages and nav entry, run the sync, check it with
  `scripts/check-apps.mjs`, and take its React port and tests away (one source only). New texts need both languages in
  the file's own dictionary.
- **Pensionsplaneraren is not ported either, and it updates itself.** `/pensionsplaneraren` shows
  `Retirement_Planner.html` of `github.com/mathiasboos/Calculators` (11 tabs, Chart.js and SheetJS inline, EN/SV)
  in a same-origin iframe like Typfallsmodellen. The owner develops it there and wants every change, a parameter or a
  tab added or removed, on the site without porting: Calculators `main` is the source of truth. The GitHub Action
  `.github/workflows/pensionsplaneraren.yml` runs every hour (and on "Run workflow"):
  `node scripts/sync-pensionsplaneraren.mjs` fetches the file (a blob-less clone, no token: the repo is public)
  and writes `public/pensionsplaneraren-app.html` and `src/data/pensionsplaneraren-source.json` (the file's last
  commit; the page no longer shows it, at the owner's request). If they changed, `scripts/check-pensionsplaneraren.mjs` (Playwright: no script errors,
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
- **News** are Markdown files in `src/content/news/` (collection `news` in `src/content.config.ts`: `title`, `source`, `source_url`, `excerpt`,
  `published_at`), listed at `/nyheter` and shown at `/nyheter/<file name>`; "Nyheter" is in `insights` (the Insikter menu and the footer) and a top-level
  header link. The owner pastes a news item (text, link, date) in the chat and Claude rewrites it in clean Swedish, checks every number, adds the file and
  opens a PR; there is no editor. No agency logos: the source is named in text and linked. A picture that comes with a news item (the owner has the right
  to use it) is always put the same way: the `<img>` as the first thing in the text, floated to the right without a frame (`.news-body img`), its
  size set by `width`/`height` (about 144 px for a square pyramid, 260 px for a wide logo), file in `public/nyheter/`, cropped of white margins
  and given a pure white background, with an `alt` text. A table is written as a plain Markdown table (shown without a frame).
- **Search (SEO) fields.** News and articles need `tags` (2-6 lowercase words; shown as `#hashtag` chips, used as `keywords` and `article:tag`;
  news tags link to `/nyheter/tagg/<slug>`), a `title` of at most 70 characters and an `excerpt` of 50-160 characters (the meta description);
  `tests/seo.test.ts` checks every file. Structured data is in `src/lib/seo.ts`; `BaseLayout.astro` adds the home page's `WebSite`/`Organization`,
  each calculator's `WebApplication` (found by its path in `site-nav.ts`), a `BreadcrumbList` (prop `breadcrumbs`), og/twitter image
  (`public/og-default.png`, 1200x630, prop `image` overrides), `max-image-preview:large` and the RSS link. `/nyheter/rss.xml` is the news feed and the
  sitemap carries `lastmod` from `published_at` (`astro.config.mjs`). A new calculator is picked up automatically once it is in `site-nav.ts`; give it `keywords` there. After `npm run build`, `npm run check:seo` checks every built page
  (title ≤ 65, description 50-175, canonical, og:image, one h1, valid JSON-LD, no duplicate titles/descriptions).
- **The two bands at the top of the home page**: "Nytt:" (the five newest news headlines, linked) and below it "Nyckeltal <year>:" (the key figures,
  scrolling the other way and slower). The figures are in `src/data/nyckeltal.ts` (label, value, and the bracket note = the change on last year or last
  year's value), in the owner's order; when a new year's figures are out, change that file and `KEY_FIGURES_YEAR`.
- **Swedish and English.** Swedish is the main language and keeps its URLs; the English pages live under `/en` (`src/pages/en/`). A page that exists in both languages is
  listed in `PAIRS` in `src/lib/i18n.ts` (Swedish path ↔ English path): the language switch in the header (`SV | EN`, plain links, the choice kept in
  `localStorage` as `pl-lang`), the `hreflang` links in `BaseLayout.astro` and the tests all use that list, and a page without a twin links the switch to the other
  language's front page. `<html lang>`, `og:locale`, the home page's JSON-LD and the sitemap (`i18n` in `astro.config.mjs`) follow the language, which is told from
  the path (`langOf`). The texts around the pages (menu, footer, cards, hint) are in `src/i18n/ui.ts`; the English dictionary has the Swedish one's type, so a missing
  text fails the build. The calculators' English names and descriptions are in `site-nav.ts` (`navItem`, `groupTitle`, `levelName`), the key figures in
  `nyckeltal.ts` (`keyFiguresEn`). A visitor whose browser is English (or who chose English) gets a dismissible hint on the Swedish pages and is never redirected.
  **Live in English**: the home page, `/en/calculators`, `/en/about`, the news (`/en/news`, tag pages `/en/news/tag/<slug>`, RSS) and the articles (`/en/articles`).
  The calculators shown from GitHub (see below) have English pages too; the other calculators and the reports are Swedish only, and the English pages link to the Swedish calculator pages (marked "Swedish") and the English menu has no Reports.
  **English news and articles**: each Swedish item has an English file of its own in `src/content/en/news/` or `src/content/en/articles/` (collections `newsEn` and
  `articlesEn`, the same fields plus `translation_of: <Swedish slug>`; the file name is the English URL). **A new Swedish news item or article gets its English
  twin in the same PR** (`tests/translations.test.ts` fails otherwise and checks that date, source, headings, table rows, list items, images, links and every number
  are the same in both). Translate faithfully, keep official Swedish terms with an English gloss ("income pension (inkomstpension)"), amounts as "86,600 kronor"/"kr"
  with English separators, decimals with a point, dates as "28 October 2026", the English slug and tags in English, title ≤ 70 and excerpt 50–160 characters, English
  alt text on images; an agency picture with Swedish text is kept (say so in the alt text) and our own graphics get an English twin (`…-en.webp`). The pages are built
  by shared components in `src/components/pages/` with a `lang` prop, so the Swedish and English pages change together. The pairs for the language switch and hreflang
  come from `translation_of` (see `PAIRS` in `src/lib/i18n.ts`); `scripts/check-seo.mjs` checks that every hreflang link points at a page that links back.
  When another page gets an English version, add its pair to `PAGE_PAIRS` and its English texts, and add it to the English menu.
- **The news slider on the home page** (under the hero, where the two calculator examples used to be): `src/components/NewsSlider.astro` shows the
  six newest news items as designed cards (navy, fine dots, an accent colour per slide, no photo), with arrows and dots. It is a scroll-snap
  track, so it also swipes and works without JavaScript; `src/scripts/news-slider.ts` adds arrows, dots and auto-advance every 6 s (pauses on
  hover/focus/touch, stops for good after a click or swipe, off with `prefers-reduced-motion`). `nextIndex` is in `src/lib/slider.ts` (tested).
- **Every calculator has a level**, `level: "Enkel" | "Medel" | "Avancerad"` on its `NavItem` in `src/lib/site-nav.ts` (a few fields and the answer at
  once / more choices / several tabs and many settings). It shows as three dots and the word (`CalculatorLevel.astro`) in the menu, on the cards
  and with a legend on `/kalkylatorer`. A new calculator must get one.
- **One palette and one typeface for all calculators.** The owner wants every calculator in the colours and fonts
  of the Pensionssparkalkylatorn: the tokens in `src/styles/global.css` (navy, gold, sand, white; the `chart-*`
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
- **Tables and fold-outs.** The embedded Typfallsmodellen app is built from another project, so the fold-in of its table
  "Månadsinkomster" is added by `scripts/typfallsmodellen-site.js` and `scripts/typfallsmodellen-theme.css`, which the sync script
  puts into the file (`node scripts/sync-typfallsmodellen.mjs --reapply` does it again after an edit, with no build).
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
  shape of the rising line). The home page's Prisbasbelopp comes from `src/lib/constants.ts` and its key figures from `src/data/nyckeltal.ts`.
  The home page's salary field opens `/nettolonkalkylator?lon=…`, which the Nettolön calculator reads.
- Sliders are native range inputs (the `.range` class in `global.css`). The
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
