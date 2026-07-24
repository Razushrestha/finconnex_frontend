"use client";

import { useEffect, useState, type ReactNode, type ElementType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Trash2,
  Play,
  Square,
  CheckCheck,
  XCircle,
  FileText,
  Send,
  Save,
} from "lucide-react";
import {
  DEFAULT_RATES,
  RELATED_RECORD_OPTIONS,
  TIME_STATUS_STYLE,
  TIME_USERS,
  amountFor,
  appendTimeAudit,
  approveTimeEntry,
  deleteTimeEntry,
  formatDuration,
  generateInvoiceFromTime,
  getTimeEntryById,
  relatedLabel,
  rejectTimeEntry,
  setBillable,
  startTimer,
  stopTimer,
  submitTimeEntry,
  upsertTimeEntry,
  type TimeEntry,
} from "@/lib/time-tracking/types";
import { formatAUD } from "@/lib/finance/shared";
import { cn } from "@/lib/utils";
import {
  fieldDiff,
  logEdit,
  softDeleteRecord,
  stripSystemFields,
} from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";

export function TimeEntryDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<TimeEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("0");
  const [rate, setRate] = useState("0");
  const [relatedIdx, setRelatedIdx] = useState(0);

  useEffect(() => {
    const e = getTimeEntryById(id) ?? null;
    setRow(e);
    if (e) hydrate(e);
  }, [id]);

  function hydrate(e: TimeEntry) {
    setDescription(e.description);
    setHours(String(e.durationHours));
    setRate(String(e.rate));
    const idx = RELATED_RECORD_OPTIONS.findIndex(
      (r) => r.kind === e.relatedTo.kind && r.name === e.relatedTo.name,
    );
    setRelatedIdx(idx >= 0 ? idx : 0);
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function reload() {
    const e = getTimeEntryById(id) ?? null;
    setRow(e);
    if (e) hydrate(e);
  }

  function persist(next: TimeEntry, msg?: string) {
    upsertTimeEntry(next);
    setRow(next);
    hydrate(next);
    if (msg) flash(msg);
  }

  function onSave() {
    if (!row) return;
    if (row.status === "Invoiced" || row.status === "Running") return;
    const durationHours = Math.max(0, Number(hours) || 0);
    const related = RELATED_RECORD_OPTIONS[relatedIdx];
    const patch = stripSystemFields({
      description: description.trim() || row.description,
      durationHours,
      rate: Number(rate) || row.rate,
      relatedTo: { ...related },
    });
    const next = appendTimeAudit(
      { ...row, ...patch },
      "Entry updated",
      row.user,
    );
    const changes = fieldDiff(
      row as unknown as Record<string, unknown>,
      next as unknown as Record<string, unknown>,
      ["description", "durationHours", "rate", "relatedTo"],
    );
    logEdit(
      "time-tracking",
      row.user,
      row.id,
      row.entryId,
      changes,
    );
    persist(next, "Saved");
  }

  function onStart() {
    if (!row) return;
    const created = startTimer({
      user: row.user,
      relatedTo: row.relatedTo,
      description: row.description,
      billable: row.billable,
      rate: row.rate,
    });
    flash(`Timer started · ${created.entryId}`);
    router.push(`/time-tracking/${created.id}`);
  }

  function onStop() {
    if (!row) return;
    stopTimer(row.id, row.user);
    reload();
    flash("Timer stopped");
  }

  function onToggleBillable() {
    if (!row || row.status === "Invoiced") return;
    setBillable(row.id, !row.billable, row.user);
    reload();
    flash(!row.billable ? "Marked billable" : "Marked non-billable");
  }

  function onSubmit() {
    if (!row) return;
    submitTimeEntry(row.id, row.user);
    reload();
    flash("Submitted for approval");
  }

  function onApprove() {
    if (!row) return;
    approveTimeEntry(row.id, "John Smith");
    reload();
    flash("Approved");
  }

  function onReject() {
    if (!row) return;
    rejectTimeEntry(row.id, "John Smith");
    reload();
    flash("Rejected");
  }

  function onInvoice() {
    if (!row) return;
    const result = generateInvoiceFromTime([row.id], row.user);
    if ("error" in result) {
      flash(result.error);
      return;
    }
    flash(`Invoice ${result.invoice.invoiceId} created`);
    router.push(`/finance/invoices/${result.invoice.id}`);
  }

  function onDelete() {
    if (!row) return;
    if (row.status === "Invoiced") {
      flash("Cannot delete invoiced entry");
      return;
    }
    if (!window.confirm(`Delete ${row.entryId}?`)) return;
    const gate = softDeleteRecord({
      action: "time-tracking.delete",
      module: "time-tracking",
      recordId: row.id,
      recordLabel: row.entryId,
      recordType: "Time Entry",
      snapshot: row,
    });
    if (!gate.ok) {
      flash(gate.message);
      return;
    }
    deleteTimeEntry(row.id);
    router.push("/time-tracking");
  }

  if (!row) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 text-[13px] text-slate-500">
        Time entry not found.{" "}
        <Link href="/time-tracking" className="ml-1 text-violet-600 underline">
          Back to list
        </Link>
      </div>
    );
  }

  const locked = row.status === "Invoiced" || row.status === "Running";

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto max-w-4xl p-2.5 sm:p-3 lg:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <nav className="mb-1 flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <Link href="/time-tracking" className="hover:text-slate-600">
                Time Tracking
              </Link>
              <span>/</span>
              <span className="text-slate-600">{row.entryId}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
                {row.entryId}
              </h1>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  TIME_STATUS_STYLE[row.status],
                )}
              >
                {row.status}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  row.billable
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {row.billable ? "Billable" : "Non-billable"}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {relatedLabel(row.relatedTo)} · {row.user} · {row.date}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/time-tracking")}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {row.status === "Running" ? (
            <ActionBtn onClick={onStop} tone="rose" icon={Square}>
              Stop timer
            </ActionBtn>
          ) : (
            <ActionBtn onClick={onStart} tone="emerald" icon={Play}>
              Start timer
            </ActionBtn>
          )}
          <ActionBtn onClick={onToggleBillable} disabled={row.status === "Invoiced"}>
            Mark {row.billable ? "non-billable" : "billable"}
          </ActionBtn>
          {(row.status === "Logged" ||
            row.status === "Draft" ||
            row.status === "Rejected") && (
            <ActionBtn onClick={onSubmit} icon={Send}>
              Submit
            </ActionBtn>
          )}
          {(row.status === "Submitted" || row.status === "Logged") && (
            <ActionBtn onClick={onApprove} tone="violet" icon={CheckCheck}>
              Approve
            </ActionBtn>
          )}
          {row.status === "Submitted" && (
            <ActionBtn onClick={onReject} tone="rose" icon={XCircle}>
              Reject
            </ActionBtn>
          )}
          {row.status === "Approved" && row.billable && (
            <ActionBtn onClick={onInvoice} tone="violet" icon={FileText}>
              Generate invoice
            </ActionBtn>
          )}
          {!locked && (
            <ActionBtn onClick={onSave} icon={Save}>
              Save
            </ActionBtn>
          )}
          {row.status !== "Invoiced" && (
            <ActionBtn onClick={onDelete} tone="rose" icon={Trash2}>
              Delete
            </ActionBtn>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="space-y-3">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Details
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[11px] font-semibold text-slate-600">
                  Related to
                  <select
                    disabled={locked}
                    value={relatedIdx}
                    onChange={(e) => setRelatedIdx(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[12px] disabled:opacity-60"
                  >
                    {RELATED_RECORD_OPTIONS.map((r, i) => (
                      <option key={`${r.kind}-${r.name}`} value={i}>
                        {relatedLabel(r)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  User
                  <select
                    disabled
                    value={row.user}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[12px] opacity-70"
                  >
                    {TIME_USERS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Duration (hours)
                  <input
                    disabled={locked}
                    type="number"
                    min={0}
                    step={0.25}
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[12px] disabled:opacity-60"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600">
                  Rate (AUD / h)
                  <input
                    disabled={locked || !row.billable}
                    type="number"
                    min={0}
                    step={10}
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-[12px] disabled:opacity-60"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-600 sm:col-span-2">
                  Description
                  <textarea
                    disabled={locked}
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-[12px] disabled:opacity-60"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Activity
              </h2>
              <ul className="space-y-2">
                {[...row.audit].reverse().map((a) => (
                  <li
                    key={a.id}
                    className="flex gap-2 border-b border-slate-50 pb-2 text-[12px] last:border-0"
                  >
                    <span className="shrink-0 text-slate-400">{a.at}</span>
                    <span className="font-medium text-slate-800">{a.action}</span>
                    <span className="text-slate-400">· {a.actor}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Summary
              </h2>
              <dl className="space-y-2 text-[12px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Duration</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatDuration(row.durationHours)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Rate</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatAUD(row.rate)}/h
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Amount</dt>
                  <dd className="font-semibold text-violet-700">
                    {row.billable ? formatAUD(amountFor(row)) : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Default rate</dt>
                  <dd className="text-slate-600">
                    {formatAUD(DEFAULT_RATES[row.user] ?? 200)}/h
                  </dd>
                </div>
                {row.invoiceRef && (
                  <div className="flex justify-between gap-2 border-t border-slate-100 pt-2">
                    <dt className="text-slate-500">Invoice</dt>
                    <dd>
                      <Link
                        href={`/finance/invoices/${row.invoiceId}`}
                        className="font-semibold text-violet-700 hover:underline"
                      >
                        {row.invoiceRef}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </aside>
        </div>

        <div className="mt-3">
          <RecordAuditHistory
            module="time-tracking"
            recordId={row.id}
            localAudit={row.audit}
          />
        </div>
      </div>

      {toast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  icon: Icon,
  tone = "slate",
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: ElementType;
  tone?: "slate" | "violet" | "emerald" | "rose";
  disabled?: boolean;
}) {
  const tones = {
    slate:
      "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    violet:
      "border-violet-200 bg-violet-600 text-white hover:bg-violet-700",
    emerald:
      "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700",
    rose: "border-rose-200 bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold disabled:opacity-40",
        tones[tone],
      )}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}
