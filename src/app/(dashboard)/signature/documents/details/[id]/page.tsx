"use client";

import { DocumentSummaryData } from "@/components/documents/signature/documents/detail/DocumentSummaryCard";
import { ExtendExpiryModal } from "@/components/documents/signature/documents/detail/ExtendExpiryModal";
import { RecipientStatusData } from "@/components/documents/signature/documents/detail/RecipientStatusRow";
import { SignatureDocumentDetailView } from "@/components/documents/signature/documents/detail/SignatureDocumentDetailView";
import { SignatureDocPreview } from "@/components/documents/signature/SignatureDocPreview";
import { CompletionCertificateModal } from "@/components/documents/signature/CompletionCertificateModal";
import { PrintDocumentsModal } from "@/components/documents/signature/documents/detail/PrintDocumentsModal";
import { resolveRequestDocumentUrls } from "@/lib/documents/signature/file-cache";
import { printSignatureDocuments } from "@/lib/documents/signature/print-documents";
import { SignatureComposeEmailModal } from "@/components/documents/signature/SignatureComposeEmailModal";
import {
  getRequestDocuments,
  listSignatureRequests,
  completionPercent,
  type SignatureAuditEvent,
  type SignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { onRecordsChange } from "@/lib/records-sync";
import { syncSignatureRequestFromPublicLinks } from "@/lib/documents/signature/sync-public-status";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

interface MockSignatureDocument {
  document: DocumentSummaryData;
  recipients: RecipientStatusData[];
}

const USE_MOCK_DATA = true;
const API_BASE_URL = "http://182.93.94.220:8010";

function findSignatureRequest(
  documentId: string,
): SignatureRequest | undefined {
  return listSignatureRequests().find(
    (r) => r.id === documentId || r.signatureRequestId === documentId,
  );
}

function toIsoDate(ddmmyyyy?: string): string | null {
  if (!ddmmyyyy) return null;
  const [day, month, year] = ddmmyyyy.split("/");
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Get today's date in YYYY-MM-DD format for min attribute validation
function getTodayIsoDate(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
  return "Not yet sent";
}

function mapRequestToView(req: SignatureRequest): MockSignatureDocument {
  const sentEvent = req.audit.find((a) =>
    a.action.toLowerCase().includes("sent for signature"),
  );
  const lastEvent = req.audit[req.audit.length - 1];

  return {
    document: {
      name: req.documentName,
      ownerName: req.createdBy,
      description: req.relatedTo
        ? `Related to ${req.relatedTo}`
        : "Signature request document.",
      submittedAtLabel: sentEvent?.at ?? req.sentDate ?? "Not sent yet",
      lastUpdatedAtLabel: lastEvent?.at ?? req.sentDate ?? "N/A",
      completionPercent: completionPercent(req),
      documentFileUrl:
        getRequestDocuments(req)[0]?.fileUrl || req.documentFileUrl || "",
      fileName: getRequestDocuments(req)[0]?.fileName || req.documentFile,
      fields: req.fields,
      signers: req.signers,
    },
    recipients: req.signers.map((s) => ({
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

export default function SignatureDocumentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const documentId = params.id;

  const [documentData, setDocumentData] =
    useState<MockSignatureDocument | null>(null);
  const [sourceReq, setSourceReq] = useState<SignatureRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Expiry states
  const [expiryDateIso, setExpiryDateIso] = useState("2026-07-25");
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  // Interactive Feature States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [emailFlash, setEmailFlash] = useState<string | null>(null);
  const [isFormDataOpen, setIsFormDataOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
  const [isSendReminderModalOpen, setIsSendReminderModalOpen] = useState(false);

  // Reminder options state
  const [reminderType, setReminderType] = useState<"email" | "sms" | "both">(
    "email",
  );

  // Advanced Settings & Reminders Modal Form State
  const [modalExpiryDate, setModalExpiryDate] = useState("2026-08-20");
  const [enableAutoReminders, setEnableAutoReminders] = useState(true);
  const [reminderFrequencyDays, setReminderFrequencyDays] = useState("7 Days");
  const [maxReminders, setMaxReminders] = useState("5");

  useEffect(() => {
    let cancelled = false;

    async function loadDocumentDetail() {
      if (!documentId) return;
      const req = findSignatureRequest(documentId);
      if (!req) {
        if (!USE_MOCK_DATA) {
          setIsLoading(true);
        } else {
          setDocumentData(null);
          setSourceReq(null);
          setIsLoading(false);
        }
        return;
      }
      const merged = await syncSignatureRequestFromPublicLinks(req);
      if (cancelled) return;
      setSourceReq(merged);
      setDocumentData(mapRequestToView(merged));
      void resolveRequestDocumentUrls(merged).then((resolved) => {
        if (cancelled) return;
        setSourceReq(resolved);
        setDocumentData(mapRequestToView(resolved));
      });
      const iso = toIsoDate(merged.expiryDate);
      if (iso) {
        setExpiryDateIso(iso);
        setModalExpiryDate(iso);
      }
      setIsLoading(false);
    }

    setIsLoading(true);
    void loadDocumentDetail();
    const interval = window.setInterval(() => {
      void loadDocumentDetail();
    }, 3000);
    const stop = onRecordsChange(() => {
      void loadDocumentDetail();
    });
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      stop();
    };
  }, [documentId]);

  const handleBack = () => {
    router.push("/signature/documents");
  };

  const handleSetExpiry = async (newExpiryDate: string) => {
    setExpiryDateIso(newExpiryDate);
    setModalExpiryDate(newExpiryDate);
    if (USE_MOCK_DATA) return;

    try {
      await fetch(
        `${API_BASE_URL}/api/signature/requests/${documentId}/extend/`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expiryDate: newExpiryDate }),
        },
      );
    } catch (error) {
      console.error("Failed to update expiry date:", error);
    }
  };

  const handleExecuteSendReminder = async () => {
    setIsSendReminderModalOpen(false);
    if (USE_MOCK_DATA) {
      alert(
        `Reminder sent successfully via ${reminderType.toUpperCase()} to pending recipients!`,
      );
      return;
    }
    try {
      await fetch(
        `${API_BASE_URL}/api/signature/requests/${documentId}/remind/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reminderType }),
        },
      );
      alert(`Reminder sent successfully via ${reminderType.toUpperCase()}!`);
    } catch (error) {
      console.error("Failed to send reminder:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center text-xs text-slate-400">
        Loading document details...
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-xs text-slate-400">
        <p>Document not found or failed to load.</p>
        <button
          onClick={handleBack}
          className="text-blue-600 underline font-semibold"
        >
          Back to documents
        </button>
      </div>
    );
  }

  return (
    <>
      {emailFlash ? (
        <div className="fixed bottom-4 right-4 z-[90] rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-medium text-white shadow-lg">
          {emailFlash}
        </div>
      ) : null}
      <SignatureDocumentDetailView
        document={documentData.document}
        recipients={documentData.recipients}
        toolbarMode="completed"
        onBack={handleBack}
        onViewDocument={() => setIsPreviewOpen(true)}
        onEdit={() => setIsEditOpen(true)}
        onCompletionCertificate={() => {
          if (!sourceReq && !findSignatureRequest(documentId)) {
            alert("Completion certificate is not available yet.");
            return;
          }
          setIsCertificateOpen(true);
        }}
        onCorrectDocument={() => {
          alert("Opening document correction workflow for active signers.");
        }}
        onExtend={() => setIsExtendModalOpen(true)}
        onSendReminder={() => setIsSendReminderModalOpen(true)}
        onReminderSettings={() => setIsReminderSettingsOpen(true)}
        onRecall={async () => {
          if (USE_MOCK_DATA) {
            alert("Mock document recalled.");
            return;
          }
          await fetch(
            `${API_BASE_URL}/api/signature/requests/${documentId}/recall/`,
            {
              method: "POST",
            },
          );
        }}
        onUploadSignedDocument={() => {}}
        onEmailDocument={() => {
          const to =
            sourceReq?.signerEmail ||
            sourceReq?.signers[0]?.email ||
            documentData.recipients[0]?.email;
          if (!to?.includes("@")) {
            alert("No recipient email is available for this document.");
            return;
          }
          setIsComposeOpen(true);
        }}
        onSaveToCloud={() => {
          alert("Saved to cloud.");
        }}
        onDownload={() => {
          if (USE_MOCK_DATA) {
            alert("Mock download triggered.");
            return;
          }
          window.open(
            `${API_BASE_URL}/api/signature/requests/${documentId}/download/`,
            "_blank",
          );
        }}
        onEditAsNew={() => {}}
        onSaveAsTemplate={() => {}}
        onChangeOwnership={() => {}}
        onPrint={() => setIsPrintOpen(true)}
        onFormData={() => setIsFormDataOpen(true)}
        onActivityHistory={() => setIsActivityOpen(true)}
        onCopyDebugInfo={() => {
          const payload = JSON.stringify(
            {
              id: documentId,
              signatureRequestId: sourceReq?.signatureRequestId,
              status: sourceReq?.status,
            },
            null,
            2,
          );
          void navigator.clipboard?.writeText(payload);
        }}
        onViewLegalDisclosure={() => setIsLegalOpen(true)}
        onDelete={async () => {
          if (USE_MOCK_DATA) {
            router.push("/signature/documents");
            return;
          }
          const res = await fetch(
            `${API_BASE_URL}/api/signature/requests/${documentId}/`,
            {
              method: "DELETE",
            },
          );
          if (res.ok) {
            router.push("/signature/documents");
          }
        }}
      />

      <ExtendExpiryModal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        currentExpiryDateLabel={formatExpiryLabel(expiryDateIso)}
        currentExpiryDate={expiryDateIso}
        onSet={handleSetExpiry}
      />

      {/* Send Reminder Type Option Modal */}
      {isSendReminderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsSendReminderModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">Send Immediate Reminder</h3>
            <p className="text-xs text-gray-500">
              Choose the channel through which you want to remind pending
              recipients to sign.
            </p>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="reminderType"
                  value="email"
                  checked={reminderType === "email"}
                  onChange={() => setReminderType("email")}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Email Notification
                  </p>
                  <p className="text-xs text-gray-500">
                    Send an immediate reminder email to pending recipients.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="reminderType"
                  value="sms"
                  checked={reminderType === "sms"}
                  onChange={() => setReminderType("sms")}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    SMS Text Message
                  </p>
                  <p className="text-xs text-gray-500">
                    Send an immediate reminder SMS to pending recipients.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="reminderType"
                  value="both"
                  checked={reminderType === "both"}
                  onChange={() => setReminderType("both")}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Both Email & SMS
                  </p>
                  <p className="text-xs text-gray-500">
                    Trigger both communication channels simultaneously.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setIsSendReminderModalOpen(false)}
                className="px-4 py-2 bg-gray-100 rounded text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSendReminder}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium"
              >
                Send Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {isCertificateOpen && (sourceReq || findSignatureRequest(documentId)) ? (
        <CompletionCertificateModal
          req={sourceReq ?? findSignatureRequest(documentId)!}
          onClose={() => setIsCertificateOpen(false)}
        />
      ) : null}

      <SignatureComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        req={sourceReq ?? findSignatureRequest(documentId) ?? null}
        documentName={documentData.document.name}
        onSent={(message) => {
          setEmailFlash(message);
          window.setTimeout(() => setEmailFlash(null), 2800);
        }}
      />

      {isPrintOpen ? (
        <PrintDocumentsModal
          onClose={() => setIsPrintOpen(false)}
          onPrint={(mode) => {
            const req = sourceReq ?? findSignatureRequest(documentId);
            if (!req) {
              alert("No document is available to print yet.");
              return;
            }
            printSignatureDocuments(req, mode);
            setIsPrintOpen(false);
          }}
        />
      ) : null}

      {isFormDataOpen ? (
        <SimpleInfoDialog
          title="Form data"
          onClose={() => setIsFormDataOpen(false)}
        >
          {sourceReq?.fields?.length ? (
            <div className="space-y-2">
              {sourceReq.fields.map((field) => (
                <div
                  key={field.id}
                  className="flex justify-between gap-4 border-b border-slate-100 py-1.5 text-[13px]"
                >
                  <span className="text-slate-500">{field.label}</span>
                  <span className="text-right font-medium text-slate-800">
                    {field.value || "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">
              No form fields were captured on this document.
            </p>
          )}
        </SimpleInfoDialog>
      ) : null}

      {isActivityOpen ? (
        <SimpleInfoDialog
          title="Activity history"
          onClose={() => setIsActivityOpen(false)}
        >
          {sourceReq?.audit?.length ? (
            <div className="space-y-2">
              {sourceReq.audit.map((event) => (
                <div key={event.id} className="text-[13px]">
                  <p className="font-medium text-slate-800">{event.action}</p>
                  <p className="text-slate-500">
                    {event.actor} · {event.at}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-500">No activity yet.</p>
          )}
        </SimpleInfoDialog>
      ) : null}

      {isLegalOpen ? (
        <SimpleInfoDialog
          title="Legal disclosure"
          onClose={() => setIsLegalOpen(false)}
        >
          <p className="text-[13px] leading-6 text-slate-600">
            This electronic signature request is processed by FinConnex Sign.
            Recipients consent to do business electronically. The Certificate of
            Completion records signer identity, timestamps, IP address, and
            document identifiers for audit purposes. Keep the signed document
            and certificate together as your completion record.
          </p>
        </SimpleInfoDialog>
      ) : null}

      {/* View Document Preview Modal */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-lg">Document Preview</h3>
                <p className="text-xs text-gray-500 font-medium">
                  {documentData.document.name}
                </p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-auto bg-gray-100 p-4">
              {sourceReq ? (
                getRequestDocuments(sourceReq).map((doc, index) => (
                  <section key={doc.id} className="mx-auto w-full max-w-3xl">
                    {getRequestDocuments(sourceReq).length > 1 ? (
                      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Document {index + 1} of{" "}
                        {getRequestDocuments(sourceReq).length}
                        {doc.name ? ` · ${doc.name}` : ""}
                      </p>
                    ) : null}
                    <SignatureDocPreview
                      fileName={doc.fileName || sourceReq.documentFile}
                      fileUrl={
                        doc.fileUrl && !doc.fileUrl.startsWith("fc-file://")
                          ? doc.fileUrl
                          : index === 0
                            ? sourceReq.documentFileUrl
                            : ""
                      }
                      fields={
                        sourceReq.status === "Signed"
                          ? []
                          : sourceReq.fields.filter(
                              (field) =>
                                (field.documentId ?? "primary") === doc.id,
                            )
                      }
                      signers={sourceReq.signers}
                      pageWidth={720}
                      className="max-w-none shadow-sm"
                    />
                  </section>
                ))
              ) : documentData.document.documentFileUrl ? (
                <iframe
                  src={documentData.document.documentFileUrl}
                  className="h-full w-full rounded border bg-white"
                />
              ) : (
                <div className="w-full max-w-2xl space-y-4 rounded bg-white p-8 text-center shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Preview Mode
                  </p>
                  <h4 className="text-xl font-bold text-gray-800">
                    {documentData.document.name}
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {documentData.document.description ||
                      "This is the layout preview of the document as it appears to recipients for signing."}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end bg-white">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded text-sm font-medium hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Document Details Modal */}
      {isEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsEditOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">Modify Document Details</h3>
            <p className="text-xs text-gray-500">
              Update metadata or adjust fields/recipients depending on the
              workflow status.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Document Name
                </label>
                <input
                  type="text"
                  defaultValue={documentData.document.name}
                  className="mt-1 w-full border rounded p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  defaultValue={documentData.document.description}
                  className="mt-1 w-full border rounded p-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 bg-gray-100 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Changes saved locally!");
                  setIsEditOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings & Reminders Modal (Matching Reference Image Style with Date Validation) */}
      {isReminderSettingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsReminderSettingsOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2 text-blue-900 font-semibold text-base">
                <span className="text-xl">⚙️</span>
                <span>Settings & Reminders</span>
              </div>
              <button
                onClick={() => setIsReminderSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Expiration Date Section with min attribute constraint */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Expiration Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={getTodayIsoDate()}
                  value={modalExpiryDate}
                  onChange={(e) => setModalExpiryDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50/50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Automatic Reminders Section */}
            <div className="space-y-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAutoReminders}
                  onChange={(e) => setEnableAutoReminders(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-gray-900">
                  Automatic Reminders
                </span>
              </label>

              {enableAutoReminders && (
                <div className="space-y-3 pl-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Send reminder every
                    </label>
                    <select
                      value={reminderFrequencyDays}
                      onChange={(e) => setReminderFrequencyDays(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50/50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1 Day">1 Day</option>
                      <option value="3 Days">3 Days</option>
                      <option value="5 Days">5 Days</option>
                      <option value="7 Days">7 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Maximum reminders
                    </label>
                    <input
                      type="number"
                      value={maxReminders}
                      onChange={(e) => setMaxReminders(e.target.value)}
                      min="1"
                      max="20"
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-gray-50/50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons with programmatic validation check */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsReminderSettingsOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const todayStr = getTodayIsoDate();
                  if (modalExpiryDate < todayStr) {
                    alert("Expiration date cannot be earlier than today.");
                    return;
                  }
                  handleSetExpiry(modalExpiryDate);
                  alert(
                    `Settings & reminder rules saved successfully! (Remind every ${reminderFrequencyDays}, Max: ${maxReminders})`,
                  );
                  setIsReminderSettingsOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SimpleInfoDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-[16px] font-medium text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto px-5 py-4">{children}</div>
        <div className="flex justify-end px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-slate-300 px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function formatExpiryLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}
