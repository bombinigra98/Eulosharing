import { createFileRoute } from "@tanstack/react-router";
import { authorizeScheduler } from "@/lib/cron-guard";

/**
 * Smart alarm dispatcher. Runs on a short schedule and pushes each colleague's
 * alarm once, X minutes before their personal wake-up time (departure time
 * minus preparation minutes minus their chosen lead time).
 */
export const Route = createFileRoute("/api/public/hooks/alarms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeScheduler(request);
        if (denied) return denied;
        // Alarm dispatcher disabled by the owner to keep Cloud usage low.
        if (Date.now() > 0) return Response.json({ ok: true, disabled: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { romeToday, addDays, formatTime } = await import("@/lib/engine.server");
        const { sendPush } = await import("@/lib/push.server");

        const today = romeToday();
        const { data: assignments } = await supabaseAdmin
          .from("assignments")
          .select("day, driver_id, departure_name, departure_at, travel_minutes, trip_cost")
          .in("day", [today, addDays(today, 1)]);

        const now = Date.now();
        let sent = 0;

        for (const assignment of assignments ?? []) {
          if (!assignment.departure_at) continue;
          const departure = new Date(assignment.departure_at);

          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id, prep_minutes, alarm_lead_minutes, full_name")
            .eq("active", true);
          const { data: already } = await supabaseAdmin
            .from("alarm_sends")
            .select("user_id")
            .eq("day", assignment.day);
          const done = new Set((already ?? []).map((a) => a.user_id));

          const { data: driver } = await supabaseAdmin
            .from("profiles")
            .select("full_name, email")
            .eq("id", assignment.driver_id)
            .maybeSingle();

          for (const profile of profiles ?? []) {
            if (done.has(profile.id)) continue;
            const alarmAt =
              departure.getTime() -
              (profile.prep_minutes + profile.alarm_lead_minutes) * 60_000;
            // Fire inside the window [alarm, alarm + 10 min] so a missed tick still lands.
            if (now < alarmAt || now > alarmAt + 10 * 60_000) continue;

            const { data: subs } = await supabaseAdmin
              .from("push_subscriptions")
              .select("id, endpoint, p256dh, auth")
              .eq("user_id", profile.id);

            const title = `Sveglia! Partenza ${formatTime(departure)}`;
            const body = `Guida ${driver?.full_name || driver?.email}. Ritrovo a ${assignment.departure_name}. Partenza fissata dall'amministratore.`;

            for (const sub of subs ?? []) {
              const result = await sendPush(sub, { title, body, url: "/dashboard", tag: "sveglia" });
              if (result === "sent") sent++;
              if (result === "gone") {
                await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
              }
            }

            await supabaseAdmin.from("notifications").insert({
              user_id: profile.id,
              title,
              body,
              kind: "sveglia",
              day: assignment.day,
            });
            await supabaseAdmin
              .from("alarm_sends")
              .insert({ user_id: profile.id, day: assignment.day });
          }
        }

        return Response.json({ ok: true, sent });
      },
    },
  },
});
