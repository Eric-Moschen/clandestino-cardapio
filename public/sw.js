self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "Há uma atualização no atendimento." };
  }

  const title = data.title || "O Clandestino";
  const options = {
    body: data.body || "Há uma atualização no atendimento.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/garcom", callId: data.callId || null },
    tag: data.tag || (data.callId ? `clandestino-call-${data.callId}` : "clandestino-call"),
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/garcom", self.location.origin);
  if (event.notification.data?.callId) targetUrl.searchParams.set("chamado", event.notification.data.callId);
  const target = targetUrl.href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client && client.url !== target) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});

self.addEventListener("notificationclose", () => {});
