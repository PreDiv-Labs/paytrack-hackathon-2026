"use client";
import { AgCharts } from "ag-charts-react";
import { AllCommunityModule, ModuleRegistry, type AgChartOptions } from "ag-charts-community";
import type { analyze } from "@/lib/analytics";
import { colors, categoryColor } from "@/lib/design-system";
ModuleRegistry.registerModules([AllCommunityModule]);
export default function Charts({
  analytics,
  kind = "cashflow",
  interval = "daily",
  display = "line",
  compact = false,
  height = 280,
}: {
  analytics: ReturnType<typeof analyze>;
  kind?: "cashflow" | "categories" | "net" | "ranking" | "cumulative";
  interval?: "daily" | "weekly";
  display?: "line" | "bar";
  compact?: boolean;
  height?: number;
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
    x: { type: "category" as const, label: { fontSize: 12, color: colors.secondary } },
    y: {
      type: "number" as const,
      label: {
        fontSize: 12,
        color: colors.secondary,
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
              stroke: colors.primary,
              strokeWidth: 3,
              fill: colors.lavender,
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
                fill: colors.primary,
                itemStyler: ({ datum }) => ({ fill: categoryColor(datum.category) }),
                strokeWidth: 0,
                cornerRadius: 5,
              },
            ],
            legend: { enabled: false },
          }
        : kind === "cashflow" || kind === "cumulative"
          ? {
              data:
                kind === "cumulative"
                  ? data.map((row, index) => ({
                      ...row,
                      sent: data.slice(0, index + 1).reduce((sum, item) => sum + item.sent, 0),
                      received: data
                        .slice(0, index + 1)
                        .reduce((sum, item) => sum + item.received, 0),
                    }))
                  : data,
              series:
                display === "bar"
                  ? [
                      {
                        type: "bar",
                        xKey: "day",
                        yKey: "received",
                        yName: "Received",
                        fill: colors.income,
                        cornerRadius: 4,
                        strokeWidth: 0,
                      },
                      {
                        type: "bar",
                        xKey: "day",
                        yKey: "sent",
                        yName: "Sent",
                        fill: colors.primary,
                        cornerRadius: 4,
                        strokeWidth: 0,
                      },
                    ]
                  : [
                      {
                        type: "area",
                        xKey: "day",
                        yKey: "received",
                        yName: "Received",
                        stroke: colors.income,
                        fill: colors.income,
                        fillOpacity: 0.08,
                        strokeWidth: 2.5,
                        marker: { enabled: false },
                      },
                      {
                        type: "area",
                        xKey: "day",
                        yKey: "sent",
                        yName: "Sent",
                        stroke: colors.primary,
                        fill: colors.primary,
                        fillOpacity: 0.08,
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
                  calloutLabelKey: compact ? undefined : "category",
                  sectorLabelKey: compact ? undefined : "amount",
                  innerRadiusRatio: 0.75,
                  calloutLabel: { fontSize: 12, color: colors.secondary },
                  sectorLabel: { fontSize: 12, color: colors.text },
                  fills: analytics.breakdown.map((row) => categoryColor(row.category)),
                  strokes: [colors.surface],
                },
              ],
              legend: { position: "bottom", enabled: !compact },
            };
  return (
    <AgCharts
      options={{
        ...options,
        theme: {
          baseTheme: "ag-default",
          params: {
            fontFamily: "Inter Variable, Inter, sans-serif",
            tooltipBackgroundColor: colors.navy,
            tooltipTextColor: colors.onFeature,
          },
          overrides: {
            common: {
              title: { fontFamily: "Inter Variable, Inter, sans-serif" },
              legend: { item: { label: { fontSize: 13, color: colors.secondary } } },
            },
          },
        },
        height,
        background: { fill: "transparent" },
        padding: { top: 12, bottom: 4, left: 8, right: 12 },
      }}
    />
  );
}
