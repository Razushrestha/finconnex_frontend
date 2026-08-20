// "use client";

// import { DocumentSummaryData } from "@/components/documents/signature/documents/detail/DocumentSummaryCard";
// import { ExtendExpiryModal } from "@/components/documents/signature/documents/detail/ExtendExpiryModal";
// import { RecipientStatusData } from "@/components/documents/signature/documents/detail/RecipientStatusRow";
// import { SignatureDocumentDetailView } from "@/components/documents/signature/documents/detail/SignatureDocumentDetailView";
// import {
//   listSignatureRequests,
//   signedCount,
//   type SignatureAuditEvent,
//   type SignatureRequest,
//   type SignatureSigner,
// } from "@/lib/documents/signature/types";
// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useState } from "react";

// interface MockSignatureDocument {
//   document: DocumentSummaryData;
//   recipients: RecipientStatusData[];
// }

// // Set to true while developing frontend-only without the Django backend
// const USE_MOCK_DATA = true;
// const API_BASE_URL = "http://182.93.94.220:8010";

// /**
//  * The route param can be either the internal record id ("sr1") or the
//  * human-facing signatureRequestId ("ES-2001") — the old mock matched on
//  * the latter, so we check both here.
//  */
// function findSignatureRequest(
//   documentId: string,
// ): SignatureRequest | undefined {
//   return listSignatureRequests().find(
//     (r) => r.id === documentId || r.signatureRequestId === documentId,
//   );
// }

// function toIsoDate(ddmmyyyy?: string): string | null {
//   if (!ddmmyyyy) return null;
//   const [day, month, year] = ddmmyyyy.split("/");
//   if (!day || !month || !year) return null;
//   return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
// }

// function describeAccess(
//   signer: SignatureSigner,
//   audit: SignatureAuditEvent[],
// ): string {
//   if (signer.status === "Signed" && signer.signedAt) {
//     return `Signed at ${signer.signedAt}`;
//   }
//   const viewedEvent = audit.find(
//     (a) => a.actor === signer.name && a.action.toLowerCase().includes("viewed"),
//   );
//   if (viewedEvent) return `Accessed using Web at ${viewedEvent.at}`;
//   if (signer.status === "Declined") return "Declined to sign";
//   if (signer.status === "Sent") return "Waiting for signer to open";
//   return "Not yet sent";
// }

// // Builds the view-model the detail page renders, from a real SignatureRequest
// // record instead of a fixed hardcoded object.
// function mapRequestToView(req: SignatureRequest): MockSignatureDocument {
//   const actionable = req.signers.filter((s) => s.role !== "CC");
//   const signed = signedCount(req);
//   const sentEvent = req.audit.find((a) =>
//     a.action.toLowerCase().includes("sent for signature"),
//   );
//   const lastEvent = req.audit[req.audit.length - 1];

//   return {
//     document: {
//       name: req.documentName,
//       ownerName: req.createdBy,
//       description: req.relatedTo
//         ? `Related to ${req.relatedTo}`
//         : "Signature request document.",
//       submittedAtLabel: sentEvent?.at ?? req.sentDate ?? "Not sent yet",
//       lastUpdatedAtLabel: lastEvent?.at ?? req.sentDate ?? "N/A",
//       completionPercent:
//         actionable.length > 0
//           ? Math.round((signed / actionable.length) * 100)
//           : 0,
//       documentFileUrl: req.documentFileUrl || "",
//     },
//     recipients: req.signers.map((s) => ({
//       id: s.id,
//       order: s.order,
//       name: s.name,
//       email: s.email,
//       accessInfo: describeAccess(s, req.audit),
//       mailed: s.status !== "Pending",
//       viewed:
//         s.status === "Viewed" ||
//         s.status === "Signed" ||
//         s.status === "Declined",
//       signed: s.status === "Signed",
//     })),
//   };
// }

// export default function SignatureDocumentDetailPage() {
//   const router = useRouter();
//   const params = useParams<{ id: string }>();
//   const documentId = params.id;

//   const [documentData, setDocumentData] =
//     useState<MockSignatureDocument | null>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   // Expiry states
//   const [expiryDateIso, setExpiryDateIso] = useState("2026-07-25");
//   const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);

