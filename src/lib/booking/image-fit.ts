/**
 * Booking page images (background, logo) are saved in the CRM inside the
 * page's branding as data URLs, which the CRM caps at 400,000 characters. A
 * phone photo is several times that, so the save was refused and the image
 * only ever lived in the designer's browser. This shrinks an oversized image
 * until it fits, keeping it as large and sharp as the limit allows.
 */

/** Comfortably under the CRM's 400,000-character limit for one image. */
export const MAX_IMAGE_CHARS = 350_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be read."));
    image.src = src;
  });
}

function encode(canvas: HTMLCanvasElement, quality: number): string {
  // WebP keeps transparency (logos); browsers that cannot write it hand back
  // PNG, which is larger, so JPEG is the fallback.
  const webp = canvas.toDataURL("image/webp", quality);
  if (webp.startsWith("data:image/webp")) return webp;
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * The image as a data URL of at most `maxChars`. Web URLs and images that
 * already fit are returned unchanged.
 */
export async function fitImageDataUrl(
  src: string,
  maxChars: number = MAX_IMAGE_CHARS,
): Promise<string> {
  if (!src.startsWith("data:image/") || src.length <= maxChars) return src;
  if (typeof document === "undefined") return src;
  const image = await loadImage(src);
  let scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight, 1));
  let quality = 0.85;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return src;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const out = encode(canvas, quality);
    if (out.length <= maxChars) return out;
    // Lower quality first; once it is already low, shrink the image instead.
    if (quality > 0.6) quality -= 0.1;
    else scale *= 0.8;
  }
  throw new Error("This image is too large. Choose a smaller one.");
}
