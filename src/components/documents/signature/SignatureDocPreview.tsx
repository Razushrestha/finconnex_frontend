// "use client";

// import dynamic from "next/dynamic";
// import { Calendar, PenLine, Type, User } from "lucide-react";
// import {
//   SIGNER_COLORS,
//   fieldKindLabel,
//   type SignatureField,
//   type SignatureSigner,
// } from "@/lib/documents/signature/types";
// import { cn } from "@/lib/utils";

// const PdfDocViewer = dynamic(() => import("./PdfDocViewer"), {
//   ssr: false,
//   loading: () => (
//     <div className="flex min-h-[340px] items-center justify-center text-xs text-slate-400">
//       Loading document preview…
//     </div>
//   ),
// });

// function FieldIcon({ kind }: { kind: SignatureField["kind"] }) {
//   switch (kind) {
//     case "signature":
//     case "initials":
//       return <PenLine className="h-3 w-3 shrink-0" />;
//     case "date":
//       return <Calendar className="h-3 w-3 shrink-0" />;
//     case "name":
//       return <User className="h-3 w-3 shrink-0" />;
//     default:
//       return <Type className="h-3 w-3 shrink-0" />;
//   }
// }

// function renderValue(field: SignatureField) {
//   if (!field.value) return null;
//   if (
//     (field.kind === "signature" || field.kind === "initials") &&
//     field.value.startsWith("typed:")
//   ) {
//     return (
//       <span className="font-serif text-[13px] leading-tight text-slate-800">
//         {field.value.replace(/^typed:/, "")}
//       </span>
//     );
//   }
//   if (
//     (field.kind === "signature" || field.kind === "initials") &&
//     field.value.startsWith("data:")
//   ) {
//     return (
//       // eslint-disable-next-line @next/next/no-img-element
//       <img
//         src={field.value}
//         alt=""
//         className="h-full max-h-10 w-full object-contain"
//       />
//     );
//   }
//   return (
//     <span className="text-[11px] font-semibold text-slate-800">
//       {field.value}
//     </span>
//   );
// }

// export function SignatureDocPreview({
//   fileName,
//   fileUrl,
//   fields,
//   signers,
//   selectedFieldId,
//   highlightSignerId,
//   interactive,
//   onCanvasClick,
//   onFieldClick,
//   onFieldPointerDown,
//   className,
// }: {
//   fileName: string;
//   fileUrl?: string;
//   fields: SignatureField[];
//   signers: SignatureSigner[];
//   selectedFieldId?: string | null;
//   highlightSignerId?: string | null;
//   interactive?: boolean;
//   onCanvasClick?: (xPct: number, yPct: number) => void;
//   onFieldClick?: (fieldId: string) => void;
//   onFieldPointerDown?: (
//     fieldId: string,
//     e: React.PointerEvent<HTMLDivElement>,
//   ) => void;
//   className?: string;
// }) {
//   function handleClick(e: React.MouseEvent<HTMLDivElement>) {
//     if (!interactive || !onCanvasClick) return;
//     const rect = e.currentTarget.getBoundingClientRect();
//     const x = ((e.clientX - rect.left) / rect.width) * 100;
//     const y = ((e.clientY - rect.top) / rect.height) * 100;
//     onCanvasClick(x, y);
//   }

//   // Check if fileName is an object URL, blob, remote HTTP URL, or relative path
//   const isRealFile =
//     fileUrl &&
//     (fileUrl.startsWith("blob:") ||
//       fileUrl.startsWith("http://") ||
//       fileUrl.startsWith("https://") ||
//       fileUrl.startsWith("data:") ||
//       fileUrl.startsWith("/"));

//   if (isRealFile && fileUrl) {
//     return (
//       <PdfDocViewer
//         fileUrl={fileUrl}
//         fileName={fileName}
//         fields={fields}
//         signers={signers}
//         selectedFieldId={selectedFieldId}
//         highlightSignerId={highlightSignerId}
//         interactive={interactive}
//         onFieldClick={onFieldClick}
//         className={className}
//       />
//     );
//   }

