import { z } from "zod";
import { analyze, type Entry } from "./analytics";
import { categories, currencies, money } from "./money";

export const querySchema = z.object({
  intent: z.enum(["summary", "largest", "search", "categories", "comparison", "budgets", "help"]),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  currency: z.enum(currencies),
  direction: z.enum(["all", "SENT", "RECEIVED"]),
  kind: z.enum(["all", "CAPTURE", "REFUND"]),
  order: z.enum(["largest", "smallest", "newest"]),
  category: z.string().max(60),
  period: z.enum(["month", "all"]),
  limit: z.number().int().min(1).max(10),
});
export type CopilotQuery = z.infer<typeof querySchema>;
export type HistoryTurn = { role: "user" | "assistant"; content: string };
export type BudgetContext = {
  category: string;
  currency: string;
  month: string;
  limitMinor: number;
};

export function fallbackQuery(
  question: string,
  month: string,
  currency: (typeof currencies)[number],
  history: HistoryTurn[] = [],
): CopilotQuery {
  const q = question.toLowerCase();
  const context = /^(why|show (those|them)|what about|and |how about)/i.test(q)
    ? `${history.filter((t) => t.role === "user").at(-1)?.content ?? ""} ${q}`
    : q;
  const explicit = q.match(/\b(\d{4}-(?:0[1-9]|1[0-2]))\b/)?.[1];
  if (explicit) month = explicit;
  else if (/last month|previous month/.test(q) && !/compar|chang|versus|vs\b/.test(q)) {
    const [y, m] = month.split("-").map(Number);
    month = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  }
  const intent =
    /how.*(create|set|work|use|start|save)|what is|hello|\bhi\b|help|connect|setup/.test(q)
      ? "help"
      : /budget|limit|afford/.test(context)
        ? "budgets"
        : /compar|chang|versus|vs\b/.test(context)
          ? "comparison"
          : /largest|biggest|highest|expensive|smallest/.test(context)
            ? "largest"
            : /categor|where|most|breakdown/.test(context)
              ? "categories"
              : /show|payment|transaction|refund/.test(context)
                ? "search"
                : /how|what is|hello|hi\b|help|connect|setup/.test(context)
                  ? "help"
                  : "summary";
  return {
    intent,
    month,
    currency,
    kind: /refund/.test(context) ? "REFUND" : "all",
    order: /smallest|lowest|cheapest/.test(context) ? "smallest" : "largest",
    direction: /receiv|income|incoming/.test(context)
      ? "RECEIVED"
      : /sent|spend|outgoing|expensive/.test(context)
        ? "SENT"
        : "all",
    category: categories.find((category) => context.includes(category.toLowerCase())) ?? "",
    period: /all time|all my|entire history/.test(context) ? "all" : "month",
    limit: 5,
  };
}

