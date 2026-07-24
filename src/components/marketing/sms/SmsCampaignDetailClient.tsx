"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Play,
  Pause,
  Calendar,
  X,
  Copy,
  Send,
  Trash2,
  Eye,
  MessageSquare,
} from "lucide-react";
import {
  deleteSmsCampaign,
  deliveryRate,
  formatSmsAt,
  getSmsCampaignById,
  nextSmsCampaignIds,
  upsertSmsCampaign,
  type SmsCampaign,
  type SmsCampaignStatus,
} from "@/lib/marketing/sms/types";
import {
  assertCampaignStatusChange,
  logStatusChange,
  softDeleteRecord,
} from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<SmsCampaignStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-sky-50 text-sky-700",
  Running: "bg-amber-50 text-amber-800",
  Paused: "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

export function SmsCampaignDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<SmsCampaign | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setCampaign(getSmsCampaignById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: SmsCampaign, msg?: string) {
    upsertSmsCampaign(next);
    setCampaign(next);
    if (msg) flash(msg);
  }

  function appendAudit(c: SmsCampaign, action: string) {
    return {
      ...c,
      audit: [
        ...c.audit,
        {
          id: `a-${Date.now()}`,
          at: formatSmsAt(),
          action,
          actor: c.createdBy,
        },
      ],
    };
  }

  function setStatus(status: SmsCampaignStatus, actionLabel: string) {
    if (!campaign) return;
    const gate = assertCampaignStatusChange(campaign.status, status);
    if (!gate.ok) {
      flash(gate.message);
      return;
    }
    const from = campaign.status;
    let next = appendAudit({ ...campaign, status }, actionLabel);
    if (status === "Running" && campaign.sentCount === 0) {
      const n = campaign.audience.includes("Deal") ? 8 : 40;
      next = {
        ...next,
        sentCount: n,
        deliveredCount: Math.round(n * 0.96),
        failedCount: Math.max(1, Math.round(n * 0.04)),
        replyCount: Math.round(n * 0.12),
      };
    }
    save(next, actionLabel);
    logStatusChange(
      "marketing.sms",
      campaign.createdBy,
      campaign.id,
      campaign.campaignId,
      from,
      status,
    );
  }

  function schedule() {
    if (!campaign) return;
    const when =
      campaign.scheduledAt ||
      new Date(Date.now() + 86400000).toLocaleString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    save(
      appendAudit(
        { ...campaign, status: "Scheduled", scheduledAt: when },
        "Scheduled",
      ),
      `Scheduled for ${when}`,
    );
  }

  function duplicate() {
    if (!campaign) return;
    const ids = nextSmsCampaignIds();
    const copy = upsertSmsCampaign({
      ...campaign,
      id: ids.id,
      campaignId: ids.campaignId,
      name: `${campaign.name} (copy)`,
      status: "Draft",
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      replyCount: 0,
      scheduledAt: undefined,
      createdAt: new Date().toLocaleDateString("en-AU"),
      audit: [
        {
          id: `a-${Date.now()}`,
          at: formatSmsAt(),
          action: "Duplicated",
          actor: campaign.createdBy,
        },
      ],
    });
    flash("Duplicated");
    router.push(`/marketing/sms/${copy.id}`);
  }

  if (!campaign) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8">
        <MessageSquare className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-bold text-slate-900">Campaign not found</p>
        <Link href="/marketing/sms" className="mt-3 text-[12px] font-semibold text-violet-700">
          Back
        </Link>
      </div>
    );
  }

  const metrics = [
    { label: "Sent", value: String(campaign.sentCount) },
    {
      label: "Delivered",
      value: `${campaign.deliveredCount} (${deliveryRate(campaign)})`,
    },
    { label: "Failed", value: String(campaign.failedCount) },
    { label: "Replies", value: String(campaign.replyCount) },
  ];

  return (
    <div className="relative flex min-h-full flex-col bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.09),_transparent_60%)]"
      />
      <div className="relative flex flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/marketing/sms")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <nav className="flex items-center gap-1 text-[10px] text-slate-400">
            <Link href="/" className="flex items-center gap-0.5 hover:text-slate-600">
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/marketing/sms" className="hover:text-slate-600">
              SMS Campaigns
            </Link>
            <span>/</span>
          </nav>
          <h1 className="text-[15px] font-bold text-slate-900">
            {campaign.campaignId}
          </h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              STATUS_STYLE[campaign.status],
            )}
          >
            {campaign.status}
          </span>
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            {(campaign.status === "Draft" || campaign.status === "Scheduled") && (
              <button
                type="button"
                onClick={() => setStatus("Running", "Launched")}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
              >
                <Play className="h-3.5 w-3.5" />
                Launch
              </button>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{campaign.name}</h2>
              <p className="mt-1 text-[12px] text-slate-500">
                {campaign.type} · {campaign.audience}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold",
                  avatarColor(campaign.createdBy),
                )}
              >
                {initials(campaign.createdBy)}
              </span>
              <div>
                <p className="text-[12px] font-semibold">{campaign.createdBy}</p>
                <p className="text-[10px] text-slate-400">Created by</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b border-slate-100 sm:grid-cols-4">
            {metrics.map((m) => (
              <div
                key={m.label}
                className="border-b border-slate-100 px-4 py-3 sm:border-r sm:border-b-0 sm:last:border-r-0"
              >
                <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  {m.label}
                </p>
                <p className="mt-0.5 text-[15px] font-bold tabular-nums text-slate-900">
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_280px]">
            <div className="border-b border-slate-100 p-4 lg:border-r lg:border-b-0 sm:p-5">
              <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Message
              </p>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-[13px] leading-relaxed text-slate-800">
                {campaign.message}
              </div>
              <p className="mt-2 text-right text-[10px] tabular-nums text-slate-400">
                {campaign.message.length}/160
              </p>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 px-3 py-2.5">
                  <dt className="text-[10px] font-semibold text-slate-400 uppercase">
                    Scheduled
                  </dt>
                  <dd className="mt-0.5 text-[13px] font-semibold">
                    {campaign.scheduledAt ?? ""}
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-100 px-3 py-2.5">
                  <dt className="text-[10px] font-semibold text-slate-400 uppercase">
                    Created
                  </dt>
                  <dd className="mt-0.5 text-[13px] font-semibold">
                    {campaign.createdAt}
                  </dd>
                </div>
              </dl>
            </div>

            <aside className="bg-slate-50/70 p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Actions
              </p>
              <div className="space-y-2">
                {campaign.status === "Draft" ? (
                  <ActionBtn onClick={schedule} icon={Calendar} label="Schedule" />
                ) : null}
                {(campaign.status === "Draft" ||
                  campaign.status === "Scheduled" ||
                  campaign.status === "Paused") && (
                  <ActionBtn
                    onClick={() => setStatus("Running", "Launched")}
                    icon={Play}
                    label="Launch"
                    tone="primary"
                  />
                )}
                {campaign.status === "Running" ? (
                  <>
                    <ActionBtn
                      onClick={() => setStatus("Paused", "Paused")}
                      icon={Pause}
                      label="Pause"
                    />
                    <ActionBtn
                      onClick={() => setStatus("Completed", "Completed")}
                      icon={Play}
                      label="Mark completed"
                      tone="success"
                    />
                  </>
                ) : null}
                {campaign.status === "Paused" ? (
                  <ActionBtn
                    onClick={() => setStatus("Running", "Resumed")}
                    icon={Play}
                    label="Resume"
                    tone="primary"
                  />
                ) : null}
                <ActionBtn
                  onClick={() => flash("Test SMS sent (mock)")}
                  icon={Send}
                  label="Test send"
                />
                <ActionBtn onClick={duplicate} icon={Copy} label="Duplicate" />
                {campaign.status !== "Completed" &&
                campaign.status !== "Cancelled" ? (
                  <ActionBtn
                    onClick={() => setStatus("Cancelled", "Cancelled")}
                    icon={X}
                    label="Cancel"
                    tone="danger"
                  />
                ) : null}
                <ActionBtn
                  onClick={() => {
                    if (!window.confirm("Delete campaign?")) return;
                    const gate = softDeleteRecord({
                      action: "marketing.sms.delete",
                      module: "marketing.sms",
                      recordId: campaign.id,
                      recordLabel: campaign.campaignId,
                      recordType: "SMS Campaign",
                      snapshot: campaign,
                    });
                    if (!gate.ok) {
                      window.alert(gate.message);
                      return;
                    }
                    deleteSmsCampaign(campaign.id);
                    router.push("/marketing/sms");
                  }}
                  icon={Trash2}
                  label="Delete"
                  tone="danger"
                />
              </div>

              <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Audit
              </p>
              <ol className="space-y-2.5">
                {campaign.audit.map((a) => (
                  <li key={a.id} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">
                        {a.action}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {a.at} · {a.actor}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4">
                <RecordAuditHistory
                  module="marketing.sms"
                  recordId={campaign.id}
                  localAudit={campaign.audit}
                />
              </div>
            </aside>
          </div>
        </div>
      </div>

      {showPreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-bold">SMS preview</p>
              <button type="button" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-3 py-2 text-[13px] text-white">
                {campaign.message}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  tone,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  tone?: "primary" | "success" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold",
        tone === "primary"
          ? "bg-violet-600 text-white hover:bg-violet-700"
          : tone === "success"
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : tone === "danger"
              ? "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              : "border border-slate-200 bg-white text-slate-700 hover:shadow-sm",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
