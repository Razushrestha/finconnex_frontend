// "use client";

// import {
//   Send,
//   ArrowLeft,
//   ChevronDown,
//   ChevronRight,
//   Loader2,
//   BookmarkPlus,
// } from "lucide-react";
// import { useEffect, useState, type DragEvent, type MouseEvent } from "react";
// import dynamic from "next/dynamic";
// import {
//   StandardFieldsSidebar,
//   type StandardFieldType,
// } from "./StandardFieldsSidebar";
// import type {
//   PlacedField,
//   DraggingFieldType,
// } from "@/components/documents/signature/create/PdfFieldEditor";
// import {
//   SignatureSigner,
//   SIGNER_COLORS,
// } from "@/lib/documents/signature/types";
// import { useRouter } from "next/navigation";
// import { toast } from "sonner";
// import { MockSendLinksModal } from "./MockSendLinksModal";

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

// /** One document to preview, in the order it should be displayed/signed. */
// export interface SignatureDocumentPreview {
//   /** "primary" for the main document, or an AdditionalDocument's id. */
//   id: string;
//   /** Display name shown above this document's pages. */
//   name: string;
//   file: File | null;
//   fileUrl: string;
//   /** Rendered HTML preview for non-PDF (Word) documents. */
//   docHtmlContent: string;
//   isConvertingDoc: boolean;
// }

// interface PlaceFieldsViewProps {
//   /** Overall request or template name, shown once above the whole document list. */
//   documentName: string;
//   /** Documents in sequence order — the primary document first, then additionalFiles in upload order. */
//   documents: SignatureDocumentPreview[];
//   placedFields: PlacedField[];
//   draggingFieldType: DraggingFieldType | null;
//   recipients: SignatureSigner[];
//   /** Flag to switch between 'request' mode and 'template' mode */
//   isTemplate?: boolean;
//   handleBackToForm: () => void;
//   handleDropField: (
//     documentId: string,
//     page: number,
//     xPct: number,
//     yPct: number,
//   ) => void;
//   handleRepositionField: (
//     id: string,
//     documentId: string,
//     page: number,
//     xPct: number,
//     yPct: number,
//   ) => void;
//   handleResizeField?: (id: string, width: number, height: number) => void;
//   handleRemovePlacedField: (id: string) => void;
//   handleSidebarDragStart: (
//     e: DragEvent<HTMLDivElement>,
//     field: StandardFieldType,
//   ) => void;
//   handleSidebarDragEnd: () => void;
//   /** Optional custom handler when saving as a template */
//   handleSaveTemplate?: () => void;
//   /**
//    * Persists the request with placed fields, marks it sent, and fires the
//    * (currently mock) notifications. Resolves with whoever was just notified,
//    * so we can show test links before navigating away.
//    */
//   onSend?: () => Promise<SignatureSigner[]>;
// }

// const isPdfDocument = (file: File | null) =>
//   file?.type === "application/pdf" || file?.name.endsWith(".pdf");

// export function PlaceFieldsView({
//   documentName,
//   documents = [],
//   placedFields,
//   draggingFieldType,
//   recipients,
//   isTemplate = false,
//   handleBackToForm,
//   handleDropField,
//   handleRepositionField,
//   handleResizeField,
//   handleRemovePlacedField,
//   handleSidebarDragStart,
//   handleSidebarDragEnd,
//   handleSaveTemplate,
//   onSend,
// }: PlaceFieldsViewProps) {
//   const router = useRouter();
//   const [activeResizingId, setActiveResizingId] = useState<string | null>(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [testLinksFor, setTestLinksFor] = useState<SignatureSigner[] | null>(
//     null,
//   );

//   const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

//   useEffect(() => {
//     if (documents.length === 0) {
//       setExpandedDocId(null);
//       return;
//     }
//     setExpandedDocId((current) => {
//       if (current && documents.some((doc) => doc.id === current)) {
//         return current;
//       }
//       return documents[0].id;
//     });
//   }, [documents]);

