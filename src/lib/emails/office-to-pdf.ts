import mammoth from "mammoth";
import { PDFDocument, StandardFonts } from "pdf-lib";

function isDocxFile(file: File) {
  const name = file.name.trim().toLowerCase();
  return (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<\/(p|div|h[1-6]|li|tr|table)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function winAnsiSafe(text: string) {
  return text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function wrapLine(
  text: string,
  measure: (value: string) => number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = words[0]!;
  for (const word of words.slice(1)) {
    const next = `${current} ${word}`;
    if (measure(next) <= maxWidth) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }
  lines.push(current);
  return lines;
}

/**
 * Convert a .docx attachment into a PDF the CRM email whitelist accepts.
 * Layout is plain text (mammoth → pdf-lib); good enough for delivery when
 * the remote API rejects Word MIME types.
 */
export async function officeDocToPdfFile(file: File): Promise<File | null> {
  if (!isDocxFile(file)) return null;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
    const text = winAnsiSafe(htmlToPlainText(html) || "(Empty document)");

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;
    const pageWidth = 612;
    const pageHeight = 792;
    const maxWidth = pageWidth - margin * 2;
    const lineHeight = fontSize * 1.35;
    const measure = (value: string) => font.widthOfTextAtSize(value, fontSize);

    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      lines.push(...wrapLine(paragraph, measure, maxWidth));
    }

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;
    for (const line of lines) {
      if (y < margin) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, { x: margin, y, size: fontSize, font });
      y -= lineHeight;
    }

    const bytes = await pdf.save();
    const base = file.name.replace(/\.[^.]+$/, "") || "document";
    const pdfPart = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return new File([pdfPart], `${base}.pdf`, { type: "application/pdf" });
  } catch {
    return null;
  }
}
