/** A step above the old hairline, without turning the stroke into a marker. */
export function signaturePenWidth(cssHeight: number) {
  const height = Number.isFinite(cssHeight) && cssHeight > 0 ? cssHeight : 176;
  return Math.max(3.4, Math.min(4.2, height * 0.022));
}

export function applySignaturePen(
  ctx: CanvasRenderingContext2D,
  cssHeight: number,
  color = "#111827",
) {
  ctx.lineWidth = signaturePenWidth(cssHeight);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
}