//   useEffect(() => {
//     async function loadDocumentDetail() {
//       if (!documentId) return;
//       setIsLoading(true);

//       if (USE_MOCK_DATA) {
//         setTimeout(() => {
//           const req = findSignatureRequest(documentId);
//           setDocumentData(req ? mapRequestToView(req) : null);
//           const iso = toIsoDate(req?.expiryDate);
//           if (iso) setExpiryDateIso(iso);
//           setIsLoading(false);
//         }, 200);
//         return;
//       }

//       try {
//         const res = await fetch(
//           `${API_BASE_URL}/api/signature/requests/${documentId}/`,
//         );
//         if (res.ok) {
//           const data = await res.json();
//           setDocumentData({
//             document: {
//               name: data.documentName || data.name || "Untitled Document",
//               ownerName: data.ownerName || data.owner || "Admin",
//               description: data.description,
//               submittedAtLabel: data.sentDate || data.submittedAt || "N/A",
//               lastUpdatedAtLabel: data.lastActivity || data.updatedAt || "N/A",
//               completionPercent: data.completionPercent || 0,
//             },
//             recipients: (data.signers || data.recipients || []).map(
//               (s: any, idx: number) => ({
//                 id: s.id || `${documentId}-r${idx + 1}`,
//                 order: s.order || idx + 1,
//                 name: s.name || "Recipient",
//                 email: s.email || "",
//                 accessInfo: s.accessInfo || "Waiting for access",
//                 mailed: s.mailed ?? true,
//                 viewed: s.viewed ?? false,
//                 signed: s.signed ?? s.status === "Signed",
//               }),
//             ),
//           });

//           if (data.expiryDate) {
//             setExpiryDateIso(data.expiryDate);
//           }
//         } else {
//           const req = findSignatureRequest(documentId);
//           setDocumentData(req ? mapRequestToView(req) : null);
//           const iso = toIsoDate(req?.expiryDate);
//           if (iso) setExpiryDateIso(iso);
//         }
//       } catch (error) {
//         console.warn("Backend offline, using local mock data.");
//         const req = findSignatureRequest(documentId);
//         setDocumentData(req ? mapRequestToView(req) : null);
//         const iso = toIsoDate(req?.expiryDate);
//         if (iso) setExpiryDateIso(iso);
//       } finally {
//         setIsLoading(false);
//       }
//     }

//     loadDocumentDetail();
//   }, [documentId]);

//   const handleBack = () => {
//     router.push("/signature/documents");
//   };

//   const handleSetExpiry = async (newExpiryDate: string) => {
//     setExpiryDateIso(newExpiryDate);
//     if (USE_MOCK_DATA) return;

//     try {
//       await fetch(
//         `${API_BASE_URL}/api/signature/requests/${documentId}/extend/`,
//         {
//           method: "PATCH",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ expiryDate: newExpiryDate }),
//         },
//       );
//     } catch (error) {
//       console.error("Failed to update expiry date:", error);
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex h-[50vh] w-full items-center justify-center text-xs text-slate-400">
//         Loading document details...
//       </div>
//     );
//   }

//   if (!documentData) {
//     return (
//       <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-2 text-xs text-slate-400">
//         <p>Document not found or failed to load.</p>
//         <button
//           onClick={handleBack}
//           className="text-blue-600 underline font-semibold"
//         >
//           Back to documents
//         </button>
//       </div>
//     );
//   }

