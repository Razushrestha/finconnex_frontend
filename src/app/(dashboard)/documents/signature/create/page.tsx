// "use client";

// import { Suspense, useState, useEffect, useMemo, type DragEvent } from "react";
// import dynamic from "next/dynamic";
// import { useSearchParams, useRouter } from "next/navigation";
// import { ArrowLeft, Send } from "lucide-react";
// import { AdvancedOptionsSection } from "@/components/documents/signature/create/AdvancedOptionsSection";
// import { DocumentDetailsSection } from "@/components/documents/signature/create/DocumentDetailsSection";
// import { EmailMessageSection } from "@/components/documents/signature/create/EmailMessageSection";
// import { RecipientsSection } from "@/components/documents/signature/create/RecipientsSection";
// import {
//   nextSignatureIds,
//   upsertSignatureRequest,
//   type SignatureSigner,
// } from "@/lib/documents/signature/types";
// import type {
//   PlacedField,
//   DraggingFieldType,
// } from "@/components/documents/signature/create/PdfFieldEditor";

// // react-pdf uses canvas/browser-only APIs — must never render on the server
// const PdfFieldEditor = dynamic(
//   () => import("@/components/documents/signature/create/PdfFieldEditor"),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="flex items-center justify-center py-16 text-xs text-slate-400">
//         Loading PDF viewer…
//       </div>
//     ),
//   },
// );

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

// function CreateSignatureRequestForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const step = searchParams.get("step");
//   const isPlacingFields = step === "place-fields";

//   const [ids] = useState(() => nextSignatureIds());

//   const [documentName, setDocumentName] = useState("");

//   const [documentFile, setDocumentFile] = useState<File | null>(null);

//   const fileUrl = useMemo(() => {
//     if (!documentFile || !(documentFile instanceof File)) return "";
//     return URL.createObjectURL(documentFile);
//   }, [documentFile]);

//   const fileName = documentFile?.name || "Engagement Letter";

//   useEffect(() => {
//     return () => {
//       if (fileUrl) URL.revokeObjectURL(fileUrl);
//     };
//   }, [fileUrl]);

//   const [recipients, setRecipients] = useState<SignatureSigner[]>([]);

//   const [signingOrder, setSigningOrder] = useState<"sequential" | "parallel">(
//     "sequential",
//   );
//   const [enableReminders, setEnableReminders] = useState(false);
//   const [reminderDays, setReminderDays] = useState("5");
//   const [enableExpiry, setEnableExpiry] = useState(false);
//   const [expiryDate, setExpiryDate] = useState("");
//   const [expiryTime, setExpiryTime] = useState("");
//   const [ccRecipients, setCcRecipients] = useState<
//     { id: string; email: string }[]
//   >([]);

//   const [emailTitle, setEmailTitle] = useState(`Please sign: ${documentName}`);
//   const [emailMessage, setEmailMessage] = useState("");

//   const [fileError, setFileError] = useState("");

//   // ---- Field placement state ----
//   const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
//   const [draggingFieldType, setDraggingFieldType] =
//     useState<DraggingFieldType | null>(null);

//   const handleFileChange = (file: File | null) => {
//     setDocumentFile(file);
//     setFileError("");
//   };

//   const handleSaveDraft = () => {
//     if (!documentName.trim()) return;
//     upsertSignatureRequest({
//       id: ids.id,
//       signatureRequestId: ids.signatureRequestId,
//       documentName,
//       documentFile: documentFile?.name || "",
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
//     alert("Draft saved successfully!");
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

//     router.push("/documents/signature/create?step=place-fields");
//   };

//   const handleBackToForm = () => {
//     router.push("/documents/signature/create");
//   };

//   const standardFields = [
//     { type: "signature", label: "Signature" },
//     { type: "initials", label: "Initials" },
//     { type: "date", label: "Date" },
//     { type: "name", label: "Name" },
//     { type: "email", label: "Email" },
//     { type: "text", label: "Text" },
//     { type: "stamp", label: "Stamp" },
//     { type: "image", label: "Image" },
//     { type: "company", label: "Company" },
//     { type: "sign_date", label: "Sign Date" },
//     { type: "job_title", label: "Job title" },
//     { type: "checkbox", label: "Checkbox" },
//     { type: "dropdown", label: "Dropdown" },
//     { type: "radio", label: "Radio" },
//     { type: "payment", label: "Payment" },
//     { type: "attachment", label: "Attachment" },
//   ];

//   const handleSidebarDragStart = (
//     e: DragEvent<HTMLDivElement>,
//     field: (typeof standardFields)[number],
//   ) => {
//     e.dataTransfer.effectAllowed = "copy";
//     e.dataTransfer.setData("text/plain", field.type);
//     setDraggingFieldType(field);
//   };

//   const handleSidebarDragEnd = () => {
//     setDraggingFieldType(null);
//   };

