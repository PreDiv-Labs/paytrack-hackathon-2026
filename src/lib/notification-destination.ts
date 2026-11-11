import type { Entry } from "./analytics";

export function notificationDestination(
  notification: { title: string; message: string; createdAt: string },
  preview = false,
  entries: Entry[] = [],
) {
  const base = preview ? "/preview" : "";
  const capture = notification.message.match(/PayPal capture ([A-Za-z0-9]+)/)?.[1];
  if (capture) {
    const entry = entries.find((row) => row.reference === capture);
    const params = new URLSearchParams({
      q: capture,
      month: new Date(entry?.occurredAt ?? notification.createdAt).toISOString().slice(0, 7),
    });
    if (entry) params.set("currency", entry.currency);
    return `${base}/transactions?${params}`;
  }
  const text = `${notification.title} ${notification.message}`.toLowerCase();
  if (/budget/.test(text)) return `${base}/budgets`;
  if (/split|contribution|participant/.test(text)) return `${base}/divide-pay`;
  if (/connection|connect|identity/.test(text)) return `${base}/connection`;
  return `${base}/transactions`;
}
