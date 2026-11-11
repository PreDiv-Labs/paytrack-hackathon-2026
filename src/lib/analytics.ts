import { money } from "./money";
export type Entry = {
  id: string;
  amountMinor: number;
  currency: string;
  direction: string;
  category: string;
  description: string;
  occurredAt: Date | string;
  kind: string;
  reference: string;
};
export function analyze(entries: Entry[], currency: string, month: string) {
  const [year, m] = month.split("-").map(Number);
  const start = Date.UTC(year, m - 1, 1),
    end = Date.UTC(year, m, 1),
    previous = Date.UTC(year, m - 2, 1);
  const all = entries.filter((e) => e.currency === currency);
  const current = all.filter(
    (e) => +new Date(e.occurredAt) >= start && +new Date(e.occurredAt) < end,
  );
  const before = all.filter(
    (e) => +new Date(e.occurredAt) >= previous && +new Date(e.occurredAt) < start,
  );
  const sum = (rows: Entry[], direction: string) =>
    rows.filter((e) => e.direction === direction).reduce((a, e) => a + e.amountMinor, 0);
  const sent = sum(current, "SENT"),
    received = sum(current, "RECEIVED"),
    previousSent = sum(before, "SENT");
  const breakdown = Object.entries(
    current
      .filter((e) => e.direction === "SENT" && e.kind === "CAPTURE")
      .reduce<Record<string, number>>((a, e) => {
        a[e.category] = (a[e.category] ?? 0) + e.amountMinor;
        return a;
      }, {}),
  )
    .map(([category, amountMinor]) => ({ category, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
  const daily = Array.from({ length: new Date(end - 1).getUTCDate() }, (_, i) => ({
    day: `${i + 1}`,
    sent:
      sum(
        current.filter((e) => new Date(e.occurredAt).getUTCDate() === i + 1),
        "SENT",
      ) / 100,
    received:
      sum(
        current.filter((e) => new Date(e.occurredAt).getUTCDate() === i + 1),
        "RECEIVED",
      ) / 100,
  }));
  const evidence = current.map((e) => e.id);
  const outgoing = current.filter((e) => e.direction === "SENT" && e.kind === "CAPTURE");
  const amounts = outgoing.map((e) => e.amountMinor).sort((x, y) => x - y);
  const median = amounts.length
    ? (amounts[Math.floor((amounts.length - 1) / 2)] +
        amounts[Math.ceil((amounts.length - 1) / 2)]) /
      2
    : 0;
  const unusual = amounts.length >= 5 ? outgoing.filter((e) => e.amountMinor > median * 3) : [];
  const facts = [
    {
      id: "coverage",
      text: `${current.length} verified ledger entries in ${month} (${currency}). Only activity recorded by PayTrack is included.`,
      evidence,
    },
    {
      id: "cashflow",
      text: `${money(sent, currency)} sent, ${money(received, currency)} received; net recorded cash flow ${money(received - sent, currency)}. Refunds are shown in their actual direction.`,
      evidence,
    },
    ...(previousSent > 0
      ? [
          {
            id: "comparison",
            text: `Sent amount changed by ${(((sent - previousSent) / previousSent) * 100).toFixed(1)}% versus the previous calendar month.`,
            evidence: [...evidence, ...before.map((e) => e.id)],
          },
        ]
      : []),
    ...(breakdown[0]
      ? [
          {
            id: "driver",
            text: `${breakdown[0].category} is the largest recorded spending category: ${money(breakdown[0].amountMinor, currency)}.`,
            evidence: current
              .filter((e) => e.category === breakdown[0].category && e.direction === "SENT")
              .map((e) => e.id),
          },
        ]
      : []),
    ...(unusual.length
      ? [
          {
            id: "unusual",
            text: `${unusual.length} outgoing capture(s) exceed three times the median payment of ${money(Math.round(median), currency)} in this period. These may deserve a closer look; this is not a fraud assessment.`,
            evidence: unusual.map((e) => e.id),
          },
        ]
      : []),
  ];
  const history = all.filter(
    (e) => e.direction === "SENT" && e.kind === "CAPTURE" && +new Date(e.occurredAt) < start,
  );
  const months = [...new Set(history.map((e) => new Date(e.occurredAt).toISOString().slice(0, 7)))]
    .sort()
    .slice(-3);
  // Use complete calendar months, including zero-activity months between observations.
  const first = months[0];
  let observed = 0;
  if (first) {
    const [fy, fm] = first.split("-").map(Number);
    observed = Math.min(3, (year - fy) * 12 + m - fm);
  }
  const recommendations =
    observed >= 2
      ? [...new Set(history.map((e) => e.category))]
          .map((category) => {
            const rows = history.filter(
              (e) =>
                e.category === category &&
                +new Date(e.occurredAt) >= Date.UTC(year, m - 1 - observed, 1),
            );
            const totals = Array.from({ length: observed }, (_, i) =>
              rows
                .filter(
                  (e) =>
                    new Date(e.occurredAt).toISOString().slice(0, 7) ===
                    new Date(Date.UTC(year, m - 2 - i, 1)).toISOString().slice(0, 7),
                )
                .reduce((a, e) => a + e.amountMinor, 0),
            );
            const average = Math.round(totals.reduce((a, b) => a + b, 0) / observed);
            const variability = Math.round(
              Math.sqrt(totals.reduce((a, b) => a + (b - average) ** 2, 0) / observed),
            );
            return {
              category,
              limitMinor: Math.max(1, average),
              averageMinor: average,
              variabilityMinor: variability,
              months: observed,
              evidence: rows.map((e) => e.id),
              reason: `Average over ${observed} complete calendar months; variability ${money(variability, currency)}. This is a planning baseline, not a promised saving.`,
            };
          })
          .filter((r) => r.averageMinor > 0)
      : [];
  return {
    currency,
    month,
    sent,
    received,
    net: received - sent,
    count: current.filter((e) => e.kind === "CAPTURE").length,
    previousSent,
    breakdown,
    daily,
    facts,
    recommendations,
    evidence,
    historyMonths: observed,
  };
}
