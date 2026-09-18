function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushResult =
  | { ok: true; endpoint: string; p256dh: string; auth: string }
  | { ok: false; error: string };

/** Registers the notification worker and returns the subscription keys. */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushResult> {
  if (typeof window === "undefined") return { ok: false, error: "Non disponibile" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return {
      ok: false,
      error:
        "Questo browser non supporta le notifiche. Su iPhone aggiungi prima l'app alla schermata Home.",
    };
  }
  if (!vapidPublicKey) return { ok: false, error: "Notifiche non configurate sul server" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "Permesso notifiche negato" };
  }

  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));

  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  if (!keys["p256dh"] || !keys["auth"]) {
    return { ok: false, error: "Chiavi di notifica non disponibili" };
  }
  return {
    ok: true,
    endpoint: subscription.endpoint,
    p256dh: keys["p256dh"],
    auth: keys["auth"],
  };
}
