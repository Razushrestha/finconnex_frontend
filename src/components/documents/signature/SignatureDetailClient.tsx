"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Send,
  X,
  Download,
  Copy,
  PenLine,
  Plus,
  Calendar,
  Mail,
  User,
  Link2,
  RefreshCw,
} from "lucide-react";
import {
  formatAuditAt,
  getSignatureRequestById,
  upsertSignatureRequest,
  type SignatureRequest,
  type SignatureStatus,
} from "@/lib/documents/signature/types";
import { pushLibraryDoc } from "@/lib/documents/library/types";
import { avatarColor, initials } from "@/lib/activities/shared";
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

interface SigField {
  id: string;
  label: string;
  x: number;
  y: number;
}

export function SignatureDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [req, setReq] = useState<SignatureRequest | null>(null);
  const [fields, setFields] = useState<SigField[]>([
    { id: "f1", label: "Sign here", x: 18, y: 68 },
  ]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setReq(getSignatureRequestById(id) ?? null);
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: SignatureRequest, msg?: string) {
    upsertSignatureRequest(next);
    setReq(next);
    if (msg) flash(msg);
  }

  function sendForSignature() {
    if (!req) return;
    const today = new Date().toLocaleDateString("en-AU");
    save(
      {
        ...req,
        status: "Sent",
        sentDate: today,
        audit: [
          ...req.audit,
          {
            id: `a-${Date.now()}`,
            at: formatAuditAt(),
            action: "Sent for signature",
            actor: req.createdBy,
          },
        ],
      },
      "Sent to signer · copy public link",
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
  }

  function resend() {
    if (!req) return;
    save(
      {
        ...req,
        audit: [
          ...req.audit,
          {
            id: `a-${Date.now()}`,
            at: formatAuditAt(),
            action: "Resent",
            actor: req.createdBy,
          },
        ],
      },
      `Reminder sent to ${req.signerEmail}`,
    );
  }

  function copySignLink() {
    if (!req) return;
    const url = `${window.location.origin}/sign/${req.manageToken}`;
    void navigator.clipboard?.writeText(url);
    flash("Sign link copied");
  }

  function refreshFromStore() {
    const live = getSignatureRequestById(id);
    if (live) {
      setReq(live);
      flash("Synced latest status");
    }
  }

  function addField(e: React.MouseEvent<HTMLDivElement>) {
    if (!req || req.status !== "Draft") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setFields((prev) => [
      ...prev,
      { id: `f-${Date.now()}`, label: "Sign here", x, y },
    ]);
  }

  function downloadSigned() {
    if (!req) return;
    flash(`Downloading signed: ${req.documentFile}`);
    if (req.status === "Signed") {
      const today = new Date().toLocaleDateString("en-AU");
      pushLibraryDoc({
        id: `lib-signed-${req.id}`,
        fileName: req.documentFile.replace(/\.pdf$/i, "") + "_Signed.pdf",
        folder: "Signed",
        owner: req.createdBy,
        relatedTo: req.relatedTo,
        version: 1,
        tags: ["signed", "e-signature"],
        uploadedAt: today,
        accessLevel: "Team",
        sizeLabel: "320 KB",
        versions: [
          {
            version: 1,
            uploadedAt: today,
            uploadedBy: "System",
            sizeLabel: "320 KB",
            note: "From e-signature",
          },
        ],
      });
    }
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

  const publicUrl = `/sign/${req.manageToken}`;
  const openForSigner =
    req.status === "Sent" || req.status === "Viewed";

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
            onClick={() => router.push("/documents/signature")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Back"
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
            <Link href="/documents/signature" className="hover:text-slate-600">
              E-Signature
            </Link>
            <span>/</span>
          </nav>
          <h1 className="text-[15px] font-bold text-slate-900">
            {req.signatureRequestId}
          </h1>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              STATUS_STYLE[req.status],
            )}
          >
            {req.status}
          </span>
          <span className="hidden text-[11px] text-slate-400 sm:inline">·</span>
          <p className="hidden min-w-0 truncate text-[12px] font-medium text-slate-600 sm:block">
            {req.documentName}
          </p>
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
              <button
                type="button"
                onClick={sendForSignature}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700"
              >
                <Send className="h-3.5 w-3.5" />
                Send for signature
              </button>
            ) : null}
            {openForSigner ? (
              <button
                type="button"
                onClick={copySignLink}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy link
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
                  ? " · click preview to place signature fields"
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
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
                <MetaCell icon={User} label="Signer" value={req.signer} />
                <MetaCell icon={Mail} label="Email" value={req.signerEmail} />
                <MetaCell
                  icon={Link2}
                  label="Related to"
                  value={req.relatedTo ?? "—"}
                />
                <MetaCell
                  icon={Calendar}
                  label="Expiry"
                  value={req.expiryDate}
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Document preview
                  </p>
                  {req.status === "Draft" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600">
                      <Plus className="h-3 w-3" />
                      Click to add field
                    </span>
                  ) : null}
                </div>
                <div
                  role={req.status === "Draft" ? "button" : undefined}
                  onClick={addField}
                  className={cn(
                    "relative mx-auto aspect-[3/4] w-full max-w-md flex-1 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-inner",
                    req.status === "Draft" && "cursor-crosshair",
                  )}
                >
                  <div className="absolute inset-x-8 top-10 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-slate-200/80" />
                    <div className="h-2 w-full rounded bg-slate-100" />
                    <div className="h-2 w-full rounded bg-slate-100" />
                    <div className="h-2 w-5/6 rounded bg-slate-100" />
                    <div className="mt-6 h-2 w-full rounded bg-slate-100" />
                    <div className="h-2 w-full rounded bg-slate-100" />
                    <div className="h-2 w-4/5 rounded bg-slate-100" />
                  </div>
                  <p className="absolute top-[42%] left-1/2 -translate-x-1/2 text-[11px] font-medium text-slate-300">
                    {req.documentFile}
                  </p>
                  {fields.map((f) => (
                    <div
                      key={f.id}
                      className="absolute flex items-center gap-1 rounded border border-dashed border-violet-400 bg-violet-50/95 px-2 py-1 text-[10px] font-semibold text-violet-700 shadow-sm"
                      style={{ left: `${f.x}%`, top: `${f.y}%` }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PenLine className="h-3 w-3" />
                      {f.label}
                    </div>
                  ))}
                  {req.status === "Signed" && req.signatureData ? (
                    <div className="absolute right-6 bottom-10 left-6 rounded-lg border border-emerald-200 bg-white/90 px-3 py-2 text-center">
                      {req.signatureData.startsWith("typed:") ? (
                        <p className="font-serif text-xl text-slate-800">
                          {req.signatureData.replace(/^typed:/, "")}
                        </p>
                      ) : req.signatureData.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={req.signatureData}
                          alt="Signature"
                          className="mx-auto h-12 object-contain"
                        />
                      ) : null}
                      <p className="mt-1 text-[9px] font-semibold tracking-wide text-emerald-700 uppercase">
                        Signed · {req.signedDate}
                      </p>
                    </div>
                  ) : null}
                </div>

                {openForSigner ? (
                  <p className="mt-3 text-center text-[11px] text-slate-400">
                    Public link:{" "}
                    <Link
                      href={publicUrl}
                      className="font-semibold text-violet-700 hover:underline"
                      target="_blank"
                    >
                      {publicUrl}
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>

            <aside className="flex flex-col bg-slate-50/70 p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Actions
              </p>
              <div className="space-y-2">
                {req.status === "Draft" ? (
                  <ActionBtn
                    onClick={sendForSignature}
                    icon={Send}
                    label="Send for signature"
                    tone="primary"
                  />
                ) : null}
                {openForSigner ? (
                  <>
                    <ActionBtn onClick={resend} icon={Send} label="Resend" />
                    <ActionBtn
                      onClick={copySignLink}
                      icon={Copy}
                      label="Copy sign link"
                    />
                  </>
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
                <Row label="Sent" value={req.sentDate ?? "—"} />
                <Row label="Signed" value={req.signedDate ?? "—"} />
                <Row label="IP address" value={req.ipAddress ?? "—"} />
                <Row label="Token" value={req.manageToken} />
              </dl>

              <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Audit trail
              </p>
              <ol className="min-h-0 flex-1 space-y-0 overflow-auto">
                {req.audit.map((a, i) => (
                  <li key={a.id} className="relative flex gap-3 pb-3.5 last:pb-0">
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
      <p className="truncate text-[13px] font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </dt>
      <dd className="truncate text-right font-medium text-slate-800">{value}</dd>
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
