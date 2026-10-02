import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { formatDate, formatSek } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/konto")({
  head: () => ({
    meta: [
      { title: "Mitt konto – Pensionslyft" },
      {
        name: "description",
        content: "Hantera ditt konto och dina sparade pensionsberäkningar på Pensionslyft.",
      },
      { property: "og:title", content: "Mitt konto – Pensionslyft" },
      { property: "og:description", content: "Medlemskap och sparade beräkningar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, isAdmin, refresh } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const calcs = useQuery({
    queryKey: ["saved-calcs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_calculations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = async (id: string) => {
    const { error } = await supabase.from("saved_calculations").delete().eq("id", id);
    if (error) toast.error("Kunde inte ta bort beräkningen.");
    else void calcs.refetch();
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const claimAdmin = async () => {
    const { data, error } = await supabase.rpc("claim_admin");
    await refresh();
    if (error || !data) toast.error("Det finns redan en administratör.");
    else toast.success("Du är nu administratör.");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="font-serif text-3xl font-semibold">Mitt konto</h1>
      <p className="mt-2 text-muted-foreground">{user?.email}</p>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-serif text-xl font-semibold">Konto</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {isAdmin ? (
            <Button asChild variant="outline">
              <Link to="/admin">Till adminverktyget</Link>
            </Button>
          ) : (
            <Button variant="ghost" onClick={claimAdmin}>
              Gör mig till administratör
            </Button>
          )}
          <Button variant="ghost" onClick={signOut}>
            Logga ut
          </Button>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-serif text-xl font-semibold">Sparade beräkningar</h2>
        {calcs.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Laddar …</p>
        ) : (calcs.data?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Du har inga sparade beräkningar ännu. Gör en i{" "}
            <Link to="/pensionskalkylator" className="text-primary underline">
              pensionskalkylatorn
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {calcs.data!.map((c) => {
              const result = (c.result ?? {}) as { finalCapital?: number; monthlyPension?: number };
              return (
                <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium">{c.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(c.created_at)}
                      {result.finalCapital ? ` · ${formatSek(result.finalCapital)}` : ""}
                      {result.monthlyPension ? ` · ${formatSek(result.monthlyPension)}/mån` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                    Ta bort
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
