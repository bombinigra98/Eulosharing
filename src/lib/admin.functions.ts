import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type AuthedContext = {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
};

async function assertAdmin(context: AuthedContext): Promise<void> {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Solo un amministratore può eseguire questa azione");
}

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { romeToday, addDays } = await import("./engine.server");
    const today = romeToday();

    const [profiles, roles, sos, assignments, availability, settings] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("full_name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin
        .from("sos_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60),
      supabaseAdmin
        .from("assignments")
        .select("*")
        .gte("day", addDays(today, -60))
        .order("day", { ascending: false }),
      supabaseAdmin.from("availability").select("user_id, day").gte("day", today),
      supabaseAdmin.from("app_settings").select("*").eq("id", true).maybeSingle(),
    ]);

    return {
      today,
      profiles: profiles.data ?? [],
      roles: roles.data ?? [],
      sos: sos.data ?? [],
      assignments: assignments.data ?? [],
      availability: availability.data ?? [],
      settings: settings.data,
    };
  });

export const adminGenerateDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        force: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { generateAssignment } = await import("./engine.server");
    return generateAssignment(data.day, { createdBy: context.userId, force: data.force });
  });

/** Admin sets the shared departure point; the alarm is recomputed from traffic. */
export const adminSetDeparture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        address: z.string().min(3).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { generateAssignment } = await import("./engine.server");
    return generateAssignment(data.day, {
      createdBy: context.userId,
      departureAddress: data.address,
    });
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        destination_name: z.string().min(1).max(120),
        destination_address: z.string().min(3).max(200),
        default_departure_address: z.string().max(200).default(""),
        arrival_time: z.string().regex(/^\d{2}:\d{2}$/),
        one_way_km: z.number().min(1).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { geocode } = await import("./maps.server");

    const dest = await geocode(data.destination_address);
    let depName = "";
    let depLat: number | null = null;
    let depLng: number | null = null;
    let depAddress = "";
    if (data.default_departure_address.trim().length > 2) {
      const dep = await geocode(data.default_departure_address);
      depName = dep.city || dep.formatted;
      depLat = dep.lat;
      depLng = dep.lng;
      depAddress = dep.formatted;
    }

    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({
        destination_name: data.destination_name,
        destination_address: dest.formatted,
        destination_lat: dest.lat,
        destination_lng: dest.lng,
        default_departure_name: depName,
        default_departure_address: depAddress,
        default_departure_lat: depLat,
        default_departure_lng: depLng,
        arrival_time: data.arrival_time,
        one_way_km: data.one_way_km,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        full_name: z.string().max(120).optional(),
        email: z.string().email().optional(),
        city: z.string().max(120).optional(),
        active: z.boolean().optional(),
        makeAdmin: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { geocode } = await import("./maps.server");

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.full_name !== undefined) patch["full_name"] = data.full_name;
    if (data.active !== undefined) patch["active"] = data.active;
    if (data.city !== undefined && data.city.length > 1) {
      patch["city"] = data.city;
      try {
        const geo = await geocode(data.city);
        patch["city"] = geo.city || data.city;
        patch["province"] = geo.province;
      } catch (error) {
        console.error("Geocodifica non riuscita", error);
      }
    }
    if (data.email !== undefined) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        email: data.email,
        email_confirm: true,
      });
      if (error) return { ok: false as const, error: error.message };
      patch["email"] = data.email;
    }

    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) return { ok: false as const, error: error.message };

    if (data.makeAdmin !== undefined) {
      if (data.makeAdmin) {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", data.userId)
          .eq("role", "admin");
      }
    }
    return { ok: true as const };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    if (data.userId === context.userId) {
      return { ok: false as const, error: "Non puoi eliminare il tuo account amministratore." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const adminResolveSos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as AuthedContext);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sos_requests")
      .update({ status: "gestita", handled_by: context.userId })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
