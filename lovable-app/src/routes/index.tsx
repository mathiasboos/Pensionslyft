import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Calculator, LineChart } from "lucide-react";
import { listArticles } from "@/lib/articles.functions";
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";

const articlesQuery = queryOptions({
  queryKey: ["articles"],
  queryFn: () => listArticles(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(articlesQuery),
  head: () => ({
    meta: [
      { title: "Pensionslyft – förstå och förbättra din pension" },
      {
        name: "description",
        content:
          "Räkna ut ditt pensionskapital, se ränta-på-ränta-effekten och läs guider om allmän pension, tjänstepension och avgifter.",
      },
      { property: "og:title", content: "Pensionslyft – förstå och förbättra din pension" },
      {
        property: "og:description",
        content: "Kalkylatorer och guider för din svenska pension.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: articles } = useSuspenseQuery(articlesQuery);

  return (
    <>
      <section
        className="text-primary-foreground"
        style={{ background: "var(--gradient-deep)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/70">
            Pension på riktigt
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight font-semibold sm:text-5xl">
            Få kontroll över din pension – innan den är någon annans beslut
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/85">
            Pensionslyft samlar begripliga guider och kalkylatorer om allmän pension,
            tjänstepension och eget sparande. Räkna först, läs sedan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/pensionskalkylator">Räkna ut din pension</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/artiklar">Läs artiklarna</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            to="/pensionskalkylator"
            className="rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-[var(--shadow-soft)]"
          >
            <Calculator className="size-8 text-primary-soft" />
            <h2 className="mt-4 font-serif text-2xl font-semibold">Pensionskalkylatorn</h2>
            <p className="mt-2 text-muted-foreground">
              Se ditt framtida pensionskapital och vad det blir per månad efter avgifter.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
              Öppna kalkylatorn <ArrowRight className="size-4" />
            </span>
          </Link>
          <Link
            to="/ranta-pa-ranta"
            className="rounded-xl border border-border bg-card p-8 transition-shadow hover:shadow-[var(--shadow-soft)]"
          >
            <LineChart className="size-8 text-primary-soft" />
            <h2 className="mt-4 font-serif text-2xl font-semibold">Ränta på ränta</h2>
            <p className="mt-2 text-muted-foreground">
              Jämför hur mycket som är dina insättningar och hur mycket avkastningen gör.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
              Öppna kalkylatorn <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-2xl font-semibold">Senaste artiklarna</h2>
          <Link to="/artiklar" className="text-sm text-primary hover:underline">
            Alla artiklar
          </Link>
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.slice(0, 3).map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </>
  );
}
