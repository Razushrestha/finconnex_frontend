/**
 * Phase D1 — Persist downloadable signed-document artifacts (demo).
 * Stores a minimal PDF certificate in sessionStorage keyed by library doc id.
 */

import type { SignatureRequest } from "@/lib/documents/signature/types";
import {
  buildCompletionCertificatePdf,
  completionCertificateFromRequest,
} from "@/lib/documents/signature/completion-certificate";
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

/** Build a Certificate of Completion PDF. */
export function buildSignedCertificatePdf(input: {
  title: string;
  documentFile: string;
  relatedTo?: string;
  signers: { name: string; email: string; signedAt?: string }[];
  requestId: string;
}): Uint8Array {
  return buildCompletionCertificatePdf({
    envelopeId: input.requestId,
    documentName: input.title,
    generatedAt: new Date().toLocaleString("en-US"),
    sentByName: input.signers[0]?.name || "FinConnex",
    sentByEmail: input.signers[0]?.email,
    organizationName: "Finconnex Financial Services",
    organizationAddress:
      "Level 3/301 Castlereagh St., SYDNEY, NSW, Australia 2000",
    signOrder: "Sequential",
    documentCount: 1,
    timezone: "Australia/Sydney (GMT+10:00)",
    signerCount: input.signers.length,
    ccCount: 0,
    approverCount: 0,
    witnessCount: 0,
    reviewerCount: 0,
    signers: input.signers.map((s) => ({
      name: s.name,
      email: s.email,
      role: "Signer",
      status: "Signed",
      signedAt: s.signedAt,
      device: "Web",
      authenticationType: "None",
    })),
  });
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
  const fileName = req.documentFile.replace(/\.pdf$/i, "") + "_Certificate.pdf";
  const pdf = buildCompletionCertificatePdf(
    completionCertificateFromRequest(req),
  );
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
