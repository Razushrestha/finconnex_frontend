import {
  buildCompletionCertificatePdf,
  completionCertificateFromRequest,
} from "./completion-certificate";
import { getRequestDocuments, type SignatureRequest } from "./types";
import { toast } from "@/lib/notify/toast";

export type PrintDocumentsMode = "documents" | "documents-and-certificate";

function printableUrl(url?: string) {
  if (!url) return null;
  if (url.startsWith("fc-file://")) return null;
  return url;
}

export function printSignatureDocuments(
  req: SignatureRequest,
  mode: PrintDocumentsMode,
) {
  const docs = getRequestDocuments(req)
    .map((doc, index) => ({
      title: doc.name || doc.fileName || `Document ${index + 1}`,
      url:
        printableUrl(doc.fileUrl) ||
        (index === 0 ? printableUrl(req.documentFileUrl) : null),
    }))
    .filter((doc): doc is { title: string; url: string } => Boolean(doc.url));

  const frames: string[] = docs.map(
    (doc) =>
      `<section class="sheet"><p class="label">${escapeHtml(doc.title)}</p><iframe src="${escapeAttr(doc.url)}"></iframe></section>`,
  );

  if (mode === "documents-and-certificate") {
    const pdf = buildCompletionCertificatePdf(
      completionCertificateFromRequest(req),
    );
    const certUrl = URL.createObjectURL(
      new Blob([pdf.buffer as ArrayBuffer], { type: "application/pdf" }),
    );
    frames.push(
      `<section class="sheet"><p class="label">Certificate of Completion</p><iframe src="${certUrl}"></iframe></section>`,
    );
  }

  if (frames.length === 0) {
    toast.error("No printable document file is available yet.");
    return;
  }

  const popup = window.open("", "_blank", "noopener,noreferrer,width=920,height=800");
  if (!popup) {
    toast.error("Allow pop-ups to print these documents.");
    return;
  }

  popup.document.open();
  popup.document.write(`<!doctype html>
<html>
<head>
  <title>Print documents</title>
  <style>
    body { margin: 16px; font-family: Arial, sans-serif; }
    .sheet { page-break-after: always; }
    .label { font-size: 12px; color: #64748b; margin: 0 0 8px; }
    iframe { width: 100%; height: 980px; border: 1px solid #e2e8f0; }
    @media print {
      body { margin: 0; }
      .label { display: none; }
      iframe { border: 0; height: 100vh; }
    }
  </style>
</head>
<body>
  ${frames.join("\n")}
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 400);
    };
  </script>
</body>
</html>`);
  popup.document.close();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string) {
  return value.replace(/"/g, "&quot;");
}
