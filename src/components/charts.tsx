"use client";
import { AgCharts } from "ag-charts-react";
import { AllCommunityModule, ModuleRegistry, type AgChartOptions } from "ag-charts-community";
import type { analyze } from "@/lib/analytics";
ModuleRegistry.registerModules([AllCommunityModule]);
export default function Charts({
  analytics,
  kind = "cashflow",
  interval = "daily",
  display = "line",
}: {
  analytics: ReturnType<typeof analyze>;
  kind?: "cashflow" | "categories" | "net" | "ranking";
  interval?: "daily" | "weekly";
  display?: "line" | "bar";
}) {
  let net = 0;
  const daily = analytics.daily.map((row) => ({ ...row, net: (net += row.received - row.sent) }));
  const data =
    interval === "daily"
      ? daily
      : Array.from({ length: Math.ceil(daily.length / 7) }, (_, index) => {
          const rows = daily.slice(index * 7, index * 7 + 7);
          return {
            day: `Week ${index + 1}`,
            sent: rows.reduce((sum, row) => sum + row.sent, 0),
            received: rows.reduce((sum, row) => sum + row.received, 0),
            net: rows.at(-1)?.net ?? 0,
          };
        });
  const axes = {
    x: { type: "category" as const, label: { fontSize: 10, color: "#9096a6" } },
    y: {
      type: "number" as const,
      label: {
        fontSize: 10,
        color: "#9096a6",
        formatter: ({ value }: { value: number }) =>
          new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
            value,
          ),
      },
    },
  };
  const options: AgChartOptions =
    kind === "net"
      ? {
          data,
          axes,
          series: [
            {
              type: "area",
              xKey: "day",
              yKey: "net",
              yName: `Net flow (${analytics.currency})`,
              stroke: "#6037d7",
              strokeWidth: 3,
              fill: "#9271eb",
              fillOpacity: 0.1,
              marker: { enabled: false },
            },
          ],
          legend: { enabled: false },
        }
      : kind === "ranking"
        ? {
            data: analytics.breakdown.map((row) => ({
              category: row.category,
              amount: row.amountMinor / 100,
            })),
            series: [
              {
                type: "bar",
                direction: "horizontal",
                xKey: "category",
                yKey: "amount",
                yName: `Spending (${analytics.currency})`,
                fill: "#8764df",
                strokeWidth: 0,
                cornerRadius: 5,
              },
            ],
            legend: { enabled: false },
          }
        : kind === "cashflow"
          ? {
              data,
              series:
                display === "bar"
                  ? [
                      {
                        type: "bar",
                        xKey: "day",
                        yKey: "received",
                        yName: "Received",
                        fill: "#42ad90",
                        cornerRadius: 4,
                        strokeWidth: 0,
                      },
                      {
                        type: "bar",
                        xKey: "day",
                        yKey: "sent",
                        yName: "Sent",
                        fill: "#8764df",
                        cornerRadius: 4,
                        strokeWidth: 0,
                      },
                    ]
                  : [
                      {
                        type: "line",
                        xKey: "day",
                        yKey: "received",
                        yName: "Received",
                        stroke: "#118762",
                        strokeWidth: 2.5,
                        marker: { enabled: false },
                      },
                      {
                        type: "line",
                        xKey: "day",
                        yKey: "sent",
                        yName: "Sent",
                        stroke: "#6037D7",
                        strokeWidth: 2.5,
                        marker: { enabled: false },
                      },
                    ],
              axes,
              legend: { position: "bottom" },
            }
          : {
              data: analytics.breakdown.map((e) => ({
                category: e.category,
                amount: e.amountMinor / 100,
              })),
              series: [
                {
                  type: "donut",
                  angleKey: "amount",
                  calloutLabelKey: "category",
                  sectorLabelKey: "amount",
                  innerRadiusRatio: 0.75,
                  fills: ["#6037D7", "#9c85df", "#118762", "#92cabb", "#d0c5f1", "#cdd2df"],
                  strokes: ["#fff"],
                },
              ],
              legend: { position: "bottom" },
            };
  return (
    <AgCharts
      options={{
        ...options,
        height: 280,
        background: { fill: "transparent" },
        padding: { top: 12, bottom: 4, left: 8, right: 12 },
      }}
    />
  );
}
