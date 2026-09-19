"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteSignatureRequest,
  formatAuditAt,
  getRequestDocuments,
  getSignatureRequestById,
  markRequestSent,
  normalizeSignatureRequest,
  completionPercent,
  upsertSignatureRequest,
  type SignatureAuditEvent,
  type SignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { onRecordsChange } from "@/lib/records-sync";
import { syncSignatureRequestFromPublicLinks } from "@/lib/documents/signature/sync-public-status";
import {
  deleteCrmSignatureRequest,
  downloadCrmSignatureRequest,
  getCrmSignatureRequest,
  isCrmSignatureRequestId,
  persistRemoteSignatureRequest,
  remindCrmSignatureRequest,
  sendCrmSignatureRequest,
  tryCrmSignatureRequest,
} from "@/lib/documents/signature/api";
import { resolveRequestDocumentUrls } from "@/lib/documents/signature/file-cache";
import {
  downloadArtifactBlob,
  getSignedArtifact,
  persistSignedPackage,
} from "@/lib/documents/signed-artifacts";
import { SignatureDocPreview } from "./SignatureDocPreview";
import { CompletionCertificateModal } from "./CompletionCertificateModal";
import { PrintDocumentsModal } from "./documents/detail/PrintDocumentsModal";
import { printSignatureDocuments } from "@/lib/documents/signature/print-documents";
import { SignatureComposeEmailModal } from "./SignatureComposeEmailModal";
import { SignatureDocumentDetailView } from "./documents/detail/SignatureDocumentDetailView";
import { ExtendExpiryModal } from "./documents/detail/ExtendExpiryModal";
import type { DocumentSummaryData } from "./documents/detail/DocumentSummaryCard";
import type { RecipientStatusData } from "./documents/detail/RecipientStatusRow";
import { notify } from "@/lib/notify/toast";

