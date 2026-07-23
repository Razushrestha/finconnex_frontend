"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Trash2,
  User,
  Flag,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquare,
  Lock,
  Send,
  AlertTriangle,
  Merge,
  Star,
} from "lucide-react";
import {
  SUPPORT_AGENTS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_STYLE,
  TICKET_STATUSES,
  TICKET_STATUS_STYLE,
  appendTicketAudit,
  deleteTicket,
  formatTicketAt,
  getTicketById,
  listTickets,
  upsertTicket,
  type SupportTicket,
  type TicketCategory,
  type TicketNoteKind,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support/types";
import {
  assertTicketStatusChange,
  getRulesActor,
  logStatusChange,
  notifyOwnerAssigned,
  notifyStatusChanged,
  notifyTicketUpdated,
  softDeleteRecord,
} from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";
import { cn } from "@/lib/utils";
import {
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

export function TicketDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<SupportTicket | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState<TicketNoteKind>("internal");
  const [mergeTarget, setMergeTarget] = useState("");
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [showMerge, setShowMerge] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);

  useEffect(() => {
    setRow(getTicketById(id) ?? null);
  }, [id]);

  const mergeCandidates = useMemo(() => {
    if (!row) return [];
    return listTickets().filter(
      (t) =>
        t.id !== row.id &&
        !t.mergedIntoId &&
        t.status !== "Closed" &&
        t.status !== "Resolved",
    );
  }, [row]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: SupportTicket, msg?: string) {
    upsertTicket(next);
    setRow(next);
    if (msg) flash(msg);
  }

  function actor() {
    return getRulesActor().name || row?.assignedTo || row?.createdBy || SUPPORT_AGENTS[0];
  }

  function setStatus(status: TicketStatus, actionLabel?: string) {
    if (!row) return;
    const from = row.status;
    const gate = assertTicketStatusChange(from, status);
    if (!gate.ok) {
      flash(gate.message);
      return;
    }
    let next: SupportTicket = {
      ...row,
      status,
    };
    if (status === "Resolved") {
      next.resolvedAt = formatTicketAt();
    }
    if (status === "Closed") {
      next.closedAt = formatTicketAt();
      if (!next.resolvedAt) next.resolvedAt = formatTicketAt();
    }
    if (status === "Reopened") {
      next.closedAt = undefined;
      next.resolvedAt = undefined;
    }
    next = appendTicketAudit(
      next,
      actionLabel ?? `Status → ${status}`,
      actor(),
    );
    save(next, actionLabel ?? `Status → ${status}`);
    logStatusChange(
      "support.tickets",
      actor(),
      row.id,
      row.ticketId,
      from,
      status,
    );
    notifyStatusChanged({
      recipient: row.assignedTo || actor(),
      entityLabel: row.ticketId,
      from,
      to: status,
      relatedTo: row.ticketId,
      relatedHref: `/support/${row.id}`,
    });
    notifyTicketUpdated({
      requester: row.requester,
      ticketRef: row.ticketId,
      summary: actionLabel ?? `Status → ${status}`,
      relatedHref: `/support/${row.id}`,
    });
  }

  function setPriority(priority: TicketPriority) {
    if (!row) return;
    save(
      appendTicketAudit(
        { ...row, priority },
        `Priority → ${priority}`,
        actor(),
      ),
      `Priority → ${priority}`,
    );
  }

  function setAssignee(assignedTo: string) {
    if (!row) return;
    let next: SupportTicket = {
      ...row,
      assignedTo: assignedTo || undefined,
    };
    next = appendTicketAudit(
      next,
      assignedTo ? `Assigned to ${assignedTo}` : "Unassigned",
      actor(),
    );
    if (assignedTo && next.status === "New") {
      next = appendTicketAudit(
        { ...next, status: "Open" },
        "Status → Open",
        actor(),
      );
    }
    save(next, assignedTo ? `Assigned to ${assignedTo}` : "Unassigned");
    if (assignedTo) {
      notifyOwnerAssigned({
        owner: assignedTo,
        entityLabel: `Ticket ${row.ticketId}`,
        relatedTo: row.ticketId,
        relatedHref: `/support/${row.id}`,
      });
    }
  }

  function setCategory(category: TicketCategory | "") {
    if (!row) return;
    save(
      appendTicketAudit(
        { ...row, category: category || undefined },
        category ? `Category → ${category}` : "Category cleared",
        actor(),
      ),
    );
  }

  function addNote() {
    if (!row || !noteBody.trim()) {
      flash("Enter a note");
      return;
    }
    const note = {
      id: `n-${Date.now()}`,
      kind: noteKind,
      body: noteBody.trim(),
      at: formatTicketAt(),
      actor: actor(),
    };
    const next = appendTicketAudit(
      {
        ...row,
        notes: [...row.notes, note],
      },
      noteKind === "internal" ? "Internal note added" : "Public reply added",
      actor(),
    );
    save(next, noteKind === "internal" ? "Internal note added" : "Reply sent");
    setNoteBody("");
  }

  function escalate() {
    if (!row) return;
    save(
      appendTicketAudit(
        {
          ...row,
          priority: "Critical",
          escalatedAt: formatTicketAt(),
        },
        "Escalated → Critical",
        actor(),
      ),
      "Escalated to Critical",
    );
  }

  function mergeInto() {
    if (!row || !mergeTarget) {
      flash("Select a target ticket");
      return;
    }
    const target = getTicketById(mergeTarget);
    if (!target) {
      flash("Target not found");
      return;
    }
    const closed = appendTicketAudit(
      {
        ...row,
        status: "Closed",
        closedAt: formatTicketAt(),
        mergedIntoId: target.id,
        mergedIntoRef: target.ticketId,
      },
      `Merged into ${target.ticketId}`,
      actor(),
    );
    upsertTicket(closed);
    const targetNext = appendTicketAudit(
      {
        ...target,
        notes: [
          ...target.notes,
          {
            id: `n-merge-${Date.now()}`,
            kind: "internal" as const,
            body: `Merged ticket ${row.ticketId}: ${row.subject}\n\n${row.description}`,
            at: formatTicketAt(),
            actor: actor(),
          },
        ],
      },
      `Merged ${row.ticketId} into this ticket`,
      actor(),
    );
    upsertTicket(targetNext);
    setShowMerge(false);
    flash(`Merged into ${target.ticketId}`);
    router.push(`/support/${target.id}`);
  }

  function sendSurvey() {
    if (!row) return;
    if (row.status !== "Resolved" && row.status !== "Closed") {
      flash("Resolve or close before sending survey");
      return;
    }
    save(
      appendTicketAudit(
        { ...row, surveySentAt: formatTicketAt() },
        "Satisfaction survey sent",
        actor(),
      ),
      "Survey sent (mock)",
    );
    setShowSurvey(true);
  }

  function submitRating() {
    if (!row) return;
    save(
      appendTicketAudit(
        {
          ...row,
          satisfactionRating: rating,
          satisfactionComment: ratingComment.trim() || undefined,
          surveySentAt: row.surveySentAt ?? formatTicketAt(),
        },
        `Satisfaction rating ${rating}/5`,
        row.requester,
      ),
      `Rating saved ${rating}/5`,
    );
    setShowSurvey(false);
    setRatingComment("");
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Ticket not found
      </div>
    );
  }

  const isMerged = !!row.mergedIntoId;
  const canReopen = row.status === "Closed" || row.status === "Resolved";
  const timeline = [
    ...row.notes.map((n) => ({
      sort: n.at,
      key: n.id,
      type: "note" as const,
      note: n,
    })),
    ...row.audit.map((a) => ({
      sort: a.at,
      key: a.id,
      type: "audit" as const,
      audit: a,
    })),
  ].sort((a, b) => a.sort.localeCompare(b.sort));

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-[1100px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/support")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <Link href="/support" className="hover:text-slate-600">
                Support
              </Link>
              <span>/</span>
            </nav>
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
              {row.ticketId}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                TICKET_STATUS_STYLE[row.status],
              )}
            >
              {row.status}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                TICKET_PRIORITY_STYLE[row.priority],
              )}
            >
              {row.priority}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {!isMerged && row.status !== "Closed" ? (
              <>
                <button
                  type="button"
                  onClick={() => setStatus("Resolved")}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("Closed")}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Close
                </button>
              </>
            ) : null}
            {canReopen && !isMerged ? (
              <button
                type="button"
                onClick={() => setStatus("Reopened")}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reopen
              </button>
            ) : null}
            {!isMerged ? (
              <>
                <button
                  type="button"
                  onClick={escalate}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 text-[11px] font-semibold text-orange-800"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Escalate
                </button>
                <button
                  type="button"
                  onClick={() => setShowMerge((v) => !v)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
                >
                  <Merge className="h-3.5 w-3.5" />
                  Merge
                </button>
                <button
                  type="button"
                  onClick={sendSurvey}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-800"
                >
                  <Star className="h-3.5 w-3.5" />
                  Survey
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const gate = softDeleteRecord({
                  action: "support.tickets.delete",
                  module: "support.tickets",
                  recordId: row.id,
                  recordLabel: row.ticketId,
                  recordType: "Ticket",
                  snapshot: row,
                });
                if (!gate.ok) {
                  window.alert(gate.message);
                  return;
                }
                deleteTicket(row.id);
                router.push("/support");
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        {isMerged ? (
          <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-[12px] text-violet-800">
            Merged into{" "}
            <Link
              href={`/support/${row.mergedIntoId}`}
              className="font-semibold underline"
            >
              {row.mergedIntoRef}
            </Link>
          </div>
        ) : null}

        {showMerge ? (
          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                Merge into
              </label>
              <select
                className={cn(elevatedSelectClass(false), "h-9")}
                value={mergeTarget}
                onChange={(e) => setMergeTarget(e.target.value)}
              >
                <option value="">Select target ticket…</option>
                {mergeCandidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ticketId} · {t.subject}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={mergeInto}
              className="h-9 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
            >
              Confirm merge
            </button>
            <button
              type="button"
              onClick={() => setShowMerge(false)}
              className="h-9 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[16px] font-bold text-slate-900">{row.subject}</h2>
            <p className="mt-2 whitespace-pre-wrap text-[13px] text-slate-600">
              {row.description}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  <User className="h-3 w-3" />
                  Assigned to
                </label>
                <select
                  className={cn(elevatedSelectClass(false), "h-9 text-[12px]")}
                  value={row.assignedTo ?? ""}
                  disabled={isMerged}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {SUPPORT_AGENTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  <Flag className="h-3 w-3" />
                  Priority
                </label>
                <select
                  className={cn(elevatedSelectClass(false), "h-9 text-[12px]")}
                  value={row.priority}
                  disabled={isMerged}
                  onChange={(e) =>
                    setPriority(e.target.value as TicketPriority)
                  }
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Status
                </label>
                <select
                  className={cn(elevatedSelectClass(false), "h-9 text-[12px]")}
                  value={row.status}
                  disabled={isMerged}
                  onChange={(e) => setStatus(e.target.value as TicketStatus)}
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Category
                </label>
                <select
                  className={cn(elevatedSelectClass(false), "h-9 text-[12px]")}
                  value={row.category ?? ""}
                  disabled={isMerged}
                  onChange={(e) =>
                    setCategory(e.target.value as TicketCategory | "")
                  }
                >
                  <option value="">— None —</option>
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              <span>
                Requester:{" "}
                <strong className="text-slate-700">{row.requester}</strong>
              </span>
              {row.relatedAccount ? (
                <span>
                  Account:{" "}
                  <strong className="text-slate-700">{row.relatedAccount}</strong>
                </span>
              ) : null}
              <span>
                Created:{" "}
                <strong className="text-slate-700">{row.createdAt}</strong>
              </span>
              {row.resolvedAt ? (
                <span>
                  Resolved:{" "}
                  <strong className="text-slate-700">{row.resolvedAt}</strong>
                </span>
              ) : null}
              {row.closedAt ? (
                <span>
                  Closed:{" "}
                  <strong className="text-slate-700">{row.closedAt}</strong>
                </span>
              ) : null}
            </div>
            {row.satisfactionRating ? (
              <div className="mt-3 rounded-xl bg-amber-50/80 px-3 py-2 text-[12px] text-amber-900">
                <span className="font-semibold">
                  CSAT {row.satisfactionRating}/5
                </span>
                {row.satisfactionComment
                  ? ` — “${row.satisfactionComment}”`
                  : null}
              </div>
            ) : null}
          </div>

          {(showSurvey ||
            (row.surveySentAt && !row.satisfactionRating)) &&
          !isMerged ? (
            <div className="border-b border-slate-100 bg-amber-50/40 px-5 py-4">
              <h3 className="mb-2 text-[11px] font-bold tracking-wide text-amber-800 uppercase">
                Satisfaction survey (mock response)
              </h3>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                    Rating
                  </label>
                  <select
                    className={cn(elevatedSelectClass(false), "h-9 w-24")}
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-[10px] font-semibold text-slate-500">
                    Comment
                  </label>
                  <input
                    className={cn(elevatedInputClass(false), "h-9")}
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Optional feedback"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitRating}
                  className="h-9 rounded-lg bg-amber-600 px-3 text-[11px] font-semibold text-white"
                >
                  Submit rating
                </button>
              </div>
            </div>
          ) : null}

          {!isMerged ? (
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="mb-2 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                Add note / reply
              </h3>
              <div className="mb-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setNoteKind("internal")}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold",
                    noteKind === "internal"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  <Lock className="h-3 w-3" />
                  Internal
                </button>
                <button
                  type="button"
                  onClick={() => setNoteKind("public")}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold",
                    noteKind === "public"
                      ? "bg-violet-600 text-white"
                      : "bg-violet-50 text-violet-700",
                  )}
                >
                  <MessageSquare className="h-3 w-3" />
                  Public reply
                </button>
              </div>
              <textarea
                className={cn(elevatedTextareaClass, "min-h-[80px] border border-slate-200 px-3 py-2")}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder={
                  noteKind === "internal"
                    ? "Internal note (agents only)…"
                    : "Public reply to requester…"
                }
              />
              <button
                type="button"
                onClick={addNote}
                className="mt-2 inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
              >
                <Send className="h-3.5 w-3.5" />
                {noteKind === "internal" ? "Add note" : "Send reply"}
              </button>
            </div>
          ) : null}

          <div className="px-5 py-4">
            <h3 className="mb-3 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
              History
            </h3>
            <ul className="space-y-3">
              {timeline.length === 0 ? (
                <li className="text-[12px] text-slate-400">No history yet</li>
              ) : (
                timeline.map((item) =>
                  item.type === "note" ? (
                    <li
                      key={item.key}
                      className={cn(
                        "rounded-xl border px-3 py-2.5",
                        item.note.kind === "internal"
                          ? "border-slate-200 bg-slate-50"
                          : "border-violet-100 bg-violet-50/50",
                      )}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase">
                        {item.note.kind === "internal" ? (
                          <span className="inline-flex items-center gap-0.5 text-slate-500">
                            <Lock className="h-2.5 w-2.5" />
                            Internal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-violet-600">
                            <MessageSquare className="h-2.5 w-2.5" />
                            Public
                          </span>
                        )}
                        <span className="font-normal normal-case text-slate-400">
                          {item.note.actor} · {item.note.at}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-[12px] text-slate-700">
                        {item.note.body}
                      </p>
                    </li>
                  ) : (
                    <li key={item.key} className="text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700">
                        {item.audit.action}
                      </span>
                      {" · "}
                      {item.audit.actor} · {item.audit.at}
                    </li>
                  ),
                )
              )}
            </ul>
          </div>

          <RecordAuditHistory
            module="support.tickets"
            recordId={row.id}
            localAudit={row.audit}
          />
        </div>
      </div>
    </div>
  );
}
