import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logga in eller skapa konto – Pensionslyft" },
      {
        name: "description",
        content:
          "Logga in på Pensionslyft för att läsa premiumartiklar och spara dina pensionsberäkningar.",
      },
      { property: "og:title", content: "Logga in – Pensionslyft" },
      { property: "og:description", content: "Logga in eller skapa ett konto på Pensionslyft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/konto", replace: true });
  }, [user, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("Inloggningen misslyckades. Kontrollera e-post och lösenord.");
    else navigate({ to: "/konto" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Kontot är skapat. Bekräfta din e-postadress via länken vi skickat.");
    } else {
      navigate({ to: "/konto" });
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google-inloggningen misslyckades.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/konto" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center font-serif text-3xl font-semibold">Välkommen till Pensionslyft</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Logga in för att spara dina beräkningar.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <Button variant="outline" className="w-full" onClick={google}>
          Fortsätt med Google
        </Button>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> eller <span className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Logga in</TabsTrigger>
            <TabsTrigger value="signup">Skapa konto</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={signIn} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="email">E-post</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">Lösenord</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Logga in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="mt-4 space-y-4">
              <div>
                <Label htmlFor="name">Namn</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="email2">E-post</Label>
                <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password2">Lösenord</Label>
                <Input
                  id="password2"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Skapa konto
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Genom att skapa konto godkänner du att vi lagrar din e-postadress.
      </p>
    </div>
  );
}
