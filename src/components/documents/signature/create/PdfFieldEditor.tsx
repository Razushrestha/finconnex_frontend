"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { X } from "lucide-react";
import { SIGNER_COLORS } from "@/lib/documents/signature/types";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface PlacedField {
  id: string;
  type: string;
  label: string;
  /** Which document this field belongs to — "primary" or an AdditionalDocument id. */
  documentId: string;
  page: number; // 1-indexed, scoped to `documentId`
  xPct: number; // % of that specific page's width
  yPct: number; // % of that specific page's height
  width?: number;
  height?: number;
  recipientId?: string;
  colorIndex?: number;
}

export interface DraggingFieldType {
  type: string;
  label: string;
  recipient?: {
    id: string;
    name: string;
    email: string;
    colorIndex: number;
  };
}

interface PdfFieldEditorProps {
  /** Identifies which document this editor instance is rendering — used to scope placedFields. */
  documentId: string;
  fileUrl: string;
  placedFields: PlacedField[];
  draggingFieldType: DraggingFieldType | null;
  pageWidth?: number;
  onDropField: (
    documentId: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => void;
  onRepositionField: (
    id: string,
    documentId: string,
    page: number,
    xPct: number,
    yPct: number,
  ) => void;
  onRemoveField: (id: string) => void;
  onResizeField?: (id: string, width: number, height: number) => void;
  /** Called once this document's page count is known, so the caller can show continuous numbering across documents. */
  onNumPagesResolved?: (documentId: string, numPages: number) => void;
}

export default function PdfFieldEditor({
  documentId,
  fileUrl,
  placedFields,
  draggingFieldType,
  pageWidth = 700,
  onDropField,
  onRepositionField,
  onRemoveField,
  onResizeField,
  onNumPagesResolved,
}: PdfFieldEditorProps) {
  const [numPages, setNumPages] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [dragOverPage, setDragOverPage] = useState<number | null>(null);
  const [repositioningId, setRepositioningId] = useState<string | null>(null);

  const setPageRef = useCallback((page: number, el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(page, el);
    else pageRefs.current.delete(page);
  }, []);

  // Pointer-based repositioning — works across page boundaries too, since
  // each page div (within THIS document) is checked for cursor containment
  // on every move. Repositioning does not cross document boundaries — each
  // PdfFieldEditor instance only tracks its own pages.
  useEffect(() => {
    if (!repositioningId) return;

    const handleMove = (e: MouseEvent) => {
      for (const [page, el] of pageRefs.current.entries()) {
        const rect = el.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          const xPct = ((e.clientX - rect.left) / rect.width) * 100;
          const yPct = ((e.clientY - rect.top) / rect.height) * 100;
          onRepositionField(
            repositioningId,
            documentId,
            page,
            Math.min(Math.max(xPct, 0), 100),
            Math.min(Math.max(yPct, 0), 100),
          );
          break;
        }
      }
    };

    const handleUp = () => setRepositioningId(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [repositioningId, onRepositionField, documentId]);

  const handleDragOverPage = (page: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverPage(page);
  };

  const handleDragLeavePage = () => setDragOverPage(null);

  const handleDropOnPage = (page: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPage(null);
    const el = pageRefs.current.get(page);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    onDropField(
      documentId,
      page,
      Math.min(Math.max(xPct, 0), 100),
      Math.min(Math.max(yPct, 0), 100),
    );
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-16 text-xs text-rose-400">
        Failed to load PDF. Please go back and re-upload the file.
      </div>
    );
  }

  const fieldsForThisDocument = placedFields.filter(
    (f) => f.documentId === documentId,
  );

  return (
    <Document
      file={fileUrl}
      onLoadSuccess={({ numPages }) => {
        setNumPages(numPages);
        onNumPagesResolved?.(documentId, numPages);
      }}
      onLoadError={() => setLoadError(true)}
      loading={
        <div className="flex items-center justify-center py-16 text-xs text-slate-400">
          Loading document…
        </div>
      }
      className="flex flex-col items-center gap-6"
    >
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
        <div
          key={pageNum}
          ref={(el) => setPageRef(pageNum, el)}
          onDragOver={
            draggingFieldType ? handleDragOverPage(pageNum) : undefined
          }
          onDragLeave={draggingFieldType ? handleDragLeavePage : undefined}
          onDrop={draggingFieldType ? handleDropOnPage(pageNum) : undefined}
          className={`relative shadow-md rounded-md overflow-hidden transition-shadow ${
            dragOverPage === pageNum
              ? "ring-2 ring-indigo-400 ring-offset-2"
              : ""
          }`}
        >
          <Page
            pageNumber={pageNum}
            width={pageWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />

          {fieldsForThisDocument
            .filter((f) => f.page === pageNum)
            .map((field) => {
              const isBeingDragged = repositioningId === field.id;
              const color =
                field.colorIndex != null
                  ? SIGNER_COLORS[field.colorIndex]
                  : null;

              const width = field.width || 140;
              const height = field.height || 36;

              return (
                <div
                  key={field.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRepositioningId(field.id);
                  }}
                  style={{
                    left: `${field.xPct}%`,
                    top: `${field.yPct}%`,
                    width: `${width}px`,
                    height: `${height}px`,
                  }}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-between gap-1.5 ${
                    color
                      ? `${color.bg} ${color.text} border-2 border-dashed ${color.border}`
                      : "bg-indigo-600 text-white border-2 border-dashed border-indigo-300"
                  } text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-md select-none z-10 ${
                    isBeingDragged
                      ? "cursor-grabbing shadow-xl scale-105 z-20"
                      : "cursor-grab"
                  }`}
                >
                  {field.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      disabled
                      className="w-3.5 h-3.5 accent-current pointer-events-none shrink-0"
                    />
                  ) : field.type === "date" || field.type === "sign_date" ? (
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
                    <span className="truncate">{field.label}</span>
                  )}
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => onRemoveField(field.id)}
                    className={`ml-1 opacity-0 group-hover:opacity-100 rounded-full p-0.5 transition-opacity ${
                      color ? "hover:bg-black/10" : "hover:bg-indigo-700"
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {onResizeField && (
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const onMove = (moveEvent: MouseEvent) => {
                          const newWidth = Math.max(
                            80,
                            width + (moveEvent.clientX - startX),
                          );
                          const newHeight = Math.max(
                            30,
                            height + (moveEvent.clientY - startY),
                          );
                          onResizeField(field.id, newWidth, newHeight);
                        };
                        const onUp = () => {
                          window.removeEventListener("mousemove", onMove);
                          window.removeEventListener("mouseup", onUp);
                        };
                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                      className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border border-current rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 z-30"
                    />
                  )}
                </div>
              );
            })}

          {dragOverPage === pageNum && (
            <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
          )}

          <div className="absolute top-2 right-2 bg-slate-900/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Page {pageNum} / {numPages}
          </div>
        </div>
      ))}
    </Document>
  );
}
