import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { getArticleView } from "@/lib/articles.functions";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/artiklar/$slug")({
  loader: async ({ params }) => {
    const result = await getArticleView({ data: { slug: params.slug } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article;
    return {
      meta: article
        ? [
            { title: `${article.title} – Pensionslyft` },
            { name: "description", content: article.excerpt },
            { property: "og:title", content: article.title },
            { property: "og:description", content: article.excerpt },
            { property: "og:type", content: "article" },
            { name: "twitter:card", content: "summary_large_image" },
          ]
        : [],
      scripts: article
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: article.title,
                description: article.excerpt,
                datePublished: article.published_at,
                author: { "@type": "Organization", name: article.author },
                isAccessibleForFree: true,
              }),
            },
          ]
        : [],
    };
  },
  errorComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-muted-foreground">Artikeln kunde inte laddas just nu.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-serif text-2xl font-semibold">Artikeln finns inte</h1>
      <Button asChild className="mt-6">
        <Link to="/artiklar">Till artiklarna</Link>
      </Button>
    </div>
  ),
  component: ArticlePage,
});

function ArticlePage() {
  const { article, body } = Route.useLoaderData();

  return (
    <article className="mx-auto max-w-3xl px-4 py-14">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span>{article.category}</span>
      </div>
      <h1 className="mt-4 font-serif text-4xl leading-tight font-semibold">{article.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{article.excerpt}</p>
      <div className="mt-4 flex items-center gap-4 border-b border-border pb-6 text-sm text-muted-foreground">
        <span>{article.author}</span>
        <span>{formatDate(article.published_at)}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" /> {article.reading_minutes} min
        </span>
      </div>

      <p className="mt-8 font-serif text-xl leading-9 text-foreground">{article.preview}</p>

      {body && (
        <div className="mt-6">
          <Markdown content={body} />
        </div>
      )}
    </article>
  );
}
