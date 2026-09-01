// "use client";

// import {
//   Suspense,
//   useState,
//   useEffect,
//   useMemo,
//   useRef,
//   type DragEvent,
// } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import mammoth from "mammoth";
// import { AdvancedOptionsSection } from "@/components/documents/signature/create/AdvancedOptionsSection";
// import {
//   DocumentDetailsSection,
//   type AdditionalDocument,
// } from "@/components/documents/signature/create/DocumentDetailsSection";
// import { EmailMessageSection } from "@/components/documents/signature/create/EmailMessageSection";
// import {
//   CcRecipient,
//   RecipientsSection,
// } from "@/components/documents/signature/create/RecipientsSection";
// import {
//   PlaceFieldsView,
//   type SignatureDocumentPreview,
// } from "@/components/documents/signature/create/PlaceFieldsView";
// import type { StandardFieldType } from "@/components/documents/signature/create/StandardFieldsSidebar";
// import {
//   nextSignatureIds,
//   upsertSignatureRequest,
//   markRequestSent,
//   type SignatureField,
//   type SignatureSigner,
// } from "@/lib/documents/signature/types";
// import type {
//   PlacedField,
//   DraggingFieldType,
// } from "@/components/documents/signature/create/PdfFieldEditor";
// import { toast } from "sonner";
// import { getNewlyNotifiedSigners } from "@/lib/documents/signature/mock-send";
// import { notifySigners } from "@/components/documents/signature/create/Notify";

// export default function CreateSignatureRequestPage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="flex min-h-[50vh] items-center justify-center text-[13px] text-slate-400">
//           Loading…
//         </div>
//       }
//     >
//       <CreateSignatureRequestForm />
//     </Suspense>
//   );
// }

// interface AdditionalDocPreview {
//   fileUrl: string;
//   persistentFileUrl: string;
//   docHtmlContent: string;
//   isConvertingDoc: boolean;
// }

// const isDocxFile = (file: File) =>
//   file.name.endsWith(".docx") || file.name.endsWith(".doc");

// // Converts the field-placement editor's PlacedField[] into the store's
// // SignatureField[] shape.
// // TODO: confirm PlacedField's actual width/height field names — guessed
// // here since PdfFieldEditor's type definition wasn't shared.
// function toSignatureFields(placed: PlacedField[]): SignatureField[] {
//   return placed
//     .filter((f) => f.recipientId) // a field with no assigned recipient can't be saved
//     .map((f) => ({
//       id: f.id,
//       documentId: f.documentId,
//       kind: f.type as SignatureField["kind"],
//       label: f.label,
//       x: f.xPct,
//       y: f.yPct,
//       w: typeof f.width === "number" && f.width <= 100 ? f.width : 20,
//       h: typeof f.height === "number" && f.height <= 20 ? f.height : 5,
//       page: f.page,
//       signerId: f.recipientId!,
//       required: true,
//     }));
// }

// function CreateSignatureRequestForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const step = searchParams.get("step");
//   const isPlacingFields = step === "place-fields";

//   const [ids] = useState(() => nextSignatureIds());

//   const [documentName, setDocumentName] = useState("");
//   const [documentFile, setDocumentFile] = useState<File | null>(null);
//   const [persistentFileUrl, setPersistentFileUrl] = useState<string>("");

//   const fileUrl = useMemo(() => {
//     if (!documentFile || !(documentFile instanceof File)) return "";
//     return URL.createObjectURL(documentFile);
//   }, [documentFile]);

//   useEffect(() => {
//     if (!documentFile || !(documentFile instanceof File)) {
//       setPersistentFileUrl("");
//       return;
//     }
//     const reader = new FileReader();
//     reader.onload = (e) => {
//       const result = e.target?.result as string;
//       if (result) setPersistentFileUrl(result);
//     };
//     reader.readAsDataURL(documentFile);
//   }, [documentFile]);

//   useEffect(() => {
//     return () => {
//       if (fileUrl) URL.revokeObjectURL(fileUrl);
//     };
//   }, [fileUrl]);

//   // Word Document conversion state (primary document)
//   const [docHtmlContent, setDocHtmlContent] = useState<string>("");
//   const [isConvertingDoc, setIsConvertingDoc] = useState(false);

//   useEffect(() => {
//     async function convertDocx() {
//       if (!documentFile) {
//         setDocHtmlContent("");
//         return;
//       }
//       if (!isDocxFile(documentFile)) {
//         setDocHtmlContent("");
//         return;
//       }

//       setIsConvertingDoc(true);
//       try {
//         const arrayBuffer = await documentFile.arrayBuffer();
//         const result = await mammoth.convertToHtml({ arrayBuffer });
//         setDocHtmlContent(result.value);
//       } catch (error) {
//         console.error("Error converting docx:", error);
//         setDocHtmlContent("<p>Error loading document preview.</p>");
//       } finally {
//         setIsConvertingDoc(false);
//       }
//     }

