import test from "node:test";
import assert from "node:assert/strict";
import { toMinor, splitEqual } from "../src/lib/money";
import { analyze, type Entry } from "../src/lib/analytics";
import { validateCapture } from "../src/lib/payment-checks";
import { webhookPayload, assertVerified } from "../src/lib/webhook-checks";
test("money parsing preserves cents and rejects invalid precision, negative and oversized values", () => {
  assert.equal(toMinor("0.01"), 1);
  assert.equal(toMinor("12.1"), 1210);
  assert.equal(toMinor("999999.99"), 99999999);
  for (const value of ["0", "-1", "1.001", "1e3", "NaN", "1000000.01", ""])
    assert.throws(() => toMinor(value));
});
test("equal splits allocate every cent deterministically", () => {
  assert.deepEqual(splitEqual(1000, 3), [334, 333, 333]);
  for (let count = 2; count <= 30; count++) {
    const shares = splitEqual(10001, count);
    assert.equal(
      shares.reduce((a, b) => a + b),
      10001,
    );
    assert.ok(Math.max(...shares) - Math.min(...shares) <= 1);
  }
  assert.throws(() => splitEqual(1, 2));
});
const entry = (
  id: string,
  amountMinor: number,
  currency: string,
  direction: string,
  date: string,
  kind = "CAPTURE",
  category = "Dining",
): Entry => ({
  id,
  amountMinor,
  currency,
  direction,
  occurredAt: date,
  category,
  description: "Test fixture only",
  kind,
  reference: id,
});
test("analytics isolates currencies and calendar boundaries while preserving refund cash flow", () => {
  const a = analyze(
    [
      entry("a", 1200, "USD", "SENT", "2026-11-01T00:00:00Z"),
      entry("b", 500, "USD", "RECEIVED", "2026-11-03T00:00:00Z", "REFUND"),
      entry("c", 9999, "EUR", "SENT", "2026-11-01T00:00:00Z"),
      entry("d", 600, "USD", "SENT", "2026-10-31T23:59:59Z"),
      entry("e", 700, "USD", "SENT", "2026-12-01T00:00:00Z"),
    ],
    "USD",
    "2026-11",
  );
  assert.equal(a.sent, 1200);
  assert.equal(a.received, 500);
  assert.equal(a.net, -700);
  assert.equal(a.count, 1);
  assert.equal(a.previousSent, 600);
  assert.deepEqual(a.evidence, ["a", "b"]);
  assert.equal(a.breakdown[0].amountMinor, 1200);
  assert.match(a.facts.find((f) => f.id === "comparison")!.text, /100.0%/);
});
test("budget baselines include complete zero-activity months and trace source records", () => {
  const a = analyze(
    [entry("a", 3000, "USD", "SENT", "2026-08-05"), entry("b", 6000, "USD", "SENT", "2026-10-03")],
    "USD",
    "2026-11",
  );
  assert.equal(a.recommendations[0].months, 3);
  assert.equal(a.recommendations[0].limitMinor, 3000);
  assert.deepEqual(a.recommendations[0].evidence, ["a", "b"]);
  assert.equal(
    analyze([entry("c", 3000, "USD", "SENT", "2026-10-03")], "USD", "2026-11").recommendations
      .length,
    0,
  );
});
const payment = {
  orderId: "ORDER",
  amountMinor: 1250,
  currency: "USD",
  merchantId: "MERCHANT",
  payerId: "PAYER",
  captureId: null,
};
const order = () => ({
  id: "ORDER",
  status: "COMPLETED",
  payer: { payer_id: "PAYER" },
  purchase_units: [
    {
      custom_id: "internal",
      payee: { merchant_id: "MERCHANT" },
      payments: {
        captures: [
          { id: "CAPTURE", status: "COMPLETED", amount: { value: "12.50", currency_code: "USD" } },
        ],
      },
    },
  ],
});
test("capture validation checks amount, currency, order, identity, merchant and completion", () => {
  assert.equal(validateCapture(payment, order(), "internal").captureId, "CAPTURE");
  for (const mutate of [
    (o: ReturnType<typeof order>) => {
      o.id = "OTHER";
    },
    (o: ReturnType<typeof order>) => {
      o.payer.payer_id = "OTHER";
    },
    (o: ReturnType<typeof order>) => {
      o.purchase_units[0].payee.merchant_id = "OTHER";
    },
    (o: ReturnType<typeof order>) => {
      o.purchase_units[0].custom_id = "OTHER";
    },
    (o: ReturnType<typeof order>) => {
      o.purchase_units[0].payments.captures[0].amount.value = "12.51";
    },
    (o: ReturnType<typeof order>) => {
      o.purchase_units[0].payments.captures[0].amount.currency_code = "EUR";
    },
    (o: ReturnType<typeof order>) => {
      o.status = "APPROVED";
    },
    (o: ReturnType<typeof order>) => {
      o.purchase_units[0].payments.captures[0].status = "PENDING";
    },
  ]) {
    const o = order();
    mutate(o);
    assert.throws(() => validateCapture(payment, o, "internal"));
  }
  assert.throws(() => validateCapture({ ...payment, payerId: null }, order(), "internal"));
  assert.throws(() => validateCapture({ ...payment, captureId: "CONFLICT" }, order(), "internal"));
});
test("webhook verification rejects missing headers and forged certificate origins", () => {
  assert.throws(() => webhookPayload(new Headers(), {}, "WH"));
  const headers = new Headers({
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/test",
    "paypal-transmission-id": "test",
    "paypal-transmission-sig": "not-a-real-signature",
    "paypal-transmission-time": "2026-11-11T00:00:00Z",
  });
  assert.equal(webhookPayload(headers, { id: "event" }, "WH").webhook_id, "WH");
  for (const url of [
    "http://api.sandbox.paypal.com/cert",
    "https://api.sandbox.paypal.com.evil.test/cert",
    "https://evil.test/cert",
  ]) {
    headers.set("paypal-cert-url", url);
    assert.throws(() => webhookPayload(headers, {}, "WH"));
  }
  assert.throws(() => assertVerified("FAILURE"));
  assert.throws(() => assertVerified(""));
  assert.doesNotThrow(() => assertVerified("SUCCESS"));
});
