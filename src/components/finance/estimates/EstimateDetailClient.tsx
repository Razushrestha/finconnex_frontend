"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
  Send,
  Check,
  X,
  Trash2,
  FileText,
  Copy,
  Download,
  Link2,
  Paperclip,
} from "lucide-react";
import {
  addCrmEstimateAttachment,
  deleteCrmEstimate,
  deleteCrmEstimateAttachment,
  downloadCrmEstimatePdf,
  getCrmEstimate,
  getCrmEstimatePublicLink,
  isCrmEstimateId,
  listCrmEstimateAttachments,
  persistRemoteEstimate,
  sendCrmEstimate,
  tryCrmEstimate,
  updateCrmEstimate,
} from "@/lib/finance/estimates/api";
import {
  appendEstimateAudit,
  deleteEstimate,
  formatFinanceAt,
  getEstimateById,
  upsertEstimate,
  type Estimate,
  type EstimateStatus,
} from "@/lib/finance/estimates/types";
import {
  appendQuotationAudit,
  nextQuotationIds,
  upsertQuotation,
} from "@/lib/finance/quotations/types";
import { ensureJourneyForQuote } from "@/lib/finance/journey/types";
import { formatAUD } from "@/lib/finance/shared";
import { ESTIMATE_STATUS_STYLE } from "@/lib/finance/statusStyles";
import { LineItemsEditor } from "@/components/finance/LineItemsEditor";
import { CommercialTrail } from "@/components/finance/CommercialTrail";
import { cn } from "@/lib/utils";
import { softDeleteRecord } from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";