//     convertDocx();
//   }, [documentFile]);

//   // --- Additional documents: each needs its own object URL + (if docx) its
//   // own mammoth conversion. Keyed by AdditionalDocument.id.
//   const [additionalFiles, setAdditionalFiles] = useState<AdditionalDocument[]>(
//     [],
//   );
//   const [additionalPreviews, setAdditionalPreviews] = useState<
//     Record<string, AdditionalDocPreview>
//   >({});
//   const processedAdditionalIds = useRef<Set<string>>(new Set());

//   useEffect(() => {
//     const currentIds = new Set(additionalFiles.map((doc) => doc.id));

//     // Drop + revoke previews for files that were removed.
//     setAdditionalPreviews((prev) => {
//       let changed = false;
//       const next = { ...prev };
//       for (const id of Object.keys(next)) {
//         if (!currentIds.has(id)) {
//           URL.revokeObjectURL(next[id].fileUrl);
//           delete next[id];
//           processedAdditionalIds.current.delete(id);
//           changed = true;
//         }
//       }
//       return changed ? next : prev;
//     });

//     // Set up previews for newly added files only (avoids re-creating object
//     // URLs / re-running mammoth on every render).
//     additionalFiles.forEach((doc) => {
//       if (processedAdditionalIds.current.has(doc.id)) return;
//       processedAdditionalIds.current.add(doc.id);

//       const docFileUrl = URL.createObjectURL(doc.file);
//       const isDocx = isDocxFile(doc.file);

//       setAdditionalPreviews((prev) => ({
//         ...prev,
//         [doc.id]: {
//           fileUrl: docFileUrl,
//           persistentFileUrl: "",
//           docHtmlContent: "",
//           isConvertingDoc: isDocx,
//         },
//       }));

//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const result = e.target?.result as string;
//         if (result) {
//           setAdditionalPreviews((prev) => {
//             if (!prev[doc.id]) {
//               return prev;
//             }

//             return {
//               ...prev,
//               [doc.id]: {
//                 ...prev[doc.id],
//                 persistentFileUrl: result,
//               },
//             };
//           });
//         }
//       };
//       reader.readAsDataURL(doc.file);

//       if (isDocx) {
//         doc.file
//           .arrayBuffer()
//           .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
//           .then((result) => {
//             setAdditionalPreviews((prev) =>
//               prev[doc.id]
//                 ? {
//                     ...prev,
//                     [doc.id]: {
//                       ...prev[doc.id],
//                       docHtmlContent: result.value,
//                       isConvertingDoc: false,
//                     },
//                   }
//                 : prev,
//             );
//           })
//           .catch((error) => {
//             console.error("Error converting docx:", error);
//             setAdditionalPreviews((prev) =>
//               prev[doc.id]
//                 ? {
//                     ...prev,
//                     [doc.id]: {
//                       ...prev[doc.id],
//                       docHtmlContent: "<p>Error loading document preview.</p>",
//                       isConvertingDoc: false,
//                     },
//                   }
//                 : prev,
//             );
//           });
//       }
//     });
//   }, [additionalFiles]);

//   // Revoke any remaining additional-document object URLs on unmount.
//   useEffect(() => {
//     return () => {
//       Object.values(additionalPreviews).forEach((preview) =>
//         URL.revokeObjectURL(preview.fileUrl),
//       );
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Ordered list of every document to preview/sign — primary first, then
//   // additional documents in the order they were attached.
//   const documents: SignatureDocumentPreview[] = useMemo(() => {
//     const list: SignatureDocumentPreview[] = [];
//     if (documentFile) {
//       list.push({
//         id: "primary",
//         name: documentName || documentFile.name,
//         file: documentFile,
//         fileUrl,
//         docHtmlContent,
//         isConvertingDoc,
//       });
//     }
//     additionalFiles.forEach((doc) => {
//       const preview = additionalPreviews[doc.id];
//       list.push({
//         id: doc.id,
//         name: doc.name,
//         file: doc.file,
//         fileUrl: preview?.fileUrl ?? "",
//         docHtmlContent: preview?.docHtmlContent ?? "",
//         isConvertingDoc: preview?.isConvertingDoc ?? false,
//       });
//     });
//     return list;
//   }, [
//     documentFile,
//     documentName,
//     fileUrl,
//     docHtmlContent,
//     isConvertingDoc,
//     additionalFiles,
//     additionalPreviews,
//   ]);

