"use client";

import { DocumentSummaryData } from "@/components/documents/signature/documents/detail/DocumentSummaryCard";
import { ExtendExpiryModal } from "@/components/documents/signature/documents/detail/ExtendExpiryModal";
import { RecipientStatusData } from "@/components/documents/signature/documents/detail/RecipientStatusRow";
import { SignatureDocumentDetailView } from "@/components/documents/signature/documents/detail/SignatureDocumentDetailView";
import {
  listSignatureRequests,
  signedCount,
  type SignatureAuditEvent,
  type SignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MockSignatureDocument {
  document: DocumentSummaryData;
  recipients: RecipientStatusData[];
}

// Set to true while developing frontend-only without the Django backend
const USE_MOCK_DATA = true;
const API_BASE_URL = "http://182.93.94.220:8010";

/**
 * The route param can be either the internal record id ("sr1") or the
 * human-facing signatureRequestId ("ES-2001") — the old mock matched on
 * the latter, so we check both here.
 */
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

// Builds the view-model the detail page renders, from a real SignatureRequest
// record instead of a fixed hardcoded object.
function mapRequestToView(req: SignatureRequest): MockSignatureDocument {
  const actionable = req.signers.filter((s) => s.role !== "CC");
  const signed = signedCount(req);
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
      completionPercent:
        actionable.length > 0
          ? Math.round((signed / actionable.length) * 100)
          : 0,
      documentFileUrl: req.documentFileUrl || "",
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
  const [isLoading, setIsLoading] = useState(true);

  // Expiry states
  const [expiryDateIso, setExpiryDateIso] = useState("2026-07-25");
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

  useEffect(() => {
    async function loadDocumentDetail() {
      if (!documentId) return;
      setIsLoading(true);

      if (USE_MOCK_DATA) {
        setTimeout(() => {
          const req = findSignatureRequest(documentId);
          setDocumentData(req ? mapRequestToView(req) : null);
          const iso = toIsoDate(req?.expiryDate);
          if (iso) setExpiryDateIso(iso);
          setIsLoading(false);
        }, 200);
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/signature/requests/${documentId}/`,
        );
        if (res.ok) {
          const data = await res.json();
          setDocumentData({
            document: {
              name: data.documentName || data.name || "Untitled Document",
              ownerName: data.ownerName || data.owner || "Admin",
              description: data.description,
              submittedAtLabel: data.sentDate || data.submittedAt || "N/A",
              lastUpdatedAtLabel: data.lastActivity || data.updatedAt || "N/A",
              completionPercent: data.completionPercent || 0,
            },
            recipients: (data.signers || data.recipients || []).map(
              (s: any, idx: number) => ({
                id: s.id || `${documentId}-r${idx + 1}`,
                order: s.order || idx + 1,
                name: s.name || "Recipient",
                email: s.email || "",
                accessInfo: s.accessInfo || "Waiting for access",
                mailed: s.mailed ?? true,
                viewed: s.viewed ?? false,
                signed: s.signed ?? s.status === "Signed",
              }),
            ),
          });

          if (data.expiryDate) {
            setExpiryDateIso(data.expiryDate);
          }
        } else {
          const req = findSignatureRequest(documentId);
          setDocumentData(req ? mapRequestToView(req) : null);
          const iso = toIsoDate(req?.expiryDate);
          if (iso) setExpiryDateIso(iso);
        }
      } catch (error) {
        console.warn("Backend offline, using local mock data.");
        const req = findSignatureRequest(documentId);
        setDocumentData(req ? mapRequestToView(req) : null);
        const iso = toIsoDate(req?.expiryDate);
        if (iso) setExpiryDateIso(iso);
      } finally {
        setIsLoading(false);
      }
    }

    loadDocumentDetail();
  }, [documentId]);

  const handleBack = () => {
    router.push("/signature/documents");
  };

  const handleSetExpiry = async (newExpiryDate: string) => {
    setExpiryDateIso(newExpiryDate);
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
      <SignatureDocumentDetailView
        document={documentData.document}
        recipients={documentData.recipients}
        onBack={handleBack}
        onViewDocument={() => {}}
        onEdit={() => {}}
        onCorrectDocument={() => {}}
        onExtend={() => setIsExtendModalOpen(true)}
        onSendReminder={async () => {
          if (USE_MOCK_DATA) {
            alert("Mock reminder sent successfully!");
            return;
          }
          await fetch(
            `${API_BASE_URL}/api/signature/requests/${documentId}/remind/`,
            {
              method: "POST",
            },
          );
        }}
        onReminderSettings={() => {}}
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
        onEmailDocument={() => {}}
        onSaveToCloud={() => {}}
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
        onPrint={() => {
          window.print();
        }}
        onActivityHistory={() => {}}
        onCopyDebugInfo={() => {
          navigator.clipboard?.writeText(documentId);
        }}
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
    </>
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
