/**
 * Average fuel price for an Italian province, from the public MIMIT
 * "Osservaprezzi carburanti" service (no API key required).
 */
const OSPZ = "https://carburanti.mise.gov.it/ospzApi/search/servicearea";

export const FUEL_TYPES = ["benzina", "gasolio", "gpl", "metano"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

const FUEL_IDS: Record<FuelType, { api: string; fuelId: number }> = {
  benzina: { api: "1-1", fuelId: 1 },
  gasolio: { api: "2-1", fuelId: 2 },
  metano: { api: "3-1", fuelId: 3 },
  gpl: { api: "4-1", fuelId: 4 },
};

export function isFuelType(value: string): value is FuelType {
  return (FUEL_TYPES as readonly string[]).includes(value);
}

export async function fetchProvinceFuelPrice(
  province: string,
  fuelType: FuelType,
): Promise<{ price: number; sampleSize: number } | null> {
  const conf = FUEL_IDS[fuelType];
  const res = await fetch(OSPZ, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ province: province.toUpperCase(), fuelType: conf.api }),
  });
  if (!res.ok) {
    console.error(`Osservaprezzi fallito [${res.status}]: ${await res.text()}`);
    return null;
  }
  const json = (await res.json()) as {
    success?: boolean;
    results?: Array<{ fuels?: Array<{ price: number; fuelId: number; isSelf: boolean }> }>;
  };
  const prices: number[] = [];
  for (const station of json.results ?? []) {
    for (const fuel of station.fuels ?? []) {
      if (fuel.fuelId === conf.fuelId && fuel.isSelf && fuel.price > 0) {
        prices.push(fuel.price);
      }
    }
  }
  if (prices.length === 0) return null;
  // Trim the extremes so a single outlier station cannot skew the average.
  prices.sort((a, b) => a - b);
  const trim = prices.length > 8 ? Math.floor(prices.length * 0.1) : 0;
  const core = prices.slice(trim, prices.length - trim);
  const avg = core.reduce((a, b) => a + b, 0) / core.length;
  return { price: Math.round(avg * 1000) / 1000, sampleSize: core.length };
}

export function tripCost(
  km: number,
  consumptionKml: number,
  pricePerUnit: number,
): number {
  if (consumptionKml <= 0) return 0;
  return Math.round((km / consumptionKml) * pricePerUnit * 100) / 100;
}