//   const [recipients, setRecipients] = useState<SignatureSigner[]>([]);
//   const [signingOrder, setSigningOrder] = useState<"sequential" | "parallel">(
//     "sequential",
//   );
//   const [enableReminders, setEnableReminders] = useState(false);
//   const [reminderDays, setReminderDays] = useState("5");
//   const [enableExpiry, setEnableExpiry] = useState(false);
//   const [expiryDate, setExpiryDate] = useState("");
//   const [expiryTime, setExpiryTime] = useState("");
//   const [ccRecipients, setCcRecipients] = useState<CcRecipient[]>([]);

//   const [emailTitle, setEmailTitle] = useState(`Please sign: ${documentName}`);
//   const [emailMessage, setEmailMessage] = useState("");

//   const [fileError, setFileError] = useState("");

//   // Field placement state
//   const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
//   const [draggingFieldType, setDraggingFieldType] =
//     useState<DraggingFieldType | null>(null);

//   const handleFileChange = (file: File | null) => {
//     setDocumentFile(file);
//     setFileError("");
//   };

//   const handleResizeField = (id: string, width: number, height: number) => {
//     setPlacedFields((prev) =>
//       prev.map((f) => (f.id === id ? { ...f, width, height } : f)),
//     );
//   };

//   const handleSaveDraft = () => {
//     if (!documentName.trim()) return;
//     upsertSignatureRequest({
//       id: ids.id,
//       signatureRequestId: ids.signatureRequestId,
//       documentName,
//       documentFile: documentFile?.name || "",
//       documentFileUrl: persistentFileUrl || fileUrl,
//       signer: recipients[0]?.name || "",
//       signerEmail: recipients[0]?.email || "",
//       signers: recipients,
//       fields: [],
//       signingOrder,
//       status: "Draft",
//       expiryDate: expiryDate || "31/10/2026",
//       createdBy: "Current User",
//       manageToken: ids.manageToken,
//       audit: [
//         {
//           id: `a-${Date.now()}`,
//           at: new Date().toLocaleString(),
//           action: "Draft created",
//           actor: "Current User",
//         },
//       ],
//     });
//     toast.success("Draft saved successfully!");
//   };

//   const handleContinue = () => {
//     if (!documentFile) {
//       setFileError("Document file is required");
//       return;
//     }

//     upsertSignatureRequest({
//       id: ids.id,
//       signatureRequestId: ids.signatureRequestId,
//       documentName,
//       documentFile: documentFile?.name || "",
//       documentFileUrl: persistentFileUrl || fileUrl,
//       signer: recipients[0]?.name || "",
//       signerEmail: recipients[0]?.email || "",
//       signers: recipients,
//       fields: [],
//       signingOrder,
//       status: "Draft",
//       expiryDate: expiryDate || "31/10/2026",
//       createdBy: "Current User",
//       manageToken: ids.manageToken,
//       audit: [
//         {
//           id: `a-${Date.now()}`,
//           at: new Date().toLocaleString(),
//           action: "Initialized field placement",
//           actor: "Current User",
//         },
//       ],
//     });

//     router.push("/signature/create?step=place-fields");
//   };

//   const handleBackToForm = () => {
//     router.push("/signature/create");
//   };

//   const handleSidebarDragStart = (
//     e: DragEvent<HTMLDivElement>,
//     field: StandardFieldType,
//     recipient?: { id: string; name: string; email: string; colorIndex: number },
//   ) => {
//     e.dataTransfer.effectAllowed = "copy";
//     e.dataTransfer.setData("text/plain", field.type);
//     setDraggingFieldType(recipient ? { ...field, recipient } : field);
//   };

//   const handleSidebarDragEnd = () => {
//     setDraggingFieldType(null);
//   };

//   const handleDropField = (
//     documentId: string,
//     page: number,
//     xPct: number,
//     yPct: number,
//   ) => {
//     if (!draggingFieldType) return;
//     setPlacedFields((prev) => [
//       ...prev,
//       {
//         id: `field-${Date.now()}-${prev.length}`,
//         type: draggingFieldType.type,
//         label: draggingFieldType.label,
//         documentId,
//         page,
//         xPct,
//         yPct,
//         recipientId: draggingFieldType.recipient?.id,
//         colorIndex: draggingFieldType.recipient?.colorIndex,
//       },
//     ]);
//     setDraggingFieldType(null);
//   };

//   const handleRepositionField = (
//     id: string,
//     documentId: string,
//     page: number,
//     xPct: number,
//     yPct: number,
//   ) => {
//     setPlacedFields((prev) =>
//       prev.map((f) =>
//         f.id === id ? { ...f, documentId, page, xPct, yPct } : f,
//       ),
//     );
//   };

//   const handleRemovePlacedField = (id: string) => {
//     setPlacedFields((prev) => prev.filter((f) => f.id !== id));
//   };

