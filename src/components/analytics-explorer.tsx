"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, ChartNoAxesCombined, Layers3 } from "lucide-react";
import type { analyze } from "@/lib/analytics";
import { money } from "@/lib/money";
import { categoryColor } from "@/lib/design-system";
const Charts = dynamic(() => import("./charts"), {
  ssr: false,
  loading: () => <div className="chart-loading skeleton" />,
});
type Analytics = ReturnType<typeof analyze>;

export default function AnalyticsExplorer({
  analytics: a,
  onEvidence,
}: {
  analytics: Analytics;
  onEvidence: (ids: string[]) => void;
}) {
  const [interval, setInterval] = useState<"daily" | "weekly">("daily");
  const [display, setDisplay] = useState<"line" | "bar">("line");
  const [categoryView, setCategoryView] = useState<"ranking" | "categories">("ranking");
  const total = a.breakdown.reduce((sum, row) => sum + row.amountMinor, 0);
  const activeDays = a.daily.filter((row) => row.sent || row.received).length;
  return (
    <div className="analytics-explorer">
      <div className="analysis-summary">
        <div>
          <span className="eyebrow">THE MONTH AT A GLANCE</span>
          <h2>Find the rhythm in your money.</h2>
          <p>Explore movement, spot spending drivers, and follow the evidence.</p>
        </div>
        <span className="analysis-period">
          <span className="live-dot" />
          {a.month} · {a.currency}
        </span>
      </div>
      <div className="stat-grid three analytics-stats">
        {[
          {
            label: "Outgoing activity",
            value: money(a.sent, a.currency),
            detail: a.previousSent
              ? `${(((a.sent - a.previousSent) / a.previousSent) * 100).toFixed(1)}% vs previous month`
              : "No previous-month comparison yet",
          },
          {
            label: "Active days",
            value: `${activeDays}`,
            detail: `of ${a.daily.length} calendar days with recorded activity`,
          },
          {
            label: "Top spending category",
            value: a.breakdown[0]?.category ?? "—",
            detail: total
              ? `${Math.round((a.breakdown[0].amountMinor / total) * 100)}% of gross outgoing captures`
              : "Your categories will appear with activity",
          },
        ].map((item) => (
          <article className="stat-card" key={item.label}>
            <span className="muted">{item.label}</span>
            <strong className="stat-value">{item.value}</strong>
            <small className="muted">{item.detail}</small>
          </article>
        ))}
      </div>
      <section className="panel explorer-flow">
        <div className="explorer-heading">
          <div>
            <span className="eyebrow">01 / MOVEMENT</span>
            <h2>Money in, money out</h2>
            <p>
              Compare recorded flows in {a.currency}. Hover for exact amounts; click a legend to
              isolate a series.
            </p>
          </div>
          <div className="chart-controls">
            <div className="segmented" aria-label="Chart interval">
              {(["daily", "weekly"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={interval === value}
                  onClick={() => setInterval(value)}
                >
                  {value === "daily" ? "Daily" : "Weekly"}
                </button>
              ))}
            </div>
            <div className="segmented" aria-label="Chart type">
              {(["line", "bar"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={display === value}
                  onClick={() => setDisplay(value)}
                >
                  {value === "line" ? "Line" : "Bars"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Charts analytics={a} interval={interval} display={display} />
        <div className="chart-footnote">
          <ChartNoAxesCombined size={14} />
          {a.evidence.length
            ? `${a.evidence.length} ledger entries · Refunds follow their actual direction`
            : "No recorded activity this month. Charts will fill with verified payments."}
          <button
            className="text-link"
            disabled={!a.evidence.length}
            onClick={() => onEvidence(a.evidence)}
          >
            Inspect records <ArrowUpRight size={14} />
          </button>
        </div>
      </section>
      <div className="analytics-bottom">
        <section className="panel">
          <div className="explorer-heading">
            <div>
              <span className="eyebrow">02 / SPENDING MIX</span>
              <h2>What drives your spending?</h2>
              <p>Gross outgoing captures by checkout category.</p>
            </div>
            <div className="segmented" aria-label="Category chart type">
              <button
                aria-pressed={categoryView === "ranking"}
                onClick={() => setCategoryView("ranking")}
              >
                Ranking
              </button>
              <button
                aria-pressed={categoryView === "categories"}
                onClick={() => setCategoryView("categories")}
              >
                Donut
              </button>
            </div>
          </div>
          {a.breakdown.length ? (
            <Charts analytics={a} kind={categoryView} />
          ) : (
            <div className="analytics-empty">
              <Layers3 size={28} />
              <h3>A clearer mix is on its way</h3>
              <p>Your first outgoing capture starts the category breakdown.</p>
            </div>
          )}
        </section>
        <section className="panel category-detail">
          <div className="explorer-heading">
            <div>
              <span className="eyebrow">03 / THE DETAILS</span>
              <h2>Category share</h2>
              <p>See the amounts behind the picture.</p>
            </div>
          </div>
          {a.breakdown.length ? (
            a.breakdown.map((row) => (
              <div className="category-share" key={row.category}>
                <div>
                  <span>
                    <i
                      style={{
                        background: categoryColor(row.category),
                      }}
                    />
                    {row.category}
                  </span>
                  <strong>{money(row.amountMinor, a.currency)}</strong>
                </div>
                <progress value={row.amountMinor} max={total} />
                <small>{((row.amountMinor / total) * 100).toFixed(1)}% of category spending</small>
              </div>
            ))
          ) : (
            <div className="analytics-empty">
              <span className="empty-share">—</span>
              <p>No spending categories for this month.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
