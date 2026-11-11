"use client";
import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from "ag-grid-community";
import type { Entry } from "@/lib/analytics";
import { money } from "@/lib/money";
import { colors } from "@/lib/design-system";
import { CategoryBadge } from "./ui/financial";
ModuleRegistry.registerModules([AllCommunityModule]);
const theme = themeQuartz.withParams({
  accentColor: colors.primary,
  backgroundColor: colors.surface,
  borderColor: colors.border,
  headerBackgroundColor: colors.app,
  foregroundColor: colors.text,
  fontFamily: "Inter, Segoe UI, sans-serif",
  fontSize: 14,
  rowHeight: 56,
  headerHeight: 48,
  wrapperBorderRadius: 10,
});
export default function TransactionGrid({
  entries,
  query,
  onSelect,
}: {
  entries: Entry[];
  query: string;
  onSelect: (entry: Entry) => void;
}) {
  const columns = useMemo<ColDef<Entry>[]>(
    () => [
      { field: "description", headerName: "Transaction", minWidth: 180, flex: 2 },
      {
        field: "occurredAt",
        colId: "time",
        headerName: "Time",
        minWidth: 105,
        valueFormatter: (p) =>
          new Date(p.value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        headerTooltip: "Payment time in your local timezone",
      },
      {
        field: "occurredAt",
        headerName: "Date",
        minWidth: 115,
        valueFormatter: (p) =>
          new Date(p.value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        sort: "desc",
      },
      {
        field: "category",
        minWidth: 150,
        cellRenderer: (p: { value: string }) => <CategoryBadge category={p.value} />,
      },
      { field: "direction", headerName: "Direction", minWidth: 95 },
      {
        field: "amountMinor",
        headerName: "Amount",
        minWidth: 115,
        valueFormatter: (p) =>
          `${p.data?.direction === "RECEIVED" ? "+" : "−"}${money(p.value, p.data?.currency)}`,
        cellStyle: (p) => ({
          color: p.data?.direction === "RECEIVED" ? colors.positive : colors.negative,
          fontWeight: 600,
        }),
      },
      {
        field: "kind",
        headerName: "Type",
        minWidth: 110,
        cellRenderer: (p: { value: string }) => (
          <span className={`badge ${p.value === "REFUND" ? "amber" : "green"}`}>
            {p.value === "REFUND" ? "↩ Refund" : "✓ Capture"}
          </span>
        ),
      },
      { field: "reference", headerName: "Verified reference", minWidth: 160 },
    ],
    [],
  );
  return (
    <div className="transaction-grid">
      <AgGridReact<Entry>
        theme={theme}
        rowData={entries}
        columnDefs={columns}
        defaultColDef={{ sortable: true, filter: true, resizable: true, flex: 1 }}
        quickFilterText={query}
        pagination
        paginationAutoPageSize
        paginationPageSizeSelector={false}
        onRowClicked={(e) => e.data && onSelect(e.data)}
        getRowId={(p) => p.data.id}
        overlayNoRowsTemplate="<span>No verified activity matches this view.</span>"
      />
    </div>
  );
}
