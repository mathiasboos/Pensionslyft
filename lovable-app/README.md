# Lovable app (reference copy)

This folder is a **read-only snapshot** of the original Pensionslyft app built in
[Lovable](https://lovable.dev). It was copied from the
[`mathiasboos/pension-partner`](https://github.com/mathiasboos/pension-partner)
repository, which is still connected to Lovable and still has the full history.

It is kept here so the Framer site can be built from it:

- `src/routes/` – every page, with its Swedish texts and SEO titles
- `src/lib/pension.ts` – the calculator math (the tests in `../tests/` check that
  the Framer components give exactly the same numbers)
- `src/styles.css` – the colors and fonts (converted to hex in `../design/brand.md`)
- `drizzle/migrations/` – the database tables and the 4 original articles
- `.lovable/plan/` – the original description of the site

Do not edit files here. `.env`, `bun.lock` and Lovable's `AGENTS.md` and
`project.json` were left out. The app needs Lovable Cloud (Supabase) to run, so it
does not run on its own from this folder.
