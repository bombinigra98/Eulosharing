import { createFileRoute } from "@tanstack/react-router";
import { authorizeScheduler } from "@/lib/cron-guard";

/**
 * Fixed 21:00 Europe/Rome automation: draws tomorrow's driver.
 * pg_cron runs in UTC, so the job fires at 19:00 and 20:00 UTC and this
 * handler only acts on the tick that is actually 21:00 in Rome.
 */
export const Route = createFileRoute("/api/public/hooks/daily-draw")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeScheduler(request);
        if (denied) return denied;

        const { generateAssignment, romeToday, addDays, ROME_TZ } = await import(
          "@/lib/engine.server"
        );

        const romeHour = Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: ROME_TZ,
            hour: "2-digit",
            hour12: false,
          }).format(new Date()),
        );
        if (romeHour !== 21) {
          return Response.json({ skipped: true, romeHour });
        }

        const day = addDays(romeToday(), 1);
        const result = await generateAssignment(day, { createdBy: null });
        return Response.json({ day, result });
      },
    },
  },
});
