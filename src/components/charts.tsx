"use client";
import { AgCharts } from "ag-charts-react";
import { AllCommunityModule, ModuleRegistry, type AgChartOptions } from "ag-charts-community";
import type { analyze } from "@/lib/analytics";
ModuleRegistry.registerModules([AllCommunityModule]);
export default function Charts({
  analytics,
  kind = "cashflow",
}: {
  analytics: ReturnType<typeof analyze>;
  kind?: "cashflow" | "categories";
}) {
  const options: AgChartOptions =
    kind === "cashflow"
      ? {
          data: analytics.daily,
          series: [
            {
              type: "area",
              xKey: "day",
              yKey: "received",
              yName: "Received",
              fill: "#118762",
              stroke: "#118762",
              fillOpacity: 0.07,
              marker: { enabled: false },
            },
            {
              type: "line",
              xKey: "day",
              yKey: "sent",
              yName: "Sent",
              stroke: "#6037D7",
              marker: { enabled: false },
            },
          ],
          axes: {
            x: { type: "category", title: { text: "Day of month" } },
            y: {
              type: "number",
              label: { formatter: ({ value }) => `${analytics.currency} ${value}` },
            },
          },
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
