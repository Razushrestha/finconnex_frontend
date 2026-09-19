"use client";

import {
  Send,
  ArrowLeft,
  Loader2,
  BookmarkPlus,
  FileWarning,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Search,
  Download,
  ScanLine,
  Maximize2,
} from "lucide-react";
import { useEffect, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import dynamic from "next/dynamic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  signerColor,
} from "@/lib/documents/signature/types";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/notify/toast";
import { ConfirmSendDetailsModal } from "./ConfirmSendDetailsModal";
import { PlaceFieldsPreviewModal } from "./PlaceFieldsPreviewModal";
import {
  DEFAULT_PLACED_FIELD_HEIGHT,
  DEFAULT_PLACED_FIELD_WIDTH,
  isSenderFieldValueEmpty,
  isSenderPrefillField,
  pageDropTargetFromPoint,
  pointerToPagePercent,
} from "@/lib/documents/signature/field-placement";
import { SenderFieldErrorTooltip } from "./SenderFieldErrorTooltip";
import { SelectSignatureProfileModal } from "./SelectSignatureProfileModal";
import { cn } from "@/lib/utils";

function glideScroll(el: HTMLElement, top: number, duration = 520) {
  const start = el.scrollTop;
  const delta = top - start;
  if (Math.abs(delta) < 1) return;
  const t0 = performance.now();
  const ease = (t: number) => 1 - (1 - t) ** 4;
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / duration);
    el.scrollTop = start + delta * ease(t);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

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

const PdfPageThumbnails = dynamic(
  () =>
    import("@/components/documents/signature/create/PdfPageThumbnails").then(
      (mod) => mod.PdfPageThumbnails,
    ),
  { ssr: false },
);

