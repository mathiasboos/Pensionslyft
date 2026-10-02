import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listArticles } from "@/lib/articles.functions";
import { ArticleCard } from "@/components/ArticleCard";

const articlesQuery = queryOptions({
  queryKey: ["articles"],
  queryFn: () => listArticles(),
});

export const Route = createFileRoute("/artiklar/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(articlesQuery),
  head: () => ({
    meta: [
      { title: "Artiklar om pension – Pensionslyft" },
      {
        name: "description",
        content:
          "Guider och analyser om allmän pension, tjänstepension, avgifter och uttagsstrategier.",
      },
      { property: "og:title", content: "Artiklar om pension – Pensionslyft" },
      {
        property: "og:description",
        content: "Guider och analyser om svensk pension från Pensionslyft.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArticlesPage,
});

function ArticlesPage() {
  const { data: articles } = useSuspenseQuery(articlesQuery);

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-serif text-4xl font-semibold">Artiklar</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Allt du behöver för att fatta bättre pensionsbeslut – förklarat på svenska, utan
        säljsnack.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      {articles.length === 0 && (
        <p className="mt-10 text-muted-foreground">Inga artiklar här ännu.</p>
      )}
    </div>
  );
}
