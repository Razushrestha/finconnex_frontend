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
  Mail,
} from "lucide-react";
import {
  clickRate,
  deleteEmailCampaign,
  formatCampaignAt,
  getEmailCampaignById,
  nextEmailCampaignIds,
  openRate,
  upsertEmailCampaign,
  type EmailCampaign,
  type EmailCampaignStatus,
} from "@/lib/marketing/email/types";
import { assertCampaignStatusChange, logStatusChange, softDeleteRecord } from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<EmailCampaignStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-sky-50 text-sky-700",
  Running: "bg-amber-50 text-amber-800",
  Paused: "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

export function EmailCampaignDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setCampaign(getEmailCampaignById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: EmailCampaign, msg?: string) {
    upsertEmailCampaign(next);
    setCampaign(next);
    if (msg) flash(msg);
  }

  function appendAudit(c: EmailCampaign, action: string) {
    return {
      ...c,
      audit: [
        ...c.audit,
        {
          id: `a-${Date.now()}`,
          at: formatCampaignAt(),
          action,
          actor: c.createdBy,
        },
      ],
    };
  }

  function setStatus(status: EmailCampaignStatus, actionLabel: string) {
    if (!campaign) return;
    const gate = assertCampaignStatusChange(campaign.status, status);
    if (!gate.ok) {
      flash(gate.message);
      return;
    }
    let next = appendAudit({ ...campaign, status }, actionLabel);
    if (status === "Running" && campaign.sentCount === 0) {
      const audienceSize =
        campaign.audience.includes("Deal") ? 3 : campaign.audience.includes("Pending") ? 56 : 120;
      next = {
        ...next,
        sentCount: audienceSize,
        openCount: Math.round(audienceSize * 0.38),
        clickCount: Math.round(audienceSize * 0.09),
        bounceCount: Math.max(1, Math.round(audienceSize * 0.01)),
        unsubscribeCount: Math.max(0, Math.round(audienceSize * 0.005)),
      };
    }
    if (status === "Completed") {
      /* keep metrics */
    }
    save(next, actionLabel);
    logStatusChange(
      "marketing.email",
      campaign.createdBy,
      campaign.id,
      campaign.campaignId,
      campaign.status,
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
    const ids = nextEmailCampaignIds();
    const copy = upsertEmailCampaign({
      ...campaign,
      id: ids.id,
      campaignId: ids.campaignId,
      name: `${campaign.name} (copy)`,
      status: "Draft",
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0,
      scheduledAt: undefined,
      createdAt: new Date().toLocaleDateString("en-AU"),
      audit: [
        {
          id: `a-${Date.now()}`,
          at: formatCampaignAt(),
          action: "Duplicated",
          actor: campaign.createdBy,
        },
      ],
    });
    flash("Duplicated");
    router.push(`/marketing/email/${copy.id}`);
  }

  function testSend() {
    flash(`Test send to ${campaign?.fromEmail}`);
  }

  function remove() {
    if (!campaign) return;
    if (!window.confirm(`Delete ${campaign.campaignId}?`)) return;
    const gate = softDeleteRecord({
      action: "marketing.email.delete",
      module: "marketing.email",
      recordId: campaign.id,
      recordLabel: campaign.campaignId,
      recordType: "Email Campaign",
      snapshot: campaign,
    });
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    deleteEmailCampaign(campaign.id);
    router.push("/marketing/email");
  }

  if (!campaign) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8">
        <Mail className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-bold text-slate-900">Campaign not found</p>
        <Link
          href="/marketing/email"
          className="mt-3 text-[12px] font-semibold text-violet-700"
        >
          Back
        </Link>
      </div>
    );
  }

  const metrics = [
    { label: "Sent", value: campaign.sentCount.toLocaleString() },
    { label: "Opens", value: `${campaign.openCount} (${openRate(campaign)})` },
    {
      label: "Clicks",
      value: `${campaign.clickCount} (${clickRate(campaign)})`,
    },
    { label: "Bounces", value: String(campaign.bounceCount) },
    { label: "Unsubscribes", value: String(campaign.unsubscribeCount) },
  ];

  return (
    <div className="relative flex min-h-full flex-col bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.09),_transparent_60%)]"
      />

      <div className="relative flex flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <button
            type="button"
            onClick={() => router.push("/marketing/email")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500"
            aria-label="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <nav className="flex items-center gap-1 text-[10px] text-slate-400">
            <Link href="/" className="flex items-center gap-0.5 hover:text-slate-600">
              <Home className="h-3 w-3" />
              Home
            </Link>
            <span>/</span>
            <Link href="/marketing/email" className="hover:text-slate-600">
              Email Campaigns
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
          <span className="hidden text-[11px] text-slate-400 sm:inline">·</span>
          <p className="hidden truncate text-[12px] font-medium text-slate-600 sm:block">
            {campaign.name}
          </p>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            {(campaign.status === "Draft" ||
              campaign.status === "Scheduled") && (
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
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {campaign.name}
              </h2>
              <p className="mt-1 text-[12px] text-slate-500">
                {campaign.type} · {campaign.templateName} · From{" "}
                {campaign.fromName} &lt;{campaign.fromEmail}&gt;
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
                <p className="text-[12px] font-semibold text-slate-800">
                  {campaign.createdBy}
                </p>
                <p className="text-[10px] text-slate-400">Created by</p>
              </div>
            </div>
          </div>

          {/* Analytics strip */}
          <div className="grid grid-cols-2 border-b border-slate-100 sm:grid-cols-5">
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
                Subject
              </p>
              <p className="text-[15px] font-semibold text-slate-900">
                {campaign.subject}
              </p>
              {campaign.previewText ? (
                <p className="mt-1 text-[12px] text-slate-500">
                  Preview: {campaign.previewText}
                </p>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Meta label="Audience" value={campaign.audience} />
                <Meta
                  label="Scheduled"
                  value={campaign.scheduledAt ?? "—"}
                />
                <Meta label="Template" value={campaign.templateName} />
                <Meta label="Created" value={campaign.createdAt} />
              </div>

              <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Body preview
                </p>
                <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-slate-700">
                  {campaign.body ?? "No body content."}
                </pre>
              </div>

              {/* Simple bar for open vs click */}
              {campaign.sentCount > 0 ? (
                <div className="mt-6">
                  <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Engagement
                  </p>
                  <div className="space-y-2">
                    <Bar
                      label="Open rate"
                      pct={Math.round(
                        (campaign.openCount / campaign.sentCount) * 100,
                      )}
                      color="bg-violet-500"
                    />
                    <Bar
                      label="Click rate"
                      pct={Math.round(
                        (campaign.clickCount / campaign.sentCount) * 100,
                      )}
                      color="bg-emerald-500"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="flex flex-col bg-slate-50/70 p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Actions
              </p>
              <div className="space-y-2">
                {campaign.status === "Draft" ? (
                  <ActionBtn
                    onClick={schedule}
                    icon={Calendar}
                    label="Schedule"
                  />
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
                <ActionBtn onClick={testSend} icon={Send} label="Test send" />
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
                  onClick={remove}
                  icon={Trash2}
                  label="Delete"
                  tone="danger"
                />
              </div>

              <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Audit
              </p>
              <ol className="space-y-0">
                {campaign.audit.map((a, i) => (
                  <li key={a.id} className="relative flex gap-3 pb-3 last:pb-0">
                    {i < campaign.audit.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute top-3 left-[5px] h-[calc(100%-4px)] w-px bg-slate-200"
                      />
                    ) : null}
                    <span className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-50" />
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
                  module="marketing.email"
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
          <div className="max-h-[90dvh] w-full max-w-lg overflow-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-[13px] font-bold text-slate-900">
                Email preview
              </p>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 border-b border-slate-100 px-4 py-3 text-[12px]">
              <p>
                <span className="text-slate-400">From:</span>{" "}
                {campaign.fromName} &lt;{campaign.fromEmail}&gt;
              </p>
              <p>
                <span className="text-slate-400">Subject:</span>{" "}
                <span className="font-semibold">{campaign.subject}</span>
              </p>
            </div>
            <pre className="whitespace-pre-wrap p-4 font-sans text-[13px] leading-relaxed text-slate-800">
              {campaign.body}
            </pre>
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Bar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold tabular-nums text-slate-800">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
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
        "flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold transition-all",
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
