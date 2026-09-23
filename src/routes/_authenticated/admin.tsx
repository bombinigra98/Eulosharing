import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Dices, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import {
  adminDeleteUser,
  adminGenerateDriver,
  adminResolveSos,
  adminSaveSettings,
  adminSetDeparture,
  adminUpdateUser,
} from "@/lib/admin.functions";
import { getAdminData } from "@/lib/admin.functions";
import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, CardTitle, Field, Select } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Area amministratore · Eulosharing" },
      {
        name: "description",
        content:
          "Gestione colleghi, estrazione del guidatore, punto di ritrovo, SOS e impostazioni del tragitto.",
      },
      { property: "og:title", content: "Area amministratore · Eulosharing" },
      {
        property: "og:description",
        content: "Gestisci utenti, SOS, estrazione guidatore e punto di partenza condiviso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

function dayLabel(day: string) {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${day}T12:00:00Z`));
}

function time(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Admin() {
  const queryClient = useQueryClient();
  const fetchAdmin = useServerFn(getAdminData);
  const generate = useServerFn(adminGenerateDriver);
  const setDeparture = useServerFn(adminSetDeparture);
  const saveSettings = useServerFn(adminSaveSettings);
  const updateUser = useServerFn(adminUpdateUser);
  const deleteUser = useServerFn(adminDeleteUser);
  const resolveSos = useServerFn(adminResolveSos);

  const [message, setMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [day, setDay] = useState("");
  const [departure, setDeparturePoint] = useState("");
  const [settings, setSettings] = useState({
    destination_name: "",
    destination_address: "",
    default_departure_address: "",
    arrival_time: "09:00",
    one_way_km: 40,
  });

  const { data, error } = useQuery({ queryKey: ["admin"], queryFn: () => fetchAdmin() });

  useEffect(() => {
    if (!data) return;
    if (!day) setDay(data.today);
    if (data.settings && !settings.destination_name) {
      setSettings({
        destination_name: data.settings.destination_name,
        destination_address: data.settings.destination_address,
        default_departure_address: data.settings.default_departure_address,
        arrival_time: String(data.settings.arrival_time).slice(0, 5),
        one_way_km: Number(data.settings.one_way_km),
      });
      setDeparturePoint(data.settings.default_departure_address);
    }
  }, [data, day, settings.destination_name]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  };

  const drawMutation = useMutation({
    mutationFn: (input: { day: string; force: boolean }) => generate({ data: input }),
    onSuccess: (result) => {
      setMessage(
        result.ok
          ? `Guidatore estratto: ${result.driverName}. Partenza ${time(result.departureAt)}, costo ${result.cost.toFixed(2)} €.`
          : result.reason,
      );
      refresh();
    },
  });

  const departureMutation = useMutation({
    mutationFn: (input: { day: string; address: string }) => setDeparture({ data: input }),
    onSuccess: (result) => {
      setMessage(
        result.ok
          ? `Punto di ritrovo aggiornato: nuova partenza ${time(result.departureAt)} e sveglie ricalcolate.`
          : result.reason,
      );
      refresh();
    },
  });

  if (error) {
    return (
      <AppShell title="Area amministratore">
        <Card>
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        </Card>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Area amministratore" isAdmin>
        <Card>
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        </Card>
      </AppShell>
    );
  }

  const adminIds = new Set(data.roles.filter((r) => r.role === "admin").map((r) => r.user_id));
  const availableOn = (d: string) => data.availability.filter((a) => a.day === d).length;
  const assignmentFor = (d: string) => data.assignments.find((a) => a.day === d);
  const nameOf = (id: string) => {
    const p = data.profiles.find((x) => x.id === id);
    return p?.full_name || p?.email || "Collega";
  };
  const current = assignmentFor(day);
  const openSos = data.sos.filter((s) => s.status === "aperta");
  const monthPrefix = data.today.slice(0, 7);

  return (
    <AppShell title="Area amministratore" isAdmin>
      {message ? (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      ) : null}

      <Card className="border-primary/40 bg-primary/5">
        <CardTitle hint={`${availableOn(day)} disponibili`}>Estrazione guidatore</CardTitle>
        <div className="space-y-3">
          <Field label="Giorno" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          {current ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm">
              <p className="text-foreground">
                Guida <strong>{nameOf(current.driver_id)}</strong>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ritrovo {current.departure_name || "—"} · partenza {time(current.departure_at)} ·
                arrivo {time(current.arrival_at)} ·{" "}
                {current.trip_cost ? `${Number(current.trip_cost).toFixed(2)} €` : "costo n/d"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nessuna estrazione per questo giorno. L'automatismo fisso delle 21:00 estrae il
              guidatore del giorno successivo.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="accent"
              size="sm"
              disabled={drawMutation.isPending}
              onClick={() => drawMutation.mutate({ day, force: false })}
            >
              <Dices className="size-4" /> Estrai guidatore
            </Button>
            {current ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={drawMutation.isPending}
                onClick={() => drawMutation.mutate({ day, force: true })}
              >
                Rifai estrazione
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="border-primary/30">
        <CardTitle hint="ricalcola le sveglie">Punto di ritrovo del giorno</CardTitle>
        <div className="space-y-3">
          <Field
            label="Indirizzo o luogo"
            value={departure}
            onChange={(e) => setDeparturePoint(e.target.value)}
            placeholder="Es. Piazza Garibaldi, Tivoli"
            hint="La partenza viene ricalcolata sul traffico da qui alla destinazione."
          />
          <Button
            size="sm"
            disabled={departureMutation.isPending || departure.length < 3}
            onClick={() => departureMutation.mutate({ day, address: departure })}
          >
            <MapPin className="size-4" /> Imposta ritrovo e avvisa tutti
          </Button>
        </div>
      </Card>

      <Card className={openSos.length ? "border-destructive/50" : "border-success/30"}>
        <CardTitle hint={openSos.length ? `${openSos.length} aperte` : "nessuna aperta"}>
          Richieste SOS
        </CardTitle>
        <ul className="divide-y divide-border/60">
          {data.sos.slice(0, 10).map((s) => (
            <li
              key={s.id}
              className={`flex items-center justify-between gap-3 rounded-lg border-l-4 px-3 py-2.5 ${
                s.status === "aperta"
                  ? "border-destructive bg-destructive/10"
                  : "border-success bg-success/10"
              }`}
            >
              <div>
                <p className="text-sm text-foreground">
                  {nameOf(s.user_id)} · {dayLabel(s.day)}
                </p>
                <p className="text-xs text-muted-foreground">{s.reason || "Nessun motivo"}</p>
              </div>
              {s.status === "aperta" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await resolveSos({ data: { id: s.id } });
                    refresh();
                  }}
                >
                  <span className="text-destructive">Segna gestita</span>
                </Button>
              ) : (
                <Badge tone="success">gestita</Badge>
              )}
            </li>
          ))}
          {data.sos.length === 0 ? (
            <li className="py-2 text-sm text-muted-foreground">Nessun SOS.</li>
          ) : null}
        </ul>
      </Card>

      <Card className="border-primary/30">
        <CardTitle hint={`${data.profiles.length} iscritti`}>Colleghi</CardTitle>
        <ul className="space-y-3">
          {data.profiles.map((p) => {
            const drives = data.assignments.filter(
              (a) => a.driver_id === p.id && a.day.startsWith(monthPrefix),
            ).length;
            return (
              <li key={p.id} className="rounded-xl border border-border/70 bg-secondary/30 p-4 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {p.full_name || "(senza nome)"}{" "}
                      {adminIds.has(p.id) ? <Badge tone="primary">admin</Badge> : null}
                      {!p.active ? <Badge tone="danger">disattivato</Badge> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.city || "città n/d"} ({p.province || "—"}) · {p.car_model || "auto n/d"} ·{" "}
                      {p.fuel_type} · {drives} turni questo mese
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (!window.confirm(`Eliminare definitivamente ${p.email}?`)) return;
                      const result = await deleteUser({ data: { userId: p.id } });
                      if (!result.ok) setMessage(result.error);
                      refresh();
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const email = window.prompt("Nuova email di accesso", p.email);
                      if (!email) return;
                      const result = await updateUser({ data: { userId: p.id, email } });
                      if (!result.ok) setMessage(result.error);
                      refresh();
                    }}
                  >
                    Cambia email
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const city = window.prompt("Città di partenza", p.city);
                      if (!city) return;
                      await updateUser({ data: { userId: p.id, city } });
                      refresh();
                    }}
                  >
                    Cambia città
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await updateUser({ data: { userId: p.id, active: !p.active } });
                      refresh();
                    }}
                  >
                    {p.active ? "Disattiva" : "Riattiva"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await updateUser({
                        data: { userId: p.id, makeAdmin: !adminIds.has(p.id) },
                      });
                      refresh();
                    }}
                  >
                    <ShieldCheck className="size-3.5" />
                    {adminIds.has(p.id) ? "Rimuovi admin" : "Rendi admin"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardTitle>Impostazioni tragitto</CardTitle>
        <div className="space-y-3">
          <Field
            label="Nome destinazione"
            value={settings.destination_name}
            onChange={(e) => setSettings({ ...settings, destination_name: e.target.value })}
          />
          <Field
            label="Indirizzo destinazione"
            value={settings.destination_address}
            onChange={(e) => setSettings({ ...settings, destination_address: e.target.value })}
            placeholder="Es. Via del Lavoro 10, Roma"
          />
          <Field
            label="Ritrovo predefinito"
            value={settings.default_departure_address}
            onChange={(e) =>
              setSettings({ ...settings, default_departure_address: e.target.value })
            }
          />
          <Field
            label="Orario di arrivo al lavoro"
            type="time"
            value={settings.arrival_time}
            onChange={(e) => setSettings({ ...settings, arrival_time: e.target.value })}
          />
          <Field
            label="Chilometri per tratta"
            type="number"
            value={settings.one_way_km}
            onChange={(e) => setSettings({ ...settings, one_way_km: Number(e.target.value) })}
          />
          <Button
            size="sm"
            onClick={async () => {
              const result = await saveSettings({ data: settings });
              setMessage(result.ok ? "Impostazioni salvate." : result.error);
              refresh();
            }}
          >
            Salva impostazioni
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
