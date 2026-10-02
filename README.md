# Pensionslyft

The website **pensionslyft.se**: guides and calculators about Swedish pensions.

It's built with code, the same way Lovable works: you describe the change you want to
Claude Code, Claude edits the code, and the site updates when the change is merged. No
visual editor (Framer, Lovable) is needed.

## How changes work

1. **Ask Claude Code** (claude.ai/code or the Claude app, with this repo) for a change in
   plain words. For example: "write a new article about ISK", "add an inflation slider to
   the pension calculator", or "make the hero section shorter".
2. **Claude makes the change** on a branch, builds the site, checks it with screenshots on
   desktop and phone, and opens a pull request.
3. **Cloudflare adds a preview link** to the pull request, so you can see the change before
   it goes live.
4. **Merge the pull request** (or tell Claude "merge it"). Cloudflare publishes
   pensionslyft.se about a minute later.

## What's on the site

| Page | URL | File |
| --- | --- | --- |
| Start | `/` | `src/pages/index.astro` |
| Articles | `/artiklar` | `src/pages/artiklar/index.astro` |
| One article | `/artiklar/<slug>` | `src/pages/artiklar/[slug].astro` + `src/content/articles/<slug>.md` |
| Pension calculator | `/pensionskalkylator` | `src/pages/pensionskalkylator.astro` + `src/components/calculators/PensionCalculator.tsx` |
| Compound interest | `/ranta-pa-ranta` | `src/pages/ranta-pa-ranta.astro` + `src/components/calculators/CompoundCalculator.tsx` |
| Not found | any other URL | `src/pages/404.astro` |

- **Articles** are Markdown files in `src/content/articles/`. Add a new file there and the
  article appears on the site, in the article list and in the sitemap.
- **Colors and fonts** are in `src/styles/global.css`: navy, sand and off-white, with
  Source Serif 4 and Inter.
- **Header and footer** are `src/components/SiteHeader.astro` and `SiteFooter.astro`.

The design, texts and calculators come from the earlier Lovable version of the site
([`mathiasboos/pension-partner`](https://github.com/mathiasboos/pension-partner)).
Login, membership and admin from that version are not included.

## One-time setup: Cloudflare Pages and the domain

### 1. Connect the repo to Cloudflare Pages

1. Create a free account at [cloudflare.com](https://dash.cloudflare.com/sign-up).
2. Go to **Workers & Pages → Create → Pages → Connect to Git**, give Cloudflare access to
   GitHub, and choose **mathiasboos/Pensionslyft**.
3. Use these build settings:
   - Production branch: `main`
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: the repo's `.nvmrc` sets Node 22. Cloudflare reads it automatically.
     If the build complains about Node, add the variable `NODE_VERSION` = `22` under
     Settings → Variables.
4. Click **Save and Deploy**. After a minute the site is live at
   `https://<project-name>.pages.dev`. Check that it looks right.

From now on, every merge to `main` updates the live site, and every pull request gets
its own preview link.

### 2. Move pensionslyft.se from Framer to Cloudflare

pensionslyft.se currently points to Framer.

1. In Cloudflare, click **Add a domain** and enter `pensionslyft.se`, using the Free plan.
   Cloudflare copies your current DNS records.
   - **Keep any MX/email records** if you use e-mail on the domain.
2. Cloudflare shows two **nameservers**. Log in to the company where you bought the
   domain (your .se registrar) and replace the nameservers with these two. This can take
   from a few minutes up to 24 hours.
3. In Cloudflare, open the Pages project → **Custom domains → Set up a custom domain**.
   Add `pensionslyft.se`, then add `www.pensionslyft.se` the same way.
4. Under the domain's **DNS** settings, delete the old Framer records (A records
   `31.43.160.6` and `31.43.161.6`) if they are still there.
5. When pensionslyft.se shows the new site, remove the domain from your Framer project
   and cancel the Framer plan.

## For developers

```sh
npm install
npm run dev       # local dev server at http://localhost:4321
npm test          # calculator math and formatting
npm run build     # type check (astro check) + build into dist/
npm run preview   # serve the built site
```

Built with [Astro](https://astro.build), React (for the calculators), Tailwind CSS v4,
shadcn/ui components and Recharts.
