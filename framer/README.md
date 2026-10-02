# Framer code components

| File | What it is | Lovable page it replaces |
| --- | --- | --- |
| `Pensionskalkylator.tsx` | Pension calculator: capital at retirement, monthly payout, fee cost, area chart | `/pensionskalkylator` |
| `RantaPaRanta.tsx` | Compound interest calculator: deposits vs. returns, stacked bar chart | `/ranta-pa-ranta` |

Each file is complete on its own. It only imports `react` and `framer`, which Framer
already has, so there is nothing to install.

## Add a component to Framer

1. In Framer, open **Assets** (left panel) → **Code** → **+** → **New code file**.
2. Name it exactly like the file, e.g. `Pensionskalkylator`.
3. Delete the example code, paste the whole file from this folder, and save (⌘S / Ctrl+S).
4. Drag the component from **Assets → Code** onto a page.
5. Set its width to **Fill** (or a fixed width such as 1100) and its height to **Fit content**.

To update later: open the code file in Framer, select all, paste the new version and save.
Every copy of the component on your pages updates at once.

## Settings in the right-hand panel

Both components have these settings:

- **Rubrik / Titel / Ingress**: show or hide the heading and intro text, and edit them.
- **Start values**: the numbers the calculator starts with.
- **Colors**: Primär (navy), Insättningar (gold), Kort, Text, Dämpad text, Kantlinje.
  The defaults are the Pensionslyft brand colors from `../design/brand.md`.
- **Rubrikfont / Brödtext**: pick **Source Serif 4** (headings) and **Inter** (body text)
  so the calculators match the rest of the site.

`Pensionskalkylator` also has:
- **Avgiftsruta**: background color of the fee box.
- **Länk avgifter**: where the "avgifter" link goes. The default is
  `/artiklar/avgifter-som-ater-upp-din-pension`.

## Differences from the Lovable version

- There is no "Spara beräkningen" button. Accounts are not part of the Framer site yet.
- Charts are drawn with plain SVG instead of Recharts, so no extra package is needed.
  Hover over a chart (or tap it on a phone) to see the numbers for a year.
- Percentages use a Swedish decimal comma ("6,5 %" instead of "6.5 %").

## Check changes locally (for developers / Claude)

```sh
npm install
npm run preview     # opens both components at http://localhost:5173
npm test            # checks the math against the Lovable app
npm run typecheck
```

The `framer` import is replaced by `../preview/framer-stub.ts` when running locally.
