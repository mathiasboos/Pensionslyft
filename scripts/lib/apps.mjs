/*
 * The calculators that the site shows straight from github.com/mathiasboos/Calculators: one HTML file each, fetched by
 * scripts/sync-apps.mjs and shown in a frame by src/components/pages/AppPage.astro. The file in Calculators is the master;
 * the site only adds its look (scripts/apps-theme.css, scripts/apps/<slug>.css, scripts/apps-colors.mjs) and its language.
 *
 *   slug      the name of the file the site serves (public/app/<slug>.html) and of the entry in src/data/apps-source.json
 *   file      the file in Calculators
 *   sv, en    the pages of the site that show it
 *   native    true when the file already has the site's own palette (no colours are replaced, only the header is hidden)
 *
 * The other calculators of the site are written in the site's own code. The Pensionsplaneraren (Retirement_Planner.html) and the Typfallsmodellen have their own scripts and workflows.
 */
export const REPOSITORY = "https://github.com/mathiasboos/Calculators";

export const apps = [
  { slug: "ranta-pa-ranta", file: "Compound Interest Calculator.html", sv: "/ranta-pa-ranta", en: "/en/compound-interest", native: true },
  { slug: "pensionssparande", file: "Pension Savings Calculator.html", sv: "/pensionskalkylator", en: "/en/pension-savings-calculator", native: true },
  { slug: "pensionsmal", file: "Replacement rate goal calculator.html", sv: "/pensionsmalkalkylatorn", en: "/en/replacement-rate-calculator", native: true },
];

export const bySlug = (slug) => apps.find((a) => a.slug === slug);
