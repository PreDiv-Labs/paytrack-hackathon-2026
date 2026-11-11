"use client";
import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from "ag-grid-community";
import type { Entry } from "@/lib/analytics";
import { money } from "@/lib/money";
ModuleRegistry.registerModules([AllCommunityModule]);
const theme = themeQuartz.withParams({
  accentColor: "#6037D7",
  backgroundColor: "#fff",
  borderColor: "#E7EAF1",
  headerBackgroundColor: "#fafbfe",
  fontFamily: "Inter, Segoe UI, sans-serif",
  fontSize: 13,
  rowHeight: 60,
  headerHeight: 44,
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
      { field: "description", headerName: "Transaction", minWidth: 210, flex: 2 },
      {
        field: "occurredAt",
        headerName: "Date",
        minWidth: 140,
        valueFormatter: (p) =>
          new Date(p.value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        sort: "desc",
      },
      { field: "category", minWidth: 140 },
      { field: "direction", headerName: "Direction", minWidth: 110 },
      {
        field: "amountMinor",
        headerName: "Amount",
        minWidth: 140,
        valueFormatter: (p) => money(p.value, p.data?.currency),
        cellStyle: (p) => ({
          color: p.data?.direction === "RECEIVED" ? "#118762" : "#17192B",
          fontWeight: 600,
        }),
      },
      { field: "kind", headerName: "Type", minWidth: 110 },
      { field: "reference", headerName: "Verified reference", minWidth: 190 },
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
        paginationPageSize={20}
        paginationPageSizeSelector={[20, 50, 100]}
        onRowClicked={(e) => e.data && onSelect(e.data)}
        getRowId={(p) => p.data.id}
        overlayNoRowsTemplate="<span>No verified activity matches this view.</span>"
      />
    </div>
  );
}
