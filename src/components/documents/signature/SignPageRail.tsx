"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function SignPageRail({
  fileUrl,
  fileName,
  activePage,
  onSelectPage,
}: {
  fileUrl?: string;
  fileName: string;
  activePage: number;
  onSelectPage: (page: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const isPdf = Boolean(fileUrl && !/\.docx?$/i.test(fileName || ""));
  return (
    <div className="flex flex-col items-center gap-3 px-3 py-3">
      {isPdf && fileUrl ? (
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages: count }) => setNumPages(count)}
          loading={<div className="h-28 w-[140px] animate-pulse bg-white" />}
          className="flex flex-col items-center gap-3"
        >
          {numPages > 0
            ? Array.from({ length: numPages }, (_, index) => {
                const page = index + 1;
                const selected = page === activePage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => onSelectPage(page)}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className={cn(
                        "block overflow-hidden border bg-white shadow-sm",
                        selected ? "border-[#12875a]" : "border-slate-300",
                      )}
                    >
                      <Page
                        pageNumber={page}
                        width={140}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    </span>
                    <span className="text-[12px] text-slate-700">{page}</span>
                  </button>
                );
              })
            : null}
        </Document>
      ) : (
        <button
          type="button"
          onClick={() => onSelectPage(1)}
          className="flex flex-col items-center gap-1"
        >
          <span className="flex h-36 w-[140px] items-center justify-center border border-[#12875a] bg-white text-[12px] text-slate-500">
            {fileName || "Document"}
          </span>
          <span className="text-[12px] text-slate-700">1</span>
        </button>
      )}
    </div>
  );
}
