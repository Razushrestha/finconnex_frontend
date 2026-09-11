export const DEFAULT_PLACED_FIELD_WIDTH = 140;
export const DEFAULT_PLACED_FIELD_HEIGHT = 36;

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

/** Tiny field-sized drag image so the cursor is the top-left of the preview. */
export function setFieldDragImage(
  dataTransfer: DataTransfer,
  label: string,
  width = DEFAULT_PLACED_FIELD_WIDTH,
  height = DEFAULT_PLACED_FIELD_HEIGHT,
) {
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
    "border:2px dashed rgb(167 139 250)",
    "border-radius:6px",
    "background:rgba(237,233,254,0.95)",
    "color:rgb(109 40 217)",
    "font:600 11px/1.2 system-ui,sans-serif",
    "pointer-events:none",
    "box-sizing:border-box",
  ].join(";");
  document.body.appendChild(preview);
  dataTransfer.setDragImage(preview, 0, 0);
  window.setTimeout(() => preview.remove(), 0);
}
