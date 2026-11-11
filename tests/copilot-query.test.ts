import test from "node:test";
import assert from "node:assert/strict";
import { fallbackQuery, executeCopilotQuery, querySchema } from "../src/lib/copilot-query";
import type { Entry } from "../src/lib/analytics";
const row = (id: string, amountMinor: number, overrides: Partial<Entry> = {}): Entry => ({
  id,
  amountMinor,
  currency: "USD",
  occurredAt: "2026-11-10T12:00:00Z",
  direction: "SENT",
  kind: "CAPTURE",
  category: "Dining",
  description: "private description",
  reference: "private reference",
  ...overrides,
});
const entries = [
  row("small", 1000),
  row("large", 3000),
  row("refund", 500, { direction: "RECEIVED", kind: "REFUND" }),
  row("euro", 999999, { currency: "EUR" }),
  row("old", 2000, { occurredAt: "2026-10-01T00:00:00Z" }),
];
test("copilot ranking isolates currency, period and captures with traceable results", () => {
  const result = executeCopilotQuery(
    fallbackQuery("largest outgoing payment", "2026-11", "USD"),
    entries,
    [],
  );
  assert.deepEqual(result.facts.find((f) => f.id === "payment-0")?.evidence, ["large"]);
  assert.ok(result.facts.every((f) => !f.evidence.includes("euro") && !f.evidence.includes("old")));
  assert.ok(result.facts.every((f) => !f.text.includes("private")));
});
test("copilot totals retain refund direction and budgets use gross captures", () => {
  const result = executeCopilotQuery(fallbackQuery("summary", "2026-11", "USD"), entries, []);
  assert.match(result.facts[0].text, /\$40.00 sent and \$5.00 received/);
  const budget = executeCopilotQuery(
    fallbackQuery("Dining budget remaining", "2026-11", "USD"),
    entries,
    [{ category: "Dining", currency: "USD", month: "2026-11", limitMinor: 5000 }],
  );
  assert.match(budget.facts[0].text, /\$40.00 spent/);
  assert.match(budget.facts[0].text, /\$10.00/);
  assert.deepEqual(budget.facts[0].evidence, ["small", "large"]);
});
test("follow-ups preserve intent, calendar boundaries, and refund filtering", () => {
  const query = fallbackQuery("what about last month?", "2026-01", "USD", [
    { role: "user", content: "largest outgoing payment" },
  ]);
  assert.equal(query.month, "2025-12");
  assert.equal(query.intent, "largest");
  const refunds = executeCopilotQuery(fallbackQuery("show refunds", "2026-11", "USD"), entries, []);
  assert.deepEqual(refunds.facts[0].evidence, ["refund"]);
  assert.equal(fallbackQuery("how do I create a budget?", "2026-11", "USD").intent, "help");
});
test("read-only query validation rejects unsupported instructions and zero-baseline comparisons stay defined", () => {
  assert.equal(querySchema.safeParse({ intent: "execute_sql" }).success, false);
  const result = executeCopilotQuery(
    fallbackQuery("compare months", "2026-11", "USD"),
    [entries[0]],
    [],
  );
  assert.match(result.facts[0].text, /percentage unavailable/);
  assert.doesNotMatch(result.facts[0].text, /NaN|Infinity/);
});