//   return (
//     <div
//       role={interactive ? "button" : undefined}
//       onClick={handleClick}
//       className={cn(
//         "relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner select-none",
//         interactive && "cursor-crosshair",
//         className,
//       )}
//     >
//       {/* Styled document paper layout when file URL is not available */}
//       <div className="absolute inset-0 p-6 bg-slate-50/50 flex flex-col justify-between pointer-events-none">
//         <div>
//           <div className="border-b border-slate-200/80 pb-3 mb-4 flex items-center justify-between">
//             <div>
//               <p className="text-[10px] font-bold tracking-wider text-violet-600 uppercase">
//                 FinConnex Document
//               </p>
//               <h3 className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
//                 {fileName
//                   ? fileName.replace(/\.[^/.]+$/, "")
//                   : "Document Preview"}
//               </h3>
//             </div>
//             <span className="rounded bg-violet-100 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
//               PDF
//             </span>
//           </div>

//           <div className="space-y-3">
//             <p className="text-[10.5px] leading-relaxed text-slate-600">
//               This document is issued for review and legal electronic signature
//               through FinConnex. Please review all fields, terms, and agreements
//               highlighted below.
//             </p>

//             <div className="my-4 space-y-2">
//               <div className="h-2 w-full rounded bg-slate-200/80" />
//               <div className="h-2 w-11/12 rounded bg-slate-200/60" />
//               <div className="h-2 w-4/5 rounded bg-slate-200/60" />
//               <div className="h-2 w-full rounded bg-slate-200/60" />
//             </div>

//             <div className="rounded-lg border border-slate-200/60 bg-white p-3 shadow-2xs">
//               <p className="text-[9.5px] font-medium text-slate-500">
//                 Document Agreement &amp; Acknowledgement
//               </p>
//               <p className="mt-1 text-[9px] text-slate-400 leading-normal">
//                 By applying your signature to the designated fields below, you
//                 confirm accuracy of details and consent to electronic execution
//                 under standard digital signature guidelines.
//               </p>
//             </div>

//             <div className="mt-4 space-y-1.5">
//               <div className="h-2 w-full rounded bg-slate-200/60" />
//               <div className="h-2 w-3/4 rounded bg-slate-200/60" />
//             </div>
//           </div>
//         </div>

//         <div className="border-t border-slate-200/80 pt-3 flex items-center justify-between text-[9px] font-medium text-slate-400">
//           <span>Ref: {fileName || "DOC-2026"}</span>
//           <span>FinConnex Verified</span>
//         </div>
//       </div>

//       {/* Interactive / Placed Field Overlays */}
//       {(highlightSignerId
//         ? fields.filter((f) => f.signerId === highlightSignerId)
//         : fields
//       ).map((f) => {
//         const signer = signers.find((s) => s.id === f.signerId);
//         const color = SIGNER_COLORS[signer?.colorIndex ?? 0];
//         const dim =
//           highlightSignerId && f.signerId !== highlightSignerId
//             ? "opacity-35"
//             : "";
//         const selected = selectedFieldId === f.id;
//         const filled = Boolean(f.value);

//         return (
//           <div
//             key={f.id}
//             className={cn(
//               "absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1 overflow-hidden rounded border-2 border-dashed px-1.5 py-1 text-[10px] font-semibold shadow-sm transition-all z-10 select-none",
//               color.bg,
//               color.text,
//               color.border,
//               dim,
//               selected && "ring-2 ring-offset-1 ring-violet-500 shadow-md",
//               filled && "border-solid bg-white/95",
//               interactive && "cursor-grab active:cursor-grabbing",
//             )}
//             style={{
//               left: `${f.x}%`,
//               top: `${f.y}%`,
//               width: f.w && f.w <= 100 ? `${f.w}%` : "140px",
//               height: "34px",
//               minHeight: "34px",
//               maxHeight: "34px",
//             }}
//             onClick={(e) => {
//               e.stopPropagation();
//               onFieldClick?.(f.id);
//             }}
//             onPointerDown={(e) => {
//               e.stopPropagation();
//               onFieldPointerDown?.(f.id, e);
//             }}
//           >
//             {filled ? (
//               renderValue(f)
//             ) : (
//               <>
//                 <FieldIcon kind={f.kind} />
//                 <span className="truncate">
//                   {f.label || fieldKindLabel(f.kind)}
//                   {signer ? ` · ${signer.name.split(" ")[0]}` : ""}
//                 </span>
//               </>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );
// }