export function EstimateDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [row, setRow] = useState<Estimate | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRow(getEstimateById(id) ?? null);
    setLoading(true);
    let cancelled = false;
    void (async () => {
      try {
        const remote = await getCrmEstimate(id);
        if (cancelled || !remote) return;
        persistRemoteEstimate(remote);
        const attachments = await tryCrmEstimate(() =>
          listCrmEstimateAttachments(id),
        );
        const next = attachments
          ? { ...remote, attachments }
          : { ...remote, attachments: remote.attachments ?? [] };
        persistRemoteEstimate(next);
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

  function save(next: Estimate, msg?: string) {
    upsertEstimate(next);
    setRow(next);
    if (msg) flash(msg);
  }

  function setStatus(status: EstimateStatus, action: string) {
    if (!row || row.status === "Converted") return;
    const next = appendEstimateAudit({ ...row, status }, action);
    if (status === "Sent") next.sentAt = formatFinanceAt();
    save(next, action);
    if (isCrmEstimateId(row.id) && status !== "Sent") {
      void tryCrmEstimate(() =>
        updateCrmEstimate(row.id, { status: status.toUpperCase() }),
      );
    }
  }

  async function onSend() {
    if (!row || busy) return;
    setBusy(true);
    try {
      const remote = isCrmEstimateId(row.id)
        ? await sendCrmEstimate(row.id)
        : null;
      const next = persistRemoteEstimate(remote) ?? {
        ...row,
        status: "Sent" as const,
        sentAt: formatFinanceAt(),
      };
      save(appendEstimateAudit(next, "Sent"), "Estimate sent");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPdf() {
    if (!row || busy || !isCrmEstimateId(row.id)) return;
    setBusy(true);
    try {
      const blob = await downloadCrmEstimatePdf(row.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.estimateId}.pdf`;
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
    if (!row || busy || !isCrmEstimateId(row.id)) return;
    setBusy(true);
    try {
      const link = await getCrmEstimatePublicLink(row.id);
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
    if (!row || busy || !isCrmEstimateId(row.id)) return;
    setBusy(true);
    try {
      const added = await addCrmEstimateAttachment(row.id, file);
      const attachments = added
        ? [...(row.attachments ?? []), added]
        : (await tryCrmEstimate(() => listCrmEstimateAttachments(row.id))) ??
          row.attachments ??
          [];
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
      if (isCrmEstimateId(row.id)) {
        await deleteCrmEstimateAttachment(row.id, attachmentId);
      }
      save(
        {
          ...row,
          attachments: (row.attachments ?? []).filter((a) => a.id !== attachmentId),
        },
        "Attachment removed",
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  function convertToQuotation() {
    if (!row) return;
    if (row.status !== "Accepted" && row.status !== "Sent") {
      flash("Accept (or send) the estimate before converting");
      return;
    }
    if (row.quotationId) {
      router.push(`/finance/quotations/${row.quotationId}`);
      return;
    }
    const ids = nextQuotationIds();
    const quo = upsertQuotation(
      appendQuotationAudit(
        {
          id: ids.id,
          quotationId: ids.quotationId,
          title: row.title.replace(/estimate/i, "quotation") || `${row.title} quotation`,
          status: "Draft",
          clientId: row.clientId,
          clientName: row.clientName,
          contactName: row.contactName,
          contactEmail: row.contactEmail,
          dealName: row.dealName,
          owner: row.owner,
          validUntil: row.validUntil,
          notes: row.notes,
          lineItems: row.lineItems.map((l) => ({ ...l, id: `qli-${l.id}` })),
          subtotal: row.subtotal,
          tax: row.tax,
          total: row.total,
          estimateId: row.id,
          estimateRef: row.estimateId,
          signatureStatus: "Not sent",
          createdBy: row.owner,
          createdAt: new Date().toLocaleDateString("en-AU"),
          audit: [],
        },
        "Created from estimate",
        row.owner,
      ),
    );
    ensureJourneyForQuote({
      quotationId: quo.id,
      clientId: quo.clientId,
      clientName: quo.clientName,
      contactName: quo.contactName,
      contactEmail: quo.contactEmail,
      dealName: quo.dealName,
      estimateId: row.id,
      status: "Quoted",
    });
    save(
      appendEstimateAudit(
        { ...row, status: "Converted", quotationId: quo.id },
        "Converted to quotation",
      ),
      "Converted to quotation",
    );
    router.push(`/finance/quotations/${quo.id}`);
  }

  if (loading && !row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading estimate…
      </div>
    );
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Estimate not found
      </div>
    );
  }

  const locked = row.status === "Converted";

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
              onClick={() => router.push("/finance/estimates")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
              {row.estimateId}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                ESTIMATE_STATUS_STYLE[row.status],
              )}
            >
              {row.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {!locked && row.status === "Draft" ? (
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
            {isCrmEstimateId(row.id) ? (
              <>
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
              </>
            ) : null}
            {!locked && (row.status === "Sent" || row.status === "Draft") ? (
              <>
                <button
                  type="button"
                  onClick={() => setStatus("Accepted", "Accepted")}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("Rejected", "Rejected")}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
              </>
            ) : null}
            {!locked && (row.status === "Accepted" || row.status === "Sent") ? (
              <button
                type="button"
                onClick={convertToQuotation}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700"
              >
                <Copy className="h-3.5 w-3.5" />
                Convert to quotation
              </button>
            ) : null}
            {row.quotationId ? (
              <Link
                href={`/finance/quotations/${row.quotationId}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
              >
                <FileText className="h-3.5 w-3.5" />
                Open quotation
              </Link>
            ) : null}
            {!locked ? (
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete ${row.estimateId}?`)) return;
                  const gate = softDeleteRecord({
                    action: "finance.estimates.delete",
                    module: "finance.estimates",
                    recordId: row.id,
                    recordLabel: row.estimateId,
                    recordType: "Estimate",
                    snapshot: row,
                  });
                  if (!gate.ok) {
                    window.alert(gate.message);
                    return;
                  }
                  deleteEstimate(row.id);
                  if (isCrmEstimateId(row.id)) {
                    void tryCrmEstimate(() => deleteCrmEstimate(row.id));
                  }
                  router.push("/finance/estimates");
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            ) : null}
          </div>
        </div>

        <CommercialTrail
          links={[
            { label: row.estimateId, current: true },
            ...(row.quotationId
              ? [
                  {
                    label: "Quotation",
                    href: `/finance/quotations/${row.quotationId}`,
                  },
                ]
              : []),
          ]}
        />

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-[16px] font-bold text-slate-900">{row.title}</h2>
            <p className="mt-1 text-[12px] text-slate-500">
              {row.clientName} · {row.contactName} · {row.contactEmail}
              {row.dealName ? ` · Deal: ${row.dealName}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
              <span>
                Owner: <strong className="text-slate-700">{row.owner}</strong>
              </span>
              <span>
                Valid until:{" "}
                <strong className="text-slate-700">{row.validUntil}</strong>
              </span>
              <span>
                Total:{" "}
                <strong className="text-slate-900">{formatAUD(row.total)}</strong>
              </span>
            </div>
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
            {row.notes ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                {row.notes}
              </p>
            ) : null}
          </div>

          <div className="px-5 py-4">
            <LineItemsEditor items={row.lineItems} onChange={() => {}} readOnly />
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[12px] font-bold tracking-wide text-slate-700 uppercase">
                Attachments
              </h3>
              {isCrmEstimateId(row.id) ? (
                <>
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
                </>
              ) : null}
            </div>
            {(row.attachments ?? []).length === 0 ? (
              <p className="text-[12px] text-slate-400">No attachments</p>
            ) : (
              <ul className="space-y-1.5">
                {(row.attachments ?? []).map((att) => (
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
              module="finance.estimates"
              recordId={row.id}
              localAudit={row.audit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