//   const handleDropField = (page: number, xPct: number, yPct: number) => {
//     if (!draggingFieldType) return;
//     setPlacedFields((prev) => [
//       ...prev,
//       {
//         id: `field-${Date.now()}-${prev.length}`,
//         type: draggingFieldType.type,
//         label: draggingFieldType.label,
//         page,
//         xPct,
//         yPct,
//       },
//     ]);
//     setDraggingFieldType(null);
//   };

//   const handleRepositionField = (
//     id: string,
//     page: number,
//     xPct: number,
//     yPct: number,
//   ) => {
//     setPlacedFields((prev) =>
//       prev.map((f) => (f.id === id ? { ...f, page, xPct, yPct } : f)),
//     );
//   };

//   const handleRemovePlacedField = (id: string) => {
//     setPlacedFields((prev) => prev.filter((f) => f.id !== id));
//   };

//   // ==========================================
//   // STEP 2: PLACE FIELDS VIEW (?step=place-fields)
//   // ==========================================
//   if (isPlacingFields) {
//     return (
//       <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
//         <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-xs">
//           <div className="flex items-center gap-4">
//             <button
//               type="button"
//               onClick={handleBackToForm}
//               className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
//             >
//               <ArrowLeft className="w-4 h-4" />
//               <span>Create Signature Request</span>
//             </button>
//             <span className="text-slate-300">/</span>
//             <h1 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
//               Place Fields
//             </h1>
//           </div>
//         </header>

//         <div className="flex-1 flex flex-col md:flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full">
//           {/* Document Canvas Area (Displays uploaded PDF, page by page) */}
//           <div className="flex-1 bg-slate-100/80 rounded-sm border border-slate-200/80 flex items-start justify-center p-3 overflow-auto min-h-[750px] relative shadow-inner">
//             <div className="w-full max-w-[800px] flex flex-col gap-4">
//               <h2 className="text-sm font-bold text-slate-900">{fileName}</h2>

//               {fileUrl ? (
//                 <PdfFieldEditor
//                   fileUrl={fileUrl}
//                   placedFields={placedFields}
//                   draggingFieldType={draggingFieldType}
//                   pageWidth={700}
//                   onDropField={handleDropField}
//                   onRepositionField={handleRepositionField}
//                   onRemoveField={handleRemovePlacedField}
//                 />
//               ) : (
//                 <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-16">
//                   No document preview available. Please go back and upload a
//                   PDF.
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Right Sidebar: Standard Fields */}
//           <aside className="w-full md:w-80 bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-xs">
//             <div className="space-y-4">
//               <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
//                 Standard Fields
//               </h3>

//               <div className="grid grid-cols-2 gap-2.5">
//                 {standardFields.map((field) => {
//                   return (
//                     <div
//                       key={field.type}
//                       draggable
//                       onDragStart={(e) => handleSidebarDragStart(e, field)}
//                       onDragEnd={handleSidebarDragEnd}
//                       className="flex flex-col items-start gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
//                     >
//                       <span className="text-xs font-semibold text-slate-700">
//                         {field.label}
//                       </span>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>

//             <div className="mt-8 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
//               <p className="text-[11px] text-slate-500 font-medium">
//                 Drag fields onto the document.
//               </p>
//             </div>
//           </aside>
//         </div>

//         <footer className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shadow-lg">
//           <button
//             type="button"
//             onClick={handleBackToForm}
//             className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
//           >
//             Back to Recipients
//           </button>

//           <div className="flex items-center gap-4">
//             <button
//               type="button"
//               className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
//             >
//               Preview
//             </button>
//             <button
//               type="button"
//               className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
//             >
//               <span>Send Request</span>
//               <Send className="w-3.5 h-3.5" />
//             </button>
//           </div>
//         </footer>
//       </div>
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

//       <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-200 w-full p-3 flex items-center justify-between rounded-xl shadow-lg">
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

