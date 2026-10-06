export type InkBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function isInkPixel(r: number, g: number, b: number, a: number) {
  if (a < 24) return false;
  return !(r > 246 && g > 246 && b > 246);
}

/** Tight box around drawn strokes, ignoring empty canvas and near-white paper. */
export function inkBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): InkBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (!isInkPixel(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3])) {
        continue;
      }
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

const cropped = new Map<string, string>();

/** Crop a signature image to its ink so it fills the field instead of floating in empty canvas. */
export function cropSignatureInk(src: string): Promise<string> {
  const cached = cropped.get(src);
  if (cached) return Promise.resolve(cached);
  if (typeof document === "undefined" || !src.startsWith("data:")) {
    return Promise.resolve(src);
  }
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (width < 2 || height < 2) {
        cropped.set(src, src);
        resolve(src);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(image, 0, 0);
      let bounds: InkBounds | null = null;
      try {
        const pixels = ctx.getImageData(0, 0, width, height);
        bounds = inkBounds(pixels.data, width, height);
      } catch {
        cropped.set(src, src);
        resolve(src);
        return;
      }
      if (!bounds) {
        cropped.set(src, src);
        resolve(src);
        return;
      }
      const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 1);
      const pad = Math.max(6, Math.round(span * 0.06));
      const sx = Math.max(0, bounds.minX - pad);
      const sy = Math.max(0, bounds.minY - pad);
      const sw = Math.min(width - sx, bounds.maxX - bounds.minX + 1 + pad * 2);
      const sh = Math.min(height - sy, bounds.maxY - bounds.minY + 1 + pad * 2);
      const out = document.createElement("canvas");
      out.width = sw;
      out.height = sh;
      const outCtx = out.getContext("2d");
      if (!outCtx) {
        resolve(src);
        return;
      }
      outCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      const next = out.toDataURL("image/png");
      cropped.set(src, next);
      resolve(next);
    };
    image.onerror = () => resolve(src);
    image.src = src;
  });
}
