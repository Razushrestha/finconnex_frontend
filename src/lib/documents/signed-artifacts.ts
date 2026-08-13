/**
 * Phase D1 — Persist downloadable signed-document artifacts (demo).
 * Stores a minimal PDF certificate in sessionStorage keyed by library doc id.
 */

import type { SignatureRequest } from "@/lib/documents/signature/types";
import {
  pushLibraryDoc,
  type LibraryDocument,
} from "@/lib/documents/library/types";

const ARTIFACTS_KEY = "library:artifacts:v1";

export type SignedArtifact = {
  docId: string;
  fileName: string;
  /** Base64 of binary PDF bytes */
  contentBase64: string;
  mimeType: string;
  createdAt: string;
  signatureRequestId?: string;
};

function readMap(): Record<string, SignedArtifact> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(ARTIFACTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SignedArtifact>) : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, SignedArtifact>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ARTIFACTS_KEY, JSON.stringify(map));
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Escape PDF literal string (basic). */
function pdfEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Build a one-page Helvetica certificate PDF (no external deps). */
export function buildSignedCertificatePdf(input: {
  title: string;
  documentFile: string;
  relatedTo?: string;
  signers: { name: string; email: string; signedAt?: string }[];
  requestId: string;
}): Uint8Array {
  const lines = [
    "FinConnex — Signed certificate (demo)",
    `Request: ${input.requestId}`,
    `Title: ${input.title}`,
    `File: ${input.documentFile}`,
    input.relatedTo ? `Related: ${input.relatedTo}` : "",
    `Issued: ${new Date().toISOString()}`,
    "",
    "Signers:",
    ...input.signers.map(
      (s, i) =>
        `${i + 1}. ${s.name} <${s.email}>${s.signedAt ? ` @ ${s.signedAt}` : ""}`,
    ),
    "",
    "This demo artifact proves the e-sign flow completed.",
  ].filter(Boolean);

  const contentLines = lines
    .map((line, i) => {
      const y = 740 - i * 16;
      return `BT /F1 11 Tf 50 ${y} Td (${pdfEscape(line.slice(0, 90))}) Tj ET`;
    })
    .join("\n");

  const stream = contentLines;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(body.length);
    body += obj;
  }
  const xrefStart = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body +=
    xref +
    `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const enc = new TextEncoder();
  return enc.encode(body);
}

export function saveSignedArtifact(artifact: SignedArtifact) {
  const map = readMap();
  map[artifact.docId] = artifact;
  writeMap(map);
  return artifact;
}

export function getSignedArtifact(docId: string): SignedArtifact | null {
  return readMap()[docId] ?? null;
}

export function downloadArtifactBlob(
  artifact: SignedArtifact,
  fallbackName?: string,
) {
  const bytes = fromBase64(artifact.contentBase64);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: artifact.mimeType || "application/pdf",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = artifact.fileName || fallbackName || "signed.pdf";
  a.click();
  URL.revokeObjectURL(url);
}

/** Persist library row + downloadable PDF when a request reaches Signed. */
export function persistSignedPackage(req: SignatureRequest): LibraryDocument {
  const today = new Date().toLocaleDateString("en-AU");
  const docId = `lib-signed-${req.id}`;
  const fileName = req.documentFile.replace(/\.pdf$/i, "") + "_Signed.pdf";
  const pdf = buildSignedCertificatePdf({
    title: req.documentName,
    documentFile: req.documentFile,
    relatedTo: req.relatedTo,
    requestId: req.signatureRequestId,
    signers: req.signers
      .filter((s) => s.role !== "CC")
      .map((s) => ({
        name: s.name,
        email: s.email,
        signedAt: s.signedAt,
      })),
  });
  const sizeKb = Math.max(1, Math.round(pdf.byteLength / 1024));
  const doc: LibraryDocument = {
    id: docId,
    fileName,
    folder: "Signed",
    owner: req.createdBy,
    relatedTo: req.relatedTo,
    version: 1,
    tags: ["signed", "e-signature"],
    uploadedAt: today,
    accessLevel: "Team",
    sizeLabel: `${sizeKb} KB`,
    versions: [
      {
        version: 1,
        uploadedAt: today,
        uploadedBy: "System",
        sizeLabel: `${sizeKb} KB`,
        note: "From e-signature",
      },
    ],
  };
  pushLibraryDoc(doc);
  saveSignedArtifact({
    docId,
    fileName,
    contentBase64: toBase64(pdf),
    mimeType: "application/pdf",
    createdAt: new Date().toISOString(),
    signatureRequestId: req.id,
  });
  return doc;
}

export function downloadLibraryDocument(doc: LibraryDocument): boolean {
  const artifact = getSignedArtifact(doc.id);
  if (artifact) {
    downloadArtifactBlob(artifact, doc.fileName);
    return true;
  }
  // Seed signed docs without stored bytes — synthesize a stub certificate
  if (doc.folder === "Signed") {
    const pdf = buildSignedCertificatePdf({
      title: doc.fileName,
      documentFile: doc.fileName,
      relatedTo: doc.relatedTo,
      requestId: doc.id,
      signers: [{ name: doc.owner, email: "signed@finconnex.demo" }],
    });
    const artifact: SignedArtifact = {
      docId: doc.id,
      fileName: doc.fileName.endsWith(".pdf") ? doc.fileName : `${doc.fileName}.pdf`,
      contentBase64: toBase64(pdf),
      mimeType: "application/pdf",
      createdAt: new Date().toISOString(),
    };
    saveSignedArtifact(artifact);
    downloadArtifactBlob(artifact);
    return true;
  }
  return false;
}