//   const toggleExpandedDoc = (docId: string) => {
//     setExpandedDocId((current) => (current === docId ? null : docId));
//   };

//   const handleSubmitAction = async () => {
//     setIsSubmitting(true);

//     try {
//       if (isTemplate) {
//         if (handleSaveTemplate) {
//           handleSaveTemplate();
//         } else {
//           toast.success("Template created successfully!");
//           router.push("/signature/templates");
//         }
//         return;
//       }

//       if (onSend) {
//         const notified = await onSend();
//         toast.success("Signature request sent successfully!");
//         // Hold off navigating so the test links are actually usable —
//         // we redirect once the person closes this modal instead.
//         setTestLinksFor(notified);
//       } else {
//         // Fallback if no onSend was wired up yet — old behavior.
//         toast.success("Signature request sent successfully!");
//         router.push("/signature/documents");
//       }
//     } catch (error) {
//       console.error("Failed to process submission:", error);
//       toast.error(
//         isTemplate
//           ? "Failed to save template."
//           : "Failed to send signature request.",
//       );
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const makeContainerDropHandler =
//     (documentId: string) => (e: DragEvent<HTMLDivElement>) => {
//       e.preventDefault();
//       const rect = e.currentTarget.getBoundingClientRect();
//       const x = e.clientX - rect.left;
//       const y = e.clientY - rect.top;
//       const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
//       const yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));

//       if (activeResizingId) {
//         handleRepositionField(activeResizingId, documentId, 1, xPct, yPct);
//         setActiveResizingId(null);
//       } else if (draggingFieldType) {
//         handleDropField(documentId, 1, xPct, yPct);
//       }
//     };

//   const startResizing = (
//     e: MouseEvent,
//     fieldId: string,
//     currentWidth = 140,
//     currentHeight = 36,
//   ) => {
//     e.stopPropagation();
//     e.preventDefault();

//     const startX = e.clientX;
//     const startY = e.clientY;

//     const onMouseMove = (moveEvent: MouseEvent) => {
//       const deltaX = moveEvent.clientX - startX;
//       const deltaY = moveEvent.clientY - startY;
//       const newWidth = Math.max(80, currentWidth + deltaX);
//       const newHeight = Math.max(30, currentHeight + deltaY);

//       if (handleResizeField) {
//         handleResizeField(fieldId, newWidth, newHeight);
//       }
//     };

//     const onMouseUp = () => {
//       window.removeEventListener("mousemove", onMouseMove as any);
//       window.removeEventListener("mouseup", onMouseUp);
//     };

//     window.addEventListener("mousemove", onMouseMove as any);
//     window.addEventListener("mouseup", onMouseUp);
//   };

//   return (
//     <div className="h-screen bg-slate-50 flex flex-col justify-between overflow-hidden">
//       <header className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shadow-xs shrink-0">
//         <div className="flex items-center gap-4">
//           <button
//             type="button"
//             onClick={handleBackToForm}
//             className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
//           >
//             <ArrowLeft className="w-4 h-4" />
//             <span>
//               {isTemplate ? "Create Template" : "Create Signature Request"}
//             </span>
//           </button>
//           <span className="text-slate-300">/</span>
//           <h1 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
//             Place Fields
//           </h1>
//         </div>
//       </header>

//       <div className="flex-1 flex flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full overflow-hidden">
//         {/* Document Canvas Area */}
//         <div className="flex-1 bg-slate-100/80 rounded-sm border border-slate-200/80 flex items-start justify-center p-3 overflow-y-auto h-full relative shadow-inner">
//           <div className="w-full max-w-[800px] flex flex-col gap-4">
//             <h2 className="text-sm font-bold text-slate-900">
//               {documentName.trim() ||
//                 (isTemplate ? "Untitled template" : "Untitled request")}
//             </h2>