export function executeCopilotQuery(
  query: CopilotQuery,
  entries: Entry[],
  budgets: BudgetContext[],
) {
  if (!["summary", "search", "largest"].includes(query.intent))
    query = { ...query, period: "month" };
  const a = analyze(entries, query.currency, query.month);
  const rows = entries.filter(
    (e) =>
      e.currency === query.currency &&
      (query.period === "all" || new Date(e.occurredAt).toISOString().startsWith(query.month)) &&
      (query.direction === "all" || e.direction === query.direction) &&
      (query.kind === "all" || e.kind === query.kind) &&
      (!query.category || e.category.toLowerCase() === query.category.toLowerCase()),
  );
  const facts: { id: string; text: string; evidence: string[] }[] = [];
  const add = (id: string, text: string, evidence: string[]) => facts.push({ id, text, evidence });
  const periodLabel = query.period === "all" ? "all recorded history" : query.month;
  if (query.intent === "summary" || query.intent === "search" || query.intent === "largest") {
    const sent = rows
      .filter((e) => e.direction === "SENT")
      .reduce((sum, e) => sum + e.amountMinor, 0);
    const received = rows
      .filter((e) => e.direction === "RECEIVED")
      .reduce((sum, e) => sum + e.amountMinor, 0);
    add(
      "totals",
      `${rows.length} matching ledger entries in ${periodLabel}: ${money(sent, query.currency)} sent and ${money(received, query.currency)} received. Net flow: ${money(received - sent, query.currency)}.`,
      rows.map((e) => e.id),
    );
    const captures = rows.filter(
      (e) => query.intent !== "largest" || query.kind === "REFUND" || e.kind === "CAPTURE",
    );
    const ordered = [...captures].sort((x, y) =>
      query.intent === "largest"
        ? query.order === "smallest"
          ? x.amountMinor - y.amountMinor
          : y.amountMinor - x.amountMinor
        : +new Date(y.occurredAt) - +new Date(x.occurredAt),
    );
    ordered
      .slice(0, query.limit)
      .forEach((e, i) =>
        add(
          `payment-${i}`,
          `${query.intent === "largest" ? "Ranked payment" : "Payment"}: ${money(e.amountMinor, e.currency)} ${e.direction.toLowerCase()} · ${e.category} · ${e.kind.toLowerCase()} · ${new Date(e.occurredAt).toISOString().slice(0, 10)}.`,
          [e.id],
        ),
      );
  }
  if (query.intent === "categories") {
    a.breakdown
      .filter((e) => !query.category || e.category.toLowerCase() === query.category.toLowerCase())
      .slice(0, query.limit)
      .forEach((e, i) =>
        add(
          `category-${i}`,
          `${e.category}: ${money(e.amountMinor, query.currency)} in gross outgoing captures for ${query.month}.`,
          entries
            .filter(
              (row) =>
                row.currency === query.currency &&
                row.category === e.category &&
                row.kind === "CAPTURE" &&
                row.direction === "SENT" &&
                new Date(row.occurredAt).toISOString().startsWith(query.month),
            )
            .map((row) => row.id),
        ),
      );
  }
  if (query.intent === "comparison") {
    const [y, m] = query.month.split("-").map(Number);
    const previousMonth = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
    const previous = analyze(entries, query.currency, previousMonth);
    add(
      "comparison",
      `Money sent: ${money(a.sent, query.currency)} in ${query.month}, versus ${money(previous.sent, query.currency)} in ${previousMonth}. Change: ${money(a.sent - previous.sent, query.currency)}${previous.sent ? ` (${(((a.sent - previous.sent) / previous.sent) * 100).toFixed(1)}%)` : "; percentage unavailable because the previous total is zero"}.`,
      [...a.evidence, ...previous.evidence],
    );
    add(
      "incoming-comparison",
      `Money received: ${money(a.received, query.currency)} in ${query.month}, versus ${money(previous.received, query.currency)} in ${previousMonth}.`,
      [...a.evidence, ...previous.evidence],
    );
  }
  if (query.intent === "budgets") {
    budgets
      .filter(
        (b) =>
          b.currency === query.currency &&
          b.month === query.month &&
          (!query.category || b.category.toLowerCase() === query.category.toLowerCase()),
      )
      .forEach((b, i) => {
        const spent = a.breakdown.find((row) => row.category === b.category)?.amountMinor ?? 0;
        add(
          `budget-${i}`,
          `${b.category}: ${money(spent, query.currency)} spent against a ${money(b.limitMinor, query.currency)} limit. ${spent > b.limitMinor ? "Over budget by" : "Remaining"}: ${money(Math.abs(b.limitMinor - spent), query.currency)}.`,
          entries
            .filter(
              (e) =>
                a.evidence.includes(e.id) &&
                e.category === b.category &&
                e.kind === "CAPTURE" &&
                e.direction === "SENT",
            )
            .map((e) => e.id),
        );
      });
    a.recommendations
      .filter((r) => !query.category || r.category.toLowerCase() === query.category.toLowerCase())
      .slice(0, 5)
      .forEach((r, i) =>
        add(
          `baseline-${i}`,
          `${r.category}: a historical monthly baseline of ${money(r.limitMinor, query.currency)}. ${r.reason}`,
          r.evidence,
        ),
      );
  }
  return { facts, analytics: a, matched: rows.length, query };
}
