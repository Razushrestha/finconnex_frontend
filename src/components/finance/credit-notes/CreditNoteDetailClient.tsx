"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Link2,
  Paperclip,
  Send,
  Trash2,
} from "lucide-react";
import {
  addCrmCreditNoteAttachment,
  deleteCrmCreditNote,
  deleteCrmCreditNoteAttachment,
  downloadCrmCreditNotePdf,
  getCrmCreditNote,
  getCrmCreditNotePublicLink,
  listCrmCreditNoteAttachments,
  persistRemoteCreditNote,
  sendCrmCreditNote,
  tryCrmCreditNote,
  updateCrmCreditNote,
} from "@/lib/finance/credit-notes/api";
import {
  appendCreditNoteAudit,
  deleteCreditNote,
  getCreditNoteById,
  upsertCreditNote,
  type CreditNote,
} from "@/lib/finance/credit-notes/types";
import { formatAUD, formatFinanceAt } from "@/lib/finance/shared";
import { CREDIT_NOTE_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { LineItemsEditor } from "@/components/finance/LineItemsEditor";
import { CommercialTrail } from "@/components/finance/CommercialTrail";
import { cn } from "@/lib/utils";
import { softDeleteRecord } from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";

export function CreditNoteDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [row, setRow] = useState<CreditNote | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRow(getCreditNoteById(id) ?? null);
    setLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getCrmCreditNote(id);
        if (cancelled || !remote) return;
        persistRemoteCreditNote(remote);
        const attachments = await tryCrmCreditNote(() =>
          listCrmCreditNoteAttachments(id),
        );
        const next = attachments ? { ...remote, attachments } : remote;
        persistRemoteCreditNote(next);
        setRow(next);
      } catch {
        /* keep local overlay */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: CreditNote, msg?: string) {
    upsertCreditNote(next);
    setRow(next);
    if (msg) flash(msg);
  }

  async function onSend() {
    if (!row || busy) return;
    setBusy(true);
    try {
      const remote = await sendCrmCreditNote(row.id);
      const next = persistRemoteCreditNote(remote) ?? {
        ...row,
        status: "Sent" as const,
        sentAt: formatFinanceAt(),
      };
      save(appendCreditNoteAudit(next, "Sent"), "Credit note sent");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPdf() {
    if (!row || busy) return;
    setBusy(true);
    try {
      const blob = await downloadCrmCreditNotePdf(row.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.creditNoteId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      flash("PDF downloaded");
    } catch (err) {
      flash(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPublicLink() {
    if (!row || busy) return;
    setBusy(true);
    try {
      const link = await getCrmCreditNotePublicLink(row.id);
      if (!link?.url) {
        flash("No public link returned");
        return;
      }
      try {
        await navigator.clipboard.writeText(link.url);
      } catch {
        /* ignore */
      }
      save({ ...row, publicLink: link.url }, "Public link copied");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Public link failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAttach(file: File) {
    if (!row || busy) return;
    setBusy(true);
    try {
      const added = await addCrmCreditNoteAttachment(row.id, file);
      const attachments = added
        ? [...row.attachments, added]
        : (await tryCrmCreditNote(() => listCrmCreditNoteAttachments(row.id))) ??
          row.attachments;
      save({ ...row, attachments }, "Attachment uploaded");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveAttachment(attachmentId: string) {
    if (!row || busy) return;
    setBusy(true);
    try {
      await deleteCrmCreditNoteAttachment(row.id, attachmentId);
      save(
        {
          ...row,
          attachments: row.attachments.filter((a) => a.id !== attachmentId),
        },
        "Attachment removed",
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  async function onApply() {
    if (!row || busy) return;
    setBusy(true);
    try {
      const remote = await updateCrmCreditNote(row.id, { status: "APPLIED" });
      const next = persistRemoteCreditNote(remote) ?? {
        ...row,
        status: "Applied" as const,
      };
      save(appendCreditNoteAudit(next, "Applied"), "Marked applied");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading credit note…
      </div>
    );
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Credit note not found
      </div>
    );
  }

  const terminal = row.status === "Void" || row.status === "Cancelled";

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col p-3 sm:p-4 lg:px-6 2xl:px-8">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/finance/credit-notes")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
              {row.creditNoteId}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                CREDIT_NOTE_STATUS_STYLE[row.status],
              )}
            >
              {row.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {!terminal && row.status === "Draft" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSend()}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            ) : null}
            {!terminal && row.status === "Sent" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onApply()}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-800 disabled:opacity-50"
              >
                Mark applied
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void onPdf()}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onPublicLink()}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50"
            >
              <Link2 className="h-3.5 w-3.5" />
              Public link
            </button>
            {!terminal ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(`Delete ${row.creditNoteId}?`)) return;
                  const gate = softDeleteRecord({
                    action: "finance.credit-notes.delete",
                    module: "finance.credit-notes",
                    recordId: row.id,
                    recordLabel: row.creditNoteId,
                    recordType: "CreditNote",
                    snapshot: row,
                  });
                  if (!gate.ok) {
                    window.alert(gate.message);
                    return;
                  }
                  void (async () => {
                    setBusy(true);
                    try {
                      await deleteCrmCreditNote(row.id);
                      deleteCreditNote(row.id);
                      router.push("/finance/credit-notes");
                    } catch (err) {
                      flash(err instanceof Error ? err.message : "Delete failed");
                      setBusy(false);
                    }
                  })();
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : null}
          </div>
        </div>

        <CommercialTrail
          links={[
            ...(row.invoiceId
              ? [
                  {
                    label: row.invoiceRef ?? "Invoice",
                    href: `/finance/invoices/${row.invoiceId}`,
                  },
                ]
              : row.invoiceRef
                ? [{ label: row.invoiceRef, href: "/finance/invoices" }]
                : []),
            { label: row.creditNoteId, current: true },
          ]}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[16px] font-bold text-slate-900">{row.title}</h2>
            <p className="mt-1 text-[12px] text-slate-500">
              {row.clientName}
              {row.reason ? ` · ${row.reason}` : ""}
              {row.invoiceRef ? ` · ${row.invoiceRef}` : ""}
            </p>
            {row.publicLink ? (
              <a
                href={row.publicLink}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-[11px] text-violet-600"
              >
                {row.publicLink}
              </a>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Total
                </div>
                <div className="text-[14px] font-bold text-slate-900">
                  {formatAUD(row.total)}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Issued
                </div>
                <div className="text-[14px] font-bold text-slate-900">
                  {row.issueDate}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Owner
                </div>
                <div className="text-[14px] font-bold text-slate-900">
                  {row.owner}
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <LineItemsEditor items={row.lineItems} onChange={() => {}} readOnly />
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[12px] font-bold tracking-wide text-slate-700 uppercase">
                Attachments
              </h3>
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Add file
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void onAttach(file);
                }}
              />
            </div>
            {row.attachments.length === 0 ? (
              <p className="text-[12px] text-slate-400">No attachments</p>
            ) : (
              <ul className="space-y-1.5">
                {row.attachments.map((att) => (
                  <li
                    key={att.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-[12px]"
                  >
                    <span className="min-w-0 truncate text-slate-700">
                      {att.name}
                      {att.sizeLabel ? (
                        <span className="ml-1 text-slate-400">{att.sizeLabel}</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onRemoveAttachment(att.id)}
                      className="text-[11px] font-semibold text-rose-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <RecordAuditHistory
              module="finance.credit-notes"
              recordId={row.id}
              localAudit={row.audit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
