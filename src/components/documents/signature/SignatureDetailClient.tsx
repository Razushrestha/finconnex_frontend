"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  X,
  Download,
  Copy,
  LayoutTemplate,
  Calendar,
  Mail,
  Link2,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  SIGNER_COLORS,
  formatAuditAt,
  getSignatureRequestById,
  markRequestSent,
  normalizeSignatureRequest,
  signedCount,
  upsertSignatureRequest,
  type SignatureRequest,
  type SignatureStatus,
  type SignerStatus,
} from "@/lib/documents/signature/types";
import {
  deleteCrmSignatureRequest,
  downloadCrmSignatureRequest,
  getCrmSignatureRequest,
  isCrmSignatureRequestId,
  persistRemoteSignatureRequest,
  sendCrmSignatureRequest,
  tryCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import {
  downloadArtifactBlob,
  getSignedArtifact,
  persistSignedPackage,
} from "@/lib/documents/signed-artifacts";
import { avatarColor, initials } from "@/lib/activities/shared";
import { SignatureDocPreview } from "./SignatureDocPreview";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<SignatureStatus, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-sky-50 text-sky-700",
  Viewed: "bg-amber-50 text-amber-800",
  Signed: "bg-emerald-50 text-emerald-700",
  Declined: "bg-rose-50 text-rose-700",
  Expired: "bg-slate-100 text-slate-500",
  Cancelled: "bg-slate-100 text-slate-500",
};

const SIGNER_STATUS_STYLE: Record<SignerStatus, string> = {
  Pending: "bg-slate-100 text-slate-500",
  Sent: "bg-sky-50 text-sky-700",
  Viewed: "bg-amber-50 text-amber-800",
  Signed: "bg-emerald-50 text-emerald-700",
  Declined: "bg-rose-50 text-rose-700",
};