"use client";

import dynamic from "next/dynamic";
import { Calendar, PenLine, Type, User } from "lucide-react";
import {
  SIGNER_COLORS,
  fieldKindLabel,
  type SignatureField,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { cn } from "@/lib/utils";

const PdfDocViewer = dynamic(() => import("./PdfDocViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[340px] items-center justify-center text-xs text-slate-400">
      Loading document preview…
    </div>
  ),
});

const DocxDocViewer = dynamic(() => import("./DocxDocViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[340px] items-center justify-center text-xs text-slate-400">
      Loading document preview…
    </div>
  ),
});

const isDocxFileName = (name: string) => /\.(docx?|DOCX?)$/.test(name);

function FieldIcon({ kind }: { kind: SignatureField["kind"] }) {
  switch (kind) {
    case "signature":
    case "initials":
      return <PenLine className="h-3 w-3 shrink-0" />;
    case "date":
      return <Calendar className="h-3 w-3 shrink-0" />;
    case "name":
      return <User className="h-3 w-3 shrink-0" />;
    default:
      return <Type className="h-3 w-3 shrink-0" />;
  }
}

function renderValue(field: SignatureField) {
  if (!field.value) return null;
  if (
    (field.kind === "signature" || field.kind === "initials") &&
    field.value.startsWith("typed:")
  ) {
    return (
      <span className="font-serif text-[13px] leading-tight text-slate-800">
        {field.value.replace(/^typed:/, "")}
      </span>
    );
  }
  if (
    (field.kind === "signature" || field.kind === "initials") &&
    field.value.startsWith("data:")
  ) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={field.value}
        alt=""
        className="h-full max-h-10 w-full object-contain"
      />
    );
  }
  return (
    <span className="text-[11px] font-semibold text-slate-800">
      {field.value}
    </span>
  );
}

