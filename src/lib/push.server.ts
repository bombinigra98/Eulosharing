import { buildPushPayload } from "@block65/webcrypto-web-push";

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushContent = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Sends one web push notification. Returns "gone" when the browser has dropped
 * the subscription so the caller can delete the stale row.
 */
export async function sendPush(
  sub: StoredSubscription,
  content: PushContent,
): Promise<"sent" | "gone" | "failed"> {
  const vapid = {
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:admin@commutebuddy.app",
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };
  if (!vapid.publicKey || !vapid.privateKey) {
    console.error("Chiavi VAPID mancanti");
    return "failed";
  }

  try {
    const payload = await buildPushPayload(
      { data: content, options: { ttl: 3600, urgency: "high" } },
      {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      vapid,
    );
    const res = await fetch(sub.endpoint, payload);
    if (res.status === 404 || res.status === 410) return "gone";
    if (!res.ok) {
      console.error(`Push rifiutata [${res.status}]: ${await res.text()}`);
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("Invio push non riuscito", error);
    return "failed";
  }
}
