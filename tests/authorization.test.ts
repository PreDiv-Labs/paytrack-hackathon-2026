import test from "node:test";
import assert from "node:assert/strict";
const origin = process.env.TEST_BASE_URL ?? "http://localhost:3000";
test("unauthenticated requests cannot read a workspace", async () => {
  const r = await fetch(`${origin}/api/workspace`);
  assert.equal(r.status, 401);
  const body = await r.json();
  assert.ok(!("entries" in body));
});
test("unauthenticated writes and cross-origin writes are denied on every mutation", async () => {
  for (const path of [
    "/api/payments",
    "/api/budgets",
    "/api/groups",
    "/api/copilot",
    "/api/notifications",
    "/api/payments/nonexistent/capture",
  ]) {
    const denied = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { Origin: "https://attacker.invalid", "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(denied.status, 403, path);
    const anonymous = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(anonymous.status, 401, path);
  }
});
test("unsigned webhooks fail closed and protected pages redirect to PayPal login", async () => {
  const r = await fetch(`${origin}/api/paypal/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "forged",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: { id: "forged" },
    }),
  });
  assert.equal(r.status, 400);
  for (const path of [
    "overview",
    "transactions",
    "pay",
    "divide-pay",
    "budgets",
    "copilot",
    "analytics",
    "connection",
    "settings",
  ]) {
    const page = await fetch(`${origin}/${path}`, { redirect: "manual" });
    assert.equal(page.status, 307, path);
    assert.equal(new URL(page.headers.get("location")!, origin).pathname, "/login");
  }
});
