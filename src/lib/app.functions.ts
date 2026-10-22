import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { romeToday, addDays } = await import("./engine.server");
    const today = romeToday();
    const horizon = addDays(today, 30);

    const [profile, roles, settings, availability, assignments, notifications, sos, subs] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("app_settings").select("*").eq("id", true).maybeSingle(),
        supabase.from("availability").select("user_id, day").gte("day", today).lte("day", horizon),
        supabase
          .from("assignments")
          .select("*")
          .gte("day", addDays(today, -14))
          .order("day", { ascending: false }),
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("sos_requests").select("*").gte("day", today),
        supabase.from("push_subscriptions").select("endpoint").eq("user_id", userId),
      ]);

    const { data: colleagues } = await supabase
      .from("profiles")
      .select("id, full_name, email, city, active");

    return {
      today,
      userId,
      profile: profile.data,
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      settings: settings.data,
      availability: availability.data ?? [],
      assignments: assignments.data ?? [],
      notifications: notifications.data ?? [],
      sos: sos.data ?? [],
      colleagues: colleagues ?? [],
      pushRegistered: (subs.data ?? []).length > 0,
      vapidPublicKey: process.env["VAPID_PUBLIC_KEY"] ?? "",
    };
  });

const profileSchema = z.object({
  full_name: z.string().min(1).max(120),
  email: z.string().email(),
  city: z.string().min(1).max(120),
  car_model: z.string().max(120),
  fuel_type: z.enum(["benzina", "gasolio", "gpl", "metano"]),
  consumption_kml: z.number().min(1).max(60),
  seats: z.number().int().min(1).max(9),
  prep_minutes: z.number().int().min(0).max(240),
  alarm_lead_minutes: z.number().int().min(0).max(240),
});

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => profileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current } = await supabase
      .from("profiles")
      .select("email, city, province")
      .eq("id", userId)
      .maybeSingle();

    const city = data.city.trim();
    const province = current?.city.trim().toLowerCase() === city.toLowerCase()
      ? current.province
      : "";

    if (current && current.email.toLowerCase() !== data.email.toLowerCase()) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: data.email,
        email_confirm: true,
      });
      if (error) {
        return { ok: false as const, error: `Email non aggiornabile: ${error.message}` };
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ ...data, city, province, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, province };
  });

export const setAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), available: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.available) {
      const { error } = await supabase
        .from("availability")
        .insert({ user_id: userId, day: data.day });
      if (error && !error.message.includes("duplicate")) {
        return { ok: false as const, error: error.message };
      }
    } else {
      await supabase.from("availability").delete().eq("user_id", userId).eq("day", data.day);
    }
    return { ok: true as const };
  });

/** SOS: the colleague can no longer drive on that day. */
export const sendSos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().max(400).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("sos_requests")
      .insert({ user_id: userId, day: data.day, reason: data.reason });
    if (error) return { ok: false as const, error: error.message };

    await supabase.from("availability").delete().eq("user_id", userId).eq("day", data.day);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyEveryone, formatDay } = await import("./engine.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const { data: assignment } = await supabaseAdmin
      .from("assignments")
      .select("driver_id")
      .eq("day", data.day)
      .maybeSingle();
    const wasDriver = assignment?.driver_id === userId;

    await notifyEveryone({
      title: `SOS: ${profile?.full_name || profile?.email} non può guidare il ${formatDay(data.day)}`,
      body: wasDriver
        ? `Era il guidatore estratto. ${data.reason || "Nessun motivo indicato."} Serve una nuova estrazione.`
        : data.reason || "Nessun motivo indicato.",
      kind: "sos",
      day: data.day,
      onlyUserIds: (admins ?? []).map((a) => a.user_id),
    });

    return { ok: true as const, wasDriver };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        endpoint: z.string().url(),
        p256dh: z.string().min(10),
        auth: z.string().min(5),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({ ...data, user_id: userId }, { onConflict: "endpoint" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", context.userId)
      .eq("read", false);
    return { ok: true as const };
  });
