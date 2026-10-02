# Pensionslyft

The building blocks for **pensionslyft.se**, a Swedish site about pensions built in
**Framer**.

The site was first built in Lovable (repo
[`mathiasboos/pension-partner`](https://github.com/mathiasboos/pension-partner)).
Framer can't import a code project, so this repo holds what carries over to Framer:

| Folder | What's in it | How you use it in Framer |
| --- | --- | --- |
| [`framer/`](framer/) | The two calculators as Framer code components | Paste into a Framer code file |
| [`content/`](content/) | The articles as Markdown, plus `articles.csv` | Import the CSV into a Framer CMS collection |
| [`design/brand.md`](design/brand.md) | Colors (hex), fonts, text sizes, shadow, gradient | Create Framer Color and Text Styles |
| [`design/site-structure.md`](design/site-structure.md) | Every page: sections, Swedish texts, SEO titles | Build the pages from it |
| [`lovable-app/`](lovable-app/) | Read-only copy of the Lovable code | Reference only |

## What changed from the Lovable site

- **Kept:** the start page, the article list and article pages, both calculators, the
  colors and fonts, the texts, and the URLs.
- **Not included for now:** login, "Mitt konto", saved calculations, the admin page and
  the premium paywall. Framer has no built-in user accounts, so every article is free.
  To add membership later, a Framer-compatible tool such as Outseta or Memberstack can
  be used.
- Articles are now edited in **Framer CMS** instead of the Lovable admin page.

## Build the site in Framer, step by step

1. **Styles.** Create the Color Styles and Text Styles listed in
   [`design/brand.md`](design/brand.md).
2. **Calculators.** Go to **Assets → Code → + → New code file**. Make one file called
   `Pensionskalkylator` and one called `RantaPaRanta`. Paste in the matching file from
   [`framer/`](framer/) and save. See [`framer/README.md`](framer/README.md) for details.
3. **Articles.**
   - Go to **CMS → +** and create a collection called **Artiklar**.
   - Use **Import CSV** with [`content/articles.csv`](content/articles.csv).
     (Download it from GitHub with the "Download raw file" button.)
   - Set the collection page path to `/artiklar/:slug`.
4. **Pages.** Build Start, Artiklar, the article page, Pensionskalkylator and Ränta på
   ränta following [`design/site-structure.md`](design/site-structure.md).
5. **Settings.** Set the language (Swedish), the SEO title and description, and the favicon
   under Site Settings.
6. **Domain.** Publish, then connect **pensionslyft.se** under Site Settings → Domains.
   Update the domain's DNS records as Framer shows. If the domain currently points to
   the Lovable site, it moves over to Framer at this point.

## Making changes with Claude

Framer doesn't sync with GitHub, so changes go like this:

1. Ask Claude for the change, e.g. "add an inflation setting to the pension
   calculator" or "write a new article about ISK".
2. Claude updates the files in this repo and checks them (tests, type check, preview
   screenshots).
3. You copy the updated file into Framer:
   - **Calculator:** paste the new `framer/*.tsx` file over the old code file and save.
   - **New or changed article:** import `content/articles.csv` again, or paste the text
     into the CMS item.
   - **Page or design change:** follow the updated `design/*.md`.

## Notes

- **Articles written after the first version.** If you wrote articles in the Lovable admin
  page, they live only in the Lovable Cloud database, not in git. Export them from Lovable
  (Cloud → Database → `articles` and `article_bodies`) or copy them from the live site.
  Then add each one as a Markdown file in `content/articles/` and run
  `npm run build:articles`, or add them directly in Framer CMS.
- **Category "Premium".** Two articles have the category "Premium" from the old paywall.
  You may want to rename it, for example to "Fördjupning", in the CMS.
- **Dates.** The original articles were given dates relative to when the Lovable
  database was created. The dates in `content/articles/` are approximate (Aug–Sep 2026).

## For developers

```sh
npm install
npm run preview          # see the calculators at http://localhost:5173
npm test                 # math matches the Lovable app, CSV is complete
npm run typecheck
npm run build:articles   # rebuild content/articles.csv from content/articles/*.md
```
