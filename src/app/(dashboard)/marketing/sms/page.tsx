"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import {
  SMS_CAMPAIGN_STATUSES,
  SMS_CAMPAIGN_TYPES,
  deliveryRate,
  listSmsCampaigns,
  smsCampaigns as seed,
  type SmsCampaign,
  type SmsCampaignStatus,
  type SmsCampaignType,
} from "@/lib/marketing/sms/types";
import { useCrmCampaigns } from "@/lib/campaigns/use-crm-campaigns";
import { CreateSmsCampaignForm } from "@/components/marketing/sms/CreateSmsCampaignForm";
import {
  CampaignHeader,
  MarketingListShell,
  StatusDropdown,
  FilterDropdown,
  DataTable,
  StatusBadge,
  AvatarInitials,
  type DataTableColumn,
} from "@/components/marketing/index";
import { SearchInput } from "@/components/ui/search-input";

const STATUS_STYLE: Record<SmsCampaignStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-sky-50 text-sky-700",
  Running: "bg-amber-50 text-amber-800",
  Paused: "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

const columns: DataTableColumn<SmsCampaign>[] = [
  {
    key: "name",
    header: "Campaign",
    className: "max-w-[220px]",
    render: (r) => (
      <>
        <p className="truncate text-[13px] font-semibold text-slate-900">
          {r.name}
        </p>
      </>
    ),
  },
  { key: "type", header: "Type", render: (r) => r.type },
  {
    key: "message",
    header: "Message",
    className: "max-w-[240px] truncate",
    render: (r) => r.message,
  },
  {
    key: "audience",
    header: "Audience",
    className: "max-w-[180px] truncate",
    render: (r) => r.audience,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => (
      <StatusBadge label={r.status} colorClassName={STATUS_STYLE[r.status]} />
    ),
  },
  {
    key: "sentCount",
    header: "Sent",
    className: "tabular-nums text-slate-600",
    render: (r) => r.sentCount.toLocaleString(),
  },
  {
    key: "delivered",
    header: "Delivered",
    className: "tabular-nums text-slate-500",
    render: (r) => (
      <>
        {deliveryRate(r)}
        <span className="text-slate-300"> · </span>
        {r.replyCount} replies
      </>
    ),
  },
  {
    key: "createdBy",
    header: "Created By",
    render: (r) => (
      <div className="flex items-center gap-2.5">
        <AvatarInitials name={r.createdBy} />
        {r.createdBy}
      </div>
    ),
  },
];

export default function SmsCampaignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<SmsCampaign[]>(seed);
  const [statusTab, setStatusTab] = useState<SmsCampaignStatus | "All">("All");
  const [typeFilter, setTypeFilter] = useState<SmsCampaignType | "All">("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get("create") === "1",
  );
  const pageSize = 8;
  const crm = useCrmCampaigns("sms");

  useEffect(() => {
    setRows(listSmsCampaigns());
  }, [crm.source, crm.loading, createOpen]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, typeFilter, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      SMS_CAMPAIGN_STATUSES.map((s) => [s, 0]),
    ) as Record<SmsCampaignStatus, number>;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (typeFilter !== "All") data = data.filter((r) => r.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.campaignId.toLowerCase().includes(q) ||
          r.message.toLowerCase().includes(q) ||
          r.audience.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function exportCsv() {
    const header = [
      "ID",
      "Name",
      "Type",
      "Status",
      "Audience",
      "Sent",
      "Delivered",
      "Failed",
      "Replies",
    ];
    const body = filtered.map((r) =>
      [
        r.campaignId,
        r.name,
        r.type,
        r.status,
        r.audience,
        r.sentCount,
        r.deliveredCount,
        r.failedCount,
        r.replyCount,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sms-campaigns.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <MarketingListShell>
      <CampaignHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Marketing" },
          { label: "SMS Campaigns" },
        ]}
        title="SMS Campaigns"
        totalCount={filtered.length}
        onExport={exportCsv}
        onCreate={() => setCreateOpen(true)}
        createLabel="New SMS"
      />
      <CreateSmsCampaignForm
        variant="modal"
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next);
          if (!next && searchParams.get("create") === "1") {
            router.replace("/marketing/sms");
          }
        }}
        onCreated={() => {
          setRows(listSmsCampaigns());
          crm.refresh();
        }}
      />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 py-2">
        <StatusDropdown
          statuses={SMS_CAMPAIGN_STATUSES}
          counts={counts}
          totalCount={rows.length}
          value={statusTab}
          onChange={setStatusTab}
        />
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} />
          <FilterDropdown
            options={SMS_CAMPAIGN_TYPES}
            value={typeFilter}
            onChange={setTypeFilter}
            allLabel="All types"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={paginated}
        getRowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/marketing/sms/${r.id}`)}
        page={safePage}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        emptyState={
          <>
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            No SMS campaigns match. Create one to reach your audience.
          </>
        }
      />
    </MarketingListShell>
  );
}
