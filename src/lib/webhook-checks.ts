export function webhookPayload(headers: Headers, event: unknown, webhookId: string) {
  const names = [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ];
  if (names.some((n) => !headers.get(n))) throw new Error("Missing PayPal verification headers.");
  const cert = new URL(headers.get("paypal-cert-url")!);
  if (
    cert.protocol !== "https:" ||
    !["api.sandbox.paypal.com", "api-m.sandbox.paypal.com"].includes(cert.hostname) ||
    cert.username ||
    cert.password
  )
    throw new Error("Invalid PayPal certificate origin.");
  return {
    auth_algo: headers.get(names[0]),
    cert_url: cert.href,
    transmission_id: headers.get(names[2]),
    transmission_sig: headers.get(names[3]),
    transmission_time: headers.get(names[4]),
    webhook_id: webhookId,
    webhook_event: event,
  };
}
export function assertVerified(status: string) {
  if (status !== "SUCCESS") throw new Error("PayPal webhook signature did not verify.");
}