//   return (
//     <>
//       <SignatureDocumentDetailView
//         document={documentData.document}
//         recipients={documentData.recipients}
//         onBack={handleBack}
//         onViewDocument={() => {}}
//         onEdit={() => {}}
//         onCorrectDocument={() => {}}
//         onExtend={() => setIsExtendModalOpen(true)}
//         onSendReminder={async () => {
//           if (USE_MOCK_DATA) {
//             alert("Mock reminder sent successfully!");
//             return;
//           }
//           await fetch(
//             `${API_BASE_URL}/api/signature/requests/${documentId}/remind/`,
//             {
//               method: "POST",
//             },
//           );
//         }}
//         onReminderSettings={() => {}}
//         onRecall={async () => {
//           if (USE_MOCK_DATA) {
//             alert("Mock document recalled.");
//             return;
//           }
//           await fetch(
//             `${API_BASE_URL}/api/signature/requests/${documentId}/recall/`,
//             {
//               method: "POST",
//             },
//           );
//         }}
//         onUploadSignedDocument={() => {}}
//         onEmailDocument={() => {}}
//         onSaveToCloud={() => {}}
//         onDownload={() => {
//           if (USE_MOCK_DATA) {
//             alert("Mock download triggered.");
//             return;
//           }
//           window.open(
//             `${API_BASE_URL}/api/signature/requests/${documentId}/download/`,
//             "_blank",
//           );
//         }}
//         onEditAsNew={() => {}}
//         onSaveAsTemplate={() => {}}
//         onChangeOwnership={() => {}}
//         onPrint={() => {
//           window.print();
//         }}
//         onActivityHistory={() => {}}
//         onCopyDebugInfo={() => {
//           navigator.clipboard?.writeText(documentId);
//         }}
//         onDelete={async () => {
//           if (USE_MOCK_DATA) {
//             router.push("/signature/documents");
//             return;
//           }
//           const res = await fetch(
//             `${API_BASE_URL}/api/signature/requests/${documentId}/`,
//             {
//               method: "DELETE",
//             },
//           );
//           if (res.ok) {
//             router.push("/signature/documents");
//           }
//         }}
//       />

//       <ExtendExpiryModal
//         isOpen={isExtendModalOpen}
//         onClose={() => setIsExtendModalOpen(false)}
//         currentExpiryDateLabel={formatExpiryLabel(expiryDateIso)}
//         currentExpiryDate={expiryDateIso}
//         onSet={handleSetExpiry}
//       />
//     </>
//   );
// }

// function formatExpiryLabel(isoDate: string): string {
//   const date = new Date(`${isoDate}T00:00:00`);
//   if (Number.isNaN(date.getTime())) return isoDate;
//   return new Intl.DateTimeFormat("en-US", {
//     month: "short",
//     day: "2-digit",
//     year: "numeric",
//   }).format(date);
// }

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

  // Interactive Feature States
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
    async function loadDocumentDetail() {
      if (!documentId) return;
      setIsLoading(true);

      if (USE_MOCK_DATA) {
        setTimeout(() => {
          const req = findSignatureRequest(documentId);
          setDocumentData(req ? mapRequestToView(req) : null);
          const iso = toIsoDate(req?.expiryDate);
          if (iso) {
            setExpiryDateIso(iso);
            setModalExpiryDate(iso);
          }
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
              documentFileUrl: data.documentFileUrl || "",
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
            setModalExpiryDate(data.expiryDate);
          }
        } else {
          const req = findSignatureRequest(documentId);
          setDocumentData(req ? mapRequestToView(req) : null);
          const iso = toIsoDate(req?.expiryDate);
          if (iso) {
            setExpiryDateIso(iso);
            setModalExpiryDate(iso);
          }
        }
      } catch (error) {
        console.warn("Backend offline, using local mock data.");
        const req = findSignatureRequest(documentId);
        setDocumentData(req ? mapRequestToView(req) : null);
        const iso = toIsoDate(req?.expiryDate);
        if (iso) {
          setExpiryDateIso(iso);
          setModalExpiryDate(iso);
        }
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
      <SignatureDocumentDetailView
        document={documentData.document}
        recipients={documentData.recipients}
        onBack={handleBack}
        onViewDocument={() => setIsPreviewOpen(true)}
        onEdit={() => setIsEditOpen(true)}
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

            <div className="p-4 flex-1 bg-gray-100 flex items-center justify-center overflow-auto">
              {documentData.document.documentFileUrl ? (
                <iframe
                  src={documentData.document.documentFileUrl}
                  className="w-full h-full border rounded bg-white"
                />
              ) : (
                <div className="bg-white p-8 rounded shadow-sm w-full max-w-2xl space-y-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                    Preview Mode
                  </p>
                  <h4 className="text-xl font-bold text-gray-800">
                    {documentData.document.name}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
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

function formatExpiryLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}
