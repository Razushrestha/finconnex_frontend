"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  SIGNER_COLORS,
  fieldKindLabel,
  type SignatureField,
  type SignatureSigner,
} from "@/lib/documents/signature/types";
import { cn } from "@/lib/utils";
import { Calendar, PenLine, Type, User } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
      <span className="font-serif text-[12px] leading-tight text-slate-800">
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
        className="h-full max-h-8 w-full object-contain"
      />
    );
  }
  return (
    <span className="text-[10px] font-semibold text-slate-800 truncate">
      {field.value}
    </span>
  );
}

interface PdfDocViewerProps {
  fileUrl: string;
  fileName: string;
  fields: SignatureField[];
  signers: SignatureSigner[];
  selectedFieldId?: string | null;
  highlightSignerId?: string | null;
  interactive?: boolean;
  onFieldClick?: (fieldId: string) => void;
  pageWidth?: number;
  className?: string;
}

export default function PdfDocViewer({
  fileUrl,
  fileName,
  fields,
  signers,
  selectedFieldId,
  highlightSignerId,
  interactive,
  onFieldClick,
  pageWidth = 620,
  className,
}: PdfDocViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loadError, setLoadError] = useState<boolean>(false);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500">
        <p className="font-medium text-rose-500">Unable to render PDF preview canvas</p>
        <p className="mt-1 text-[11px] text-slate-400">{fileName}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative mx-auto flex max-h-[68vh] w-full max-w-3xl flex-col items-center overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/80 p-4 shadow-inner custom-scrollbar",
        className,
      )}
    >
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        onLoadError={() => setLoadError(true)}
        loading={
          <div className="flex items-center justify-center py-16 text-xs text-slate-400">
            Loading document pages…
          </div>
        }
        className="flex w-full flex-col items-center gap-4"
      >
        {Array.from({ length: numPages || 1 }, (_, i) => i + 1).map((pageNum) => {
          const visibleFields = highlightSignerId
            ? fields.filter((f) => f.signerId === highlightSignerId)
            : fields;

          const pageFields = visibleFields.filter(
            (f) => (f.page || 1) === pageNum || numPages === 1,
          );

          return (
            <div
              key={pageNum}
              className="relative shadow-md rounded-lg overflow-hidden bg-white shrink-0 border border-slate-200/60"
            >
              <Page
                pageNumber={pageNum}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />

              {/* Placed Field Overlays for this specific page */}
              {pageFields.map((f) => {
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
                      selected && "ring-2 ring-violet-500 ring-offset-1 shadow-md",
                      filled && "border-solid bg-white/95",
                      interactive && "cursor-pointer hover:scale-105",
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
        })}
      </Document>
    </div>
  );
}
