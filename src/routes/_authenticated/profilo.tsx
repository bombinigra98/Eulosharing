import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getBootstrap, saveProfile } from "@/lib/app.functions";
import { AppShell } from "@/components/app-shell";
import { Button, Card, CardTitle, Field, Select } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/profilo")({
  head: () => ({
    meta: [
      { title: "Il mio profilo · CommuteBuddy" },
      {
        name: "description",
        content:
          "Aggiorna email, città di partenza, auto, consumo e i minuti di anticipo della sveglia.",
      },
      { property: "og:title", content: "Il mio profilo · CommuteBuddy" },
      {
        property: "og:description",
        content: "Email, città, auto e preferenze della sveglia intelligente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

type FormState = {
  full_name: string;
  email: string;
  city: string;
  car_model: string;
  fuel_type: "benzina" | "gasolio" | "gpl" | "metano";
  consumption_kml: number;
  seats: number;
  prep_minutes: number;
  alarm_lead_minutes: number;
};

function Profile() {
  const queryClient = useQueryClient();
  const fetchBootstrap = useServerFn(getBootstrap);
  const persist = useServerFn(saveProfile);
  const [form, setForm] = useState<FormState | null>(null);
  const [message, setMessage] = useState("");

  const { data } = useQuery({ queryKey: ["bootstrap"], queryFn: () => fetchBootstrap() });

  useEffect(() => {
    if (data?.profile && !form) {
      const p = data.profile;
      setForm({
        full_name: p.full_name,
        email: p.email,
        city: p.city,
        car_model: p.car_model,
        fuel_type: (p.fuel_type as FormState["fuel_type"]) ?? "benzina",
        consumption_kml: Number(p.consumption_kml),
        seats: p.seats,
        prep_minutes: p.prep_minutes,
        alarm_lead_minutes: p.alarm_lead_minutes,
      });
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (input: FormState) => persist({ data: input }),
    onSuccess: (result) => {
      setMessage(
        result.ok
          ? `Profilo salvato. Prezzi carburante della provincia ${result.province || "—"}.`
          : result.error,
      );
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  if (!data || !form) {
    return (
      <AppShell title="Profilo">
        <Card>
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        </Card>
      </AppShell>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm({ ...form, [key]: value });

  return (
    <AppShell title="Il mio profilo" isAdmin={data.isAdmin}>
      {message ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <Card>
        <CardTitle>Dati personali</CardTitle>
        <div className="space-y-3">
          <Field
            label="Nome e cognome"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            hint="Cambiandola cambia anche l'email di accesso."
          />
          <Field
            label="Città di partenza"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            hint={`Provincia rilevata: ${data.profile?.province || "—"} · decide il prezzo del carburante.`}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>La mia auto</CardTitle>
        <div className="space-y-3">
          <Field
            label="Modello"
            value={form.car_model}
            onChange={(e) => set("car_model", e.target.value)}
            placeholder="Es. Fiat Panda 1.2"
          />
          <Select
            label="Carburante"
            value={form.fuel_type}
            onChange={(e) => set("fuel_type", e.target.value as FormState["fuel_type"])}
          >
            <option value="benzina">Benzina</option>
            <option value="gasolio">Diesel</option>
            <option value="gpl">GPL</option>
            <option value="metano">Metano</option>
          </Select>
          <Field
            label="Consumo medio (km per litro/kg)"
            type="number"
            step="0.1"
            value={form.consumption_kml}
            onChange={(e) => set("consumption_kml", Number(e.target.value))}
          />
          <Field
            label="Posti disponibili"
            type="number"
            value={form.seats}
            onChange={(e) => set("seats", Number(e.target.value))}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Sveglia intelligente</CardTitle>
        <div className="space-y-3">
          <Field
            label="Minuti per prepararmi"
            type="number"
            value={form.prep_minutes}
            onChange={(e) => set("prep_minutes", Number(e.target.value))}
          />
          <Field
            label="Minuti di anticipo della sveglia"
            type="number"
            value={form.alarm_lead_minutes}
            onChange={(e) => set("alarm_lead_minutes", Number(e.target.value))}
            hint="La notifica arriva a: partenza − preparazione − anticipo."
          />
        </div>
      </Card>

      <Button
        className="w-full"
        variant="accent"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(form)}
      >
        {mutation.isPending ? "Salvo…" : "Salva profilo"}
      </Button>
    </AppShell>
  );
}
