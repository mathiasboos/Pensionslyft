# Pensionslyft — Swedish pension platform

A Swedish-language site at pensionslyft.se with articles, pension calculators, reader accounts and a premium membership that unlocks locked articles.

## Look and feel

"Trustworthy Nordic": deep navy (#0E2A47), a lighter blue, warm sand (#E8DCC8) and an off-white page background. Calm, institutional, generous whitespace, clear typography for long reading. All text in Swedish.

## Pages

- **Start** — short pitch, the two calculators highlighted, latest articles, membership teaser.
- **Artiklar** — list of all articles with filters, premium ones clearly marked with a lock.
- **Article page** — free articles read in full; premium articles show the intro, then fade into a "Bli medlem för att läsa vidare" panel with sign-up/upgrade buttons.
- **Räkna ut din pension** — pension capital calculator: current savings, monthly deposit, years to retirement, expected return, fees, plus an estimated monthly pension at withdrawal. Live chart of capital growth over the years, plus a results summary.
- **Ränta-på-ränta** — compound interest calculator: start amount, monthly savings, years, return, and a chart splitting own deposits vs. returns.
- **Medlemskap** — what premium gives, price, upgrade button.
- **Logga in / Skapa konto** — email + password, and Google sign-in.
- **Mitt konto** — membership status, saved calculations, sign out.
- **Admin** — for you only: write, edit, publish and delete articles, mark each as free or premium.

## How the paywall works

Each article is free or premium. Premium article bodies are never sent to non-members — the server only returns the preview text for them, so the full text cannot be read by peeking at the page source. Membership is a flag on the account; for now you can switch it on from the membership page to test the flow, and real card payments get added later when you want them.

## Accounts

Email/password and Google sign-in. Every reader gets a profile. Admin rights are stored separately from the profile so they cannot be granted from the browser.

## Technical notes

- Lovable Cloud for database, auth and server logic.
- Tables: `profiles`, `user_roles` (+ `has_role` security-definer function), `articles`, `subscriptions`, `saved_calculations`. RLS on all; published article metadata readable by anyone, full premium body only via a server function that checks membership.
- Calculators run client-side; charts with Recharts.
- Design tokens in `src/styles.css` (oklch), shadcn components.
- Swedish number/currency formatting via `Intl`.
- Per-page titles/descriptions and JSON-LD Article markup for blog posts.

## Not included yet

Real payment processing — the membership flow is simulated until you want to enable payments (requires a Pro plan).
