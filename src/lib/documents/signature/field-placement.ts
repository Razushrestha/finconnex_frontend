export const DEFAULT_PLACED_FIELD_WIDTH = 140;
export const DEFAULT_PLACED_FIELD_HEIGHT = 36;

const PREVIEW_PAGE_WIDTH = 700;

/** Match Place Fields overlays: top-left % origin, pixel box size. */
export function placedFieldOverlayStyle(field: {
  x: number;
  y: number;
  w?: number;
  h?: number;
}): {
  left: string;
  top: string;
  width: string;
  height: string;
  transform: "none";
} {
  const width =
    field.w && field.w > 40
      ? `${field.w}px`
      : `${field.w && field.w > 0 ? field.w : 20}%`;
  const height =
    field.h && field.h > 20
      ? `${field.h}px`
      : `${DEFAULT_PLACED_FIELD_HEIGHT}px`;
  return {
    left: `${field.x}%`,
    top: `${field.y}%`,
    width,
    height,
    transform: "none",
  };
}

/** Same box the overlay uses, in PDF user space (origin bottom-left). */
export function placedFieldPdfRect(
  field: { x: number; y: number; w?: number; h?: number },
  pageWidth: number,
  pageHeight: number,
  previewWidth = PREVIEW_PAGE_WIDTH,
) {
  const previewHeight = previewWidth * (pageHeight / pageWidth || 1);
  const xPct = field.x <= 1 && field.y <= 1 ? field.x * 100 : field.x;
  const yPct = field.x <= 1 && field.y <= 1 ? field.y * 100 : field.y;
  let widthPx: number;
  if (field.w && field.w > 40) widthPx = field.w;
  else if (field.w && field.w > 0) widthPx = (field.w / 100) * previewWidth;
  else widthPx = DEFAULT_PLACED_FIELD_WIDTH;
  const heightPx =
    field.h && field.h > 20 ? field.h : DEFAULT_PLACED_FIELD_HEIGHT;
  const scaleX = pageWidth / previewWidth;
  const scaleY = pageHeight / previewHeight;
  return {
    x: (xPct / 100) * pageWidth,
    y: pageHeight - (yPct / 100) * pageHeight - heightPx * scaleY,
    width: widthPx * scaleX,
    height: heightPx * scaleY,
  };
}

export type PagePercent = { xPct: number; yPct: number };

function pageSurface(pageEl: HTMLElement): HTMLElement {
  // Fields are `absolute` against this node, so percentages must use its box —
  // not the inner canvas, which can differ by a sub-pixel.
  return pageEl;
}

/** Map a pointer to page-relative %, with the field's top-left under the cursor (minus grab offset). */
export function pointerToPagePercent(
  clientX: number,
  clientY: number,
  pageEl: HTMLElement,
  opts?: {
    offsetX?: number;
    offsetY?: number;
    fieldWidth?: number;
    fieldHeight?: number;
  },
): PagePercent {
  const surface = pageSurface(pageEl);
  const rect = surface.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { xPct: 0, yPct: 0 };

  const offsetX = opts?.offsetX ?? 0;
  const offsetY = opts?.offsetY ?? 0;
  const fieldWidth = opts?.fieldWidth ?? DEFAULT_PLACED_FIELD_WIDTH;
  const fieldHeight = opts?.fieldHeight ?? DEFAULT_PLACED_FIELD_HEIGHT;
  const maxX = Math.max(0, rect.width - fieldWidth);
  const maxY = Math.max(0, rect.height - fieldHeight);
  const x = Math.min(maxX, Math.max(0, clientX - offsetX - rect.left));
  const y = Math.min(maxY, Math.max(0, clientY - offsetY - rect.top));

  return {
    xPct: (x / rect.width) * 100,
    yPct: (y / rect.height) * 100,
  };
}

export function clientPointHitsPage(
  clientX: number,
  clientY: number,
  pageEl: HTMLElement,
  slack = 12,
): boolean {
  const rect = pageSurface(pageEl).getBoundingClientRect();
  return (
    clientX >= rect.left - slack &&
    clientX <= rect.right + slack &&
    clientY >= rect.top - slack &&
    clientY <= rect.bottom + slack
  );
}

export function pageDropTargetFromPoint(clientX: number, clientY: number) {
  const node = document.elementFromPoint(clientX, clientY);
  if (!(node instanceof Element)) return null;
  const page = node.closest<HTMLElement>("[id^='pdf-page-']");
  if (!page?.id) return null;
  const match = page.id.match(/^pdf-page-(.+)-(\d+)$/);
  if (!match) return null;
  return {
    documentId: match[1],
    page: Number(match[2]),
    el: page,
  };
}

export function fieldDragFont() {
  return "600 11px/1.2 ui-sans-serif, system-ui, sans-serif";
}

/** Tiny field-sized drag image so the cursor is the top-left of the preview. */
export function setFieldDragImage(
  dataTransfer: DataTransfer,
  label: string,
  opts?: {
    width?: number;
    height?: number;
    background?: string;
    color?: string;
    border?: string;
    font?: string;
  },
) {
  const width = opts?.width ?? DEFAULT_PLACED_FIELD_WIDTH;
  const height = opts?.height ?? DEFAULT_PLACED_FIELD_HEIGHT;
  const preview = document.createElement("div");
  preview.textContent = label;
  preview.style.cssText = [
    "position:absolute",
    "top:-1000px",
    "left:-1000px",
    `width:${width}px`,
    `height:${height}px`,
    "display:flex",
    "align-items:center",
    "padding:0 10px",
    `border:2px dashed ${opts?.border ?? "#FACC15"}`,
    "border-radius:6px",
    `background:${opts?.background ?? "#FEF9C3"}`,
    `color:${opts?.color ?? "#713F12"}`,
    `font:${opts?.font ?? "600 11px/1.2 ui-sans-serif, system-ui, sans-serif"}`,
    "pointer-events:none",
    "box-sizing:border-box",
    "white-space:nowrap",
    "overflow:hidden",
  ].join(";");
  document.body.appendChild(preview);
  dataTransfer.setDragImage(preview, 0, 0);
  window.setTimeout(() => preview.remove(), 0);
}

export function isSenderPrefillField(recipientId?: string) {
  return recipientId === "prefill";
}

export function isSenderFieldValueEmpty(field: {
  type: string;
  value?: string;
}) {
  if (field.type === "checkbox") return field.value !== "true";
  return !String(field.value ?? "").trim();
}
