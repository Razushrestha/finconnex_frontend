"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { X } from "lucide-react";
import { SIGNER_COLORS } from "@/lib/documents/signature/types";
import {
  DEFAULT_PLACED_FIELD_HEIGHT,
  DEFAULT_PLACED_FIELD_WIDTH,
  clientPointHitsPage,
  pointerToPagePercent,
} from "@/lib/documents/signature/field-placement";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface PlacedField {
  id: string;
  type: string;
  label: string;
  /** Which document this field belongs to — "primary" or an AdditionalDocument id. */
  documentId: string;
  page: number; // 1-indexed, scoped to `documentId`
  xPct: number; // % of that specific page's width (top-left)
  yPct: number; // % of that specific page's height (top-left)
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

type ActiveDrag = {
  id: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

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
  const [dropGhost, setDropGhost] = useState<{
    page: number;
    xPct: number;
    yPct: number;
  } | null>(null);
  const [repositioningId, setRepositioningId] = useState<string | null>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const frameRef = useRef<number>(0);
  const onRepositionRef = useRef(onRepositionField);
  onRepositionRef.current = onRepositionField;

  const setPageRef = useCallback((page: number, el: HTMLDivElement | null) => {
    if (el) pageRefs.current.set(page, el);
    else pageRefs.current.delete(page);
  }, []);

  const locatePage = useCallback((clientX: number, clientY: number) => {
    for (const [page, el] of pageRefs.current.entries()) {
      if (clientPointHitsPage(clientX, clientY, el)) {
        return { page, el };
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!repositioningId) return;

    const flushMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const hit = locatePage(e.clientX, e.clientY);
      if (!hit) return;
      const pos = pointerToPagePercent(e.clientX, e.clientY, hit.el, {
        offsetX: drag.offsetX,
        offsetY: drag.offsetY,
        fieldWidth: drag.width,
        fieldHeight: drag.height,
      });
      onRepositionRef.current(
        drag.id,
        documentId,
        hit.page,
        pos.xPct,
        pos.yPct,
      );
    };

    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        flushMove(e);
      });
    };

    const handleUp = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      dragRef.current = null;
      setRepositioningId(null);
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [repositioningId, documentId, locatePage]);

  const fieldSize = (field?: PlacedField | null) => ({
    width: field?.width || DEFAULT_PLACED_FIELD_WIDTH,
    height: field?.height || DEFAULT_PLACED_FIELD_HEIGHT,
  });

  const updateDropGhost = (page: number, e: React.DragEvent) => {
    const el = pageRefs.current.get(page);
    if (!el) return;
    const pos = pointerToPagePercent(e.clientX, e.clientY, el, {
      fieldWidth: DEFAULT_PLACED_FIELD_WIDTH,
      fieldHeight: DEFAULT_PLACED_FIELD_HEIGHT,
    });
    setDragOverPage(page);
    setDropGhost({ page, xPct: pos.xPct, yPct: pos.yPct });
  };

  const handleDragOverPage = (page: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    updateDropGhost(page, e);
  };

  const handleDragLeavePage = (e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setDragOverPage(null);
    setDropGhost(null);
  };

  const handleDropOnPage = (page: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = pageRefs.current.get(page);
    setDragOverPage(null);
    setDropGhost(null);
    if (!el) return;
    const pos = pointerToPagePercent(e.clientX, e.clientY, el, {
      fieldWidth: DEFAULT_PLACED_FIELD_WIDTH,
      fieldHeight: DEFAULT_PLACED_FIELD_HEIGHT,
    });
    onDropField(documentId, page, pos.xPct, pos.yPct);
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
          className={`relative inline-block rounded-md shadow-md transition-shadow ${
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
              const { width, height } = fieldSize(field);

              return (
                <div
                  key={field.id}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    dragRef.current = {
                      id: field.id,
                      offsetX: e.clientX - rect.left,
                      offsetY: e.clientY - rect.top,
                      width,
                      height,
                    };
                    setRepositioningId(field.id);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  style={{
                    left: `${field.xPct}%`,
                    top: `${field.yPct}%`,
                    width: `${width}px`,
                    height: `${height}px`,
                    transform: "none",
                  }}
                  className={`group absolute flex items-center justify-between gap-1.5 ${
                    color
                      ? `${color.bg} ${color.text} border-2 border-dashed ${color.border}`
                      : "bg-indigo-600 text-white border-2 border-dashed border-indigo-300"
                  } text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-md select-none z-10 touch-none ${
                    isBeingDragged
                      ? "cursor-grabbing shadow-xl z-20"
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
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onRemoveField(field.id)}
                    className={`ml-1 opacity-0 group-hover:opacity-100 rounded-full p-0.5 transition-opacity ${
                      color ? "hover:bg-black/10" : "hover:bg-indigo-700"
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {onResizeField && (
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const onMove = (moveEvent: PointerEvent) => {
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
                          window.removeEventListener("pointermove", onMove);
                          window.removeEventListener("pointerup", onUp);
                        };
                        window.addEventListener("pointermove", onMove);
                        window.addEventListener("pointerup", onUp);
                      }}
                      className="absolute -right-1 -bottom-1 w-3 h-3 bg-white border border-current rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 z-30"
                    />
                  )}
                </div>
              );
            })}

          {draggingFieldType &&
            dropGhost?.page === pageNum && (
              <div
                className="absolute z-30 pointer-events-none rounded-md border-2 border-dashed border-violet-400 bg-violet-100/80 text-[11px] font-semibold text-violet-700 px-2.5 flex items-center shadow-sm"
                style={{
                  left: `${dropGhost.xPct}%`,
                  top: `${dropGhost.yPct}%`,
                  width: DEFAULT_PLACED_FIELD_WIDTH,
                  height: DEFAULT_PLACED_FIELD_HEIGHT,
                }}
              >
                {draggingFieldType.label}
              </div>
            )}

          {dragOverPage === pageNum && (
            <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
          )}

          <div className="absolute top-2 right-2 bg-slate-900/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full pointer-events-none">
            Page {pageNum} / {numPages}
          </div>
        </div>
      ))}
    </Document>
  );
}