//             {documents.length === 0 ? (
//               <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-16">
//                 No document preview available. Please go back and upload a valid
//                 file.
//               </div>
//             ) : (
//               documents.map((doc, index) => {
//                 const isPdf = isPdfDocument(doc.file);
//                 const handleContainerDrop = makeContainerDropHandler(doc.id);
//                 const isExpanded = expandedDocId === doc.id;

//                 return (
//                   <div
//                     key={doc.id}
//                     className="flex flex-col gap-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
//                   >
//                     <button
//                       type="button"
//                       onClick={() => toggleExpandedDoc(doc.id)}
//                       className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
//                     >
//                       <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold flex items-center justify-center">
//                         {index + 1}
//                       </span>
//                       <h3 className="flex-1 text-xs font-semibold text-slate-700 truncate">
//                         {doc.name}
//                       </h3>
//                       {isExpanded ? (
//                         <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
//                       ) : (
//                         <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
//                       )}
//                     </button>

//                     {isExpanded && (
//                       <div className="px-4 pb-4">
//                         {doc.fileUrl ? (
//                           isPdf ? (
//                             <PdfFieldEditor
//                               documentId={doc.id}
//                               fileUrl={doc.fileUrl}
//                               placedFields={placedFields}
//                               draggingFieldType={draggingFieldType}
//                               pageWidth={700}
//                               onDropField={handleDropField}
//                               onRepositionField={handleRepositionField}
//                               onRemoveField={handleRemovePlacedField}
//                               onResizeField={handleResizeField}
//                             />
//                           ) : (
//                             <div
//                               className="relative bg-white p-8 rounded-xl border border-slate-200 shadow-sm min-h-[900px] select-none"
//                               onDragOver={(e) => e.preventDefault()}
//                               onDrop={handleContainerDrop}
//                             >
//                               {doc.isConvertingDoc ? (
//                                 <div className="flex items-center justify-center py-16 text-xs text-slate-400">
//                                   Converting Word document preview…
//                                 </div>
//                               ) : (
//                                 <div
//                                   className="prose prose-sm max-w-none relative text-slate-800 pointer-events-none"
//                                   dangerouslySetInnerHTML={{
//                                     __html: doc.docHtmlContent,
//                                   }}
//                                 />
//                               )}

//                               {placedFields
//                                 .filter((field) => field.documentId === doc.id)
//                                 .map((field) => {
//                                   const width = field.width || 140;
//                                   const height = field.height || 36;
//                                   const color =
//                                     field.colorIndex != null
//                                       ? SIGNER_COLORS[field.colorIndex]
//                                       : SIGNER_COLORS[0];

//                                   return (
//                                     <div
//                                       key={field.id}
//                                       draggable
//                                       onDragStart={(e) => {
//                                         e.stopPropagation();
//                                         setActiveResizingId(field.id);
//                                       }}
//                                       onDragEnd={() =>
//                                         setActiveResizingId(null)
//                                       }
//                                       style={{
//                                         left: `${field.xPct}%`,
//                                         top: `${field.yPct}%`,
//                                         width: `${width}px`,
//                                         height: `${height}px`,
//                                       }}
//                                       className={`absolute -translate-x-2 -translate-y-2 text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center justify-between cursor-grab active:cursor-grabbing z-10 group border-2 border-dashed ${
//                                         color
//                                           ? `${color.bg} ${color.text} ${color.border}`
//                                           : "bg-indigo-50/90 text-indigo-700 border-indigo-400"
//                                       }`}
//                                     >
//                                       {field.type === "checkbox" ? (
//                                         <input
//                                           type="checkbox"
//                                           disabled
//                                           className="w-3.5 h-3.5 accent-current pointer-events-none shrink-0"
//                                         />
//                                       ) : field.type === "date" ||
//                                         field.type === "sign_date" ? (
//                                         <input
//                                           type="date"
//                                           disabled
//                                           className="w-full bg-transparent text-[11px] font-semibold pointer-events-none outline-none border-none"
//                                         />
//                                       ) : field.type === "dropdown" ? (
//                                         <select
//                                           disabled
//                                           className="w-full bg-transparent text-[11px] font-semibold pointer-events-none outline-none border-none appearance-none truncate"
//                                         >
//                                           <option>{field.label}</option>
//                                         </select>
//                                       ) : (
//                                         <span className="truncate">
//                                           {field.label}
//                                         </span>
//                                       )}
//                                       <button
//                                         type="button"
//                                         onClick={(e) => {
//                                           e.stopPropagation();
//                                           handleRemovePlacedField(field.id);
//                                         }}
//                                         className="text-indigo-400 hover:text-red-600 font-bold ml-1 relative z-20"
//                                       >
//                                         ×
//                                       </button>

