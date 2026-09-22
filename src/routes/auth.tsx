import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button, Card, Field } from "@/components/ui-kit";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accedi · Eulosharing" },
      {
        name: "description",
        content:
          "Accedi a Eulosharing per gestire la disponibilità auto, l'estrazione del guidatore e la sveglia intelligente.",
      },
      { property: "og:title", content: "Accedi · Eulosharing" },
      {
        property: "og:description",
        content: "Il carpooling tra colleghi: disponibilità, guidatore estratto a sorte e sveglia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, city },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setBusy(false);
        return;
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    if (mode === "signup" && city) {
      const { data: session } = await supabase.auth.getUser();
      if (session.user) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName, city })
          .eq("id", session.user.id);
      }
    }
    navigate({ to: mode === "signup" ? "/profilo" : "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <img src="/icon-192.png" alt="" width={64} height={64} className="rounded-2xl" />
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight text-foreground">
          Eulosharing
        </h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Il carpooling tra colleghi: chi guida lo decide un'estrazione equa, la sveglia la calcola
          l'app.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <div className="mb-5 flex rounded-full bg-secondary p-1">
          {(["login", "signup"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`flex-1 rounded-full px-3 py-2 text-sm transition-colors ${
                mode === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "login" ? "Accedi" : "Registrati"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" ? (
            <>
              <Field
                label="Nome e cognome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Mario Rossi"
              />
              <Field
                label="Città di partenza"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder="Es. Tivoli"
                hint="Serve per il prezzo del carburante della tua provincia."
              />
            </>
          ) : null}
          <Field
            label="Email di lavoro"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Attendi…" : mode === "login" ? "Entra" : "Crea account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
