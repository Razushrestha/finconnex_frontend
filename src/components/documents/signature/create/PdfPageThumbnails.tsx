"use client";

import { Document, Page, pdfjs } from "react-pdf";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPageThumbnailsProps {
  fileUrl: string;
  numPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
}

export function PdfPageThumbnails({
  fileUrl,
  numPages,
  currentPage,
  onSelectPage,
}: PdfPageThumbnailsProps) {
  return (
    <Document
      file={fileUrl}
      loading={
        <div className="px-2 py-6 text-center text-[11px] text-slate-400">
          Loading pages…
        </div>
      }
      className="relative z-10 flex flex-col items-center gap-3 px-3 pb-4"
    >
      {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onSelectPage(page)}
          className="relative z-10 flex w-full cursor-pointer flex-col items-center gap-1.5"
        >
          <span
            className={cn(
              "pointer-events-none overflow-hidden rounded-sm border bg-white shadow-sm",
              currentPage === page
                ? "border-primary ring-2 ring-primary/30"
                : "border-slate-200 hover:border-slate-300",
            )}
          >
            <Page
              pageNumber={page}
              width={118}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="pointer-events-none"
            />
          </span>
          <span className="text-[11px] font-medium text-slate-500">{page}</span>
        </button>
      ))}
    </Document>
  );
}
