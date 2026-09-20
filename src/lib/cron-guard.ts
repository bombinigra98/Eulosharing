/**
 * Accepts either the platform cron secret or the app's own scheduler token,
 * so the nightly draw and the alarm dispatcher can be triggered by pg_cron.
 */
export async function authorizeScheduler(request: Request): Promise<Response | null> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return new Response("Unauthorized", { status: 401 });

  const allowed = [
    process.env["CRON_TOKEN"],
    process.env["LOVABLE_CRON_SECRET"],
    process.env["LOVABLE_CRON_SECRET_PREVIOUS"],
  ].filter((value): value is string => Boolean(value));
  if (allowed.length === 0) return new Response("Server configuration error", { status: 500 });

  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  const provided = digest(token);
  const ok = allowed.some((value) => timingSafeEqual(provided, digest(value)));
  return ok ? null : new Response("Unauthorized", { status: 401 });
}