//                                       {/* Resize handles */}
//                                       <div
//                                         onMouseDown={(e) =>
//                                           startResizing(
//                                             e,
//                                             field.id,
//                                             width,
//                                             height,
//                                           )
//                                         }
//                                         className="absolute -right-1 top-0 w-2 h-full cursor-ew-resize z-20"
//                                       />
//                                       <div
//                                         onMouseDown={(e) =>
//                                           startResizing(
//                                             e,
//                                             field.id,
//                                             width,
//                                             height,
//                                           )
//                                         }
//                                         className="absolute left-0 -bottom-1 w-full h-2 cursor-ns-resize z-20"
//                                       />
//                                       <div
//                                         onMouseDown={(e) =>
//                                           startResizing(
//                                             e,
//                                             field.id,
//                                             width,
//                                             height,
//                                           )
//                                         }
//                                         className="absolute -right-1 -bottom-1 w-4 h-4 cursor-se-resize z-30"
//                                       />
//                                     </div>
//                                   );
//                                 })}
//                             </div>
//                           )
//                         ) : (
//                           <div className="flex items-center justify-center text-xs text-slate-400 py-16">
//                             No preview available for this file.
//                           </div>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         </div>

//         {/* Standard Fields Sidebar */}
//         <StandardFieldsSidebar
//           recipients={recipients}
//           onDragStart={handleSidebarDragStart}
//           onDragEnd={handleSidebarDragEnd}
//         />
//       </div>

//       <footer className="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-between shadow-lg shrink-0">
//         <button
//           type="button"
//           onClick={handleBackToForm}
//           className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
//         >
//           {isTemplate ? "Back to Template Details" : "Back to Recipients"}
//         </button>

//         <div className="flex items-center gap-4">
//           <button
//             type="button"
//             className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
//           >
//             Preview
//           </button>
//           <button
//             type="button"
//             onClick={handleSubmitAction}
//             disabled={isSubmitting}
//             className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
//           >
//             {isSubmitting ? (
//               <>
//                 <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                 <span>{isTemplate ? "Saving..." : "Sending..."}</span>
//               </>
//             ) : isTemplate ? (
//               <>
//                 <span>Save Template</span>
//                 <BookmarkPlus className="w-3.5 h-3.5" />
//               </>
//             ) : (
//               <>
//                 <span>Send Request</span>
//                 <Send className="w-3.5 h-3.5" />
//               </>
//             )}
//           </button>
//         </div>
//       </footer>

//       {testLinksFor && (
//         <MockSendLinksModal
//           signers={testLinksFor}
//           onClose={() => {
//             setTestLinksFor(null);
//             router.push("/signature/documents");
//           }}
//         />
//       )}
//     </div>
//   );
// }

"use client";

import {
  Send,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  BookmarkPlus,
  FileWarning,
} from "lucide-react";
import { useEffect, useState, type DragEvent, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import {
  StandardFieldsSidebar,
  type StandardFieldType,
} from "./StandardFieldsSidebar";
import type {
  PlacedField,
  DraggingFieldType,
} from "@/components/documents/signature/create/PdfFieldEditor";
import {
  SignatureSigner,
  SIGNER_COLORS,
} from "@/lib/documents/signature/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MockSendLinksModal } from "./MockSendLinksModal";

const PdfFieldEditor = dynamic(
  () => import("@/components/documents/signature/create/PdfFieldEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16 text-xs text-slate-400">
        Loading PDF viewer…
      </div>
    ),
  },
);

