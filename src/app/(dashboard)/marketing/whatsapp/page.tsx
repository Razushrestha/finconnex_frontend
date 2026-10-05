"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import {
  WHATSAPP_CAMPAIGN_STATUSES,
  listWhatsAppCampaigns,
  readRate,
  whatsappCampaigns as seed,
  type WhatsAppCampaign,
  type WhatsAppCampaignStatus,
} from "@/lib/marketing/whatsapp/types";
import { useCrmCampaigns } from "@/lib/campaigns/use-crm-campaigns";
import { CreateWhatsAppCampaignForm } from "@/components/marketing/whatsapp/CreateWhatsAppCampaignForm";
import {
  CampaignHeader,
  MarketingListShell,
  StatusDropdown,
  DataTable,
  StatusBadge,
  AvatarInitials,
  type DataTableColumn,
} from "@/components/marketing/index";
import { SearchInput } from "@/components/ui/search-input";

const STATUS_STYLE: Record<WhatsAppCampaignStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-sky-50 text-sky-700",
  Running: "bg-amber-50 text-amber-800",
  Paused: "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

const APPROVAL_STYLE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  "Pending Meta": "bg-amber-50 text-amber-800",
  Approved: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-rose-50 text-rose-700",
};

const columns: DataTableColumn<WhatsAppCampaign>[] = [
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
  {
    key: "templateName",
    header: "Template",
    className: "font-mono text-[13px] text-slate-600",
    render: (r) => r.templateName,
  },
  {
    key: "templateApproval",
    header: "Approval",
    render: (r) => (
      <StatusBadge
        label={r.templateApproval}
        colorClassName={APPROVAL_STYLE[r.templateApproval]}
      />
    ),
  },
  {
    key: "audience",
    header: "Audience",
    className: "max-w-[180px] truncate text-slate-500",
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
    key: "sentRead",
    header: "Sent / Read",
    className: "tabular-nums text-slate-600",
    render: (r) => (
      <>
        {r.sentCount} / {r.readCount}
        <span className="text-slate-400"> ({readRate(r)})</span>
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

export default function WhatsAppCampaignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<WhatsAppCampaign[]>(seed);
  const [statusTab, setStatusTab] = useState<WhatsAppCampaignStatus | "All">(
    "All",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(
    () => searchParams.get("create") === "1",
  );
  const pageSize = 8;
  const crm = useCrmCampaigns("whatsapp");

  useEffect(() => {
    setRows(listWhatsAppCampaigns());
  }, [crm.source, crm.loading, createOpen]);

  useEffect(() => {
    if (searchParams.get("create") === "1") setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      WHATSAPP_CAMPAIGN_STATUSES.map((s) => [s, 0]),
    ) as Record<WhatsAppCampaignStatus, number>;
    for (const r of rows) map[r.status] += 1;
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (statusTab !== "All") data = data.filter((r) => r.status === statusTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.campaignId.toLowerCase().includes(q) ||
          r.templateName.toLowerCase().includes(q) ||
          r.audience.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusTab, search]);

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
      "Template",
      "Approval",
      "Status",
      "Sent",
      "Delivered",
      "Read",
      "Failed",
      "Replies",
    ];
    const body = filtered.map((r) =>
      [
        r.campaignId,
        r.name,
        r.templateName,
        r.templateApproval,
        r.status,
        r.sentCount,
        r.deliveredCount,
        r.readCount,
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
    a.download = "whatsapp-campaigns.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <MarketingListShell>
      <CampaignHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Marketing" },
          { label: "WhatsApp Campaigns" },
        ]}
        title="WhatsApp Campaigns"
        totalCount={filtered.length}
        onExport={exportCsv}
        onCreate={() => setCreateOpen(true)}
        createLabel="New campaign"
      />
      <CreateWhatsAppCampaignForm
        variant="modal"
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next);
          if (!next && searchParams.get("create") === "1") {
            router.replace("/marketing/whatsapp");
          }
        }}
        onCreated={() => {
          setRows(listWhatsAppCampaigns());
          crm.refresh();
        }}
      />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1 py-2">
        <StatusDropdown
          statuses={WHATSAPP_CAMPAIGN_STATUSES}
          counts={counts}
          totalCount={rows.length}
          value={statusTab}
          onChange={setStatusTab}
        />
        <SearchInput value={search} onChange={setSearch} />
      </div>

      <DataTable
        columns={columns}
        rows={paginated}
        getRowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/marketing/whatsapp/${r.id}`)}
        page={safePage}
        pageSize={pageSize}
        totalCount={filtered.length}
        onPageChange={setPage}
        emptyState={
          <>
            <MessageCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            No WhatsApp campaigns match.
          </>
        }
      />
    </MarketingListShell>
  );
}
