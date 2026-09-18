// Notification worker for CommuteBuddy wake-up alarms.
// It only handles web push; it never caches or serves app files.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "CommuteBuddy", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "CommuteBuddy", {
      body: payload.body || "",
      tag: payload.tag || "commutebuddy",
      renotify: true,
      requireInteraction: payload.tag === "sveglia",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [400, 200, 400, 200, 400],
      data: { url: payload.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
