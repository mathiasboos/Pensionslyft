import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Markdown } from "@/components/Markdown";
import { Clock, Eye, Pencil } from "lucide-react";
import { slugify, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin – Pensionslyft" },
      { name: "description", content: "Skriv och publicera artiklar på Pensionslyft." },
      { property: "og:title", content: "Admin – Pensionslyft" },
      { property: "og:description", content: "Redaktionellt verktyg för Pensionslyft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

type Draft = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  preview: string;
  category: string;
  is_premium: boolean;
  published: boolean;
  reading_minutes: number;
  author: string;
  body: string;
};

const emptyDraft: Draft = {
  slug: "",
  title: "",
  excerpt: "",
  preview: "",
  category: "Pension",
  is_premium: false,
  published: false,
  reading_minutes: 5,
  author: "Pensionslyft",
  body: "",
};

function Admin() {
  const { isAdmin, loading } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const articles = useQuery({
    queryKey: ["admin-articles"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-20">Laddar …</div>;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-serif text-2xl font-semibold">Endast för administratörer</h1>
        <p className="mt-2 text-muted-foreground">
          Ditt konto saknar adminbehörighet. Du kan begära den från ditt konto.
        </p>
        <Button asChild className="mt-6">
          <Link to="/konto">Till mitt konto</Link>
        </Button>
      </div>
    );
  }

  const edit = async (id: string) => {
    const article = articles.data?.find((a) => a.id === id);
    if (!article) return;
    const { data: bodyRow } = await supabase
      .from("article_bodies")
      .select("body")
      .eq("article_id", id)
      .maybeSingle();
    setDraft({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      preview: article.preview,
      category: article.category,
      is_premium: article.is_premium,
      published: article.published,
      reading_minutes: article.reading_minutes,
      author: article.author,
      body: bodyRow?.body ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const slug = draft.slug.trim() || slugify(draft.title);
    const payload = {
      slug,
      title: draft.title,
      excerpt: draft.excerpt,
      preview: draft.preview,
      category: draft.category,
      is_premium: draft.is_premium,
      published: draft.published,
      reading_minutes: draft.reading_minutes,
      author: draft.author,
      updated_at: new Date().toISOString(),
      published_at: draft.published ? new Date().toISOString() : null,
    };

    const { data, error } = draft.id
      ? await supabase.from("articles").update(payload).eq("id", draft.id).select("id").single()
      : await supabase.from("articles").insert(payload).select("id").single();

    if (error || !data) {
      setBusy(false);
      toast.error("Kunde inte spara artikeln: " + (error?.message ?? ""));
      return;
    }

    const { error: bodyError } = await supabase
      .from("article_bodies")
      .upsert({ article_id: data.id, body: draft.body });
    setBusy(false);
    if (bodyError) {
      toast.error("Texten kunde inte sparas.");
      return;
    }
    toast.success("Artikeln är sparad.");
    setDraft(emptyDraft);
    void articles.refetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) toast.error("Kunde inte ta bort artikeln.");
    else {
      toast.success("Artikeln är borttagen.");
      void articles.refetch();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="font-serif text-3xl font-semibold">Redaktion</h1>
      <p className="mt-2 text-muted-foreground">
        Skriv i enkel markdown: ## rubrik, - punktlista, **fet text** och tabeller med |.
      </p>

      <form
        onSubmit={save}
        className={`mt-8 space-y-5 rounded-xl border border-border bg-card p-6 ${
          mode === "preview" ? "hidden" : ""
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold">
            {draft.id ? "Redigera artikel" : "Ny artikel"}
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setMode("preview")}>
            <Eye className="size-4" /> Förhandsgranska
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Rubrik</Label>
            <Input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Länknamn (slug)</Label>
            <Input
              value={draft.slug}
              placeholder={slugify(draft.title)}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            />
          </div>
          <div>
            <Label>Kategori</Label>
            <Input
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </div>
          <div>
            <Label>Lästid (minuter)</Label>
            <Input
              type="number"
              min={1}
              value={draft.reading_minutes}
              onChange={(e) => setDraft({ ...draft, reading_minutes: Number(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <Label>Ingress i listan</Label>
          <Textarea
            required
            rows={2}
            value={draft.excerpt}
            onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
          />
        </div>
        <div>
          <Label>Fri inledning (visas även för icke-medlemmar)</Label>
          <Textarea
            rows={3}
            value={draft.preview}
            onChange={(e) => setDraft({ ...draft, preview: e.target.value })}
          />
        </div>
        <div>
          <Label>Artikeltext</Label>
          <Textarea
            rows={16}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-8">
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={draft.is_premium}
              onCheckedChange={(v) => setDraft({ ...draft, is_premium: v })}
            />
            Premiumartikel
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={draft.published}
              onCheckedChange={(v) => setDraft({ ...draft, published: v })}
            />
            Publicerad
          </label>
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            Spara
          </Button>
          {draft.id && (
            <Button type="button" variant="ghost" onClick={() => setDraft(emptyDraft)}>
              Avbryt
            </Button>
          )}
        </div>
      </form>

      {mode === "preview" && (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Förhandsvisning {draft.published ? "· publicerad" : "· utkast, syns inte på sajten"}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => setMode("edit")}>
              <Pencil className="size-4" /> Tillbaka till redigering
            </Button>
          </div>
          <article className="mx-auto mt-8 max-w-3xl">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {draft.category}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
              {draft.title || "Utan rubrik"}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{draft.author}</span>
              <span>{formatDate(new Date().toISOString())}</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" /> {draft.reading_minutes} min
              </span>
            </div>
            <p className="mt-6 text-lg leading-8 text-foreground/90">{draft.excerpt}</p>
            {draft.preview && (
              <p className="mt-4 text-base leading-8 text-foreground/90">{draft.preview}</p>
            )}
            <div className="mt-6">
              {draft.body.trim() ? (
                <Markdown content={draft.body} />
              ) : (
                <p className="text-muted-foreground">Ingen artikeltext ännu.</p>
              )}
            </div>
          </article>
        </div>
      )}


      <div className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="font-serif text-xl font-semibold">Alla artiklar</h2>
        <ul className="mt-4 divide-y divide-border">
          {(articles.data ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.published ? "Publicerad" : "Utkast"} · {a.is_premium ? "Premium" : "Fri"} ·{" "}
                  {a.slug}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await edit(a.id);
                    setMode("preview");
                  }}
                >
                  Förhandsgranska
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await edit(a.id);
                    setMode("edit");
                  }}
                >
                  Redigera
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                  Ta bort
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
