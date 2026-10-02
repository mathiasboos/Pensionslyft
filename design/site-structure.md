# Site structure for Framer

This is the page map for rebuilding pensionslyft.se in Framer. All copy is taken word for
word from the Lovable app (`lovable-app/src/routes/`) unless it is marked **(new)**. Keep
the same URLs as the Lovable site so existing links keep working.

Login, "Mitt konto", "Admin" and membership are **not** part of the Framer site for now.
Leave out every button and link that points to them.

| Page | URL | Built with |
| --- | --- | --- |
| Start | `/` | Framer sections + CMS list |
| Artiklar | `/artiklar` | CMS list |
| Article | `/artiklar/:slug` | CMS detail page |
| Pensionskalkylator | `/pensionskalkylator` | Code component `Pensionskalkylator` |
| Ränta på ränta | `/ranta-pa-ranta` | Code component `RantaPaRanta` |
| 404 | – | Framer's 404 page |

---

## Site settings (Framer → Site Settings → General / SEO)

- **Language:** Swedish (`sv`)
- **Title:** Pensionslyft – pension, kalkyler och guider
- **Description:** Pensionslyft förklarar svensk pension med guider, artiklar och
  kalkylatorer för pensionskapital och ränta på ränta.
- **Social preview title:** Pensionslyft – pension, kalkyler och guider
- **Social preview description:** Guider och kalkylatorer som gör din svenska pension begriplig.
- **Favicon:** `lovable-app/public/favicon.ico` (or a new one)

---

## Header (shared on every page)

Sticky at the top. Background color Background at 90 % with background blur, and a
1 px bottom border in Border.

- **Left:** the text logo "Pensionslyft" with a small ".se", linking to `/`. See `brand.md`.
- **Middle:** three links (Small text style; Navy and Medium weight when the page is active):
  - Artiklar → `/artiklar`
  - Pensionskalkylator → `/pensionskalkylator`
  - Ränta på ränta → `/ranta-pa-ranta`
- **Phone:** the links fold into a menu button (hamburger) that opens a list of the
  same three links.

## Footer (shared on every page)

Background Sand at 40 %, top border in Border.

- **Column 1:** "Pensionslyft" (Heading 3, Navy), then the text:
  > Oberoende guider och kalkyler om svensk pension. Vi ger allmän information, inte
  > individuell finansiell rådgivning.
- **Column 2:** heading "Innehåll", with the links Artiklar, Pensionskalkylator and Ränta på ränta.
- The Lovable footer had a third column, "Konto" (Logga in, Mitt konto). Leave it out.
- **Bottom bar,** centered, in Label size without uppercase:
  > © 2026 Pensionslyft. Alla belopp är uppskattningar.

---

## Start `/`

**SEO title:** Pensionslyft – förstå och förbättra din pension
**SEO description:** Räkna ut ditt pensionskapital, se ränta-på-ränta-effekten och läs
guider om allmän pension, tjänstepension och avgifter.
**Social description:** Kalkylatorer och guider för din svenska pension.

1. **Hero.** Fill: the hero gradient. Text color: Background (off-white).
   - Eyebrow: PENSION PÅ RIKTIGT
   - Heading (Hero style): Få kontroll över din pension – innan den är någon annans beslut
   - Intro (at 85 % opacity): Pensionslyft samlar begripliga guider och kalkylatorer om
     allmän pension, tjänstepension och eget sparande. Räkna först, läs sedan.
   - Buttons:
     - "Räkna ut din pension" → `/pensionskalkylator`. Sand background, Navy text.
     - "Läs artiklarna" → `/artiklar`. Outline: transparent background, off-white text,
       off-white border at 40 %.
2. **Two calculator cards** side by side, stacked on phones. Each card is white, has a
   1 px Border and 12 px corners, gets the soft shadow on hover, and the whole card is a link.
   - Card 1 → `/pensionskalkylator`
     - Icon: calculator (Navy Soft)
     - Heading 3: Pensionskalkylatorn
     - Text: Se ditt framtida pensionskapital och vad det blir per månad efter avgifter.
     - Link text: Öppna kalkylatorn →
   - Card 2 → `/ranta-pa-ranta`
     - Icon: line chart (Navy Soft)
     - Heading 3: Ränta på ränta
     - Text: Jämför hur mycket som är dina insättningar och hur mycket avkastningen gör.
     - Link text: Öppna kalkylatorn →