const ZOOM_LEVELS = [50, 75, 100, 125, 150, 175];
const BASE_PAGE_WIDTH = 720;

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
  handleChangeFieldValue?: (id: string, value: string) => void;
  handleRemovePlacedField: (id: string) => void;
  handleSidebarDragStart: (
    e: DragEvent<HTMLDivElement>,
    field: StandardFieldType,
    recipient?: { id: string; name: string; email: string; colorIndex: number },
  ) => void;
  handleSidebarDragEnd: () => void;
  handleArmField?: (
    field: StandardFieldType,
    recipient?: { id: string; name: string; email: string; colorIndex: number },
  ) => void;
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
  file?.type === "application/pdf" || Boolean(file?.name.endsWith(".pdf"));

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
  handleChangeFieldValue,
  handleRemovePlacedField,
  handleSidebarDragStart,
  handleSidebarDragEnd,
  handleArmField,
  handleSaveTemplate,
  onSend,
}: PlaceFieldsViewProps) {
  const router = useRouter();
  const [activeResizingId, setActiveResizingId] = useState<string | null>(null);
  const htmlPageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const htmlDragRef = useRef<{
    id: string;
    documentId: string;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const handleRepositionRef = useRef(handleRepositionField);
  handleRepositionRef.current = handleRepositionField;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [emptyFieldErrorId, setEmptyFieldErrorId] = useState<string | null>(
    null,
  );
  const [signaturePickerField, setSignaturePickerField] =
    useState<PlacedField | null>(null);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [leftDocExpanded, setLeftDocExpanded] = useState(true);

  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [pdfReadyDocId, setPdfReadyDocId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const switchLockRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const pendingScrollRef = useRef<"top" | "bottom" | null>(null);
  const paletteDragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    field: StandardFieldType | null;
    recipient?: { id: string; name: string; email: string; colorIndex: number };
  }>({ active: false, moved: false, startX: 0, startY: 0, field: null });
  const [paletteGhost, setPaletteGhost] = useState<{
    label: string;
    colorIndex: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (documents.length === 0) {
      setActiveDocId(null);
      return;
    }
    setActiveDocId((current) =>
      current && documents.some((doc) => doc.id === current)
        ? current
        : documents[0].id,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents.map((d) => d.id).join(",")]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = paletteDragRef.current;
      if (!drag.active || !drag.field) return;
      const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (dist > 6) drag.moved = true;
      if (!drag.moved) return;
      setPaletteGhost({
        label: drag.field.label,
        colorIndex: drag.recipient?.colorIndex ?? 0,
        x: e.clientX,
        y: e.clientY,
      });
    };
    const onUp = (e: PointerEvent) => {
      const drag = paletteDragRef.current;
      if (!drag.active) return;
      const moved = drag.moved;
      const field = drag.field;
      const recipient = drag.recipient;
      drag.active = false;
      drag.moved = false;
      setPaletteGhost(null);
      if (!field) return;
      const hit = pageDropTargetFromPoint(e.clientX, e.clientY);
      if (hit) {
        const pos = pointerToPagePercent(e.clientX, e.clientY, hit.el, {
          fieldWidth: DEFAULT_PLACED_FIELD_WIDTH,
          fieldHeight: DEFAULT_PLACED_FIELD_HEIGHT,
        });
        handleDropField(hit.documentId, hit.page, pos.xPct, pos.yPct);
        return;
      }
      if (!moved) handleArmField?.(field, recipient);
      else handleSidebarDragEnd();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [handleDropField, handleArmField, handleSidebarDragEnd]);

  const activeDocIndex = documents.findIndex((doc) => doc.id === activeDocId);

  function goToAdjacentDocument(direction: 1 | -1) {
    if (activeDocIndex < 0) return;
    const next = documents[activeDocIndex + direction];
    if (!next || switchLockRef.current || htmlDragRef.current) return;
    const current = documents[activeDocIndex];
    if (
      current &&
      isPdfDocument(current.file) &&
      pdfReadyDocId !== current.id
    ) {
      return;
    }
    switchLockRef.current = true;
    pendingScrollRef.current = direction === 1 ? "top" : "bottom";
    setActiveDocId(next.id);
    window.setTimeout(() => {
      switchLockRef.current = false;
    }, 500);
  }

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const mode = pendingScrollRef.current ?? "top";
    pendingScrollRef.current = null;
    const frame = requestAnimationFrame(() => {
      el.scrollTop = mode === "bottom" ? el.scrollHeight : 0;
      lastScrollTopRef.current = el.scrollTop;
    });
    return () => cancelAnimationFrame(frame);
  }, [activeDocId]);

  function handleCanvasWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (htmlDragRef.current || documents.length < 2) return;
    const el = canvasRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 20;
    const atTop = el.scrollTop <= 20;
    if (e.deltaY > 8 && atBottom && activeDocIndex < documents.length - 1) {
      e.preventDefault();
      goToAdjacentDocument(1);
    } else if (e.deltaY < -8 && atTop && activeDocIndex > 0) {
      e.preventDefault();
      goToAdjacentDocument(-1);
    }
  }

  function handleCanvasScroll() {
    const el = canvasRef.current;
    if (!el || switchLockRef.current || documents.length < 2) return;
    const previous = lastScrollTopRef.current;
    const top = el.scrollTop;
    lastScrollTopRef.current = top;
    if (el.scrollHeight - el.clientHeight <= 32) return;
    const atBottom = el.scrollHeight - top - el.clientHeight <= 20;
    const atTop = top <= 20;
    if (top > previous && atBottom) goToAdjacentDocument(1);
    else if (top < previous && atTop) goToAdjacentDocument(-1);
  }

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
        setIsConfirmOpen(false);
        return;
      }

      if (onSend) {
        const notified = await onSend();
        toast.success(
          notified?.length
            ? `Signature request sent to ${notified.length} recipient${notified.length === 1 ? "" : "s"}.`
            : "Signature request sent successfully!",
        );
        setIsConfirmOpen(false);
        router.push("/signature/documents");
      } else {
        toast.success("Signature request sent successfully!");
        setIsConfirmOpen(false);
        router.push("/signature/documents");
      }
    } catch (error) {
      console.error("Failed to process submission:", error);
      toast.error(
        isTemplate
          ? "Failed to save template."
          : error instanceof Error && error.message
            ? error.message
            : "Failed to send signature request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  function handleChangeValue(id: string, value: string) {
    handleChangeFieldValue?.(id, value);
    if (emptyFieldErrorId === id && !isSenderFieldValueEmpty({ type: placedFields.find((f) => f.id === id)?.type ?? "text", value })) {
      setEmptyFieldErrorId(null);
    }
  }

  function handleConfirmAndSend() {
    const emptyPrefill = placedFields.find(
      (field) =>
        isSenderPrefillField(field.recipientId) &&
        isSenderFieldValueEmpty(field),
    );
    if (emptyPrefill) {
      setIsConfirmOpen(false);
      setEmptyFieldErrorId(emptyPrefill.id);
      if (emptyPrefill.documentId !== activeDocId) {
        pendingScrollRef.current = "top";
        setActiveDocId(emptyPrefill.documentId);
      }
      window.setTimeout(() => {
        scrollToPage(emptyPrefill.page);
        document
          .getElementById(`placed-field-${emptyPrefill.id}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 50);
      return;
    }
    void handleSubmitAction();
  }

  const makeContainerDropHandler =
    (documentId: string) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const pos = pointerToPagePercent(
        e.clientX,
        e.clientY,
        e.currentTarget,
        {
          fieldWidth: DEFAULT_PLACED_FIELD_WIDTH,
          fieldHeight: DEFAULT_PLACED_FIELD_HEIGHT,
        },
      );

      if (activeResizingId) {
        handleRepositionField(
          activeResizingId,
          documentId,
          1,
          pos.xPct,
          pos.yPct,
        );
        setActiveResizingId(null);
      } else if (draggingFieldType) {
        handleDropField(documentId, 1, pos.xPct, pos.yPct);
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

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = htmlDragRef.current;
      if (!drag) return;
      const pageEl = htmlPageRefs.current.get(drag.documentId);
      if (!pageEl) return;
      const pos = pointerToPagePercent(e.clientX, e.clientY, pageEl, {
        offsetX: drag.offsetX,
        offsetY: drag.offsetY,
        fieldWidth: drag.width,
        fieldHeight: drag.height,
      });
      handleRepositionRef.current(drag.id, drag.documentId, 1, pos.xPct, pos.yPct);
    };
    const onUp = () => {
      htmlDragRef.current = null;
      setActiveResizingId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const activeDoc =
    documents.find((doc) => doc.id === activeDocId) ?? documents[0] ?? null;
  const activePageCount = activeDoc
    ? pageCounts[activeDoc.id] || (isPdfDocument(activeDoc.file) ? 0 : 1)
    : 0;
  const pageWidth = Math.round((BASE_PAGE_WIDTH * zoom) / 100);
  const displayName =
    activeDoc?.name ||
    documentName.trim() ||
    (isTemplate ? "Untitled template" : "Untitled request");

  function handleNumPagesResolved(documentId: string, numPages: number) {
    setPageCounts((prev) =>
      prev[documentId] === numPages ? prev : { ...prev, [documentId]: numPages },
    );
  }

  function onPalettePointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    field: StandardFieldType,
    recipient?: { id: string; name: string; email: string; colorIndex: number },
  ) {
    if (e.button !== 0) return;
    e.preventDefault();
    paletteDragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      field,
      recipient,
    };
    handleArmField?.(field, recipient);
  }

  function scrollToPage(page: number) {
    const canvas = canvasRef.current;
    if (!canvas || !activeDoc) return;
    const el = document.getElementById(`pdf-page-${activeDoc.id}-${page}`);
    if (!el) {
      glideScroll(canvas, 0);
      setCurrentPage(1);
      return;
    }
    const top =
      el.getBoundingClientRect().top -
      canvas.getBoundingClientRect().top +
      canvas.scrollTop;
    glideScroll(canvas, Math.max(0, top));
    setCurrentPage(page);
  }

  function stepPage(delta: number) {
    if (!activePageCount) return;
    const next = Math.min(activePageCount, Math.max(1, currentPage + delta));
    scrollToPage(next);
  }

  function stepZoom(delta: number) {
    const index = ZOOM_LEVELS.indexOf(zoom);
    const nextIndex = Math.min(
      ZOOM_LEVELS.length - 1,
      Math.max(0, (index === -1 ? 2 : index) + delta),
    );
    setZoom(ZOOM_LEVELS[nextIndex]);
  }

  function handleDownload() {
    if (!activeDoc?.fileUrl) return;
    const link = document.createElement("a");
    link.href = activeDoc.fileUrl;
    link.download = activeDoc.name || "document";
    link.click();
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [activeDocId]);

  useEffect(() => {
    const root = canvasRef.current;
    if (!root || !activeDoc || !activePageCount) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const match = visible.target.id.match(/pdf-page-.+-(\d+)$/);
        if (match) setCurrentPage(Number(match[1]));
      },
      { root, threshold: 0.35 },
    );
    for (let page = 1; page <= activePageCount; page += 1) {
      const el = document.getElementById(`pdf-page-${activeDoc.id}-${page}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [activeDoc, activePageCount, pdfReadyDocId, zoom]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
        <div className="flex min-w-0 max-w-[280px] items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate text-[13px] font-medium text-slate-800">
            {displayName}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </div>

        <div className="flex flex-1 items-center justify-center gap-1 text-slate-600">
          <button
            type="button"
            onClick={() => stepPage(-1)}
            disabled={currentPage <= 1}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[4.5rem] text-center text-[13px] tabular-nums">
            {activePageCount ? `${currentPage} of ${activePageCount}` : "—"}
          </span>
          <button
            type="button"
            onClick={() => stepPage(1)}
            disabled={!activePageCount || currentPage >= activePageCount}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100 disabled:opacity-30"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => stepZoom(-1)}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center text-[12px] tabular-nums">{zoom}%</span>
          <button
            type="button"
            onClick={() => stepZoom(1)}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
            aria-label="Fit width"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          {findOpen ? (
            <input
              autoFocus
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const page = Number.parseInt(findQuery, 10);
                  if (page >= 1 && page <= activePageCount) scrollToPage(page);
                }
                if (e.key === "Escape") setFindOpen(false);
              }}
              placeholder="Page #"
              className="h-8 w-24 rounded border border-slate-200 px-2 text-[12px] outline-none focus:border-primary"
            />
          ) : (
            <button
              type="button"
              onClick={() => setFindOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
              aria-label="Find page"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100"
            aria-label="Download"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              toast.message("Detect fields", {
                description:
                  "Automatic field detection is not available yet. Drag fields from the right panel.",
              })
            }
            className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
          >
            <ScanLine className="h-3.5 w-3.5" />
            Detect fields
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
              Actions
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsPreviewOpen(true)}>
                Preview
              </DropdownMenuItem>
              {isTemplate ? (
                <DropdownMenuItem
                  onClick={() => handleSaveTemplate?.()}
                >
                  Save template
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={handleBackToForm}
            className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="flex overflow-hidden rounded">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsConfirmOpen(true);
              }}
              disabled={isSubmitting}
              className="inline-flex h-8 items-center gap-1.5 bg-primary px-4 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isTemplate ? (
                <BookmarkPlus className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {isSubmitting
                ? isTemplate
                  ? "Saving..."
                  : "Sending..."
                : isTemplate
                  ? "Save"
                  : "Send"}
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="flex h-8 w-7 items-center justify-center border-l border-white/20 bg-primary text-white hover:bg-primary/90"
              aria-label="Confirm and send"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {documents.length > 0 ? (
          <aside className="relative z-20 flex w-[168px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white pointer-events-auto">
            <div className="border-b border-slate-100 px-3 py-2.5">
              <h3 className="text-[13px] font-semibold text-slate-800">
                Documents
              </h3>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {documents.map((doc) => {
                const selected = doc.id === activeDoc?.id;
                const pages = pageCounts[doc.id] || (isPdfDocument(doc.file) ? 0 : 1);
                return (
                  <div key={doc.id} className="border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (doc.id !== activeDocId) {
                          pendingScrollRef.current = "top";
                          setActiveDocId(doc.id);
                        }
                        setLeftDocExpanded(true);
                      }}
                      className="flex w-full items-start gap-1 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <ChevronDown
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition",
                          selected && leftDocExpanded ? "rotate-0" : "-rotate-90",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-slate-800">
                          {doc.name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {pages ? `${pages} page${pages === 1 ? "" : "s"}` : "…"}
                        </span>
                      </span>
                    </button>
                    {selected && leftDocExpanded ? (
                      isPdfDocument(doc.file) && doc.fileUrl && pages > 0 ? (
                        <PdfPageThumbnails
                          fileUrl={doc.fileUrl}
                          numPages={pages}
                          currentPage={currentPage}
                          onSelectPage={scrollToPage}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => scrollToPage(1)}
                          className="flex w-full flex-col items-center gap-1.5 px-3 pb-3"
                        >
                          <span
                            className={cn(
                              "flex h-[150px] w-[118px] items-center justify-center rounded-sm border bg-white shadow-sm",
                              currentPage === 1
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-slate-200",
                            )}
                          >
                            <FileText className="h-8 w-8 text-slate-300" />
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            1
                          </span>
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          </aside>
        ) : null}

        <div
          ref={canvasRef}
          onScroll={handleCanvasScroll}
          onWheel={handleCanvasWheel}
          onDragOver={(e) => {
            if (!draggingFieldType) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          className="relative z-0 flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-y-auto overflow-x-hidden bg-[#ececec] py-5 [scrollbar-gutter:stable]"
        >
          <div
            key={activeDoc?.id ?? "empty"}
            className="flex w-full flex-col items-center"
          >
            {documents.length === 0 || !activeDoc ? (
              <div className="flex flex-1 items-center justify-center py-16 text-xs text-slate-400">
                No document preview available. Please go back and upload a valid
                file.
              </div>
            ) : (
              (() => {
                const doc = activeDoc;
                const isPdf = isPdfDocument(doc.file);
                const handleContainerDrop = makeContainerDropHandler(doc.id);

                return (
                  <div key={doc.id} className="flex w-full flex-col items-center">
                        {doc.fileUrl ? (
                          isPdf ? (
                            <PdfFieldEditor
                              key={doc.id}
                              documentId={doc.id}
                              fileUrl={doc.fileUrl}
                              placedFields={placedFields}
                              draggingFieldType={draggingFieldType}
                              pageWidth={pageWidth}
                              onDropField={handleDropField}
                              onRepositionField={handleRepositionField}
                              onRemoveField={handleRemovePlacedField}
                              onResizeField={handleResizeField}
                              onChangeFieldValue={handleChangeValue}
                              emptyFieldErrorId={emptyFieldErrorId}
                              onPickSignature={setSignaturePickerField}
                              onNumPagesResolved={handleNumPagesResolved}
                              onDocumentReady={setPdfReadyDocId}
                            />
                          ) : (
                            <div
                              id={`pdf-page-${doc.id}-1`}
                              ref={(el) => {
                                if (el) htmlPageRefs.current.set(doc.id, el);
                                else htmlPageRefs.current.delete(doc.id);
                              }}
                              className="relative min-h-[900px] select-none rounded-sm bg-white p-8 shadow-md"
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "copy";
                              }}
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
                                  const width =
                                    field.width || DEFAULT_PLACED_FIELD_WIDTH;
                                  const height =
                                    field.height || DEFAULT_PLACED_FIELD_HEIGHT;
                                  const color = signerColor(field.colorIndex);
                                  const isPrefill = isSenderPrefillField(
                                    field.recipientId,
                                  );
                                  const isSignaturePick =
                                    field.type === "signature" ||
                                    field.type === "initials" ||
                                    field.type === "stamp" ||
                                    field.type === "company" ||
                                    field.type === "job_title";
                                  const showEmptyError =
                                    emptyFieldErrorId === field.id;

                                  return (
                                    <div
                                      key={field.id}
                                      id={`placed-field-${field.id}`}
                                      onPointerDown={(e) => {
                                        if (e.button !== 0) return;
                                        const target = e.target as HTMLElement;
                                        if (
                                          target.closest(
                                            "input, textarea, select, button",
                                          )
                                        ) {
                                          e.stopPropagation();
                                          return;
                                        }
                                        if (
                                          field.type === "signature" ||
                                          field.type === "initials"
                                        ) {
                                          e.stopPropagation();
                                          return;
                                        }
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        htmlDragRef.current = {
                                          id: field.id,
                                          documentId: doc.id,
                                          offsetX: e.clientX - rect.left,
                                          offsetY: e.clientY - rect.top,
                                          width,
                                          height,
                                        };
                                        setActiveResizingId(field.id);
                                      }}
                                      onClick={
                                        isSignaturePick
                                          ? (e) => {
                                              e.stopPropagation();
                                              setSignaturePickerField(field);
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
                                      className={`absolute text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center justify-between group border-2 border-dashed ${
                                        showEmptyError
                                          ? "z-40 bg-white text-slate-700 border-sky-400 ring-2 ring-sky-300/60"
                                          : color
                                            ? `z-10 ${color.bg} ${color.text} ${color.border}`
                                            : "z-10 bg-indigo-50/90 text-indigo-700 border-indigo-400"
                                      }`}
                                    >
                                      {isSignaturePick &&
                                      (field.type === "signature" ||
                                        field.type === "initials") ? (
                                        field.value?.startsWith("data:") ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={field.value}
                                            alt=""
                                            className="h-full max-h-7 w-full object-contain object-left"
                                          />
                                        ) : (
                                          <span className="truncate">
                                            {field.value || field.label}
                                          </span>
                                        )
                                      ) : field.type === "checkbox" ? (
                                        <input
                                          type="checkbox"
                                          disabled={!isPrefill}
                                          checked={field.value === "true"}
                                          onChange={(e) =>
                                            handleChangeValue(
                                              field.id,
                                              e.target.checked ? "true" : "",
                                            )
                                          }
                                          className="w-3.5 h-3.5 accent-current shrink-0"
                                        />
                                      ) : field.type === "date" ||
                                        field.type === "sign_date" ? (
                                        <input
                                          type="date"
                                          disabled={!isPrefill}
                                          value={field.value ?? ""}
                                          onChange={(e) =>
                                            handleChangeValue(
                                              field.id,
                                              e.target.value,
                                            )
                                          }
                                          className="w-full bg-transparent text-[11px] font-semibold outline-none border-none"
                                        />
                                      ) : isPrefill ? (
                                        <input
                                          type="text"
                                          value={field.value ?? ""}
                                          placeholder={field.label}
                                          onChange={(e) =>
                                            handleChangeValue(
                                              field.id,
                                              e.target.value,
                                            )
                                          }
                                          className="w-full min-w-0 bg-transparent text-[11px] font-semibold outline-none"
                                        />
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
                                      {showEmptyError ? (
                                        <SenderFieldErrorTooltip
                                          fieldId={field.id}
                                          fieldLabel={field.label}
                                        />
                                      ) : null}
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
                );
              })()
            )}
          </div>
        </div>

        <StandardFieldsSidebar
          recipients={recipients}
          onArmField={handleArmField}
          onPalettePointerDown={onPalettePointerDown}
        />
      </div>

      {isConfirmOpen ? (
        <ConfirmSendDetailsModal
          recipients={recipients}
          placedFields={placedFields}
          isTemplate={isTemplate}
          isSubmitting={isSubmitting}
          onCancel={() => {
            if (!isSubmitting) setIsConfirmOpen(false);
          }}
          onConfirm={() => {
            handleConfirmAndSend();
          }}
        />
      ) : null}

      {isPreviewOpen ? (
        <PlaceFieldsPreviewModal
          documents={documents}
          placedFields={placedFields}
          recipients={recipients}
          isTemplate={isTemplate}
          isSubmitting={isSubmitting}
          onClose={() => setIsPreviewOpen(false)}
          onConfirm={() => {
            setIsPreviewOpen(false);
            handleConfirmAndSend();
          }}
        />
      ) : null}

      {signaturePickerField ? (
        <SelectSignatureProfileModal
          open
          fieldType={
            signaturePickerField.type === "initials" ||
            signaturePickerField.type === "stamp" ||
            signaturePickerField.type === "company" ||
            signaturePickerField.type === "job_title"
              ? signaturePickerField.type
              : "signature"
          }
          existingValue={
            placedFields.find((field) => field.id === signaturePickerField.id)
              ?.value ?? signaturePickerField.value
          }
          onClose={() => setSignaturePickerField(null)}
          onUse={(payload) => {
            placedFields.forEach((field) => {
              if (!isSenderPrefillField(field.recipientId)) return;
              if (field.type === "signature" && payload.signature) {
                handleChangeValue(field.id, payload.signature);
              }
              if (field.type === "initials" && payload.initial) {
                handleChangeValue(field.id, payload.initial);
              }
              if (field.type === "stamp" && payload.stamp) {
                handleChangeValue(field.id, payload.stamp);
              }
              if (field.type === "company" && payload.company) {
                handleChangeValue(field.id, payload.company);
              }
              if (field.type === "job_title" && payload.jobTitle) {
                handleChangeValue(field.id, payload.jobTitle);
              }
            });
            const clicked = signaturePickerField;
            if (clicked.type === "signature" && payload.signature) {
              handleChangeValue(clicked.id, payload.signature);
            }
            if (clicked.type === "initials" && payload.initial) {
              handleChangeValue(clicked.id, payload.initial);
            }
            if (clicked.type === "stamp" && payload.stamp) {
              handleChangeValue(clicked.id, payload.stamp);
            }
            if (clicked.type === "company" && payload.company) {
              handleChangeValue(clicked.id, payload.company);
            }
            if (clicked.type === "job_title" && payload.jobTitle) {
              handleChangeValue(clicked.id, payload.jobTitle);
            }
            setSignaturePickerField(null);
          }}
        />
      ) : null}

      {paletteGhost ? (
        <div
          className={`pointer-events-none fixed z-[80] flex items-center rounded-md border-2 border-dashed px-2.5 text-[11px] font-semibold shadow-md ${
            signerColor(paletteGhost.colorIndex).bg
          } ${signerColor(paletteGhost.colorIndex).text} ${
            signerColor(paletteGhost.colorIndex).border
          }`}
          style={{
            left: paletteGhost.x,
            top: paletteGhost.y,
            width: DEFAULT_PLACED_FIELD_WIDTH,
            height: DEFAULT_PLACED_FIELD_HEIGHT,
          }}
        >
          {paletteGhost.label}
        </div>
      ) : null}
    </div>
  );
}
