"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { X } from "lucide-react";
import { signerColor } from "@/lib/documents/signature/types";
import {
  DEFAULT_PLACED_FIELD_HEIGHT,
  DEFAULT_PLACED_FIELD_WIDTH,
  clientPointHitsPage,
  isSenderPrefillField,
  pointerToPagePercent,
} from "@/lib/documents/signature/field-placement";
import { SenderFieldErrorTooltip } from "@/components/documents/signature/create/SenderFieldErrorTooltip";
import { SignatureInkImage } from "@/components/documents/signature/SignatureInkImage";

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
  /** Sender-filled value for Prefill fields. */
  value?: string;
  required?: boolean;
  resizable?: boolean;
  movable?: boolean;
  fixedWidth?: boolean;
  fieldName?: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  description?: string;
  nameFormat?: string;
  dateFormat?: string;
  readOnly?: boolean;
  fixedHeight?: boolean;
  defaultValue?: string;
  characterLimit?: number;
  validation?: string;
  checked?: boolean;
  options?: string[];
  groupValidation?: string;
  groupValidationCount?: number;
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
  onChangeFieldValue?: (id: string, value: string) => void;
  emptyFieldErrorId?: string | null;
  onPickSignature?: (field: PlacedField) => void;
  selectedFieldId?: string | null;
  onSelectField?: (field: PlacedField) => void;
  onClearSelection?: () => void;
  /** Called once this document's page count is known, so the caller can show continuous numbering across documents. */
  onNumPagesResolved?: (documentId: string, numPages: number) => void;
  /** Fired after the last page has rendered so scroll-to-next-doc is not premature. */
  onDocumentReady?: (documentId: string) => void;
  /** Preview-only: no move, resize, or delete. */
  readOnly?: boolean;
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
  onChangeFieldValue,
  emptyFieldErrorId,
  onPickSignature,
  selectedFieldId,
  onSelectField,
  onClearSelection,
  onNumPagesResolved,
  onDocumentReady,
  readOnly = false,
}: PdfFieldEditorProps) {
  const [numPages, setNumPages] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [pageAspect, setPageAspect] = useState(11 / 8.5);
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
    if (!draggingFieldType) return;
    updateDropGhost(page, e);
  };

  const handleDragLeavePage = (e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setDragOverPage(null);
    setDropGhost(null);
  };

  const handleDropOnPage =
    (page: number) => (e: { preventDefault(): void; stopPropagation(): void; clientX: number; clientY: number }) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingFieldType) return;
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
      className="bg-white shadow-[0_2px_16px_rgba(15,23,42,0.1)]"
    >
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
        <div
          key={pageNum}
          ref={(el) => setPageRef(pageNum, el)}
          onDragOver={handleDragOverPage(pageNum)}
          onDragLeave={handleDragLeavePage}
          onDrop={handleDropOnPage(pageNum)}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("[data-placed-field]")) {
              return;
            }
            onClearSelection?.();
            if (!draggingFieldType || readOnly) return;
            handleDropOnPage(pageNum)(e);
          }}
          style={{
            width: pageWidth,
            minHeight: Math.round(pageWidth * pageAspect),
          }}
          className={`relative block overflow-hidden bg-white ${
            draggingFieldType ? "cursor-copy" : ""
          } ${pageNum > 1 ? "border-t border-slate-200/80" : ""} ${
            dragOverPage === pageNum
              ? "ring-2 ring-indigo-400 ring-offset-0"
              : ""
          }`}
          id={`pdf-page-${documentId}-${pageNum}`}
        >
          <Page
            pageNumber={pageNum}
            width={pageWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            className="pointer-events-none !block"
            onLoadSuccess={(page) => {
              if (pageNum !== 1 || page.originalWidth <= 0) return;
              setPageAspect(page.originalHeight / page.originalWidth);
            }}
            onRenderSuccess={() => {
              if (pageNum === numPages) onDocumentReady?.(documentId);
            }}
          />

          {fieldsForThisDocument
            .filter((f) => f.page === pageNum)
            .map((field) => {
              const isBeingDragged = repositioningId === field.id;
              const color = signerColor(field.colorIndex);
              const { width, height } = fieldSize(field);
              const isPrefill = isSenderPrefillField(field.recipientId);
              const isSignaturePick =
                !readOnly &&
                (field.type === "signature" ||
                  field.type === "initials" ||
                  field.type === "stamp" ||
                  field.type === "company" ||
                  field.type === "job_title");
              const showEmptyError = emptyFieldErrorId === field.id;
              const selected = selectedFieldId === field.id;
              const displayLabel = field.fieldName || field.label;
              const signatureInk =
                Boolean(field.value?.startsWith("data:")) &&
                (field.type === "signature" || field.type === "initials");
              const boxShape =
                field.type === "signature" || field.type === "initials"
                  ? "rounded-[2px]"
                  : "rounded-md";
              const textStyle =
                field.type === "email" ||
                field.type === "name" ||
                field.type === "company" ||
                field.type === "job_title" ||
                field.type === "text" ||
                field.type === "dropdown" ||
                field.type === "date" ||
                field.type === "sign_date"
                  ? {
                      fontFamily: field.fontFamily || undefined,
                      fontSize: field.fontSize ? `${field.fontSize}px` : undefined,
                      fontWeight: field.bold ? 700 : undefined,
                      fontStyle: field.italic ? "italic" : undefined,
                      color: field.textColor || undefined,
                      textAlign: field.textAlign || undefined,
                    }
                  : undefined;

              return (
                <div
                  key={field.id}
                  id={`placed-field-${field.id}`}
                  data-placed-field=""
                  onPointerDown={
                    readOnly
                      ? undefined
                      : (e) => {
                          if (e.button !== 0) return;
                          onSelectField?.(field);
                          const target = e.target as HTMLElement;
                          if (
                            target.closest(
                              "input, textarea, select, button, [data-resize-handle]",
                            )
                          ) {
                            e.stopPropagation();
                            return;
                          }
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
                        }
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectField?.(field);
                  }}
                  onDoubleClick={
                    isSignaturePick && isPrefill
                      ? (e) => {
                          e.stopPropagation();
                          onPickSignature?.(field);
                        }
                      : undefined
                  }
                  style={{
                    left: `${field.xPct}%`,
                    top: `${field.yPct}%`,
                    width: `${width}px`,
                    height: `${height}px`,
                    transform: "none",
                  }}
                  className={`group absolute flex items-center ${
                    signatureInk ? "justify-center p-1" : "justify-between gap-1.5 px-2.5 py-1.5"
                  } ${
                    showEmptyError
                      ? "z-40 bg-white text-slate-700 border-2 border-dashed border-sky-400 ring-2 ring-sky-300/60"
                      : color
                        ? `${color.bg} ${color.text} border-2 border-dashed ${color.border}`
                        : "bg-indigo-600 text-white border-2 border-dashed border-indigo-300"
                  } text-[11px] font-semibold ${boxShape} ${
                    signatureInk ? "shadow-none" : "shadow-md"
                  } select-none ${
                    showEmptyError ? "" : "z-10"
                  } ${selected ? "ring-2 ring-slate-800/80 ring-offset-1" : ""} ${
                    readOnly
                      ? "cursor-default"
                      : isBeingDragged
                        ? "cursor-grabbing shadow-xl z-20 touch-none"
                        : isSignaturePick
                          ? "cursor-pointer"
                          : isPrefill
                          ? "cursor-text"
                          : "cursor-grab touch-none"
                  }`}
                >
                  {isSignaturePick &&
                  (field.type === "signature" || field.type === "initials") ? (
                    field.value?.startsWith("data:") ? (
                      <div className="pointer-events-none absolute inset-1 overflow-hidden">
                        <SignatureInkImage
                          src={field.value}
                          className="block h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <span className="truncate" style={textStyle}>
                        {field.value || displayLabel}
                      </span>
                    )
                  ) : isSignaturePick ? (
                    field.value?.startsWith("data:") ? (
                      <div className="pointer-events-none absolute inset-1 overflow-hidden">
                        <SignatureInkImage
                          src={field.value}
                          className="block h-full w-full object-contain"
                        />
                      </div>
                    ) : (
                      <span className="truncate" style={textStyle}>
                        {field.value || displayLabel}
                      </span>
                    )
                  ) : field.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      disabled={readOnly || !isPrefill}
                      checked={field.checked === true || field.value === "true"}
                      onChange={(e) =>
                        onChangeFieldValue?.(field.id, e.target.checked ? "true" : "")
                      }
                      className={`w-3.5 h-3.5 accent-current shrink-0 ${
                        isPrefill && !readOnly ? "" : "pointer-events-none"
                      }`}
                    />
                  ) : field.type === "date" || field.type === "sign_date" ? (
                    <input
                      type="date"
                      disabled={readOnly || !isPrefill}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        onChangeFieldValue?.(field.id, e.target.value)
                      }
                      className={`w-full bg-transparent text-[11px] font-semibold outline-none border-none ${
                        isPrefill && !readOnly ? "" : "pointer-events-none"
                      }`}
                    />
                  ) : field.type === "dropdown" ? (
                    <select
                      disabled={readOnly || !isPrefill}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        onChangeFieldValue?.(field.id, e.target.value)
                      }
                      className={`w-full bg-transparent text-[11px] font-semibold outline-none border-none appearance-none truncate ${
                        isPrefill && !readOnly ? "" : "pointer-events-none"
                      }`}
                    >
                      <option value="">{displayLabel}</option>
                      <option value={displayLabel}>{displayLabel}</option>
                    </select>
                  ) : isPrefill && !readOnly ? (
                    <input
                      type="text"
                      value={field.value ?? ""}
                      placeholder={displayLabel}
                      onChange={(e) =>
                        onChangeFieldValue?.(field.id, e.target.value)
                      }
                      className="w-full min-w-0 bg-transparent text-[11px] font-semibold outline-none placeholder:text-current/70"
                    />
                  ) : (
                    <span className="truncate" style={textStyle}>
                      {displayLabel}
                    </span>
                  )}
                  {!readOnly ? (
                    <>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => onRemoveField(field.id)}
                        className={
                          signatureInk
                            ? "absolute -left-1.5 -top-2 z-30 text-[#2563eb]"
                            : `ml-1 opacity-0 group-hover:opacity-100 rounded-full p-0.5 transition-opacity ${
                                color ? "hover:bg-black/10" : "hover:bg-indigo-700"
                              }`
                        }
                      >
                        <X className={signatureInk ? "h-3.5 w-3.5" : "w-3 h-3"} />
                      </button>
                      {onResizeField && field.resizable !== false ? (
                        <div
                          data-resize-handle=""
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const handle = e.currentTarget;
                            handle.setPointerCapture(e.pointerId);
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const box = handle.parentElement?.getBoundingClientRect();
                            const scaleX =
                              box && box.width > 0 ? width / box.width : 1;
                            const scaleY =
                              box && box.height > 0 ? height / box.height : 1;
                            const onMove = (moveEvent: PointerEvent) => {
                              const newWidth = Math.max(
                                48,
                                Math.round(
                                  width + (moveEvent.clientX - startX) * scaleX,
                                ),
                              );
                              const newHeight = Math.max(
                                28,
                                Math.round(
                                  height + (moveEvent.clientY - startY) * scaleY,
                                ),
                              );
                              onResizeField(field.id, newWidth, newHeight);
                            };
                            const onUp = (upEvent: PointerEvent) => {
                              if (handle.hasPointerCapture(upEvent.pointerId)) {
                                handle.releasePointerCapture(upEvent.pointerId);
                              }
                              handle.removeEventListener("pointermove", onMove);
                              handle.removeEventListener("pointerup", onUp);
                              handle.removeEventListener("pointercancel", onUp);
                            };
                            handle.addEventListener("pointermove", onMove);
                            handle.addEventListener("pointerup", onUp);
                            handle.addEventListener("pointercancel", onUp);
                          }}
                          className={`absolute -right-1.5 -bottom-1.5 z-30 h-4 w-4 cursor-se-resize rounded-full border border-current bg-white ${
                            selected
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        />
                      ) : null}
                    </>
                  ) : null}
                  {showEmptyError ? (
                    <SenderFieldErrorTooltip
                      fieldId={field.id}
                      fieldLabel={field.label}
                    />
                  ) : null}
                </div>
              );
            })}

          {draggingFieldType && dropGhost?.page === pageNum && (
              <div
                className={`absolute z-30 pointer-events-none rounded-md border-2 border-dashed px-2.5 text-[11px] font-semibold flex items-center shadow-sm ${
                  signerColor(draggingFieldType.recipient?.colorIndex).bg
                } ${signerColor(draggingFieldType.recipient?.colorIndex).text} ${
                  signerColor(draggingFieldType.recipient?.colorIndex).border
                }`}
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
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundColor: `${signerColor(draggingFieldType?.recipient?.colorIndex).hex}14`,
              }}
            />
          )}

          <div className="absolute top-2 right-2 bg-slate-900/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full pointer-events-none">
            Page {pageNum} / {numPages}
          </div>
        </div>
      ))}
    </Document>
  );
}
