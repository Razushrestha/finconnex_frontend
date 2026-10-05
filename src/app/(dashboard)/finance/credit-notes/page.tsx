"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EntityHeader } from "@/components/finance/EntityHeader";
import { EntityCards } from "@/components/finance/EntityCards";
import { EntityTable } from "@/components/finance/EntityTable";
import { EntityFilters } from "@/components/finance/EntityFilters";
import { MetricCardConfig, TableColumn } from "@/components/finance/types";
import {
  CREDIT_NOTE_STATUSES,
  listCreditNotes,
  type CreditNote,
  type CreditNoteStatus,
} from "@/lib/finance/credit-notes/types";
import { useCrmCreditNotes } from "@/lib/finance/credit-notes/use-crm-credit-notes";
import { financeInWindow, financeMatchesQuery, formatAUD } from "@/lib/finance/shared";
import { CREDIT_NOTE_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { onRecordsChange } from "@/lib/records-sync";
import { cn } from "@/lib/utils";
import { CreateCreditNoteForm } from "@/components/finance/credit-notes/CreateCreditNoteForm";

interface CreditNoteRow {
  id: string;
  creditNoteId: string;
  title: string;
  clientName: string;
  issueDate: string;
  status: CreditNoteStatus;
  total: string;
}

export default function CreditNotesPage() {
  const router = useRouter();
  const crm = useCrmCreditNotes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [data, setData] = useState<CreditNote[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") !== "1") return;
    setCreateOpen(true);
    router.replace("/finance/credit-notes", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (crm.loading) return;
    const refresh = () => setData(listCreditNotes());
    refresh();
    return onRecordsChange(refresh);
  }, [crm.source, crm.loading]);

  const filteredData = data.filter((item) => {
    const matchesSearch = financeMatchesQuery(search, [
      item.creditNoteId,
      item.clientName,
      item.title,
      item.owner,
      item.notes,
      item.reason,
      item.invoiceRef,
      item.total,
      ...item.lineItems.map((line) => line.name),
    ]);
    const matchesStatus =
      statusFilter === "All" ||
      item.status.toLowerCase() === statusFilter.toLowerCase();
    return (
      matchesSearch &&
      matchesStatus &&
      financeInWindow(dateFilter, item.issueDate, item.createdAt)
    );
  });

  const headerProps = {
    title: "",
    description: "",
    searchPlaceholder: "Search credit notes...",
    searchValue: "",
    onSearchChange: () => {},
    actionLabel: "New credit note",
    onActionClick: () =>
      router.push(
        "/finance/credit-notes/create?layoutid=standard&redirect=false",
      ),
  };

  const openTotal = filteredData
    .filter((n) => n.status === "Draft" || n.status === "Sent")
    .reduce((acc, curr) => acc + curr.total, 0);
  const appliedCount = filteredData.filter((n) => n.status === "Applied").length;

  const cardsData: MetricCardConfig[] = [
    {
      title: "OPEN CREDITS",
      value: formatAUD(openTotal),
      subtext: "Draft + sent not yet applied",
      subtextVariant: "default",
    },
    {
      title: "APPLIED",
      value: appliedCount,
      subtext: "Allocated to invoices",
      subtextVariant: "success",
    },
    {
      title: "TOTAL CREDIT NOTES",
      value: filteredData.length,
      subtext: crm.source === "api" ? "Live CRM" : "Tracked in system",
      subtextVariant: "default",
    },
  ];

  const columns: TableColumn<CreditNoteRow>[] = [
    {
      header: "CREDIT NOTE",
      accessorKey: "creditNoteId",
      cell: (row) => (
        <div>
          <span className="text-primary font-semibold">{row.creditNoteId}</span>
          <p className="text-[11px] text-muted-foreground">{row.title}</p>
        </div>
      ),
    },
    {
      header: "CLIENT",
      accessorKey: "clientName",
      cell: (row) => (
        <span className="font-medium text-foreground">{row.clientName}</span>
      ),
    },
    {
      header: "ISSUED",
      accessorKey: "issueDate",
    },
    {
      header: "STATUS",
      accessorKey: "status",
      cell: (row) => (
        <span
          className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold",
            CREDIT_NOTE_STATUS_STYLE[row.status],
          )}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "TOTAL",
      accessorKey: "total",
      cell: (row) => (
        <span className="font-semibold text-foreground">{row.total}</span>
      ),
    },
  ];

  const tableData: CreditNoteRow[] = filteredData.map((item) => ({
    id: item.id,
    creditNoteId: item.creditNoteId,
    title: item.title,
    clientName: item.clientName,
    issueDate: item.issueDate,
    status: item.status,
    total: formatAUD(item.total),
  }));

  return (
    <div className="h-auto min-h-full w-full overflow-y-auto bg-slate-50 p-6 pb-16 text-slate-900">
      <EntityHeader {...headerProps} />
      <EntityCards cards={cardsData} />
      <EntityFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search credit notes..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        dateValue={dateFilter}
        onDateChange={setDateFilter}
        dateOptions={[
          { label: "All time", value: "all" },
          { label: "Last 7 Days", value: "7d" },
          { label: "Last 30 Days", value: "30d" },
          { label: "Last 90 Days", value: "90d" },
        ]}
        statusOptions={[
          { label: "All", value: "All" },
          ...CREDIT_NOTE_STATUSES.map((status) => ({
            label: status,
            value: status,
          })),
        ]}
      />
      <EntityTable
        columns={columns}
        data={tableData}
        paginationText={
          tableData.length === 0
            ? "Showing 0 of 0 entries"
            : `Showing 1 to ${tableData.length} of ${tableData.length} entries`
        }
        totalPages={1}
        onRowClick={(row) => router.push(`/finance/credit-notes/${row.id}`)}
      />
      <CreateCreditNoteForm
        variant="modal"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => setData(listCreditNotes())}
      />
    </div>
  );
}
