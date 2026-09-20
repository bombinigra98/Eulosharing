import { createFileRoute } from "@tanstack/react-router";
import { authorizeScheduler } from "@/lib/cron-guard";

/** Fixed 21:00 Europe/Rome automation: draws tomorrow's driver. */
export const Route = createFileRoute("/api/public/hooks/daily-draw")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeScheduler(request);
        if (denied) return denied;

        const { generateAssignment, romeToday, addDays } = await import(
          "@/lib/engine.server"
        );
        const day = addDays(romeToday(), 1);
        const result = await generateAssignment(day, { createdBy: null });
        return Response.json({ day, result });
      },
    },
  },
});