//   // Called by PlaceFieldsView's "Send Request" button. Persists the request
//   // with the actual placed fields, marks it Sent, fires the (mock)
//   // notifications, and resolves with whoever was just notified so the test
//   // links modal can be shown before navigating away.
//   const handleSendForSignature = async (): Promise<SignatureSigner[]> => {
//     const fields = toSignatureFields(placedFields);

//     const draft = upsertSignatureRequest({
//       id: ids.id,
//       signatureRequestId: ids.signatureRequestId,
//       documentName,
//       documentFile: documentFile?.name || "",
//       documentFileUrl: persistentFileUrl || fileUrl,
//       signer: recipients[0]?.name || "",
//       signerEmail: recipients[0]?.email || "",
//       signers: recipients,
//       fields,
//       signingOrder,
//       status: "Draft",
//       expiryDate: expiryDate || "31/10/2026",
//       createdBy: "Current User",
//       manageToken: ids.manageToken,
//       audit: [
//         {
//           id: `a-${Date.now()}`,
//           at: new Date().toLocaleString(),
//           action: "Fields placed, ready to send",
//           actor: "Current User",
//         },
//       ],
//     });

//     const sent = markRequestSent(draft, "Current User");
//     const notified = getNewlyNotifiedSigners(draft, sent);
//     await notifySigners(sent, notified); // mock for now — logs the payload

//     return notified;
//   };

//   // ==========================================
//   // STEP 2: PLACE FIELDS VIEW (?step=place-fields)
//   // ==========================================
//   if (isPlacingFields) {
//     return (
//       <PlaceFieldsView
//         documentName={documentName}
//         documents={documents}
//         placedFields={placedFields}
//         draggingFieldType={draggingFieldType}
//         recipients={recipients}
//         handleBackToForm={handleBackToForm}
//         handleDropField={handleDropField}
//         handleRepositionField={handleRepositionField}
//         handleRemovePlacedField={handleRemovePlacedField}
//         handleSidebarDragStart={handleSidebarDragStart}
//         handleSidebarDragEnd={handleSidebarDragEnd}
//         handleResizeField={handleResizeField}
//         onSend={handleSendForSignature}
//       />
//     );
//   }

//   // ==========================================
//   // STEP 1: CREATE FORM VIEW (Default URL)
//   // ==========================================
//   return (
//     <div className="min-h-screen bg-background p-4 space-y-6">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div className="flex items-center gap-3">
//           <h1 className="text-lg font-bold text-foreground tracking-tight">
//             Create Signature Request
//           </h1>
//         </div>
//       </div>

//       <hr className="border-border" />

//       <div className="w-full space-y-4">
//         <DocumentDetailsSection
//           documentName={documentName}
//           documentFile={documentFile}
//           onChangeName={setDocumentName}
//           onChangeFile={handleFileChange}
//           error={fileError}
//           additionalFiles={additionalFiles}
//           onChangeAdditionalFiles={setAdditionalFiles}
//         />

//         <RecipientsSection
//           signers={recipients}
//           onChange={setRecipients}
//           signingOrder={signingOrder}
//           onToggleOrder={setSigningOrder}
//           ccRecipients={ccRecipients}
//           setCcRecipients={setCcRecipients}
//         />

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <AdvancedOptionsSection
//             enableReminders={enableReminders}
//             setEnableReminders={setEnableReminders}
//             reminderDays={reminderDays}
//             setReminderDays={setReminderDays}
//             enableExpiry={enableExpiry}
//             setEnableExpiry={setEnableExpiry}
//             expiryDate={expiryDate}
//             setExpiryDate={setExpiryDate}
//             expiryTime={expiryTime}
//             setExpiryTime={setExpiryTime}
//           />

//           <EmailMessageSection
//             title={emailTitle}
//             setTitle={setEmailTitle}
//             message={emailMessage}
//             setMessage={setEmailMessage}
//           />
//         </div>
//       </div>

//       <div className="sticky bottom-0 bg-white/85 backdrop-blur-md border-t border-slate-200 w-full p-2 flex items-center justify-between rounded-xl shadow-lg">
//         <button
//           type="button"
//           onClick={() => window.history.back()}
//           className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
//         >
//           Cancel
//         </button>
//         <div className="flex items-center gap-3">
//           <button
//             type="button"
//             onClick={handleSaveDraft}
//             className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
//           >
//             Save & New
//           </button>
//           <button
//             type="button"
//             onClick={handleContinue}
//             className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold transition-colors shadow-sm flex items-center gap-2"
//           >
//             <span>Continue to place fields</span>
//             <span>→</span>
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useRef,
  type DragEvent,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import mammoth from "mammoth";
