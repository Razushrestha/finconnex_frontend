export const HUB_AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const HUB_AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_TYPES.has(file.type)) {
      reject(new Error("Use a JPG, PNG, or WEBP image"));
      return;
    }
    if (file.size > HUB_AVATAR_MAX_BYTES) {
      reject(new Error("Image must be 5MB or smaller"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string" || !result.startsWith("data:image/")) {
        reject(new Error("Could not read image"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
