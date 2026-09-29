globalThis.addEventListener("push", (event) => {
  let requestedPath = "/inbox";
  try {
    const payload = event.data?.json();
    if (payload?.path === "/today") requestedPath = "/today";
  } catch {
    // An unreadable payload still opens the account's message center.
  }
  const isPlan = requestedPath === "/today";
  event.waitUntil(
    globalThis.registration.showNotification("计划打卡", {
      body: isPlan ? "有计划需要关注" : "收到新互动",
      tag: isPlan ? "plan-checkin-plan" : "plan-checkin-social",
      data: { path: requestedPath },
    }),
  );
});

globalThis.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.path === "/today" ? "/today" : "/inbox";
  event.waitUntil(
    (async () => {
      const windows = await globalThis.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) =>
          new globalThis.URL(client.url).origin === globalThis.location.origin,
      );
      if (existing) {
        await existing.navigate(path);
        await existing.focus();
      } else {
        await globalThis.clients.openWindow(path);
      }
    })(),
  );
});
