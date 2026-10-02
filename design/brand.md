# Pensionslyft brand

The look from the Lovable site, described in its original plan as "Trustworthy Nordic":
deep navy, warm sand, an off-white page and plenty of white space. It should feel calm
and trustworthy, with typography that is easy to read in long articles. All text is in
Swedish.

The colors below are converted from the oklch values in
`lovable-app/src/styles.css`.

## Colors → Framer Color Styles

In Framer go to **Assets → Colors → +** and create one style for each row.

| Framer style name | Hex | Used for |
| --- | --- | --- |
| Navy | `#0C2A49` | Primary color: buttons, highlighted tiles, links, logo text |
| Navy Soft | `#22507B` | Icons, link hover, focus ring |
| Ink | `#0F2034` | Body text and headings |
| Muted Text | `#545F6C` | Intro text, dates, labels |
| Background | `#FBF8F2` | Page background (off-white) |
| Card | `#FFFFFF` | Cards and input fields |
| Sand | `#ECE0CA` | Secondary buttons, footer background (at 40 % opacity) |
| Sand Accent | `#E7D5B7` | Hover and accent surfaces |
| Sand Light | `#F4ECDE` | Info boxes (the fee box on the pension calculator) |
| Muted | `#F2EEE6` | Quiet backgrounds, table headers |
| Border | `#DFDAD0` | Card borders, dividers, input borders |
| Gold | `#A18142` | "Insättningar" (deposits) in charts |
| Chart Blue | `#4675A4` | Extra chart color |
| Chart Teal | `#72B3A6` | Extra chart color |
| Chart Red | `#9C4438` | Extra chart color |
| Error | `#CC2827` | Error messages |

**Hero gradient** (the navy band at the top of the start page):
`linear-gradient(160deg, #06203C, #153F66)`. In Framer, set the section **Fill** to
Linear, angle 160°, from `#06203C` to `#153F66`. Text on it is `#FBF8F2`.

**Soft shadow** (cards on hover): `0 18px 40px -24px rgba(12, 42, 73, 0.45)`.
In Framer: Shadow, X 0, Y 18, Blur 40, Spread −24, color Navy at 45 %.

**Corners:** 12 px on cards and stat tiles, 8 px on buttons and input fields.

## Fonts → Framer Text Styles

Both fonts are on Google Fonts and can be picked directly in Framer.

- **Source Serif 4** for headings and the article lead paragraph.
- **Inter** for everything else.

In Framer go to **Assets → Text → +**. Sizes are desktop / phone.

| Framer style name | Font | Size | Weight | Line height | Notes |
| --- | --- | --- | --- | --- | --- |
| Hero | Source Serif 4 | 48 / 36 | Semibold 600 | 1.15 | Start page only |
| Heading 1 | Source Serif 4 | 36 | Semibold 600 | 1.2 | Page and article titles |
| Heading 2 | Source Serif 4 | 24 | Semibold 600 | 1.3 | Section headings, headings inside articles |
| Heading 3 | Source Serif 4 | 20 | Semibold 600 | 1.35 | Card titles, sub-headings inside articles |
| Lead | Source Serif 4 | 20 | Regular 400 | 1.8 | First paragraph of an article |
| Intro | Inter | 18 | Regular 400 | 1.6 | Text under the hero heading, color Muted Text |
| Body | Inter | 16 | Regular 400 | 1.6 | Paragraphs in general |
| Article Body | Inter | 16 | Regular 400 | 2.0 | Text inside articles (CMS rich text) |
| Small | Inter | 14 | Regular 400 | 1.5 | Card text, footer, navigation |
| Label | Inter | 12 | Medium 500 | 1.4 | UPPERCASE, letter spacing 0.08em: categories, tile labels |
| Eyebrow | Inter | 12 | Regular 400 | 1.4 | UPPERCASE, letter spacing 0.3em: "PENSION PÅ RIKTIGT" on the hero |

## Logo

There is no logo image yet. The Lovable site used text: **Pensionslyft** in
Source Serif 4, Semibold, 20 px, color Navy, followed by a small **.se** in Inter 12 px,
uppercase, letter spacing 0.2em, color Muted Text.

## Layout

- Content width: max 1152 px, centered, 16 px side padding on phones.
- Article pages: max 768 px wide, for comfortable reading.
- Section spacing: about 64 px between sections. The hero has 80–112 px of top and
  bottom padding.

## Tone of voice

Plain Swedish, no sales talk ("förklarat på svenska, utan säljsnack"). Explain first,
then calculate. Always add the disclaimer that this is general information, not personal
financial advice.
