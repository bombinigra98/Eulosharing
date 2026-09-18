import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck2, Dices, Fuel, AlarmClock } from "lucide-react";
import { Button } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CommuteBuddy · Carpooling tra colleghi" },
      {
        name: "description",
        content:
          "Organizza i passaggi in auto con i colleghi: calendario disponibilità, estrazione equa del guidatore, costo carburante reale e sveglia intelligente basata sul traffico.",
      },
      { property: "og:title", content: "CommuteBuddy · Carpooling tra colleghi" },
      {
        property: "og:description",
        content:
          "Calendario disponibilità, guidatore estratto in modo equo, costo carburante per provincia e sveglia calcolata sul traffico.",
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
    title: "Sveglia intelligente",
    text: "L'app propone l'orario di partenza in base al traffico e suona i minuti prima che scegli tu.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <header className="flex items-center gap-2.5">
          <img src="/icon-192.png" alt="" width={36} height={36} className="rounded-xl" />
          <span className="font-display text-base font-semibold text-foreground">
            CommuteBuddy
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
            ricevi la sveglia calcolata sul traffico reale dal punto di ritrovo.
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
              className="rounded-3xl border border-border/60 bg-card p-5 transition-colors hover:border-accent/50"
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
          Prezzi carburante dall'Osservaprezzi del Ministero delle Imprese · tempi di percorrenza
          Google Maps.
        </footer>
      </div>
    </div>
  );
}
