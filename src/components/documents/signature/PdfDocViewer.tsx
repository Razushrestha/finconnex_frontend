"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { SignatureField, SignatureSigner } from "@/lib/documents/signature/types";
import { cn } from "@/lib/utils";
import {
  SigningFieldOverlay,
  signingFieldsForPage,
} from "./SigningFieldOverlay";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  /** When true, grow with pages and let a parent scroller own overflow. */
  embedded?: boolean;
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
  pageWidth = 700,
  className,
  embedded = false,
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
        embedded
          ? "relative mx-auto flex w-full flex-col items-center bg-transparent p-0"
          : "relative mx-auto flex max-h-[68vh] w-full max-w-3xl flex-col items-center overflow-y-auto rounded-xl border border-slate-200 bg-slate-100/80 p-4 shadow-inner custom-scrollbar",
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
        className="flex w-full flex-col items-center"
      >
        {Array.from({ length: numPages || 1 }, (_, i) => i + 1).map((pageNum) => {
          const pageFields = signingFieldsForPage(
            fields,
            pageNum,
            numPages,
            highlightSignerId,
          );

          return (
            <div
              key={pageNum}
              className="relative overflow-hidden bg-white shrink-0 border-t border-slate-200/70 first:border-t-0"
            >
              <Page
                pageNumber={pageNum}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />

              {pageFields.map((field) => (
                <SigningFieldOverlay
                  key={field.id}
                  field={field}
                  signers={signers}
                  selectedFieldId={selectedFieldId}
                  highlightSignerId={highlightSignerId}
                  interactive={interactive}
                  onFieldClick={onFieldClick}
                />
              ))}
            </div>
          );
        })}
      </Document>
    </div>
  );
}
