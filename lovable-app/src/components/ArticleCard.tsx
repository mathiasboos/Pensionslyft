import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { ArticleMeta } from "@/lib/articles.functions";

export function ArticleCard({ article }: { article: ArticleMeta }) {
  return (
    <Link
      to="/artiklar/$slug"
      params={{ slug: article.slug }}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span>{article.category}</span>
      </div>
      <h3 className="mt-3 font-serif text-xl font-semibold text-foreground group-hover:text-primary-soft">
        {article.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{article.excerpt}</p>
      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{formatDate(article.published_at)}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" /> {article.reading_minutes} min
        </span>
      </div>
    </Link>
  );
}
