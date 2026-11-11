require("dotenv").config({ quiet: true });
const fs = require("node:fs");
(async () => {
  const response = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET).toString(
          "base64",
        ),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(25000),
  });
  console.log(JSON.stringify({ sandboxMerchantAuthentication: response.status }));
  if (!response.ok) return;
  const body = await response.json();
  const identity = await fetch(
    "https://api-m.sandbox.paypal.com/v1/identity/openidconnect/userinfo?schema=paypalv1.1",
    {
      headers: { Authorization: "Bearer " + body.access_token },
      signal: AbortSignal.timeout(20000),
    },
  );
  console.log(JSON.stringify({ merchantIdentityLookup: identity.status }));
  if (identity.ok) {
    const info = await identity.json();
    const id = info.payer_id;
    if (typeof id === "string" && /^[A-Z0-9]{13}$/.test(id)) {
      fs.appendFileSync(".env", "PAYPAL_MERCHANT_ID=" + JSON.stringify(id) + "\n");
      console.log("Sandbox merchant ID verified and saved privately.");
    } else console.log("Merchant ID requires Developer Dashboard confirmation.");
  }
  if (process.env.PAYPAL_WEBHOOK_ID) {
    const r = await fetch(
      "https://api-m.sandbox.paypal.com/v1/notifications/webhooks/" +
        encodeURIComponent(process.env.PAYPAL_WEBHOOK_ID),
      {
        headers: { Authorization: "Bearer " + body.access_token },
        signal: AbortSignal.timeout(20000),
      },
    );
    console.log(JSON.stringify({ configuredWebhookLookup: r.status }));
    if (r.ok) {
      const b = await r.json();
      console.log(
        JSON.stringify({
          webhookHost: new URL(b.url).hostname,
          subscribedEvents: b.event_types?.map((e) => e.name),
        }),
      );
    }
  }
})().catch(() => {
  console.log("Sandbox connectivity test failed; no secrets printed.");
  process.exitCode = 1;
});
