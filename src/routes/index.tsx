import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck2, Dices, Fuel, AlarmClock } from "lucide-react";
import { Button } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eulosharing · Carpooling tra colleghi" },
      {
        name: "description",
        content:
          "Organizza i passaggi in auto con i colleghi: calendario disponibilità, estrazione equa del guidatore, costo carburante e partenza decisa dall'amministratore.",
      },
      { property: "og:title", content: "Eulosharing · Carpooling tra colleghi" },
      {
        property: "og:description",
        content:
          "Calendario disponibilità, guidatore estratto in modo equo, costo carburante e orari di partenza condivisi.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: CalendarCheck2,
    title: "Calendario disponibilità",
    text: "Ogni collega segna i giorni in cui può mettere a disposizione la propria auto.",
  },
  {
    icon: Dices,
    title: "Estrazione equa",
    text: "Tra i disponibili vince un sorteggio ponderato: chi ha guidato meno nel mese ha più probabilità.",
  },
  {
    icon: Fuel,
    title: "Costo reale del viaggio",
    text: "Prezzi carburante aggiornati per la provincia del guidatore, incrociati con il consumo dell'auto.",
  },
  {
    icon: AlarmClock,
    title: "Orari condivisi",
    text: "L'amministratore decide la partenza; l'orario della sveglia tiene conto dei tuoi minuti di preparazione e anticipo.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <header className="flex items-center gap-2.5">
          <img src="/icon-192.png" alt="" width={36} height={36} className="rounded-xl" />
          <span className="font-display text-base font-semibold text-foreground">
            Eulosharing
          </span>
        </header>

        <section className="mt-14">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            Carpooling tra colleghi
          </p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Un'auto sola, 80 km condivisi, zero discussioni su chi guida.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Segna quando puoi guidare, lascia che l'estrazione equa scelga il guidatore del giorno e
            consulta l'orario di partenza deciso dall'amministratore e il punto di ritrovo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button variant="accent">Inizia ora</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost">Ho già un account</Button>
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <feature.icon className="size-5 text-accent" />
              <h2 className="font-display mt-3 text-base font-semibold text-foreground">
                {feature.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
            </div>
          ))}
        </section>

        <footer className="mt-16 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          Prezzi carburante dall'Osservaprezzi del Ministero delle Imprese.
        </footer>
      </div>
    </div>
  );
}
