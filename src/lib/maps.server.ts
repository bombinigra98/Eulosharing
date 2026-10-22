  url.searchParams.set("region", "it");
  url.searchParams.set("key", key);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Geocodifica non riuscita [${res.status}]: ${body}`);
  }

  const json = (await res.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      address_components: Array<{ short_name: string; long_name: string; types: string[] }>;
    }>;
  };

  if (json.status !== "OK") {
    throw new Error(`Geocodifica Google non riuscita: ${json.status}${json.error_message ? ` — ${json.error_message}` : ""}`);
  }

  const first = json.results?.[0];
  if (!first) throw new Error(`Indirizzo non trovato: ${address}`);

  const comp = (type: string) =>
    first.address_components.find((c) => c.types.includes(type));

  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    formatted: first.formatted_address,
    city:
      comp("locality")?.long_name ??
      comp("administrative_area_level_3")?.long_name ??
      "",
    province: comp("administrative_area_level_2")?.short_name?.toUpperCase() ?? "",
  };
}

type LatLng = { lat: number; lng: number };

/** Travel minutes with live traffic between two points for a given departure instant. */
export async function travelMinutes(
  origin: LatLng,
  destination: LatLng,
  departureAt: Date,
): Promise<{ minutes: number; km: number; trafficAware: boolean }> {
  const key = mapsApiKey();
  const future = departureAt.getTime() > Date.now() + 60_000;

  const body: Record<string, unknown> = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: {
      location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
    },
    travelMode: "DRIVE",
    routingPreference: future ? "TRAFFIC_AWARE_OPTIMAL" : "TRAFFIC_AWARE",
    languageCode: "it-IT",
    units: "METRIC",
  };
  if (future) body["departureTime"] = departureAt.toISOString();

  const res = await fetch(GOOGLE_ROUTES_URL, {
    method: "POST",
    headers: {
      "X-Goog-Api-Key": key,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calcolo percorso non riuscito [${res.status}]: ${text}`);
  }

  const json = (await res.json()) as {
    routes?: Array<{ duration: string; distanceMeters: number }>;
  };
  const route = json.routes?.[0];
  if (!route) throw new Error("Nessun percorso trovato tra partenza e destinazione");

  const seconds = Number(route.duration.replace("s", ""));
  return {
    minutes: Math.ceil(seconds / 60),
    km: Math.round((route.distanceMeters / 1000) * 10) / 10,
    trafficAware: future,
  };
}

/**
 * Departure instant needed to arrive at `arrivalAt`, refined twice because the
 * Routes API models traffic from the departure time, not the arrival time.
 */
export async function departureForArrival(
  origin: LatLng,
  destination: LatLng,
  arrivalAt: Date,
): Promise<{ departureAt: Date; minutes: number; km: number; trafficAware: boolean }> {
  let guess = new Date(arrivalAt.getTime() - 45 * 60_000);
  let last = await travelMinutes(origin, destination, guess);
  for (let i = 0; i < 2; i++) {
    guess = new Date(arrivalAt.getTime() - last.minutes * 60_000);
    last = await travelMinutes(origin, destination, guess);
  }
  return {
    departureAt: new Date(arrivalAt.getTime() - last.minutes * 60_000),
    minutes: last.minutes,
    km: last.km,
    trafficAware: last.trafficAware,
  };
}
