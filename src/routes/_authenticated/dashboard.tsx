import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlarmClock, BellRing, Car, Fuel, MapPin, TriangleAlert } from "lucide-react";
import {
  getBootstrap,
  markNotificationsRead,
  savePushSubscription,
  sendSos,
  setAvailability,
} from "@/lib/app.functions";
import { subscribeToPush } from "@/lib/push-client";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, CardTitle, Stat } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "I miei viaggi · CommuteBuddy" },
      {
        name: "description",
        content:
          "Disponibilità auto, guidatore del giorno, costo del viaggio e sveglia intelligente.",
      },
      { property: "og:title", content: "I miei viaggi · CommuteBuddy" },
      {
        property: "og:description",
        content: "Guidatore del giorno, costo del viaggio e sveglia calcolata sul traffico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const WEEKDAYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];

function dayLabel(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  return `${WEEKDAYS[date.getUTCDay()]} ${String(date.getUTCDate()).padStart(2, "0")}/${String(
    date.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}

function nextDays(from: string, count: number) {
  const days: string[] = [];
  const date = new Date(`${from}T12:00:00Z`);
  while (days.length < count) {
    const iso = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(iso);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}

function time(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Dashboard() {
  const queryClient = useQueryClient();
  const fetchBootstrap = useServerFn(getBootstrap);
  const toggleAvailability = useServerFn(setAvailability);
  const raiseSos = useServerFn(sendSos);
  const registerPush = useServerFn(savePushSubscription);
  const readAll = useServerFn(markNotificationsRead);
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => fetchBootstrap(),
    refetchInterval: 60_000,
  });

  const availabilityMutation = useMutation({
    mutationFn: (input: { day: string; available: boolean }) => toggleAvailability({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bootstrap"] }),
  });

  const sosMutation = useMutation({
    mutationFn: (input: { day: string; reason: string }) => raiseSos({ data: input }),
    onSuccess: (result) => {
      setMessage(
        result.ok
          ? result.wasDriver
            ? "SOS inviato: gli amministratori rifaranno l'estrazione."
            : "SOS inviato, disponibilità rimossa per quel giorno."
          : (result.error ?? "Errore"),
      );
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  async function enablePush() {
    setMessage("");
    const result = await subscribeToPush(data?.vapidPublicKey ?? "");
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    await registerPush({
      data: { endpoint: result.endpoint, p256dh: result.p256dh, auth: result.auth },
    });
    setMessage("Sveglia attiva: riceverai la notifica anche ad app chiusa.");
    queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  }

  if (isLoading || !data) {
    return (
      <AppShell title="Caricamento">
        <Card>
          <p className="text-sm text-muted-foreground">Sto caricando i tuoi viaggi…</p>
        </Card>
      </AppShell>
    );
  }

  const myDays = new Set(
    data.availability.filter((a) => a.user_id === data.userId).map((a) => a.day),
  );
  const days = nextDays(data.today, 15);
  const upcoming = data.assignments
    .filter((a) => a.day >= data.today)
    .sort((a, b) => a.day.localeCompare(b.day));
  const next = upcoming[0];
  const driverName = (id: string) =>
    data.colleagues.find((c) => c.id === id)?.full_name ||
    data.colleagues.find((c) => c.id === id)?.email ||
    "Collega";
  const myAlarm = next?.departure_at
    ? new Date(
        new Date(next.departure_at).getTime() -
          ((data.profile?.prep_minutes ?? 30) + (data.profile?.alarm_lead_minutes ?? 15)) * 60_000,
      ).toISOString()
    : null;
  const unread = data.notifications.filter((n) => !n.read);

  return (
    <AppShell title={`Ciao ${data.profile?.full_name?.split(" ")[0] || "collega"}`} isAdmin={data.isAdmin}>
      {message ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      ) : null}

      <Card>
        <CardTitle hint={next ? dayLabel(next.day) : undefined}>Prossimo viaggio</CardTitle>
        {next ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent/15 text-accent">
                <Car className="size-5" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">
                  Guida {driverName(next.driver_id)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Estratto tra {next.candidates} disponibili
                  {next.driver_id === data.userId ? " · sei tu!" : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat
                label="Partenza"
                value={time(next.departure_at)}
                sub={`${next.travel_minutes ?? "?"} min con il traffico`}
              />
              <Stat
                label="La tua sveglia"
                value={time(myAlarm)}
                sub={`${data.profile?.prep_minutes ?? 30} min di preparazione + ${
                  data.profile?.alarm_lead_minutes ?? 15
                } min di margine`}
              />
              <Stat
                label="Arrivo previsto"
                value={time(next.arrival_at)}
                sub={data.settings?.destination_name ?? ""}
              />
              <Stat
                label="Costo viaggio"
                value={next.trip_cost ? `${Number(next.trip_cost).toFixed(2)} €` : "—"}
                sub={
                  next.fuel_price
                    ? `${next.fuel_type} a ${Number(next.fuel_price).toFixed(3)} €`
                    : "prezzo non disponibile"
                }
              />
            </div>

            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 text-accent" />
              Ritrovo: <span className="text-foreground">{next.departure_name || "da definire"}</span>
            </p>

            <div className="flex flex-wrap gap-2">
              {!data.pushRegistered ? (
                <Button variant="accent" size="sm" onClick={enablePush}>
                  <BellRing className="size-4" /> Attiva la sveglia
                </Button>
              ) : (
                <Badge tone="accent">
                  <AlarmClock className="mr-1 size-3" /> Sveglia attiva
                </Badge>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  const reason = window.prompt(
                    "SOS: perché non puoi più offrire il passaggio?",
                    "",
                  );
                  if (reason !== null) sosMutation.mutate({ day: next.day, reason });
                }}
              >
                <TriangleAlert className="size-4" /> SOS non posso guidare
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nessun guidatore estratto per i prossimi giorni. L'estrazione automatica parte ogni
            giorno alle 21:00.
          </p>
        )}
      </Card>

      <Card>
        <CardTitle hint="tocca per attivare/disattivare">La mia disponibilità</CardTitle>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {days.map((day) => {
            const active = myDays.has(day);
            const others = data.availability.filter(
              (a) => a.day === day && a.user_id !== data.userId,
            ).length;
            return (
              <button
                key={day}
                onClick={() => availabilityMutation.mutate({ day, available: !active })}
                className={`rounded-2xl border px-2 py-3 text-center transition-colors ${
                  active
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-accent/40"
                }`}
              >
                <span className="block text-sm font-medium">{dayLabel(day)}</span>
                <span className="mt-0.5 block text-[11px]">
                  {active ? "offro l'auto" : others ? `${others} disponibili` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardTitle hint={`${data.assignments.length} estrazioni`}>Storico e costi</CardTitle>
        <ul className="divide-y divide-border/60">
          {data.assignments.slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="text-foreground">{dayLabel(a.day)} · {driverName(a.driver_id)}</p>
                <p className="text-xs text-muted-foreground">
                  {a.departure_name || "—"} · partenza {time(a.departure_at)}
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm text-accent">
                <Fuel className="size-3.5" />
                {a.trip_cost ? `${Number(a.trip_cost).toFixed(2)} €` : "—"}
              </span>
            </li>
          ))}
          {data.assignments.length === 0 ? (
            <li className="py-2 text-sm text-muted-foreground">Ancora nessun viaggio.</li>
          ) : null}
        </ul>
      </Card>

      <Card>
        <CardTitle hint={unread.length ? `${unread.length} da leggere` : undefined}>
          Notifiche
        </CardTitle>
        <ul className="space-y-2">
          {data.notifications.slice(0, 6).map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl border px-4 py-3 ${
                n.read ? "border-border/60 bg-secondary/30" : "border-accent/40 bg-accent/10"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
            </li>
          ))}
          {data.notifications.length === 0 ? (
            <li className="text-sm text-muted-foreground">Nessuna notifica.</li>
          ) : null}
        </ul>
        {unread.length ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={async () => {
              await readAll();
              queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
            }}
          >
            Segna come lette
          </Button>
        ) : null}
      </Card>
    </AppShell>
  );
}
