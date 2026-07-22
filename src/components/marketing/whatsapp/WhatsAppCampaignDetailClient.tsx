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
  Trash2,
  ShieldCheck,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import {
  deleteWhatsAppCampaign,
  formatWaAt,
  getWhatsAppCampaignById,
  readRate,
  upsertWhatsAppCampaign,
  type WhatsAppCampaign,
  type WhatsAppCampaignStatus,
} from "@/lib/marketing/whatsapp/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<WhatsAppCampaignStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Scheduled: "bg-sky-50 text-sky-700",
  Running: "bg-amber-50 text-amber-800",
  Paused: "bg-violet-50 text-violet-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-rose-50 text-rose-700",
};

export function WhatsAppCampaignDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<WhatsAppCampaign | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCampaign(getWhatsAppCampaignById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: WhatsAppCampaign, msg?: string) {
    upsertWhatsAppCampaign(next);
    setCampaign(next);
    if (msg) flash(msg);
  }

  function appendAudit(c: WhatsAppCampaign, action: string) {
    return {
      ...c,
      audit: [
        ...c.audit,
        {
          id: `a-${Date.now()}`,
          at: formatWaAt(),
          action,
          actor: c.createdBy,
        },
      ],
    };
  }

  function submitForMeta() {
    if (!campaign) return;
    save(
      appendAudit(
        { ...campaign, templateApproval: "Pending Meta" },
        "Submitted for Meta Approval",
      ),
      "Submitted to Meta (mock)",
    );
  }

  function mockApprove() {
    if (!campaign) return;
    save(
      appendAudit(
        { ...campaign, templateApproval: "Approved" },
        "Meta Approved",
      ),
      "Template Approved",
    );
  }

  function launch() {
    if (!campaign) return;
    if (campaign.templateApproval !== "Approved") {
      flash("Cannot launch — template must be Meta Approved");
      return;
    }
    const n = 24;
    save(
      appendAudit(
        {
          ...campaign,
          status: "Running",
          sentCount: n,
          deliveredCount: Math.round(n * 0.95),
          readCount: Math.round(n * 0.72),
          failedCount: Math.max(1, Math.round(n * 0.05)),
          replyCount: Math.round(n * 0.18),
        },
        "Launched",
      ),
      "Launched",
    );
  }

  function setStatus(status: WhatsAppCampaignStatus, action: string) {
    if (!campaign) return;
    save(appendAudit({ ...campaign, status }, action), action);
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

  if (!campaign) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8">
        <MessageCircle className="mb-3 h-10 w-10 text-slate-300" />
        <p className="font-bold text-slate-900">Campaign not found</p>
        <Link
          href="/marketing/whatsapp"
          className="mt-3 text-[12px] font-semibold text-emerald-700"
        >
          Back
        </Link>
      </div>
    );
  }

  const canLaunch = campaign.templateApproval === "Approved";
  const metrics = [
    { label: "Sent", value: String(campaign.sentCount) },
    { label: "Delivered", value: String(campaign.deliveredCount) },
    {
      label: "Read",
      value: `${campaign.readCount} (${readRate(campaign)})`,
    },
    { label: "Failed", value: String(campaign.failedCount) },
    { label: "Replies", value: String(campaign.replyCount) },
  ];

  return (
    <div className="relative flex min-h-full flex-col bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_60%)]"
      />
      <div className="relative flex flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/marketing/whatsapp")}
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
            <Link href="/marketing/whatsapp" className="hover:text-slate-600">
              WhatsApp
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
            {(campaign.status === "Draft" ||
              campaign.status === "Scheduled") && (
              <button
                type="button"
                onClick={launch}
                disabled={!canLaunch}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white disabled:opacity-40"
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
                Template{" "}
                <span className="font-mono">{campaign.templateName}</span> ·{" "}
                {campaign.audience}
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

          {!canLaunch ? (
            <div className="flex gap-2 border-b border-amber-100 bg-amber-50/70 px-4 py-2.5 text-[12px] text-amber-900">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Launch is blocked until the WhatsApp template is{" "}
              <strong>Meta Approved</strong>. Current: {campaign.templateApproval}.
            </div>
          ) : null}

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
                Template preview
              </p>
              <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-[#e5ddd5] p-3 shadow-inner">
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  {campaign.templateHeader ? (
                    <p className="mb-1 text-[12px] font-bold text-slate-900">
                      {campaign.templateHeader}
                    </p>
                  ) : null}
                  <p className="text-[13px] leading-relaxed text-slate-800">
                    {campaign.templateBody}
                  </p>
                  {campaign.templateButtons?.length ? (
                    <div className="mt-3 space-y-1 border-t border-slate-100 pt-2">
                      {campaign.templateButtons.map((b) => (
                        <div
                          key={b}
                          className="rounded-md py-1.5 text-center text-[12px] font-semibold text-sky-600"
                        >
                          {b}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="bg-slate-50/70 p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Actions
              </p>
              <div className="space-y-2">
                {campaign.templateApproval === "Draft" ? (
                  <ActionBtn
                    onClick={submitForMeta}
                    icon={ShieldCheck}
                    label="Submit for Meta Approval"
                    tone="primary"
                  />
                ) : null}
                {campaign.templateApproval === "Pending Meta" ? (
                  <ActionBtn
                    onClick={mockApprove}
                    icon={ShieldCheck}
                    label="Simulate Meta Approve"
                    tone="success"
                  />
                ) : null}
                {campaign.status === "Draft" ? (
                  <ActionBtn onClick={schedule} icon={Calendar} label="Schedule" />
                ) : null}
                {(campaign.status === "Draft" ||
                  campaign.status === "Scheduled" ||
                  campaign.status === "Paused") && (
                  <ActionBtn
                    onClick={launch}
                    icon={Play}
                    label="Launch"
                    tone="primary"
                    disabled={!canLaunch}
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
                    deleteWhatsAppCampaign(campaign.id);
                    router.push("/marketing/whatsapp");
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
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
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
            </aside>
          </div>
        </div>
      </div>

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
  disabled,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  tone?: "primary" | "success" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-semibold disabled:opacity-40",
        tone === "primary"
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
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
