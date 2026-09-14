import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { placedFieldPdfRect } from "@/lib/documents/signature/field-placement";
import {
  isDateFieldKind,
  isSignatureCaptureKind,
} from "@/lib/documents/signature/field-kinds";
import type {
  SignatureField,
  SignatureRequest,
  SignatureSigner,
} from "@/lib/documents/signature/types";
import { getRequestDocuments } from "@/lib/documents/signature/types";

const IMAGE_DATA_URL =
  /^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/i;

export function signedAttachmentName(fileName: string) {
  const trimmed = fileName.trim() || "document.pdf";
  const base = trimmed.replace(/\.[^.]+$/, "") || "document";
  if (/_signed$/i.test(base)) return `${base}.pdf`;
  return `${base}_signed.pdf`;
}

export function resolveFieldStampValue(
  field: SignatureField,
  signer?: SignatureSigner,
): string {
  const raw = field.value?.trim();
  if (raw) return raw;
  if (isSignatureCaptureKind(field.kind) && signer?.signatureData?.trim()) {
    return signer.signatureData.trim();
  }
  if (field.kind === "name") return signer?.name?.trim() || "";
  if (field.kind === "email") return signer?.email?.trim() || "";
  if (isDateFieldKind(field.kind)) return signer?.signedAt?.trim() || "";
  return "";
}

export function fieldsForDocument(
  req: SignatureRequest,
  documentId: string,
  documentIndex: number,
): SignatureField[] {
  const matched = req.fields.filter((field) => field.documentId === documentId);
  if (matched.length) return matched;
  const unscoped = req.fields.filter(
    (field) =>
      !field.documentId ||
      field.documentId === "primary" ||
      field.documentId === req.id,
  );
  if (documentIndex > 0 && documentId !== "primary") return [];
  return unscoped;
}

function fieldBox(
  field: SignatureField,
  pageWidth: number,
  pageHeight: number,
) {
  return placedFieldPdfRect(field, pageWidth, pageHeight);
}

function decodeRasterDataUrl(
  value: string,
): { bytes: Uint8Array; format: "png" | "jpeg" } | null {
  const match = IMAGE_DATA_URL.exec(value.trim());
  if (!match) return null;
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return {
    bytes,
    format: match[1].toLowerCase() === "png" ? "png" : "jpeg",
  };
}

async function typedSignaturePng(text: string): Promise<Uint8Array | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.font = "italic 72px 'Times New Roman', Georgia, serif";
  ctx.textBaseline = "middle";
  ctx.fillText(text.trim(), 24, canvas.height / 2);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((next) => resolve(next), "image/png"),
  );
  if (!blob) return null;
  return new Uint8Array(await blob.arrayBuffer());
}

async function drawImageInBox(
  pdf: PDFDocument,
  page: ReturnType<PDFDocument["getPages"]>[number],
  bytes: Uint8Array,
  format: "png" | "jpeg",
  box: { x: number; y: number; width: number; height: number },
) {
  const image =
    format === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const scale = Math.min(box.width / image.width, box.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  page.drawImage(image, {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  });
}

export async function stampSignedPdfBytes(
  source: Uint8Array,
  fields: SignatureField[],
  signers: SignatureSigner[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(source);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const signerById = new Map(signers.map((signer) => [signer.id, signer]));

  for (const field of fields) {
    const value = resolveFieldStampValue(field, signerById.get(field.signerId));
    if (!value) continue;
    const page = pages[(field.page || 1) - 1] ?? (pages.length === 1 ? pages[0] : undefined);
    if (!page) continue;
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const box = fieldBox(field, pageWidth, pageHeight);

    if (isSignatureCaptureKind(field.kind) || field.kind === "image" || field.kind === "stamp") {
      if (value.startsWith("typed:")) {
        const png = await typedSignaturePng(value.replace(/^typed:/, ""));
        if (png) {
          await drawImageInBox(pdf, page, png, "png", box);
          continue;
        }
        page.drawText(value.replace(/^typed:/, "").trim(), {
          x: box.x + 2,
          y: box.y + box.height * 0.28,
          size: Math.min(18, box.height * 0.7),
          font: italic,
          color: rgb(0.07, 0.09, 0.15),
          maxWidth: box.width,
        });
        continue;
      }
      const raster = decodeRasterDataUrl(value);
      if (raster) {
        await drawImageInBox(pdf, page, raster.bytes, raster.format, box);
        continue;
      }
    }

    if (field.kind === "checkbox") {
      if (value === "true") {
        page.drawText("X", {
          x: box.x + 2,
          y: box.y + 2,
          size: Math.min(14, box.height * 0.8),
          font: sans,
          color: rgb(0.07, 0.09, 0.15),
        });
      }
      continue;
    }

    const text = value.replace(/^typed:/, "").trim();
    if (!text || text.startsWith("data:") || text.startsWith("file:")) continue;
    const font = isSignatureCaptureKind(field.kind) ? italic : sans;
    let size = Math.min(box.height * 0.55, 11 * (pageWidth / 700));
    while (size > 6 && font.widthOfTextAtSize(text, size) > box.width - 2) {
      size -= 0.4;
    }
    page.drawText(text, {
      x: box.x + 2,
      y: box.y + (box.height - size) / 2,
      size,
      font,
      color: rgb(0.07, 0.09, 0.15),
      maxWidth: box.width - 2,
    });
  }

  return pdf.save();
}

export function isPdfBytes(bytes: Uint8Array) {
  if (bytes.byteLength < 5) return false;
  return (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export async function stampRequestDocument(
  req: SignatureRequest,
  documentId: string,
  documentIndex: number,
  source: Uint8Array,
): Promise<Uint8Array> {
  const fields = fieldsForDocument(req, documentId, documentIndex);
  if (!fields.length || !isPdfBytes(source)) return source;
  try {
    return await stampSignedPdfBytes(source, fields, req.signers);
  } catch {
    return source;
  }
}

export function requestHasStampableValues(req: SignatureRequest) {
  return req.fields.some((field) =>
    Boolean(
      resolveFieldStampValue(
        field,
        req.signers.find((signer) => signer.id === field.signerId),
      ),
    ),
  );
}

export function getComposeDocuments(req: SignatureRequest) {
  return getRequestDocuments(req);
}
