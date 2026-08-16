"use client";

import { DocumentSummaryData } from "@/components/documents/signature/documents/detail/DocumentSummaryCard";
import { ExtendExpiryModal } from "@/components/documents/signature/documents/detail/ExtendExpiryModal";
import { RecipientStatusData } from "@/components/documents/signature/documents/detail/RecipientStatusRow";
import { SignatureDocumentDetailView } from "@/components/documents/signature/documents/detail/SignatureDocumentDetailView";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MockSignatureDocument {
  document: DocumentSummaryData;
  recipients: RecipientStatusData[];
}

// Set to true while developing frontend-only without the Django backend
const USE_MOCK_DATA = true;
const API_BASE_URL = "http://182.93.94.220:8010";

// Always returns the realistic engagement letter details as default mock data
function getMockSignatureDocument(id: string): MockSignatureDocument {
  return {
    document: {
      name:
        id === "ES-2001"
          ? "Engagement Letter: Anderson"
          : `Engagement Letter (${id})`,
      ownerName: "William Anderson",
      description: "Professional services engagement agreement.",
      submittedAtLabel: "18/07/2026 09:05",
      lastUpdatedAtLabel: "18/07/2026 09:05",
      completionPercent: 50,
    },
    recipients: [
      {
        id: `${id}-r1`,
        order: 1,
        name: "John Smith",
        email: "william@example.com",
        accessInfo: "Accessed using Web at 18/07/2026 09:05",
        mailed: true,
        viewed: true,
        signed: false,
      },
    ],
  };
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
          setDocumentData(getMockSignatureDocument(documentId));
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
          setDocumentData(getMockSignatureDocument(documentId));
        }
      } catch (error) {
        console.warn("Backend offline, using local mock data.");
        setDocumentData(getMockSignatureDocument(documentId));
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
