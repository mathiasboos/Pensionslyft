# Pensionslyft – notes for Claude

This repo supports the Framer site pensionslyft.se. The owner builds pages in Framer and
copies files from here into Framer by hand, so everything must be paste-ready.

## Rules

- **Framer components (`framer/*.tsx`)**
  - Keep each component in one self-contained file.
  - Import only from `react` and `framer`. No other npm packages, no Tailwind and no CSS
    files: use inline styles.
  - Write layouts that adapt without media queries (flex-wrap, grid `auto-fit`), because
    the component width is set in Framer.
  - Keep the `@framerSupportedLayoutWidth` / `@framerSupportedLayoutHeight` annotations
    and `addPropertyControls`.
  - Export the math function next to the default component so tests can import it.
- **Language and formatting.** All site text is Swedish. Format numbers with `Intl`
  `sv-SE` (SEK with no decimals, a decimal comma for percentages).
- **Articles.** `content/articles/*.md` is the source. After any change, run
  `npm run build:articles` and commit the regenerated `content/articles.csv`.
- **Design and page docs.** When a change affects a page or the design, update
  `design/brand.md` or `design/site-structure.md` too.
- **`lovable-app/`** is a read-only reference copy of the old Lovable app. Don't edit
  it. Never commit `.env` files or keys: this repository is public.

## Before pushing

```sh
npm test
npm run typecheck
npm run preview   # check both components at desktop and phone width (Playwright screenshot)
```

When you change a component, tell the owner which file to paste into Framer.