function formatDetailStamp(value?: string) {
  if (!value) return "N/A";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function expiryToIso(expiryDate?: string) {
  if (!expiryDate) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(expiryDate)) return expiryDate.slice(0, 10);
  const [day, month, year] = expiryDate.split(/[/\-]/);
  if (!day || !month || !year) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function isoToDisplay(iso: string) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

function describeAccess(
  signer: SignatureSigner,
  audit: SignatureAuditEvent[],
): string {
  if (signer.status === "Signed" && signer.signedAt) {
    return `Signed at ${signer.signedAt}`;
  }
  const viewedEvent = audit.find(
    (a) => a.actor === signer.name && a.action.toLowerCase().includes("viewed"),
  );
  if (viewedEvent) return `Accessed using Web at ${viewedEvent.at}`;
  if (signer.status === "Declined") return "Declined to sign";
  if (signer.status === "Sent") return "Waiting for signer to open";
  if (signer.status === "Viewed") return "Viewed — waiting for signature";
  return "Not yet sent";
}

function mapRequestToView(req: SignatureRequest): {
  document: DocumentSummaryData;
  recipients: RecipientStatusData[];
} {
  const sentEvent = req.audit.find((a) =>
    a.action.toLowerCase().includes("sent for signature"),
  );
  const lastEvent = req.audit[req.audit.length - 1];
  const primary = getRequestDocuments(req)[0];

  return {
    document: {
      name: req.documentName,
      ownerName: req.createdBy,
      description: req.relatedTo
        ? `Related to ${req.relatedTo}`
        : "Signature request document.",
      submittedAtLabel: formatDetailStamp(
        sentEvent?.at ?? req.sentDate ?? req.updatedAt,
      ),
      lastUpdatedAtLabel: formatDetailStamp(
        lastEvent?.at ?? req.updatedAt ?? req.sentDate,
      ),
      completionPercent: completionPercent(req),
      documentFileUrl: primary?.fileUrl || req.documentFileUrl || "",
      fileName: primary?.fileName || req.documentFile,
      fields: req.fields,
      signers: req.signers,
    },
    recipients: req.signers
      .filter((s) => s.role !== "CC")
      .map((s) => ({
        id: s.id,
        order: s.order,
        name: s.name,
        email: s.email,
        accessInfo: describeAccess(s, req.audit),
        mailed: s.status !== "Pending",
        viewed:
          s.status === "Viewed" ||
          s.status === "Signed" ||
          s.status === "Declined",
        signed: s.status === "Signed",
      })),
  };
}

export function SignatureDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [req, setReq] = useState<SignatureRequest | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate(next: SignatureRequest) {
      const crmDownload =
        next.status === "Signed" && isCrmSignatureRequestId(next.id)
          ? await tryCrmSignatureRequest(() =>
              downloadCrmSignatureRequest(next.id),
            )
          : null;
      const resolved = await resolveRequestDocumentUrls(
        next,
        crmDownload?.url || undefined,
      );
      if (!cancelled) setReq(resolved);
    }

    async function pull() {
      const live = getSignatureRequestById(id);
      if (!live) {
        if (!cancelled) setReq(null);
        return;
      }
      const merged = await syncSignatureRequestFromPublicLinks(
        normalizeSignatureRequest(live),
      );
      if (cancelled) return;
      setReq(merged);
      void hydrate(merged);
    }

    void pull();
    const interval = window.setInterval(() => {
      void pull();
    }, 3000);
    const stop = onRecordsChange(() => {
      void pull();
    });

    if (isCrmSignatureRequestId(id)) {
      void (async () => {
        const remote = await tryCrmSignatureRequest(() =>
          getCrmSignatureRequest(id),
        );
        if (cancelled || !remote) return;
        persistRemoteSignatureRequest(remote);
        await pull();
      })();
    }

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      stop();
    };
  }, [id]);

  const view = useMemo(() => (req ? mapRequestToView(req) : null), [req]);
  const expiryIso = expiryToIso(req?.expiryDate);

  function flash(msg: string) {
    notify(msg);
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
      router.push(`/signature/${id}/place`);
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
    if (pending.length && isCrmSignatureRequestId(req.id)) {
      void tryCrmSignatureRequest(() => remindCrmSignatureRequest(req.id));
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
    const fileUrl = getRequestDocuments(req)[0]?.fileUrl || req.documentFileUrl;
    if (fileUrl) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    flash(`Document not fully signed yet: ${req.documentFile}`);
  }

  if (!req || !view) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-white p-8">
        <p className="font-bold text-slate-900">Request not found</p>
        <Link
          href="/signature"
          className="mt-3 text-[12px] font-semibold text-violet-700"
        >
          Back
        </Link>
      </div>
    );
  }

  const previewDocs = getRequestDocuments(req);

  return (
    <div className="relative min-h-full bg-white">
      <SignatureDocumentDetailView
        document={view.document}
        recipients={view.recipients}
        toolbarMode={req.status === "Signed" ? "completed" : "signing"}
        onBack={() => router.push("/signature")}
        onViewDocument={() => setIsPreviewOpen(true)}
        onEdit={() => {
          if (req.status === "Draft") {
            router.push(`/signature/${id}/place`);
            return;
          }
          flash("This document has already been sent. Use Correct document to change fields.");
        }}
        onCorrectDocument={() => router.push(`/signature/${id}/place`)}
        onCompletionCertificate={() => setIsCertificateOpen(true)}
        onExtend={() => setIsExtendOpen(true)}
        onSendReminder={() => {
          if (req.status === "Draft") {
            sendForSignature();
            return;
          }
          resend();
        }}
        onReminderSettings={() => setIsReminderSettingsOpen(true)}
        onRecall={() => {
          save(
            {
              ...req,
              status: "Cancelled",
              audit: [
                ...req.audit,
                {
                  id: `a-${Date.now()}`,
                  at: formatAuditAt(),
                  action: "Recalled",
                  actor: req.createdBy,
                },
              ],
            },
            "Document recalled",
          );
        }}
        onUploadSignedDocument={() =>
          flash("Upload a signed copy from the document menu when needed.")
        }
        onEmailDocument={() => {
          const to = req.signerEmail || req.signers[0]?.email;
          if (!to?.includes("@")) {
            flash("No recipient email is available for this document.");
            return;
          }
          setIsComposeOpen(true);
        }}
        onSaveToCloud={() => flash("Cloud save is not configured.")}
        onDownload={downloadSigned}
        onEditAsNew={() =>
          router.push(
            `/signature/request/new?from=${id}&layoutid=standard&redirect=false&type=send`,
          )
        }
        onSaveAsTemplate={() => {
          upsertSignatureRequest({
            ...req,
            id: `${req.id}-tpl-${Date.now()}`,
            signatureRequestId: `${req.signatureRequestId}-TPL`,
            recordType: "template",
            documentName: `${req.documentName} template`,
          });
          flash("Saved as template");
        }}
        onChangeOwnership={() => flash("Ownership stays with the request owner.")}
        onPrint={() => setIsPrintOpen(true)}
        onFormData={() =>
          flash(
            req.fields.some((field) => field.value)
              ? `${req.fields.filter((field) => field.value).length} completed fields`
              : "No form data captured",
          )
        }
        onViewLegalDisclosure={() =>
          flash("Electronic signatures on this request are legally binding records.")
        }
        onActivityHistory={() => {
          const last = req.audit[req.audit.length - 1];
          flash(last ? `${last.action} · ${last.at}` : "No activity yet");
        }}
        onCopyDebugInfo={() => {
          void navigator.clipboard?.writeText(req.id);
          flash("Request id copied");
        }}
        onDelete={() => {
          if (!window.confirm(`Delete "${req.documentName}"?`)) return;
          deleteSignatureRequest(req.id);
          if (isCrmSignatureRequestId(req.id)) {
            void tryCrmSignatureRequest(() => deleteCrmSignatureRequest(req.id));
          }
          router.push("/signature");
        }}
      />

      <ExtendExpiryModal
        isOpen={isExtendOpen}
        onClose={() => setIsExtendOpen(false)}
        currentExpiryDateLabel={req.expiryDate || isoToDisplay(expiryIso)}
        currentExpiryDate={expiryIso || new Date().toISOString().slice(0, 10)}
        onSet={(nextIso) => {
          save(
            {
              ...req,
              expiryDate: isoToDisplay(nextIso),
              audit: [
                ...req.audit,
                {
                  id: `a-${Date.now()}`,
                  at: formatAuditAt(),
                  action: `Expiry extended to ${isoToDisplay(nextIso)}`,
                  actor: req.createdBy,
                },
              ],
            },
            "Expiry updated",
          );
        }}
      />

      {isPreviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Document Preview
                </h3>
                <p className="text-xs font-medium text-gray-500">
                  {req.documentName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-auto bg-gray-100 p-4">
              {previewDocs.map((doc, index) => (
                <section key={doc.id} className="mx-auto w-full max-w-3xl">
                  {previewDocs.length > 1 ? (
                    <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Document {index + 1} of {previewDocs.length}
                      {doc.name ? ` · ${doc.name}` : ""}
                    </p>
                  ) : null}
                  <SignatureDocPreview
                    fileName={doc.fileName || req.documentFile}
                    fileUrl={
                      doc.fileUrl && !doc.fileUrl.startsWith("fc-file://")
                        ? doc.fileUrl
                        : index === 0
                          ? req.documentFileUrl
                          : ""
                    }
                    fields={
                      req.status === "Signed"
                        ? []
                        : req.fields.filter(
                            (field) =>
                              (field.documentId ?? "primary") === doc.id,
                          )
                    }
                    signers={req.signers}
                    pageWidth={720}
                    className="max-w-none shadow-sm"
                  />
                </section>
              ))}
            </div>

            <div className="flex justify-end border-t bg-white p-4">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCertificateOpen ? (
        <CompletionCertificateModal
          req={req}
          onClose={() => setIsCertificateOpen(false)}
        />
      ) : null}

      {isPrintOpen ? (
        <PrintDocumentsModal
          onClose={() => setIsPrintOpen(false)}
          onPrint={(mode) => {
            printSignatureDocuments(req, mode);
            setIsPrintOpen(false);
          }}
        />
      ) : null}

      <SignatureComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        req={req}
        documentName={req.documentName}
        onSent={flash}
      />

      {isReminderSettingsOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsReminderSettingsOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-900">
              Reminder settings
            </h3>
            <p className="text-xs text-slate-500">
              Automatic reminders are sent to recipients who have not signed
              yet. Use Send reminder for an immediate follow-up.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsReminderSettingsOpen(false);
                flash("Reminder settings saved");
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