/** One document to preview, in the order it should be displayed/signed. */
export interface SignatureDocumentPreview {
  /** "primary" for the main document, or an AdditionalDocument's id. */
  id: string;
  /** Display name shown above this document's pages. */
  name: string;
  file: File | null;
  fileUrl: string;
  /** Rendered HTML preview for non-PDF (Word) documents. */
  docHtmlContent: string;
  isConvertingDoc: boolean;
}

interface PlaceFieldsViewProps {
  /** Overall request or template name, shown once above the whole document list. */
  documentName: string;
  /** Documents in sequence order — the primary document first, then additionalFiles in upload order. */
  documents: SignatureDocumentPreview[];
  placedFields: PlacedField[];
  draggingFieldType: DraggingFieldType | null;
  recipients: SignatureSigner[];
  /** Flag to switch between 'request' mode and 'template' mode */
  isTemplate?: boolean;
  handleBackToForm: () => void;
  handleDropField: (
    documentId: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => void;
  handleRepositionField: (
    id: string,
    documentId: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => void;
  handleResizeField?: (id: string, width: number, height: number) => void;
  handleRemovePlacedField: (id: string) => void;
  handleSidebarDragStart: (
    e: DragEvent<HTMLDivElement>,
    field: StandardFieldType,
  ) => void;
  handleSidebarDragEnd: () => void;
  /** Optional custom handler when saving as a template */
  handleSaveTemplate?: () => void;
  /**
   * Persists the request with placed fields, marks it sent, and fires the
   * (currently mock) notifications. Resolves with whoever was just notified,
   * so we can show test links before navigating away.
   */
  onSend?: () => Promise<SignatureSigner[]>;
}

const isPdfDocument = (file: File | null) =>
  file?.type === "application/pdf" || file?.name.endsWith(".pdf");

export function PlaceFieldsView({
  documentName,
  documents = [],
  placedFields,
  draggingFieldType,
  recipients,
  isTemplate = false,
  handleBackToForm,
  handleDropField,
  handleRepositionField,
  handleResizeField,
  handleRemovePlacedField,
  handleSidebarDragStart,
  handleSidebarDragEnd,
  handleSaveTemplate,
  onSend,
}: PlaceFieldsViewProps) {
  const router = useRouter();
  const [activeResizingId, setActiveResizingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testLinksFor, setTestLinksFor] = useState<SignatureSigner[] | null>(
    null,
  );

  // Every document is expanded by default so nothing is hidden behind a
  // collapsed accordion row. Tracks a *set* of open ids (not a single one)
  // so multiple documents can stay open at once.
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (documents.length === 0) {
      setExpandedDocIds(new Set());
      return;
    }
    setExpandedDocIds((current) => {
      // Preserve any manual collapse/expand the user already did; just add
      // newly-arrived documents (e.g. additional files attached after this
      // effect first ran) to the open set rather than resetting everything.
      const next = new Set(current);
      documents.forEach((doc) => {
        if (!next.has(doc.id) && !current.has(doc.id)) {
          next.add(doc.id);
        }
      });
      return next;
    });
    // Only re-run when the set of document ids actually changes, not on
    // every content update (e.g. docHtmlContent streaming in).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents.map((d) => d.id).join(",")]);

  const toggleExpandedDoc = (docId: string) => {
    setExpandedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleSubmitAction = async () => {
    setIsSubmitting(true);

    try {
      if (isTemplate) {
        if (handleSaveTemplate) {
          handleSaveTemplate();
        } else {
          toast.success("Template created successfully!");
          router.push("/signature/templates");
        }
        return;
      }

      if (onSend) {
        const notified = await onSend();
        toast.success("Signature request sent successfully!");
        // Hold off navigating so the test links are actually usable —
        // we redirect once the person closes this modal instead.
        setTestLinksFor(notified);
      } else {
        // Fallback if no onSend was wired up yet — old behavior.
        toast.success("Signature request sent successfully!");
        router.push("/signature/documents");
      }
    } catch (error) {
      console.error("Failed to process submission:", error);
      toast.error(
        isTemplate
          ? "Failed to save template."
          : "Failed to send signature request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const makeContainerDropHandler =
    (documentId: string) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const yPct = Math.max(0, Math.min(100, (y / rect.height) * 100));

      if (activeResizingId) {
        handleRepositionField(activeResizingId, documentId, 1, xPct, yPct);
        setActiveResizingId(null);
      } else if (draggingFieldType) {
        handleDropField(documentId, 1, xPct, yPct);
      }
    };

  const startResizing = (
    e: MouseEvent,
    fieldId: string,
    currentWidth = 140,
    currentHeight = 36,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newWidth = Math.max(80, currentWidth + deltaX);
      const newHeight = Math.max(30, currentHeight + deltaY);

      if (handleResizeField) {
        handleResizeField(fieldId, newWidth, newHeight);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove as any);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove as any);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col justify-between overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBackToForm}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>
              {isTemplate ? "Create Template" : "Create Signature Request"}
            </span>
          </button>
          <span className="text-slate-300">/</span>
          <h1 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Place Fields
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-row p-6 gap-6 max-w-[1600px] mx-auto w-full overflow-hidden">
        {/* Document Canvas Area */}
        <div className="flex-1 bg-slate-100/80 rounded-sm border border-slate-200/80 flex items-start justify-center p-3 overflow-y-auto h-full relative shadow-inner">
          <div className="w-full max-w-[800px] flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-900">
              {documentName.trim() ||
                (isTemplate ? "Untitled template" : "Untitled request")}
            </h2>

            {documents.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-16">
                No document preview available. Please go back and upload a valid
                file.
              </div>
            ) : (
              documents.map((doc, index) => {
                const isPdf = isPdfDocument(doc.file);
                const handleContainerDrop = makeContainerDropHandler(doc.id);
                const isExpanded = expandedDocIds.has(doc.id);

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpandedDoc(doc.id)}
                      className="flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <span className="shrink-0 w-5 h-5 rounded-full bg-slate-900/80 text-white text-[10px] font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <h3 className="flex-1 text-xs font-semibold text-slate-700 truncate">
                        {doc.name}
                      </h3>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {doc.fileUrl ? (
                          isPdf ? (
                            <PdfFieldEditor
                              documentId={doc.id}
                              fileUrl={doc.fileUrl}
                              placedFields={placedFields}
                              draggingFieldType={draggingFieldType}
                              pageWidth={700}
                              onDropField={handleDropField}
                              onRepositionField={handleRepositionField}
                              onRemoveField={handleRemovePlacedField}
                              onResizeField={handleResizeField}
                            />
                          ) : (
                            <div
                              className="relative bg-white p-8 rounded-xl border border-slate-200 shadow-sm min-h-[900px] select-none"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={handleContainerDrop}
                            >
                              {doc.isConvertingDoc ? (
                                <div className="flex items-center justify-center py-16 text-xs text-slate-400">
                                  Converting Word document preview…
                                </div>
                              ) : doc.docHtmlContent ? (
                                <div
                                  className="prose prose-sm max-w-none relative text-slate-800 pointer-events-none"
                                  dangerouslySetInnerHTML={{
                                    __html: doc.docHtmlContent,
                                  }}
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center gap-2 py-16 text-xs text-slate-400">
                                  <FileWarning className="h-8 w-8 text-slate-300" />
                                  <p className="font-medium text-slate-600">
                                    {doc.name}
                                  </p>
                                  <p className="max-w-xs text-center">
                                    Preview isn&apos;t available for this file
                                    type — fields can still be placed below.
                                  </p>
                                </div>
                              )}

                              {placedFields
                                .filter((field) => field.documentId === doc.id)
                                .map((field) => {
                                  const width = field.width || 140;
                                  const height = field.height || 36;
                                  const color =
                                    field.colorIndex != null
                                      ? SIGNER_COLORS[field.colorIndex]
                                      : SIGNER_COLORS[0];

                                  return (
                                    <div
                                      key={field.id}
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        setActiveResizingId(field.id);
                                      }}
                                      onDragEnd={() =>
                                        setActiveResizingId(null)
                                      }
                                      style={{
                                        left: `${field.xPct}%`,
                                        top: `${field.yPct}%`,
                                        width: `${width}px`,
                                        height: `${height}px`,
                                      }}
                                      className={`absolute -translate-x-2 -translate-y-2 text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center justify-between cursor-grab active:cursor-grabbing z-10 group border-2 border-dashed ${
                                        color
                                          ? `${color.bg} ${color.text} ${color.border}`
                                          : "bg-indigo-50/90 text-indigo-700 border-indigo-400"
                                      }`}
                                    >
                                      {field.type === "checkbox" ? (
                                        <input
                                          type="checkbox"
                                          disabled
                                          className="w-3.5 h-3.5 accent-current pointer-events-none shrink-0"
                                        />
                                      ) : field.type === "date" ||
                                        field.type === "sign_date" ? (
                                        <input
                                          type="date"
                                          disabled
                                          className="w-full bg-transparent text-[11px] font-semibold pointer-events-none outline-none border-none"
                                        />
                                      ) : field.type === "dropdown" ? (
                                        <select
                                          disabled
                                          className="w-full bg-transparent text-[11px] font-semibold pointer-events-none outline-none border-none appearance-none truncate"
                                        >
                                          <option>{field.label}</option>
                                        </select>
                                      ) : (
                                        <span className="truncate">
                                          {field.label}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemovePlacedField(field.id);
                                        }}
                                        className="text-indigo-400 hover:text-red-600 font-bold ml-1 relative z-20"
                                      >
                                        ×
                                      </button>

                                      {/* Resize handles */}
                                      <div
                                        onMouseDown={(e) =>
                                          startResizing(
                                            e,
                                            field.id,
                                            width,
                                            height,
                                          )
                                        }
                                        className="absolute -right-1 top-0 w-2 h-full cursor-ew-resize z-20"
                                      />
                                      <div
                                        onMouseDown={(e) =>
                                          startResizing(
                                            e,
                                            field.id,
                                            width,
                                            height,
                                          )
                                        }
                                        className="absolute left-0 -bottom-1 w-full h-2 cursor-ns-resize z-20"
                                      />
                                      <div
                                        onMouseDown={(e) =>
                                          startResizing(
                                            e,
                                            field.id,
                                            width,
                                            height,
                                          )
                                        }
                                        className="absolute -right-1 -bottom-1 w-4 h-4 cursor-se-resize z-30"
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 text-xs text-slate-400 py-16">
                            <FileWarning className="h-8 w-8 text-slate-300" />
                            <p className="font-medium text-slate-600">
                              {doc.name}
                            </p>
                            <p>No preview available for this file.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Standard Fields Sidebar */}
        <StandardFieldsSidebar
          recipients={recipients}
          onDragStart={handleSidebarDragStart}
          onDragEnd={handleSidebarDragEnd}
        />
      </div>

      <footer className="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-between shadow-lg shrink-0">
        <button
          type="button"
          onClick={handleBackToForm}
          className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          {isTemplate ? "Back to Template Details" : "Back to Recipients"}
        </button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleSubmitAction}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isTemplate ? "Saving..." : "Sending..."}</span>
              </>
            ) : isTemplate ? (
              <>
                <span>Save Template</span>
                <BookmarkPlus className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Send Request</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </footer>

      {testLinksFor && (
        <MockSendLinksModal
          signers={testLinksFor}
          onClose={() => {
            setTestLinksFor(null);
            router.push("/signature/documents");
          }}
        />
      )}
    </div>
  );
}
