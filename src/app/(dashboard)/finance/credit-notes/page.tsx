"use client";

import React, { useEffect, useState } from "react";
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
import { formatAUD } from "@/lib/finance/shared";
import { CREDIT_NOTE_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { cn } from "@/lib/utils";

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
  const [dateFilter, setDateFilter] = useState("30d");
  const [data, setData] = useState<CreditNote[]>([]);

  useEffect(() => {
    if (crm.loading) return;
    setData(listCreditNotes());
  }, [crm.source, crm.loading]);

  const filteredData = data.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch =
      item.creditNoteId.toLowerCase().includes(q) ||
      item.clientName.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.owner.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "All" ||
      item.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const headerProps = {
    title: "Credit notes",
    description: "Issue, send, and apply client credits against invoices.",
    searchPlaceholder: "Search credit notes...",
    searchValue: "",
    onSearchChange: () => {},
    actionLabel: "New credit note",
    onActionClick: () =>
      router.push(
        "/finance/credit-notes/create?layoutid=standard&redirect=false",
      ),
  };

  const openTotal = data
    .filter((n) => n.status === "Draft" || n.status === "Sent")
    .reduce((acc, curr) => acc + curr.total, 0);
  const appliedCount = data.filter((n) => n.status === "Applied").length;

  const cardsData: MetricCardConfig[] = [
    {
      title: "OPEN CREDITS",
      value: formatAUD(openTotal),
      subtext: "📈 Draft + sent not yet applied",
      subtextVariant: "default",
    },
    {
      title: "APPLIED",
      value: appliedCount,
      subtext: "🎯 Allocated to invoices",
      subtextVariant: "success",
    },
    {
      title: "TOTAL CREDIT NOTES",
      value: data.length,
      subtext: crm.source === "api" ? "📋 Live CRM" : "📋 Tracked in system",
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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            crm.source === "api"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {crm.source === "api"
            ? "Live CRM"
            : crm.loading
              ? "Connecting…"
              : "Demo"}
        </span>
        {crm.error && crm.source === "demo" ? (
          <span className="text-[10px] text-slate-500">{crm.error}</span>
        ) : null}
      </div>
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
        paginationText={`Showing 1 to ${tableData.length} of ${data.length} entries`}
        onRowClick={(row) => router.push(`/finance/credit-notes/${row.id}`)}
      />
    </div>
  );
}
