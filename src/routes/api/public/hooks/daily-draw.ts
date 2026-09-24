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

        // A single volunteer is not a carpool: clear the day and tell everyone.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { notifyEveryone, formatDay } = await import("@/lib/engine.server");
        const { data: avail } = await supabaseAdmin
          .from("availability")
          .select("user_id")
          .eq("day", day);

        if ((avail ?? []).length === 1) {
          const loneId = avail![0]!.user_id;
          const { data: lone } = await supabaseAdmin
            .from("profiles")
            .select("full_name, email")
            .eq("id", loneId)
            .maybeSingle();

          await supabaseAdmin.from("availability").delete().eq("day", day);
          await supabaseAdmin.from("assignments").delete().eq("day", day);

          await notifyEveryone({
            title: `Nessun equipaggio per il ${formatDay(day)}`,
            body: `Era disponibile solo ${lone?.full_name || lone?.email || "un collega"}: la disponibilità è stata rimossa e per domani non c'è nessun viaggio condiviso.`,
            kind: "annullato",
            day,
          });

          return Response.json({ day, result: { ok: false, reason: "solo-un-disponibile" } });
        }

        const result = await generateAssignment(day, { createdBy: null });
        return Response.json({ day, result });
      },
    },
  },
});