3. **Latest articles.**
   - Heading 2 "Senaste artiklarna" on the left, link "Alla artiklar" → `/artiklar` on the right.
   - A CMS Collection List of the Artiklar collection, sorted by Date (newest first),
     limited to 3 items, in 3 columns (2 on tablet, 1 on phone).
   - Use the **Article card** described below.

### Article card (used on Start and Artiklar)

White card, 1 px Border, 12 px corners, 24 px padding, soft shadow on hover. It links to
the article page.

- Category: Label style, Muted Text
- Title: Heading 3. Turns Navy Soft on hover.
- Excerpt: Small style, Muted Text
- Date (format "6 september 2026") · clock icon + Reading time + " min": Label size, Muted Text

---

## Artiklar `/artiklar`

**SEO title:** Artiklar om pension – Pensionslyft
**SEO description:** Guider och analyser om allmän pension, tjänstepension, avgifter och uttagsstrategier.
**Social description:** Guider och analyser om svensk pension från Pensionslyft.

- Heading 1: Artiklar
- Intro (Muted Text): Allt du behöver för att fatta bättre pensionsbeslut – förklarat på
  svenska, utan säljsnack.
- A CMS Collection List of all articles, newest first, in 3 / 2 / 1 columns, using the
  Article card.
- Text to show when the list is empty: Inga artiklar här ännu.

---

## Article page `/artiklar/:slug` (CMS detail page)

Max width 768 px, centered.

**SEO title:** `{Title} – Pensionslyft`
**SEO description:** `{Excerpt}`

1. Category (Label style, Muted Text)
2. Title (Heading 1)
3. Excerpt (Intro size, 18 px, Muted Text)
4. Meta row, with a bottom border and 24 px space below it: "Pensionslyft" · Date ·
   clock icon Reading time min (Small, Muted Text)
5. Lead (Lead style)
6. Content (formatted text). Style its headings with Heading 2 / Heading 3 and its
   paragraphs with Article Body.
7. **(new, optional)** A box at the end linking to the calculators, styled like the fee
   box (Sand Light background): "Räkna på ditt eget sparande med vår
   [pensionskalkylator](/pensionskalkylator) eller
   [ränta-på-ränta-kalkylator](/ranta-pa-ranta)."

### CMS collection "Artiklar"

Create the collection, then **Import CSV** with `content/articles.csv`. Framer suggests
these field types; check them before importing:

| CSV column | Framer field type |
| --- | --- |
| Title | Plain text (title) |
| Slug | Slug |
| Category | Plain text (or Option, if you want to filter by category) |
| Excerpt | Plain text |
| Lead | Plain text |
| Content | Formatted text |
| Date | Date |
| Reading time | Number |

---

## Pensionskalkylator `/pensionskalkylator`

**SEO title:** Pensionskalkylator – räkna ut ditt pensionskapital
**SEO description:** Räkna ut ditt framtida pensionskapital utifrån sparande, avkastning och
avgifter – och se vad det blir per månad.
**Social title:** Pensionskalkylator – Pensionslyft
**Social description:** Se ditt framtida pensionskapital och månadsbelopp efter avgifter.

- One section, max width 1152 px, with 56 px top and bottom padding.
- Inside it, the `Pensionskalkylator` code component: width Fill, height Fit.
- The component already contains the page heading and intro. To write them as normal
  Framer text instead, switch off **Rubrik** in the component settings.

## Ränta på ränta `/ranta-pa-ranta`

**SEO title:** Ränta på ränta-kalkylator – Pensionslyft
**SEO description:** Se hur ditt sparande växer med ränta på ränta och hur stor del som är
egna insättningar respektive avkastning.
**Social description:** Räkna på månadssparande, avkastning och avgifter över tid.

- Same layout as the pension calculator page, using the `RantaPaRanta` code component.

---

## 404 page **(new)**

The Lovable 404 page was in English. Suggested Swedish text:

- Heading 1: Sidan finns inte
- Text: Sidan du letar efter har flyttats eller finns inte längre.
- Button: Till startsidan → `/`