export function SignatureDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [req, setReq] = useState<SignatureRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const live = getSignatureRequestById(id);
    setReq(live ? normalizeSignatureRequest(live) : null);
    if (!isCrmSignatureRequestId(id)) return;
    let cancelled = false;
    void (async () => {
      const remote = await tryCrmSignatureRequest(() =>
        getCrmSignatureRequest(id),
      );
      if (cancelled || !remote) return;
      persistRemoteSignatureRequest(remote);
      setReq(normalizeSignatureRequest(remote, { allowEmptyFields: true }));
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: SignatureRequest, msg?: string) {
    const saved = upsertSignatureRequest(next);
    setReq(saved);
    if (msg) flash(msg);
  }

  function sendForSignature() {
    if (!req) return;
    const missing = req.signers.filter(
      (s) =>
        s.role !== "CC" &&
        !req.fields.some((f) => f.signerId === s.id && f.kind === "signature"),
    );
    if (missing.length) {
      flash(`Place a signature field for ${missing[0].name} first`);
      router.push(`/documents/signature/${id}/place`);
      return;
    }
    const sent = markRequestSent(req, req.createdBy);
    setReq(sent);
    if (isCrmSignatureRequestId(req.id)) {
      void (async () => {
        const remote = await tryCrmSignatureRequest(() =>
          sendCrmSignatureRequest(req.id),
        );
        if (remote) {
          persistRemoteSignatureRequest(remote);
          setReq(normalizeSignatureRequest(remote, { allowEmptyFields: true }));
        }
      })();
    }
    flash(
      `Sent · ${sent.signers.filter((s) => s.role !== "CC").length} signer link(s)`,
    );
  }

  function cancelRequest() {
    if (!req) return;
    save(
      {
        ...req,
        status: "Cancelled",
        audit: [
          ...req.audit,
          {
            id: `a-${Date.now()}`,
            at: formatAuditAt(),
            action: "Cancelled",
            actor: req.createdBy,
          },
        ],
      },
      "Request cancelled",
    );
    if (isCrmSignatureRequestId(req.id)) {
      void tryCrmSignatureRequest(() => deleteCrmSignatureRequest(req.id));
    }
  }

  function resend() {
    if (!req) return;
    const pending = req.signers.filter(
      (s) =>
        s.role !== "CC" && s.status !== "Signed" && s.status !== "Declined",
    );
    save(
      {
        ...req,
        audit: [
          ...req.audit,
          {
            id: `a-${Date.now()}`,
            at: formatAuditAt(),
            action: `Reminder sent to ${pending.map((s) => s.name).join(", ") || "signers"}`,
            actor: req.createdBy,
          },
        ],
      },
      pending.length
        ? `Reminder sent to ${pending.length} signer(s)`
        : "No pending signers",
    );
  }

  function copySignLink(token: string, name?: string) {
    const url = `${window.location.origin}/sign/${token}`;
    void navigator.clipboard?.writeText(url);
    flash(name ? `Link copied · ${name}` : "Sign link copied");
  }

  function refreshFromStore() {
    const live = getSignatureRequestById(id);
    if (live) {
      setReq(normalizeSignatureRequest(live));
      flash("Synced latest status");
    }
  }

  function downloadSigned() {
    if (!req) return;
    if (isCrmSignatureRequestId(req.id)) {
      void (async () => {
        const hit = await tryCrmSignatureRequest(() =>
          downloadCrmSignatureRequest(req.id),
        );
        if (hit?.url) {
          window.open(hit.url, "_blank", "noopener,noreferrer");
          flash("Download ready");
          return;
        }
        flash(`Document not fully signed yet: ${req.documentFile}`);
      })();
      return;
    }
    if (req.status === "Signed") {
      const doc = persistSignedPackage(req);
      const artifact = getSignedArtifact(doc.id);
      if (artifact) {
        downloadArtifactBlob(artifact);
        flash(`Downloaded ${doc.fileName}`);
        return;
      }
    }
    flash(`Document not fully signed yet: ${req.documentFile}`);
  }

  if (!req) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-slate-50 p-8">
        <p className="font-bold text-slate-900">Request not found</p>
        <Link
          href="/documents/signature"
          className="mt-3 text-[12px] font-semibold text-violet-700"
        >
          Back
        </Link>
      </div>
    );
  }

  const openForSigner = req.status === "Sent" || req.status === "Viewed";
  const done = signedCount(req);
  const total = req.signers.filter((s) => s.role !== "CC").length;
  const progressPct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="relative flex min-h-full flex-col bg-slate-50">
      <div className="relative flex flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <button
            type="button"
            onClick={() => router.push("/documents/signature")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <h1 className="text-[15px] font-bold text-slate-900">
            {req.documentName}
          </h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              STATUS_STYLE[req.status],
            )}
          >
            {req.status}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={refreshFromStore}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              title="Refresh after public sign"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync
            </button>
            {req.status === "Draft" ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/documents/signature/${id}/place`)
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700"
                >
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Place fields
                </button>
                <button
                  type="button"
                  onClick={sendForSignature}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send for signature
                </button>
              </>
            ) : null}

            {openForSigner && req.signers[0] ? (
              <button
                type="button"
                onClick={() =>
                  copySignLink(req.signers[0].token, req.signers[0].name)
                }
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy first link
              </button>
            ) : null}
            {req.status === "Signed" ? (
              <button
                type="button"
                onClick={downloadSigned}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700"
              >
                <Download className="h-3.5 w-3.5" />
                Download signed
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {req.documentName}
              </h2>
              <p className="mt-1 text-[12px] text-slate-500">
                {req.documentFile}
                {req.status === "Draft"
                  ? " · place and adjust fields before sending"
                  : ` · ${req.signingOrder} signing`}
              </p>
              {total > 0 && req.status !== "Draft" ? (
                <div className="mt-3 max-w-xs">
                  <div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-500">
                    <span>Progress</span>
                    <span>
                      {done} of {total}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold",
                  avatarColor(req.createdBy),
                )}
              >
                {initials(req.createdBy)}
              </span>
              <div>
                <p className="text-[12px] font-semibold text-slate-800">
                  {req.createdBy}
                </p>
                <p className="text-[10px] text-slate-400">Created by</p>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_300px]">
            <div className="flex min-h-0 flex-col border-b border-slate-100 lg:border-r lg:border-b-0">
              <div className="grid border-b border-slate-100 sm:grid-cols-2 xl:grid-cols-4">
                <MetaCell
                  icon={Users}
                  label="Signers"
                  value={`${total} · ${req.signingOrder}`}
                />
                <MetaCell
                  icon={Mail}
                  label="Primary email"
                  value={req.signerEmail}
                />
                <MetaCell
                  icon={Link2}
                  label="Related to"
                  value={req.relatedTo ?? ""}
                />
                <MetaCell
                  icon={Calendar}
                  label="Expiry"
                  value={req.expiryDate}
                />
              </div>

              <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                <p className="mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                  Signer progress
                </p>
                <ul className="space-y-2">
                  {req.signers.map((s) => {
                    const color =
                      SIGNER_COLORS[s.colorIndex % SIGNER_COLORS.length];
                    return (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2"
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                            color.bg,
                            color.text,
                          )}
                        >
                          {s.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-slate-800">
                            {s.name}
                          </p>
                          <p className="truncate text-[10px] text-slate-400">
                            {s.email}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            SIGNER_STATUS_STYLE[s.status],
                          )}
                        >
                          {s.status}
                        </span>
                        {openForSigner &&
                        s.status !== "Signed" &&
                        s.status !== "Declined" ? (
                          <button
                            type="button"
                            onClick={() => copySignLink(s.token, s.name)}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <Copy className="h-3 w-3" />
                            Link
                          </button>
                        ) : null}
                        {s.status === "Signed" && s.signedAt ? (
                          <span className="text-[10px] text-emerald-600">
                            {s.signedAt}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Document preview
                  </p>
                  {req.status === "Draft" ? (
                    <Link
                      href={`/documents/signature/${id}/place`}
                      className="text-[10px] font-semibold text-violet-600 hover:underline"
                    >
                      Edit field placement
                    </Link>
                  ) : null}
                </div>
                <SignatureDocPreview
                  fileName={req.documentFile}
                  fields={req.fields}
                  signers={req.signers}
                />
              </div>
            </div>

            <aside className="flex flex-col bg-slate-50/70 p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Actions
              </p>
              <div className="space-y-2">
                {req.status === "Draft" ? (
                  <>
                    <ActionBtn
                      onClick={() =>
                        router.push(`/documents/signature/${id}/place`)
                      }
                      icon={LayoutTemplate}
                      label="Place / adjust fields"
                    />
                    <ActionBtn
                      onClick={sendForSignature}
                      icon={Send}
                      label="Send for signature"
                      tone="primary"
                    />
                  </>
                ) : null}
                {openForSigner ? (
                  <ActionBtn
                    onClick={resend}
                    icon={Send}
                    label="Resend reminders"
                  />
                ) : null}
                {req.status === "Signed" ? (
                  <ActionBtn
                    onClick={downloadSigned}
                    icon={Download}
                    label="Download signed PDF"
                    tone="success"
                  />
                ) : null}
                {req.status !== "Signed" &&
                req.status !== "Cancelled" &&
                req.status !== "Declined" ? (
                  <ActionBtn
                    onClick={cancelRequest}
                    icon={X}
                    label="Cancel request"
                    tone="danger"
                  />
                ) : null}
              </div>

              <dl className="mt-5 space-y-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-[12px]">
                <Row label="Sent" value={req.sentDate ?? ""} />
                <Row label="Completed" value={req.signedDate ?? ""} />
                <Row label="IP address" value={req.ipAddress ?? ""} />
                <Row label="Fields" value={String(req.fields.length)} />
              </dl>

              <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Audit trail
              </p>
              <ol className="min-h-0 flex-1 space-y-0 overflow-auto">
                {req.audit.map((a, i) => (
                  <li
                    key={a.id}
                    className="relative flex gap-3 pb-3.5 last:pb-0"
                  >
                    {i < req.audit.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute top-3 left-[5px] h-[calc(100%-4px)] w-px bg-slate-200"
                      />
                    ) : null}
                    <span className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500 ring-4 ring-violet-50" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800">
                        {a.action}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {a.at} · {a.actor}
                        {a.ip ? ` · ${a.ip}` : ""}
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

function MetaCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-100 px-4 py-3.5 sm:border-r sm:px-5 sm:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:[&:last-child]:border-r-0">
      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="truncate text-[13px] font-semibold text-slate-900">
        {value || ""}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </dt>
      <dd className="truncate text-right font-medium text-slate-800">
        {value || ""}
      </dd>
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
