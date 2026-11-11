import test from "node:test";
import assert from "node:assert/strict";
import { notificationDestination } from "../src/lib/notification-destination";
import type { Entry } from "../src/lib/analytics";

test("payment notifications retain the capture's currency and calendar month", () => {
  const notification = {
    title: "Payment verified",
    message: "Lunch was verified against PayPal capture ABC123.",
    createdAt: "2026-11-01T00:00:00Z",
  };
  const entry = {
    reference: "ABC123",
    currency: "EUR",
    occurredAt: "2026-10-31T23:59:00Z",
  } as Entry;
  const result = new URL(
    notificationDestination(notification, false, [entry]),
    "https://example.com",
  );
  assert.equal(result.pathname, "/transactions");
  assert.equal(result.searchParams.get("q"), "ABC123");
  assert.equal(result.searchParams.get("currency"), "EUR");
  assert.equal(result.searchParams.get("month"), "2026-10");
});
test("notifications use internal destinations and preserve preview navigation", () => {
  const base = { message: "", createdAt: "2026-11-01T00:00:00Z" };
  assert.equal(
    notificationDestination({ ...base, title: "Budget updated" }, true),
    "/preview/budgets",
  );
  assert.equal(notificationDestination({ ...base, title: "New contribution" }), "/divide-pay");
  assert.equal(notificationDestination({ ...base, title: "Identity connected" }), "/connection");
  assert.equal(
    notificationDestination({ ...base, title: "https://external.example" }),
    "/transactions",
  );
});