import { AdvancedOptionsSection } from "@/components/documents/signature/create/AdvancedOptionsSection";
import {
  DocumentDetailsSection,
  renamedStoredFileName,
  type AdditionalDocument,
} from "@/components/documents/signature/create/DocumentDetailsSection";
import { EmailMessageSection } from "@/components/documents/signature/create/EmailMessageSection";
import {
  CcRecipient,
  RecipientsSection,
  firstRecipientMobileError,
} from "@/components/documents/signature/create/RecipientsSection";
import {
  PlaceFieldsView,
  type SignatureDocumentPreview,
} from "@/components/documents/signature/create/PlaceFieldsView";
import type { StandardFieldType } from "@/components/documents/signature/create/StandardFieldsSidebar";
import {
  nextSignatureIds,
  upsertSignatureRequest,
  markRequestSent,
  makeSigner,
  type SignatureField,
  type SignatureSigner,
  type SignatureDocument,
} from "@/lib/documents/signature/types";
import { tryCrmStorage, uploadCrmStorageFile } from "@/lib/storage/api";
import type {
  PlacedField,
  DraggingFieldType,
} from "@/components/documents/signature/create/PdfFieldEditor";
import { toast } from "sonner";
import { getNewlyNotifiedSigners } from "@/lib/documents/signature/mock-send";
import { notifySigners } from "@/components/documents/signature/create/Notify";

export default function CreateSignatureRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[13px] text-slate-400">
          Loading…
        </div>
      }
    >
      <CreateSignatureRequestForm />
    </Suspense>
  );
}

interface AdditionalDocPreview {
  /** blob: URL — only valid in this tab, used for the live editor preview. */
  fileUrl: string;
  /**
   * data: URL (base64) — same pattern as the primary document's
   * `persistentFileUrl`. This is what actually gets persisted onto the
   * request, since a blob: URL is dead the moment the recipient opens
   * their own browser/email client.
   */
  persistentFileUrl: string;
  docHtmlContent: string;
  isConvertingDoc: boolean;
}

const isDocxFile = (file: File) =>
  file.name.endsWith(".docx") || file.name.endsWith(".doc");

// Converts the field-placement editor's PlacedField[] into the store's
// SignatureField[] shape.
// TODO: confirm PlacedField's actual width/height field names — guessed
// here since PdfFieldEditor's type definition wasn't shared.
function toSignatureFields(placed: PlacedField[]): SignatureField[] {
  return placed
    .filter((f) => f.recipientId) // a field with no assigned recipient can't be saved
    .map((f) => ({
      id: f.id,
      kind: f.type as SignatureField["kind"],
      label: f.label,
      x: f.xPct,
      y: f.yPct,
      w: typeof f.width === "number" && f.width <= 100 ? f.width : 20,
      h: typeof f.height === "number" && f.height <= 20 ? f.height : 5,
      page: f.page,
      signerId: f.recipientId!,
      required: true,
      // Was silently dropped before — every field ended up looking like it
      // belonged to the primary document regardless of which of the
      // documents[] it was actually placed on.
      documentId: f.documentId,
    }));
}

function recipientsFromSearch(params: URLSearchParams): SignatureSigner[] {
  const raw = params.get("signers");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((row, index) => {
      if (!row || typeof row !== "object") return [];
      const name = String((row as { name?: unknown }).name ?? "").trim();
      const email = String((row as { email?: unknown }).email ?? "").trim();
      if (!name && !email) return [];
      return [
        makeSigner({
          id: `sg-lead-${index + 1}`,
          name,
          email,
          order: index + 1,
          token: `sig-lead-${index + 1}-${Date.now()}`,
          colorIndex: index,
        }),
      ];
    });
  } catch {
    return [];
  }
}

function CreateSignatureRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const isPlacingFields = step === "place-fields";

  const [ids] = useState(() => nextSignatureIds());
  const prefillDocumentName = searchParams.get("documentName")?.trim() || "";

  const [documentName, setDocumentName] = useState(prefillDocumentName);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [persistentFileUrl, setPersistentFileUrl] = useState<string>("");

  const fileUrl = useMemo(() => {
    if (!documentFile || !(documentFile instanceof File)) return "";
    return URL.createObjectURL(documentFile);
  }, [documentFile]);

  useEffect(() => {
    if (!documentFile || !(documentFile instanceof File)) {
      setPersistentFileUrl("");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) setPersistentFileUrl(result);
    };
    reader.readAsDataURL(documentFile);
  }, [documentFile]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // Word Document conversion state (primary document)
  const [docHtmlContent, setDocHtmlContent] = useState<string>("");
  const [isConvertingDoc, setIsConvertingDoc] = useState(false);

  useEffect(() => {
    async function convertDocx() {
      if (!documentFile) {
        setDocHtmlContent("");
        return;
      }
      if (!isDocxFile(documentFile)) {
        setDocHtmlContent("");
        return;
      }

      setIsConvertingDoc(true);
      try {
        const arrayBuffer = await documentFile.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocHtmlContent(result.value);
      } catch (error) {
        console.error("Error converting docx:", error);
        setDocHtmlContent("<p>Error loading document preview.</p>");
      } finally {
        setIsConvertingDoc(false);
      }
    }

    convertDocx();
  }, [documentFile]);

  // --- Additional documents: each needs its own object URL + (if docx) its
  // own mammoth conversion. Keyed by AdditionalDocument.id.
  const [additionalFiles, setAdditionalFiles] = useState<AdditionalDocument[]>(
    [],
  );
  const [additionalPreviews, setAdditionalPreviews] = useState<
    Record<string, AdditionalDocPreview>
  >({});
  const processedAdditionalIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(additionalFiles.map((doc) => doc.id));

    // Drop + revoke previews for files that were removed.
    setAdditionalPreviews((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!currentIds.has(id)) {
          URL.revokeObjectURL(next[id].fileUrl);
          delete next[id];
          processedAdditionalIds.current.delete(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    // Set up previews for newly added files only (avoids re-creating object
    // URLs / re-running mammoth on every render).
    additionalFiles.forEach((doc) => {
      if (processedAdditionalIds.current.has(doc.id)) return;
      processedAdditionalIds.current.add(doc.id);

      const docFileUrl = URL.createObjectURL(doc.file);
      const isDocx = isDocxFile(doc.file);

      setAdditionalPreviews((prev) => ({
        ...prev,
        [doc.id]: {
          fileUrl: docFileUrl,
          persistentFileUrl: "",
          docHtmlContent: "",
          isConvertingDoc: isDocx,
        },
      }));

      // Persistent copy so this document is still readable once the
      // request is saved and opened elsewhere (recipient's browser,
      // after a reload, etc.) — a blob: URL alone would 404 there.
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) return;
        setAdditionalPreviews((prev) =>
          prev[doc.id]
            ? {
                ...prev,
                [doc.id]: { ...prev[doc.id], persistentFileUrl: result },
              }
            : prev,
        );
      };
      reader.readAsDataURL(doc.file);

      if (isDocx) {
        doc.file
          .arrayBuffer()
          .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
          .then((result) => {
            setAdditionalPreviews((prev) =>
              prev[doc.id]
                ? {
                    ...prev,
                    [doc.id]: {
                      ...prev[doc.id],
                      docHtmlContent: result.value,
                      isConvertingDoc: false,
                    },
                  }
                : prev,
            );
          })
          .catch((error) => {
            console.error("Error converting docx:", error);
            setAdditionalPreviews((prev) =>
              prev[doc.id]
                ? {
                    ...prev,
                    [doc.id]: {
                      ...prev[doc.id],
                      docHtmlContent: "<p>Error loading document preview.</p>",
                      isConvertingDoc: false,
                    },
                  }
                : prev,
            );
          });
      }
    });
  }, [additionalFiles]);

  // Revoke any remaining additional-document object URLs on unmount.
  useEffect(() => {
    return () => {
      Object.values(additionalPreviews).forEach((preview) =>
        URL.revokeObjectURL(preview.fileUrl),
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ordered list of every document to preview/sign — primary first, then
  // additional documents in the order they were attached.
  const documents: SignatureDocumentPreview[] = useMemo(() => {
    const list: SignatureDocumentPreview[] = [];
    if (documentFile) {
      list.push({
        id: "primary",
        name: documentName || documentFile.name,
        file: documentFile,
        fileUrl,
        docHtmlContent,
        isConvertingDoc,
      });
    }
    additionalFiles.forEach((doc) => {
      const preview = additionalPreviews[doc.id];
      list.push({
        id: doc.id,
        name: doc.name,
        file: doc.file,
        fileUrl: preview?.fileUrl ?? "",
        docHtmlContent: preview?.docHtmlContent ?? "",
        isConvertingDoc: preview?.isConvertingDoc ?? false,
      });
    });
    return list;
  }, [
    documentFile,
    documentName,
    fileUrl,
    docHtmlContent,
    isConvertingDoc,
    additionalFiles,
    additionalPreviews,
  ]);

  // What actually gets persisted onto the request (SignatureDocument[]).
  // Unlike `documents` above (blob: URLs, editor-preview only), this uses
  // the data: URLs so every attached file — not just the primary PDF —
  // survives being opened by the recipient in a different browser/tab.
  const signatureDocuments: SignatureDocument[] = useMemo(() => {
    const list: SignatureDocument[] = [];
    if (documentFile) {
      list.push({
        id: "primary",
        name: documentName || documentFile.name,
        fileName: renamedStoredFileName(documentName, documentFile.name),
        fileUrl: persistentFileUrl,
      });
    }
    additionalFiles.forEach((doc) => {
      const preview = additionalPreviews[doc.id];
      list.push({
        id: doc.id,
        name: doc.name,
        fileName: renamedStoredFileName(doc.name, doc.file.name),
        fileUrl: preview?.persistentFileUrl || "",
      });
    });
    return list;
  }, [
    documentFile,
    documentName,
    persistentFileUrl,
    additionalFiles,
    additionalPreviews,
  ]);

  const storedFileName = documentFile
    ? renamedStoredFileName(documentName, documentFile.name)
    : "";

  const [recipients, setRecipients] = useState<SignatureSigner[]>(() =>
    recipientsFromSearch(searchParams),
  );
  const [relatedTo] = useState(() => {
    const kind = searchParams.get("relatedKind")?.trim();
    const name = searchParams.get("relatedName")?.trim();
    return kind && name ? `${kind}: ${name}` : undefined;
  });
  const [signingOrder, setSigningOrder] = useState<"sequential" | "parallel">(
    "sequential",
  );
  const [enableReminders, setEnableReminders] = useState(false);
  const [reminderDays, setReminderDays] = useState("5");
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [ccRecipients, setCcRecipients] = useState<CcRecipient[]>([]);

  const [emailTitle, setEmailTitle] = useState(
    prefillDocumentName ? `Please sign: ${prefillDocumentName}` : "Please sign:",
  );
  const [emailMessage, setEmailMessage] = useState(() => {
    const names = recipientsFromSearch(searchParams)
      .map((signer) => signer.name)
      .filter(Boolean);
    if (!names.length) return "";
    const greeting =
      names.length === 1 ? names[0] : `${names[0]} and ${names[1]}`;
    return `Hi ${greeting},\n\nPlease review and sign this document.`;
  });

  const [fileError, setFileError] = useState("");
  const [showRecipientErrors, setShowRecipientErrors] = useState(false);

  // Field placement state
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [draggingFieldType, setDraggingFieldType] =
    useState<DraggingFieldType | null>(null);

  const handleFileChange = (file: File | null) => {
    setDocumentFile(file);
    setFileError("");
    if (!file) return;
    void tryCrmStorage(() => uploadCrmStorageFile(file)).then((stored) => {
      if (stored?.url) setPersistentFileUrl(stored.url);
    });
  };

  const assertRecipientsReady = () => {
    const mobileError = firstRecipientMobileError(recipients, ccRecipients);
    if (mobileError) {
      setShowRecipientErrors(true);
      toast.error(mobileError);
      return false;
    }
    return true;
  };

  const handleResizeField = (id: string, width: number, height: number) => {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, width, height } : f)),
    );
  };

  const handleSaveDraft = () => {
    if (!documentName.trim()) return;
    if (!assertRecipientsReady()) return;
    upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName,
      documentFile: storedFileName,
      documentFileUrl: persistentFileUrl || fileUrl,
      documents: signatureDocuments,
      signer: recipients[0]?.name || "",
      signerEmail: recipients[0]?.email || "",
      signers: recipients,
      fields: [],
      signingOrder,
      status: "Draft",
      expiryDate: expiryDate || "31/10/2026",
      relatedTo,
      createdBy: "Current User",
      manageToken: ids.manageToken,
      audit: [
        {
          id: `a-${Date.now()}`,
          at: new Date().toLocaleString(),
          action: "Draft created",
          actor: "Current User",
        },
      ],
    });
    toast.success("Draft saved successfully!");
  };

  const handleContinue = () => {
    if (!documentFile) {
      setFileError("Document file is required");
      return;
    }
    if (!assertRecipientsReady()) return;

    upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName,
      documentFile: storedFileName,
      documentFileUrl: persistentFileUrl || fileUrl,
      documents: signatureDocuments,
      signer: recipients[0]?.name || "",
      signerEmail: recipients[0]?.email || "",
      signers: recipients,
      fields: [],
      signingOrder,
      status: "Draft",
      expiryDate: expiryDate || "31/10/2026",
      relatedTo,
      createdBy: "Current User",
      manageToken: ids.manageToken,
      audit: [
        {
          id: `a-${Date.now()}`,
          at: new Date().toLocaleString(),
          action: "Initialized field placement",
          actor: "Current User",
        },
      ],
    });

    const next = new URLSearchParams(searchParams.toString());
    next.set("step", "place-fields");
    router.push(`/signature/create?${next.toString()}`);
  };

  const handleBackToForm = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("step");
    const query = next.toString();
    router.push(query ? `/signature/create?${query}` : "/signature/create");
  };

  const handleSidebarDragStart = (
    e: DragEvent<HTMLDivElement>,
    field: StandardFieldType,
    recipient?: { id: string; name: string; email: string; colorIndex: number },
  ) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", field.type);
    setDraggingFieldType(recipient ? { ...field, recipient } : field);
  };

  const handleSidebarDragEnd = () => {
    setDraggingFieldType(null);
  };

  const handleDropField = (
    documentId: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => {
    if (!draggingFieldType) return;
    setPlacedFields((prev) => [
      ...prev,
      {
        id: `field-${Date.now()}-${prev.length}`,
        type: draggingFieldType.type,
        label: draggingFieldType.label,
        documentId,
        page,
        xPct,
        yPct,
        recipientId: draggingFieldType.recipient?.id,
        colorIndex: draggingFieldType.recipient?.colorIndex,
      },
    ]);
    setDraggingFieldType(null);
  };

  const handleRepositionField = (
    id: string,
    documentId: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => {
    setPlacedFields((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, documentId, page, xPct, yPct } : f,
      ),
    );
  };

  const handleRemovePlacedField = (id: string) => {
    setPlacedFields((prev) => prev.filter((f) => f.id !== id));
  };

  // Called by PlaceFieldsView's "Send Request" button. Persists the request
  // with the actual placed fields, marks it Sent, fires the (mock)
  // notifications, and resolves with whoever was just notified so the test
  // links modal can be shown before navigating away.
  const handleSendForSignature = async (): Promise<SignatureSigner[]> => {
    if (!assertRecipientsReady()) return [];
    const fields = toSignatureFields(placedFields);

    const draft = upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName,
      documentFile: storedFileName,
      documentFileUrl: persistentFileUrl || fileUrl,
      documents: signatureDocuments,
      signer: recipients[0]?.name || "",
      signerEmail: recipients[0]?.email || "",
      signers: recipients,
      fields,
      signingOrder,
      status: "Draft",
      expiryDate: expiryDate || "31/10/2026",
      relatedTo,
      createdBy: "Current User",
      manageToken: ids.manageToken,
      audit: [
        {
          id: `a-${Date.now()}`,
          at: new Date().toLocaleString(),
          action: "Fields placed, ready to send",
          actor: "Current User",
        },
      ],
    });

    const sent = markRequestSent(draft, "Current User");
    const notified = getNewlyNotifiedSigners(draft, sent);
    await notifySigners(sent, notified); // mock for now — logs the payload

    return notified;
  };

  // ==========================================
  // STEP 2: PLACE FIELDS VIEW (?step=place-fields)
  // ==========================================
  if (isPlacingFields) {
    return (
      <PlaceFieldsView
        documentName={documentName}
        documents={documents}
        placedFields={placedFields}
        draggingFieldType={draggingFieldType}
        recipients={recipients}
        handleBackToForm={handleBackToForm}
        handleDropField={handleDropField}
        handleRepositionField={handleRepositionField}
        handleRemovePlacedField={handleRemovePlacedField}
        handleSidebarDragStart={handleSidebarDragStart}
        handleSidebarDragEnd={handleSidebarDragEnd}
        handleResizeField={handleResizeField}
        onSend={handleSendForSignature}
      />
    );
  }

  // ==========================================
  // STEP 1: CREATE FORM VIEW (Default URL)
  // ==========================================
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Create Signature Request
          </h1>
        </div>
      </div>

      <hr className="border-border" />

      <div className="w-full space-y-4">
        <DocumentDetailsSection
          documentName={documentName}
          documentFile={documentFile}
          onChangeName={setDocumentName}
          onChangeFile={handleFileChange}
          error={fileError}
          additionalFiles={additionalFiles}
          onChangeAdditionalFiles={setAdditionalFiles}
        />

        <RecipientsSection
          signers={recipients}
          onChange={setRecipients}
          signingOrder={signingOrder}
          onToggleOrder={setSigningOrder}
          ccRecipients={ccRecipients}
          setCcRecipients={setCcRecipients}
          showValidationErrors={showRecipientErrors}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AdvancedOptionsSection
            enableReminders={enableReminders}
            setEnableReminders={setEnableReminders}
            reminderDays={reminderDays}
            setReminderDays={setReminderDays}
            enableExpiry={enableExpiry}
            setEnableExpiry={setEnableExpiry}
            expiryDate={expiryDate}
            setExpiryDate={setExpiryDate}
            expiryTime={expiryTime}
            setExpiryTime={setExpiryTime}
          />

          <EmailMessageSection
            title={emailTitle}
            setTitle={setEmailTitle}
            message={emailMessage}
            setMessage={setEmailMessage}
          />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white/85 backdrop-blur-md border-t border-slate-200 w-full p-2 flex items-center justify-between rounded-xl shadow-lg">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            Save & New
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold transition-colors shadow-sm flex items-center gap-2"
          >
            <span>Continue to place fields</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
