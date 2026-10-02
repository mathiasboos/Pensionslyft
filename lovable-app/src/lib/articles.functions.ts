import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type ArticleMeta = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  preview: string;
  category: string;
  cover_image_url: string | null;
  is_premium: boolean;
  published_at: string | null;
  reading_minutes: number;
  author: string;
};

const META_COLUMNS =
  "id, slug, title, excerpt, preview, category, cover_image_url, is_premium, published_at, reading_minutes, author";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listArticles = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("articles")
    .select(META_COLUMNS)
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ArticleMeta[];
});

export const getArticleView = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: article, error } = await supabase
      .from("articles")
      .select(META_COLUMNS)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!article) return null;

    const meta = article as ArticleMeta;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bodyRow } = await supabaseAdmin
      .from("article_bodies")
      .select("body")
      .eq("article_id", meta.id)
      .maybeSingle();
    return { article: meta, body: bodyRow?.body ?? "", locked: false };
  });

export const getPremiumBody = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("is_premium", {
      _user_id: context.userId,
    });
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!allowed && !isAdmin) return { body: null as string | null, locked: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: article } = await supabaseAdmin
      .from("articles")
      .select("id")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (!article) return { body: null as string | null, locked: false };
    const { data: bodyRow } = await supabaseAdmin
      .from("article_bodies")
      .select("body")
      .eq("article_id", article.id)
      .maybeSingle();
    return { body: bodyRow?.body ?? "", locked: false };
  });