export function SignatureDocPreview({
  fileName,
  fileUrl,
  fields,
  signers,
  selectedFieldId,
  highlightSignerId,
  interactive,
  onCanvasClick,
  onFieldClick,
  onFieldPointerDown,
  className,
}: {
  fileName: string;
  fileUrl?: string;
  fields: SignatureField[];
  signers: SignatureSigner[];
  selectedFieldId?: string | null;
  highlightSignerId?: string | null;
  interactive?: boolean;
  onCanvasClick?: (xPct: number, yPct: number) => void;
  onFieldClick?: (fieldId: string) => void;
  onFieldPointerDown?: (
    fieldId: string,
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
  className?: string;
}) {
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !onCanvasClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onCanvasClick(x, y);
  }

  // Check if fileName is an object URL, blob, remote HTTP URL, or relative path
  const isRealFile =
    fileUrl &&
    (fileUrl.startsWith("blob:") ||
      fileUrl.startsWith("http://") ||
      fileUrl.startsWith("https://") ||
      fileUrl.startsWith("data:") ||
      fileUrl.startsWith("/"));

  if (isRealFile && fileUrl) {
    if (isDocxFileName(fileName)) {
      return (
        <DocxDocViewer
          fileUrl={fileUrl}
          fileName={fileName}
          fields={fields}
          signers={signers}
          selectedFieldId={selectedFieldId}
          highlightSignerId={highlightSignerId}
          interactive={interactive}
          onFieldClick={onFieldClick}
          className={className}
        />
      );
    }
    return (
      <PdfDocViewer
        fileUrl={fileUrl}
        fileName={fileName}
        fields={fields}
        signers={signers}
        selectedFieldId={selectedFieldId}
        highlightSignerId={highlightSignerId}
        interactive={interactive}
        onFieldClick={onFieldClick}
        className={className}
      />
    );
  }

  return (
    <div
      role={interactive ? "button" : undefined}
      onClick={handleClick}
      className={cn(
        "relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner select-none",
        interactive && "cursor-crosshair",
        className,
      )}
    >
      {/* Styled document paper layout when file URL is not available */}
      <div className="absolute inset-0 p-6 bg-slate-50/50 flex flex-col justify-between pointer-events-none">
        <div>
          <div className="border-b border-slate-200/80 pb-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-violet-600 uppercase">
                FinConnex Document
              </p>
              <h3 className="text-xs font-bold text-slate-800 truncate max-w-[220px]">
                {fileName
                  ? fileName.replace(/\.[^/.]+$/, "")
                  : "Document Preview"}
              </h3>
            </div>
            <span className="rounded bg-violet-100 px-2 py-0.5 text-[9px] font-semibold text-violet-700">
              PDF
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-[10.5px] leading-relaxed text-slate-600">
              This document is issued for review and legal electronic signature
              through FinConnex. Please review all fields, terms, and agreements
              highlighted below.
            </p>

            <div className="my-4 space-y-2">
              <div className="h-2 w-full rounded bg-slate-200/80" />
              <div className="h-2 w-11/12 rounded bg-slate-200/60" />
              <div className="h-2 w-4/5 rounded bg-slate-200/60" />
              <div className="h-2 w-full rounded bg-slate-200/60" />
            </div>

            <div className="rounded-lg border border-slate-200/60 bg-white p-3 shadow-2xs">
              <p className="text-[9.5px] font-medium text-slate-500">
                Document Agreement &amp; Acknowledgement
              </p>
              <p className="mt-1 text-[9px] text-slate-400 leading-normal">
                By applying your signature to the designated fields below, you
                confirm accuracy of details and consent to electronic execution
                under standard digital signature guidelines.
              </p>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="h-2 w-full rounded bg-slate-200/60" />
              <div className="h-2 w-3/4 rounded bg-slate-200/60" />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 pt-3 flex items-center justify-between text-[9px] font-medium text-slate-400">
          <span>Ref: {fileName || "DOC-2026"}</span>
          <span>FinConnex Verified</span>
        </div>
      </div>

      {/* Interactive / Placed Field Overlays */}
      {(highlightSignerId
        ? fields.filter((f) => f.signerId === highlightSignerId)
        : fields
      ).map((f) => {
        const signer = signers.find((s) => s.id === f.signerId);
        const color = SIGNER_COLORS[signer?.colorIndex ?? 0];
        const dim =
          highlightSignerId && f.signerId !== highlightSignerId
            ? "opacity-35"
            : "";
        const selected = selectedFieldId === f.id;
        const filled = Boolean(f.value);

        return (
          <div
            key={f.id}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1 overflow-hidden rounded border-2 border-dashed px-1.5 py-1 text-[10px] font-semibold shadow-sm transition-all z-10 select-none",
              color.bg,
              color.text,
              color.border,
              dim,
              selected && "ring-2 ring-offset-1 ring-violet-500 shadow-md",
              filled && "border-solid bg-white/95",
              interactive && "cursor-grab active:cursor-grabbing",
            )}
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              width: f.w && f.w <= 100 ? `${f.w}%` : "140px",
              height: "34px",
              minHeight: "34px",
              maxHeight: "34px",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onFieldClick?.(f.id);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onFieldPointerDown?.(f.id, e);
            }}
          >
            {filled ? (
              renderValue(f)
            ) : (
              <>
                <FieldIcon kind={f.kind} />
                <span className="truncate">
                  {f.label || fieldKindLabel(f.kind)}
                  {signer ? ` · ${signer.name.split(" ")[0]}` : ""}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