import { Suspense, useState, useEffect, useMemo, type DragEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import mammoth from "mammoth";
import { AdvancedOptionsSection } from "@/components/documents/signature/create/AdvancedOptionsSection";
import { DocumentDetailsSection } from "@/components/documents/signature/create/DocumentDetailsSection";
import { EmailMessageSection } from "@/components/documents/signature/create/EmailMessageSection";
import { RecipientsSection } from "@/components/documents/signature/create/RecipientsSection";
import { PlaceFieldsView } from "@/components/documents/signature/create/PlaceFieldsView";
import type { StandardFieldType } from "@/components/documents/signature/create/StandardFieldsSidebar";
import {
  nextSignatureIds,
  upsertSignatureRequest,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import type {
  PlacedField,
  DraggingFieldType,
} from "@/components/documents/signature/create/PdfFieldEditor";

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

function CreateSignatureRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step");
  const isPlacingFields = step === "place-fields";

  const [ids] = useState(() => nextSignatureIds());

  const [documentName, setDocumentName] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const fileUrl = useMemo(() => {
    if (!documentFile || !(documentFile instanceof File)) return "";
    return URL.createObjectURL(documentFile);
  }, [documentFile]);

  const fileName = documentFile?.name || "Engagement Letter";

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // Word Document conversion state
  const [docHtmlContent, setDocHtmlContent] = useState<string>("");
  const [isConvertingDoc, setIsConvertingDoc] = useState(false);

  useEffect(() => {
    async function convertDocx() {
      if (!documentFile) return;
      const isDocx =
        documentFile.name.endsWith(".docx") ||
        documentFile.name.endsWith(".doc");

      if (isDocx) {
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
    }

    convertDocx();
  }, [documentFile]);

  const [recipients, setRecipients] = useState<SignatureSigner[]>([]);
  const [signingOrder, setSigningOrder] = useState<"sequential" | "parallel">(
    "sequential",
  );
  const [enableReminders, setEnableReminders] = useState(false);
  const [reminderDays, setReminderDays] = useState("5");
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [ccRecipients, setCcRecipients] = useState<
    { id: string; email: string }[]
  >([]);

  const [emailTitle, setEmailTitle] = useState(`Please sign: ${documentName}`);
  const [emailMessage, setEmailMessage] = useState("");

  const [fileError, setFileError] = useState("");

  // Field placement state
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [draggingFieldType, setDraggingFieldType] =
    useState<DraggingFieldType | null>(null);

  const handleFileChange = (file: File | null) => {
    setDocumentFile(file);
    setFileError("");
  };

  const handleResizeField = (id: string, width: number, height: number) => {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, width, height } : f)),
    );
  };

  const handleSaveDraft = () => {
    if (!documentName.trim()) return;
    upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName,
      documentFile: documentFile?.name || "",
      signer: recipients[0]?.name || "",
      signerEmail: recipients[0]?.email || "",
      signers: recipients,
      fields: [],
      signingOrder,
      status: "Draft",
      expiryDate: expiryDate || "31/10/2026",
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
    alert("Draft saved successfully!");
  };

  const handleContinue = () => {
    if (!documentFile) {
      setFileError("Document file is required");
      return;
    }

    upsertSignatureRequest({
      id: ids.id,
      signatureRequestId: ids.signatureRequestId,
      documentName,
      documentFile: documentFile?.name || "",
      signer: recipients[0]?.name || "",
      signerEmail: recipients[0]?.email || "",
      signers: recipients,
      fields: [],
      signingOrder,
      status: "Draft",
      expiryDate: expiryDate || "31/10/2026",
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

    router.push("/documents/signature/create?step=place-fields");
  };

  const handleBackToForm = () => {
    router.push("/documents/signature/create");
  };

  const handleSidebarDragStart = (
    e: DragEvent<HTMLDivElement>,
    field: StandardFieldType,
  ) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", field.type);
    setDraggingFieldType(field);
  };

  const handleSidebarDragEnd = () => {
    setDraggingFieldType(null);
  };

  const handleDropField = (page: number, xPct: number, yPct: number) => {
    if (!draggingFieldType) return;
    setPlacedFields((prev) => [
      ...prev,
      {
        id: `field-${Date.now()}-${prev.length}`,
        type: draggingFieldType.type,
        label: draggingFieldType.label,
        page,
        xPct,
        yPct,
      },
    ]);
    setDraggingFieldType(null);
  };

  const handleRepositionField = (
    id: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, page, xPct, yPct } : f)),
    );
  };

  const handleRemovePlacedField = (id: string) => {
    setPlacedFields((prev) => prev.filter((f) => f.id !== id));
  };

  // ==========================================
  // STEP 2: PLACE FIELDS VIEW (?step=place-fields)
  // ==========================================
  if (isPlacingFields) {
    return (
      <PlaceFieldsView
        documentName={documentName}
        fileName={fileName}
        fileUrl={fileUrl}
        documentFile={documentFile}
        docHtmlContent={docHtmlContent}
        isConvertingDoc={isConvertingDoc}
        placedFields={placedFields}
        draggingFieldType={draggingFieldType}
        handleBackToForm={handleBackToForm}
        handleDropField={handleDropField}
        handleRepositionField={handleRepositionField}
        handleRemovePlacedField={handleRemovePlacedField}
        handleSidebarDragStart={handleSidebarDragStart}
        handleSidebarDragEnd={handleSidebarDragEnd}
        handleResizeField={handleResizeField}
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
        />

        <RecipientsSection
          signers={recipients}
          onChange={setRecipients}
          signingOrder={signingOrder}
          onToggleOrder={setSigningOrder}
          ccRecipients={ccRecipients}
          setCcRecipients={setCcRecipients}
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

      <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-200 w-full p-2 flex items-center justify-between rounded-xl shadow-lg">
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
