import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { departureForArrival, geocode } from "./maps.server";
import { fetchProvinceFuelPrice, isFuelType, tripCost, type FuelType } from "./fuel.server";
import { sendPush } from "./push.server";

export const ROME_TZ = "Europe/Rome";

/** Builds the UTC instant for a wall-clock time on a given day in Rome. */
export function romeInstant(day: string, time: string): Date {
  const hhmmss = time.length === 5 ? `${time}:00` : time;
  const naive = new Date(`${day}T${hhmmss}Z`);
  const offsetLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: ROME_TZ,
    timeZoneName: "longOffset",
  })
    .formatToParts(naive)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offsetLabel ?? "GMT+00:00");
  const sign = match?.[1] === "-" ? -1 : 1;
  const minutes = sign * (Number(match?.[2] ?? 0) * 60 + Number(match?.[3] ?? 0));
  return new Date(naive.getTime() - minutes * 60_000);
}

export function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ROME_TZ }).format(new Date());
}

export function addDays(day: string, amount: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

/** Province-level average fuel price, cached for 12 hours in the database. */
export async function getFuelPrice(
  province: string,
  fuelType: FuelType,
): Promise<{ price: number; cached: boolean } | null> {
  const { data: cached } = await supabaseAdmin
    .from("fuel_prices")
    .select("price, updated_at")
    .eq("province", province)
    .eq("fuel_type", fuelType)
    .maybeSingle();

  const fresh =
    cached && Date.now() - new Date(cached.updated_at).getTime() < 12 * 3600_000;
  if (fresh) return { price: Number(cached.price), cached: true };

  const live = await fetchProvinceFuelPrice(province, fuelType);
  if (!live) {
    return cached ? { price: Number(cached.price), cached: true } : null;
  }
  await supabaseAdmin.from("fuel_prices").upsert(
    {
      province,
      fuel_type: fuelType,
      price: live.price,
      sample_size: live.sampleSize,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "province,fuel_type" },
  );
  return { price: live.price, cached: false };
}

type Candidate = {
  id: string;
  full_name: string;
  email: string;
  city: string;
  province: string;
  fuel_type: string;
  consumption_kml: number;
  prep_minutes: number;
  alarm_lead_minutes: number;
};

/** Weighted-random pick: the fewer drives this month, the higher the chance. */
export function weightedPick(
  candidates: Candidate[],
  drivesThisMonth: Record<string, number>,
): { winner: Candidate; weights: Record<string, number> } {
  const max = Math.max(0, ...candidates.map((c) => drivesThisMonth[c.id] ?? 0));
  const weights: Record<string, number> = {};
  let total = 0;
  for (const c of candidates) {
    const w = max - (drivesThisMonth[c.id] ?? 0) + 1;
    weights[c.id] = w;
    total += w;
  }
  let ticket = Math.random() * total;
  let winner = candidates[0]!;
  for (const c of candidates) {
    ticket -= weights[c.id]!;
    if (ticket <= 0) {
      winner = c;
      break;
    }
  }
  return { winner, weights };
}

export type GenerateResult =
  | { ok: true; day: string; driverName: string; departureAt: string; cost: number }
  | { ok: false; reason: string };

export async function generateAssignment(
  day: string,
  options: {
    createdBy?: string | null;
    departureAddress?: string | null;
    force?: boolean;
  } = {},
): Promise<GenerateResult> {
  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (!settings?.destination_lat || !settings?.destination_lng) {
    return { ok: false, reason: "Imposta prima la destinazione nell'area amministratore." };
  }

  const { data: existing } = await supabaseAdmin
    .from("assignments")
    .select("id, driver_id")
    .eq("day", day)
    .maybeSingle();
  if (existing && !options.force && !options.departureAddress) {
    return { ok: false, reason: "Il guidatore di questa giornata è già stato estratto." };
  }

  const { data: avail } = await supabaseAdmin
    .from("availability")
    .select("user_id")
    .eq("day", day);
  const availableIds = (avail ?? []).map((a) => a.user_id);
  if (availableIds.length === 0) {
    return { ok: false, reason: "Nessun collega disponibile a guidare in questa data." };
  }

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, email, city, province, fuel_type, consumption_kml, prep_minutes, alarm_lead_minutes",
    )
    .in("id", availableIds)
    .eq("active", true);
  const candidates = (profiles ?? []) as Candidate[];
  if (candidates.length === 0) {
    return { ok: false, reason: "Nessun collega attivo tra i disponibili." };
  }

  // Keep a departure point change on the same driver; otherwise draw a new one.
  let driver: Candidate | undefined;
  if (existing && options.departureAddress && !options.force) {
    driver = candidates.find((c) => c.id === existing.driver_id);
  }
  if (!driver) {
    const monthStart = `${day.slice(0, 7)}-01`;
    const { data: monthAssignments } = await supabaseAdmin
      .from("assignments")
      .select("driver_id")
      .gte("day", monthStart)
      .lte("day", day);
    const drives: Record<string, number> = {};
    for (const a of monthAssignments ?? []) {
      drives[a.driver_id] = (drives[a.driver_id] ?? 0) + 1;
    }
    driver = weightedPick(candidates, drives).winner;
  }

  // Departure point: admin override > previous value > global default > driver's city.
  const { data: prev } = await supabaseAdmin
    .from("assignments")
    .select("departure_address, departure_name, departure_lat, departure_lng")
    .eq("day", day)
    .maybeSingle();

  let departureName = prev?.departure_name ?? settings.default_departure_name ?? "";
  let departureAddress =
    options.departureAddress ??
    prev?.departure_address ??
    settings.default_departure_address ??
    driver.city;
  let lat = options.departureAddress ? null : (prev?.departure_lat ?? settings.default_departure_lat);
  let lng = options.departureAddress ? null : (prev?.departure_lng ?? settings.default_departure_lng);

  if (lat == null || lng == null) {
    const geo = await geocode(departureAddress);
    lat = geo.lat;
    lng = geo.lng;
    departureAddress = geo.formatted;
    if (!departureName) departureName = geo.city || departureAddress;
  }
  if (options.departureAddress) departureName = departureName || departureAddress;

  const arrivalAt = romeInstant(day, settings.arrival_time);
  const route = await departureForArrival(
    { lat: Number(lat), lng: Number(lng) },
    { lat: Number(settings.destination_lat), lng: Number(settings.destination_lng) },
    arrivalAt,
  );

  const fuelType = isFuelType(driver.fuel_type) ? driver.fuel_type : "benzina";
  const province = driver.province || "RM";
  const fuel = await getFuelPrice(province, fuelType);
  const totalKm = Number(settings.one_way_km) * 2;
  const cost = fuel ? tripCost(totalKm, Number(driver.consumption_kml), fuel.price) : 0;

  const alarmAt = new Date(
    route.departureAt.getTime() -
      (driver.prep_minutes + driver.alarm_lead_minutes) * 60_000,
  );

  await supabaseAdmin.from("assignments").upsert(
    {
      day,
      driver_id: driver.id,
      departure_name: departureName,
      departure_address: departureAddress,
      departure_lat: lat,
      departure_lng: lng,
      travel_minutes: route.minutes,
      departure_at: route.departureAt.toISOString(),
      arrival_at: arrivalAt.toISOString(),
      alarm_at: alarmAt.toISOString(),
      distance_km: totalKm,
      fuel_price: fuel?.price ?? null,
      fuel_type: fuelType,
      trip_cost: cost,
      candidates: candidates.length,
      created_by: options.createdBy ?? null,
    },
    { onConflict: "day" },
  );

  await notifyEveryone({
    title: `Guidatore del ${formatDay(day)}: ${driver.full_name || driver.email}`,
    body: `Partenza ${formatTime(route.departureAt)} da ${departureName} · ${route.minutes} min di viaggio · costo stimato ${cost.toFixed(2)} €`,
    kind: "estrazione",
    day,
  });

  return {
    ok: true,
    day,
    driverName: driver.full_name || driver.email,
    departureAt: route.departureAt.toISOString(),
    cost,
  };
}

export function formatDay(day: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TZ,
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${day}T12:00:00Z`));
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: ROME_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Writes an in-app notification and pushes it to every active colleague. */
export async function notifyEveryone(message: {
  title: string;
  body: string;
  kind: string;
  day?: string;
  onlyUserIds?: string[];
}): Promise<number> {
  let query = supabaseAdmin.from("profiles").select("id").eq("active", true);
  if (message.onlyUserIds) query = query.in("id", message.onlyUserIds);
  const { data: users } = await query;
  const ids = (users ?? []).map((u) => u.id);
  if (ids.length === 0) return 0;

  await supabaseAdmin.from("notifications").insert(
    ids.map((id) => ({
      user_id: id,
      title: message.title,
      body: message.body,
      kind: message.kind,
      day: message.day ?? null,
    })),
  );

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", ids);

  let sent = 0;
  for (const sub of subs ?? []) {
    const result = await sendPush(sub, {
      title: message.title,
      body: message.body,
      url: "/dashboard",
      tag: message.kind,
    });
    if (result === "sent") sent++;
    if (result === "gone") {
      await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
    }
  }
  return sent;
}
