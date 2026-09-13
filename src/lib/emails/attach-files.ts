import { attachCrmEmailObject } from "@/lib/emails/api";
import {
  uploadCrmStorageFile,
  type CrmStorageObject,
} from "@/lib/storage/api";

export type EmailOutboundAttachment = {
  filename: string;
  type: string;
  content: string;
  disposition: "attachment" | "inline";
  contentId?: string;
};

/** Nest AddEmailAttachmentDto + activity MIME whitelist. */
const CRM_EMAIL_MIME_EXT: Record<string, readonly string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "text/csv": [".csv"],
};

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".csv": "text/csv",
};

function fileExtension(name: string): string {
  const lower = name.trim().toLowerCase();
  const index = lower.lastIndexOf(".");
  return index >= 0 ? lower.slice(index) : "";
}

function mimeFromFilename(name: string): string {
  return EXT_TO_MIME[fileExtension(name)] ?? "";
}

function guessMime(file: File, stored?: CrmStorageObject): string {
  const candidates = [
    stored?.contentType,
    file.type,
    mimeFromFilename(stored?.fileName || file.name),
  ];
  for (const raw of candidates) {
    const value = (raw ?? "").split(";")[0].trim().toLowerCase();
    const normalized = value === "image/jpg" ? "image/jpeg" : value;
    if (CRM_EMAIL_MIME_EXT[normalized]) return normalized;
  }
  return "";
}

export function withInferredEmailFileType(file: File): File {
  const mime = guessMime(file);
  if (!mime || file.type === mime) return file;
  return new File([file], file.name, { type: mime });
}

function withMatchingExtension(fileName: string, mimeType: string): string {
  const allowed = CRM_EMAIL_MIME_EXT[mimeType];
  if (!allowed?.length) return fileName;
  const lower = fileName.toLowerCase();
  if (allowed.some((ext) => lower.endsWith(ext))) return fileName;
  const base = fileName.replace(/\.[^.]+$/, "") || fileName;
  return `${base}${allowed[0]}`;
}

export function toCrmEmailAttachmentDto(
  file: File,
  stored: CrmStorageObject,
): { key: string; name: string; mimeType: string; size: number } | null {
  const key = stored.key.trim();
  if (!key || key.startsWith("local/")) return null;
  const mimeType = guessMime(file, stored);
  if (!CRM_EMAIL_MIME_EXT[mimeType]) return null;
  const size = Math.round(stored.size || file.size);
  if (size < 1 || size > 10 * 1024 * 1024) return null;
  return {
    key,
    name: withMatchingExtension(stored.fileName || file.name, mimeType),
    mimeType,
    size,
  };
}

function dataUrlToFile(dataUrl: string, name: string): File | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1] || "application/octet-stream";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = mime.split("/")[1]?.split("+")[0] || "bin";
  const fileName = name.includes(".") ? name : `${name}.${ext}`;
  return new File([bytes], fileName, { type: mime });
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function prepareEmailPayload(input: {
  html: string;
  files?: File[];
}): Promise<{
  html: string;
  files: File[];
  outbound: EmailOutboundAttachment[];
}> {
  const files: File[] = [...(input.files ?? [])].map(withInferredEmailFileType);
  let html = input.html || "";
  const outbound: EmailOutboundAttachment[] = [];
  const seen = new Set(files.map((file) => `${file.name}:${file.size}`));

  const images = [...html.matchAll(/<img\b[^>]*src=["'](data:image\/[^"']+)["'][^>]*>/gi)];
  let imageIndex = 0;
  for (const match of images) {
    const dataUrl = match[1];
    if (!dataUrl) continue;
    imageIndex += 1;
    const file = dataUrlToFile(dataUrl, `image-${imageIndex}`);
    if (!file) continue;
    const contentId = `img${imageIndex}`;
    html = html.replace(dataUrl, `cid:${contentId}`);
    const key = `${file.name}:${file.size}`;
    if (!seen.has(key)) {
      files.push(file);
      seen.add(key);
    }
    outbound.push({
      filename: file.name,
      type: file.type || "image/png",
      content: await fileToBase64(file),
      disposition: "inline",
      contentId,
    });
  }

  for (const file of files) {
    const already = outbound.some(
      (row) => row.filename === file.name && row.type === (file.type || row.type),
    );
    if (already) continue;
    outbound.push({
      filename: file.name,
      type: file.type || "application/octet-stream",
      content: await fileToBase64(file),
      disposition: "attachment",
    });
  }

  return { html, files, outbound };
}

export async function attachFilesToCrmEmail(input: {
  emailId: string;
  files: File[];
  relatedType?: string;
  relatedId?: string;
}): Promise<{ attached: number; total: number }> {
  void input.relatedType;
  void input.relatedId;
  const files = input.files.map(withInferredEmailFileType);
  if (!files.length) return { attached: 0, total: 0 };

  let attached = 0;
  for (const file of files) {
    try {
      const stored = await uploadCrmStorageFile(file);
      const payload = toCrmEmailAttachmentDto(file, stored);
      if (!payload) continue;
      await attachCrmEmailObject(input.emailId, payload);
      attached += 1;
    } catch {
      /* CRM draft can still send; SendGrid deliver keeps a copy with files. */
    }
  }
  return { attached, total: files.length };
}
