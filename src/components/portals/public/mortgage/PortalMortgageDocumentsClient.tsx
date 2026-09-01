"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  Gift,
  Headphones,
  Landmark,
  Lock,
  Plus,
  Receipt,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { useMortgagePortal } from "@/components/portals/public/mortgage/useMortgagePortal";
import {
  canReplaceDocument,
  documentDescription,
  documentFiles,
  docsProgress,
  factFindProgress,
  formatFileSize,
  formatPortalStamp,
  normalizeDocStatus,
  type MortgageDocStatus,
  type MortgageDocument,
  type MortgageDocumentFile,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "documents", n: 1, title: "Documents", blurb: "Upload required documents" },
  { id: "fact-find", n: 2, title: "Fact Find", blurb: "Complete your information" },
] as const;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 8;

function completionRank(status: MortgageDocStatus) {
  if (status === "rejected") return 0;
  if (status === "pending") return 1;
  return 2;
}

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    name.endsWith(".pdf") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png")
  );
}

export function PortalMortgageDocumentsClient({ slug }: { slug: string }) {
  const { portal, mortgage, update, logActivity, canWrite, isReadOnly } =
    useMortgagePortal(slug);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [viewing, setViewing] = useState<MortgageDocument | null>(null);
  const [reasonDoc, setReasonDoc] = useState<MortgageDocument | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [panel, setPanel] = useState<"complete" | "approved">("complete");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mortgage) return;
    if (!mortgage.notifications.some((n) => n.href === "documents" && !n.read)) return;
    update((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.href === "documents" ? { ...n, read: true } : n,
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mortgage?.notifications.length]);

  const progress = docsProgress(mortgage?.documents ?? []);
  const ff = factFindProgress(mortgage?.factFind ?? {});
  const uploadedPct = progress.total
    ? Math.round((progress.received / progress.total) * 100)
    : 0;
  const overall = Math.round((uploadedPct + ff.percent) / 2);

  const toComplete = useMemo(() => {
    return (mortgage?.documents ?? [])
      .filter((d) => normalizeDocStatus(d.status) !== "accepted")
      .sort((a, b) => {
        const na = Number(Boolean(a.notApplicable)) - Number(Boolean(b.notApplicable));
        if (na !== 0) return na;
        return (
          completionRank(normalizeDocStatus(a.status)) -
          completionRank(normalizeDocStatus(b.status))
        );
      });
  }, [mortgage?.documents]);
  const approvedDocs = useMemo(() => {
    return (mortgage?.documents ?? []).filter(
      (d) => normalizeDocStatus(d.status) === "accepted",
    );
  }, [mortgage?.documents]);

  if (!portal || !mortgage) return null;

  const canUpload = canWrite && !isReadOnly;

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function pickFile(id: string) {
    if (!canUpload || !mortgage) return;
    const current = mortgage.documents.find((d) => d.id === id);
    if (!current || current.notApplicable) return;
    if (!canReplaceDocument(current.status)) {
      flash("This document is approved and cannot be changed.");
      return;
    }
    setUploadingId(id);
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const id = uploadingId;
    e.target.value = "";
    setUploadingId(null);
    if (!picked.length || !id || !mortgage) return;
    const current = mortgage.documents.find((d) => d.id === id);
    if (!current || !canReplaceDocument(current.status) || current.notApplicable) {
      flash("This document is approved and cannot be changed.");
      return;
    }
    const existing = documentFiles(current);
    const accepted: File[] = [];
    for (const file of picked) {
      if (!isAllowedFile(file)) {
        flash("Please upload a PNG, PDF, JPG, or JPEG file.");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        flash("Maximum file size is 10MB.");
        return;
      }
      accepted.push(file);
    }
    if (existing.length + accepted.length > MAX_FILES) {
      flash(`You can attach up to ${MAX_FILES} files for this document.`);
      return;
    }
    const stamp = formatPortalStamp();
    const added: MortgageDocumentFile[] = accepted.map((file, i) => ({
      id: `${id}-${Date.now()}-${i}`,
      name: file.name,
      sizeBytes: file.size,
      uploadedAt: stamp,
    }));
    const nextFiles = [...existing, ...added];
    update((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === id
          ? {
              ...d,
              status: "under-review",
              fileName: nextFiles[nextFiles.length - 1]?.name,
              uploadedAt: stamp,
              rejectionReason: undefined,
              notApplicable: false,
              files: nextFiles,
            }
          : d,
      ),
      timeline: [
        {
          id: `up-${Date.now()}`,
          title:
            accepted.length === 1
              ? `${current.name}: ${accepted[0].name} attached`
              : `${current.name}: ${accepted.length} files attached`,
          at: stamp,
          done: true,
        },
        ...prev.timeline,
      ],
    }));
    logActivity(
      accepted.length === 1
        ? `Uploaded ${accepted[0].name}`
        : `Uploaded ${accepted.length} files for ${current.name}`,
    );
    flash(
      accepted.length === 1
        ? `${accepted[0].name} attached. You can add more or remove it.`
        : `${accepted.length} files attached.`,
    );
  }

  function removeFile(id: string, fileId: string) {
    if (!canUpload || !mortgage) return;
    const current = mortgage.documents.find((d) => d.id === id);
    if (!current || !canReplaceDocument(current.status)) {
      flash("This document is approved and cannot be changed.");
      return;
    }
    const nextFiles = documentFiles(current).filter((f) => f.id !== fileId);
    const stamp = formatPortalStamp();
    update((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === id
          ? {
              ...d,
              files: nextFiles,
              fileName: nextFiles[nextFiles.length - 1]?.name,
              uploadedAt: nextFiles[nextFiles.length - 1]?.uploadedAt,
              status: nextFiles.length === 0 ? "pending" : "under-review",
            }
          : d,
      ),
      timeline: [
        {
          id: `rm-${Date.now()}`,
          title: `Removed a file from ${current.name}`,
          at: stamp,
          done: true,
        },
        ...prev.timeline,
      ],
    }));
    flash("File removed.");
  }

  function toggleNotApplicable(id: string, checked: boolean, reason = "") {
    if (!canUpload || !mortgage) return;
    const current = mortgage.documents.find((d) => d.id === id);
    if (!current || !canReplaceDocument(current.status)) return;
    const stamp = formatPortalStamp();
    const files = documentFiles(current);
    update((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === id
          ? {
              ...d,
              notApplicable: checked,
              notApplicableReason: checked ? reason : "",
              status: checked ? d.status : files.length ? "under-review" : "pending",
            }
          : d,
      ),
      timeline: [
        {
          id: `na-${Date.now()}`,
          title: checked
            ? `${current.name} marked as not applicable`
            : `${current.name} set back to required`,
          at: stamp,
          done: true,
        },
        ...prev.timeline,
      ],
    }));
    logActivity(
      checked
        ? `Marked ${current.name} as not applicable`
        : `Set ${current.name} back to required`,
    );
  }

  function requestNotApplicable(doc: MortgageDocument, checked: boolean) {
    if (!canUpload) return;
    if (!checked) {
      toggleNotApplicable(doc.id, false);
      return;
    }
    setReasonDoc(doc);
    setReasonDraft(doc.notApplicableReason ?? "");
    setReasonError(false);
  }

  function confirmNotApplicable() {
    if (!reasonDoc) return;
    const reason = reasonDraft.trim();
    if (!reason) {
      setReasonError(true);
      return;
    }
    toggleNotApplicable(reasonDoc.id, true, reason);
    setReasonDoc(null);
    setReasonDraft("");
    setReasonError(false);
  }

  return (
    <div className="pb-6">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".png,.pdf,.jpg,.jpeg,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={onFile}
      />

      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-[#5A32A3]">
            <FileText className="h-4 w-4" />
          </span>
          Documents & Fact Find
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Complete your information and upload the documents we need to assess your loan.
        </p>
      </div>

      {toast ? (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-[12px] font-medium text-emerald-800">
          {toast}
        </div>
      ) : null}

      <ProcessStepper slug={slug} docsDone={progress.pending === 0 && progress.total > 0} />

      <div className="mt-5 flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setPanel("complete")}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-[13px] font-semibold",
                  panel === "complete"
                    ? "border-[#5A32A3] text-[#5A32A3]"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                Documents to complete
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    panel === "complete" ? "bg-[#5A32A3] text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {toComplete.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPanel("approved")}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-[13px] font-semibold",
                  panel === "approved"
                    ? "border-emerald-600 text-emerald-800"
                    : "border-transparent text-slate-500 hover:text-slate-800",
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approved documents
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    panel === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {approvedDocs.length}
                </span>
              </button>
            </div>
            <span className="pb-2.5 text-[12px] font-semibold text-slate-500">{uploadedPct}% Complete</span>
          </div>

          <ul className="mt-4 space-y-3">
            {panel === "complete" ? (
              toComplete.length === 0 ? (
                <li className="rounded-2xl bg-white px-4 py-8 text-center text-[13px] text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5">
                  All documents are approved.
                </li>
              ) : (
                toComplete.map((d) => (
                  <DocumentRow
                    key={d.id}
                    doc={d}
                    canUpload={canUpload}
                    onView={setViewing}
                    onPick={pickFile}
                    onRemoveFile={removeFile}
                    onToggleNotApplicable={requestNotApplicable}
                  />
                ))
              )
            ) : approvedDocs.length === 0 ? (
              <li className="rounded-2xl bg-white px-4 py-8 text-center text-[13px] text-slate-400 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5">
                No approved documents yet.
              </li>
            ) : (
              approvedDocs.map((d) => (
                <DocumentRow
                  key={d.id}
                  doc={d}
                  canUpload={canUpload}
                  onView={setViewing}
                  onPick={pickFile}
                  onRemoveFile={removeFile}
                  onToggleNotApplicable={requestNotApplicable}
                />
              ))
            )}
          </ul>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[12px] text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Your information is secure and encrypted.
            </p>
            <Link
              href={`/p/${slug}/fact-find`}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[#5A32A3] px-5 text-[13px] font-semibold text-white hover:bg-[#4a2888]"
            >
              Continue to Fact Find
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <aside className="hidden w-[250px] shrink-0 space-y-3 xl:block">
          <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5">
            <div className="text-[13px] font-bold text-slate-900">Your Loan Progress</div>
            <div className="mt-3 flex flex-col items-center">
              <ProgressRing value={overall} />
            </div>
            <ul className="mt-4 space-y-2.5 text-[12px]">
              <ProgressLine label="Documents" value={uploadedPct} />
              <ProgressLine label="Fact Find" value={ff.percent} />
            </ul>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5">
            <div className="flex items-center gap-2 text-[13px] font-bold text-slate-900">
              <Headphones className="h-4 w-4 text-[#5A32A3]" />
              Need Help?
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Your broker can walk you through any document you are unsure about.
            </p>
            <Link
              href={`/p/${slug}/messages`}
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#5A32A3] hover:underline"
            >
              Contact Support
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        </aside>
      </div>

      {viewing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[14px] font-bold text-slate-900">{viewing.name}</div>
                <div className="text-[11px] text-slate-500">
                  {viewing.fileName} · {viewing.uploadedAt}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <div className="text-center">
                <FileText className="mx-auto h-8 w-8" />
                <p className="mt-2 text-[12px] font-medium">{viewing.fileName}</p>
              </div>
            </div>
            {normalizeDocStatus(viewing.status) === "accepted" ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-800">
                <Lock className="h-3.5 w-3.5" />
                This document is approved and cannot be changed.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setViewing(null)}
              className="mt-3 h-8 w-full rounded-lg bg-[#5A32A3] text-[12px] font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {reasonDoc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">I don&apos;t have this</h2>
                <p className="mt-1 text-[13px] text-slate-500">
                  Tell us why you can&apos;t provide <span className="font-semibold text-slate-700">{reasonDoc.name}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReasonDoc(null);
                  setReasonError(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-4 block">
              <span className={cn("mb-1.5 block text-[13px] font-semibold", reasonError ? "text-rose-700" : "text-slate-900")}>
                Reason
                <span className="text-rose-500"> *</span>
              </span>
              <textarea
                value={reasonDraft}
                onChange={(e) => {
                  setReasonDraft(e.target.value);
                  if (e.target.value.trim()) setReasonError(false);
                }}
                rows={4}
                placeholder="Write your reason here"
                className={cn(
                  "w-full resize-none rounded-xl px-3.5 py-2.5 text-[13px] text-slate-800 outline-none ring-1 ring-black/10 placeholder:text-slate-400 focus:ring-2 focus:ring-[#5A32A3]",
                  reasonError && "ring-2 ring-rose-400",
                )}
              />
              {reasonError ? (
                <p className="mt-1.5 text-[12px] font-medium text-rose-600">Please enter a reason.</p>
              ) : null}
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReasonDoc(null);
                  setReasonError(false);
                }}
                className="h-10 rounded-lg px-4 text-[13px] font-semibold text-slate-600 ring-1 ring-black/10 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmNotApplicable}
                className="h-10 rounded-lg bg-[#5A32A3] px-4 text-[13px] font-semibold text-white hover:bg-[#4a2888]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DocumentRow({
  doc,
  canUpload,
  onView,
  onPick,
  onRemoveFile,
  onToggleNotApplicable,
}: {
  doc: MortgageDocument;
  canUpload: boolean;
  onView: (doc: MortgageDocument) => void;
  onPick: (id: string) => void;
  onRemoveFile: (id: string, fileId: string) => void;
  onToggleNotApplicable: (doc: MortgageDocument, checked: boolean) => void;
}) {
  const status = normalizeDocStatus(doc.status);
  const approved = status === "accepted";
  const editable = canUpload && canReplaceDocument(status) && !doc.notApplicable;
  const files = documentFiles(doc);
  const hasFile = files.length > 0;
  const Icon = documentIcon(doc);

  return (
    <li
      className={cn(
        "rounded-2xl bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5 sm:px-5",
        status === "rejected" && !doc.notApplicable && "ring-2 ring-rose-300",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            status === "rejected" && !doc.notApplicable
              ? "bg-rose-100 text-rose-600"
              : approved
                ? "bg-emerald-50 text-emerald-600"
                : "bg-violet-50 text-[#5A32A3]",
          )}
        >
          {approved ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-bold text-slate-900">{doc.name}</h3>
            <StatusPill status={status} notApplicable={doc.notApplicable} />
          </div>
          {status === "rejected" && doc.rejectionReason && !doc.notApplicable ? (
            <p className="mt-1 text-[12px] font-medium text-rose-700">{doc.rejectionReason}</p>
          ) : null}
          <DocDescription text={documentDescription(doc)} />
          {doc.notApplicable && doc.notApplicableReason ? (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px] leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-700">Reason: </span>
              {doc.notApplicableReason}
            </p>
          ) : null}
          {files.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-0.5 pl-1.5 pr-0.5"
                >
                  <button
                    type="button"
                    onClick={() => onView(doc)}
                    className="min-w-0 truncate text-left text-[11px] font-medium text-slate-700"
                    title={[file.name, formatFileSize(file.sizeBytes)].filter(Boolean).join(" · ")}
                  >
                    {file.name}
                  </button>
                  {editable ? (
                    <button
                      type="button"
                      onClick={() => onRemoveFile(doc.id, file.id)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
          {!approved ? (
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-slate-500">
              <input
                type="checkbox"
                checked={Boolean(doc.notApplicable)}
                disabled={!canUpload}
                onChange={(e) => onToggleNotApplicable(doc, e.target.checked)}
                className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-[#5A32A3]"
              />
              Don&apos;t have
            </label>
          ) : null}
          {editable ? (
            <button
              type="button"
              onClick={() => onPick(doc.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[12px] font-semibold text-[#5A32A3] ring-1 ring-[#5A32A3]/30 hover:bg-violet-50"
            >
              {hasFile ? <Plus className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
              {hasFile ? "Add file" : "Upload"}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function documentIcon(doc: MortgageDocument) {
  const key = `${doc.id} ${doc.name}`.toLowerCase();
  if (key.includes("bank")) return Landmark;
  if (key.includes("gift")) return Gift;
  if (key.includes("saving")) return Wallet;
  if (key.includes("employ")) return Briefcase;
  if (key.includes("payslip") || key.includes("tax")) return Receipt;
  if (key.includes("contract") || key.includes("address")) return Building2;
  return FileText;
}

function DocDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 96;
  return (
    <div className="mt-0.5 min-w-0 text-[11px] leading-snug text-slate-500">
      <p className={cn(!open && long && "line-clamp-2")}>{text}</p>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="font-semibold text-[#5A32A3] hover:underline"
        >
          {open ? "View less" : "View more"}
        </button>
      ) : null}
    </div>
  );
}

function StatusPill({
  status,
  notApplicable,
}: {
  status: MortgageDocStatus;
  notApplicable?: boolean;
}) {
  if (notApplicable) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
        Not applicable
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
        status === "pending" && "bg-[#FBE8D8] text-[#C2410C]",
        status === "rejected" && "bg-rose-50 text-rose-700",
        status === "under-review" && "bg-sky-50 text-sky-700",
        status === "accepted" && "bg-emerald-50 text-emerald-700",
      )}
    >
      {status === "rejected"
        ? "Rejected"
        : status === "under-review"
          ? "Submitted"
          : status === "accepted"
            ? "Approved"
            : "Not uploaded"}
    </span>
  );
}

function ProcessStepper({ slug, docsDone }: { slug: string; docsDone: boolean }) {
  return (
    <ol className="grid grid-cols-2 gap-y-4 rounded-2xl bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5 sm:px-6">
      {STEPS.map((step, i) => {
        const current = step.id === "documents";
        const done = step.id === "documents" && docsDone;
        const inner = (
          <div className="flex min-w-0 flex-col items-start">
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                  done && "bg-emerald-500 text-white",
                  current && !done && "bg-[#5A32A3] text-white",
                  !current && !done && "bg-slate-100 text-slate-400",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step.n}
              </span>
              <span
                className={cn(
                  "text-[13px] font-bold",
                  current ? "text-[#5A32A3] underline decoration-2 underline-offset-4" : "text-slate-800",
                )}
              >
                {step.title}
              </span>
            </span>
            <span className="mt-1 hidden pl-9 text-[11px] text-slate-400 sm:block">{step.blurb}</span>
          </div>
        );
        return (
          <li key={step.id} className="relative flex items-start">
            {step.id === "fact-find" ? (
              <Link href={`/p/${slug}/fact-find`} className="min-w-0">
                {inner}
              </Link>
            ) : (
              <div className="min-w-0">{inner}</div>
            )}
            {i < STEPS.length - 1 ? (
              <span className="absolute top-3.5 right-2 left-[calc(100%-8px)] hidden border-t border-dashed border-slate-300 sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-[108px] w-[108px]">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#EDE9FE" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#5A32A3"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[16px] font-bold leading-none text-slate-900">{value}%</span>
        <span className="mt-0.5 text-[10px] font-semibold text-slate-500">Complete</span>
      </div>
    </div>
  );
}

function ProgressLine({ label, value }: { label: string; value: number }) {
  return (
    <li>
      <div className="flex justify-between text-slate-600">
        <span>{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#5A32A3]" style={{ width: `${value}%` }} />
      </div>
    </li>
  );
}
