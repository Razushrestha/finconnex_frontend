import { isUuid } from "@/lib/activity-timeline/auth";
import {
  createCrmDocument,
  toCreateDocumentBody,
} from "@/lib/documents/library/api";
import {
  attachCrmEmailFile,
  attachCrmEmailObject,
} from "@/lib/emails/api";
import { uploadCrmStorageFile } from "@/lib/storage/api";

export type EmailOutboundAttachment = {
  filename: string;
  type: string;
  content: string;
  disposition: "attachment" | "inline";
  contentId?: string;
};

function relatedIds(relatedType?: string, relatedId?: string) {
  if (!isUuid(relatedId)) return {};
  const kind = (relatedType ?? "").trim().toUpperCase();
  if (kind === "LEAD") return { leadId: relatedId };
  if (kind === "CONTACT") return { contactId: relatedId };
  if (kind === "COMPANY") return { companyId: relatedId };
  if (kind === "DEAL") return { dealId: relatedId };
  return {};
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
  const files: File[] = [...(input.files ?? [])];
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
      disposition: file.type.startsWith("image/") ? "inline" : "attachment",
    });
  }

  return { html, files, outbound };
}

export async function attachFilesToCrmEmail(input: {
  emailId: string;
  files: File[];
  relatedType?: string;
  relatedId?: string;
}): Promise<void> {
  if (!input.files.length) return;
  const related = relatedIds(input.relatedType, input.relatedId);
  const errors: string[] = [];

  for (const file of input.files) {
    try {
      const stored = await uploadCrmStorageFile(file);
      let documentId = "";
      if (stored.key) {
        const doc = await createCrmDocument(
          toCreateDocumentBody({
            fileName: stored.fileName || file.name,
            folder: "Clients",
            documentType: "OTHER",
            storageKey: stored.key,
            mimeType: stored.contentType || file.type,
            sizeBytes: stored.size || file.size,
            relatedTo: "Email attachment",
            ...related,
          }),
        );
        documentId = doc?.id && isUuid(doc.id) ? doc.id : "";
      }
      if (documentId) {
        await attachCrmEmailObject(input.emailId, {
          objectType: "DOCUMENT",
          objectId: documentId,
        });
        continue;
      }
      if (stored.key) {
        await attachCrmEmailObject(input.emailId, {
          key: stored.key,
          name: file.name,
          mimeType: stored.contentType || file.type || "application/octet-stream",
          size: stored.size || file.size,
        });
        continue;
      }
      await attachCrmEmailFile(input.emailId, file);
    } catch {
      try {
        await attachCrmEmailFile(input.emailId, file);
      } catch (err) {
        errors.push(
          `${file.name}: ${err instanceof Error ? err.message : "could not attach"}`,
        );
      }
    }
  }

  void errors;
}
