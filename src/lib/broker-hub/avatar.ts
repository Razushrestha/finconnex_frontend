export const HUB_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const HUB_AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_PX = 512;
const AVATAR_JPEG_QUALITY = 0.82;

function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          AVATAR_MAX_PX / Math.max(img.width, img.height, 1),
        );
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process image"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", AVATAR_JPEG_QUALITY));
      } catch (error) {
        reject(
          error instanceof Error ? error : new Error("Could not process image"),
        );
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return Promise.reject(new Error("Use a JPG, PNG, or WEBP image"));
  }
  if (file.size > HUB_AVATAR_MAX_BYTES) {
    return Promise.reject(new Error("Image must be 5MB or smaller"));
  }
  return compressToDataUrl(file);
}
