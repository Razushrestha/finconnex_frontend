import type { SignatureRequest, SignatureSigner } from "./types";
import { DEMO_SIGNER_IP, getRequestDocuments } from "./types";

export type CertificateSignerEvent = {
  name: string;
  email: string;
  role: string;
  status: string;
  emailedAt?: string;
  viewedAt?: string;
  termsAgreedAt?: string;
  signedAt?: string;
  ip?: string;
  device?: string;
  authenticationType?: string;
  signatureData?: string;
};

export type CompletionCertificate = {
  envelopeId: string;
  documentName: string;
  generatedAt: string;
  sentByName: string;
  sentByEmail?: string;
  organizationName: string;
  organizationAddress: string;
  sentOn?: string;
  completedOn?: string;
  signOrder: string;
  documentCount: number;
  timezone: string;
  signerCount: number;
  ccCount: number;
  approverCount: number;
  witnessCount: number;
  reviewerCount: number;
  signers: CertificateSignerEvent[];
};

const CERT_TZ = "Australia/Sydney";
const ORG_NAME = "Finconnex Financial Services";
const ORG_ADDRESS =
  "Level 3/301 Castlereagh St., SYDNEY, NSW, Australia 2000";

export function formatCertificateStamp(value?: string | Date | null): string {
  if (!value) return "—";
  const date =
    value instanceof Date
      ? value
      : /^\d{4}-/.test(String(value))
        ? new Date(value)
        : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const formatted = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: CERT_TZ,
    timeZoneName: "short",
  });
  return formatted.replace(/, (?=\d{2}:)/, " ");
}

function timezoneLabel() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CERT_TZ,
    timeZoneName: "longOffset",
  }).formatToParts(new Date());
  const offset =
    parts.find((part) => part.type === "timeZoneName")?.value || "GMT+10:00";
  return `${CERT_TZ} (${offset.replace("GMT", "GMT")})`;
}

function eventTime(
  audit: SignatureRequest["audit"],
  signer: SignatureSigner,
  needle: string,
) {
  const hit = [...audit]
    .reverse()
    .find(
      (event) =>
        event.actor === signer.name &&
        event.action.toLowerCase().includes(needle),
    );
  return hit?.at;
}

function stamp(value?: string) {
  if (!value) return undefined;
  return formatCertificateStamp(value);
}

export function completionCertificateFromRequest(
  req: SignatureRequest,
): CompletionCertificate {
  const documents = getRequestDocuments(req);
  const originator = req.signers.find((s) => s.name === req.createdBy);
  const actionable = req.signers.filter((s) => s.role !== "CC");
  const lastAudit = req.audit[req.audit.length - 1]?.at;

  return {
    envelopeId: req.signatureRequestId || req.id,
    documentName: req.documentName || req.documentFile,
    generatedAt: formatCertificateStamp(new Date()),
    sentByName: req.createdBy,
    sentByEmail: originator?.email,
    organizationName: ORG_NAME,
    organizationAddress: ORG_ADDRESS,
    sentOn: stamp(req.sentDate) || stamp(req.audit.find((a) =>
      a.action.toLowerCase().includes("sent"),
    )?.at),
    completedOn:
      stamp(req.signedDate) ||
      stamp(lastAudit) ||
      stamp(
        actionable.find((s) => s.signedAt)?.signedAt,
      ),
    signOrder: req.signingOrder === "parallel" ? "Parallel" : "Sequential",
    documentCount: Math.max(1, documents.length),
    timezone: timezoneLabel(),
    signerCount: actionable.filter((s) => s.role === "Signer").length || actionable.length,
    ccCount: req.signers.filter((s) => s.role === "CC").length,
    approverCount: req.signers.filter((s) => s.role === "Approver").length,
    witnessCount: 0,
    reviewerCount: 0,
    signers: actionable.map((s) => {
      const emailed = eventTime(req.audit, s, "sent") || req.sentDate;
      const viewed = eventTime(req.audit, s, "viewed");
      const agreed =
        eventTime(req.audit, s, "consent") ||
        eventTime(req.audit, s, "agree") ||
        viewed;
      const signed = s.signedAt || eventTime(req.audit, s, "signed");
      return {
        name: s.name,
        email: s.email,
        role: s.role === "Approver" ? "Approver" : "Signer",
        status: s.status,
        emailedAt: stamp(emailed),
        viewedAt: stamp(viewed),
        termsAgreedAt: stamp(agreed),
        signedAt: stamp(signed),
        ip: s.status === "Signed" || s.status === "Viewed" ? req.ipAddress || DEMO_SIGNER_IP : undefined,
        device: "Web",
        authenticationType: "None",
        signatureData: s.signatureData,
      };
    }),
  };
}

function pdfEscape(s: string) {
  return s
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function text(
  font: "F1" | "F2" | "F3",
  size: number,
  x: number,
  y: number,
  value: string,
) {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(value.slice(0, 120))}) Tj ET`;
}

const BLUE = "0.169 0.624 0.886 rg";
const BLACK = "0.12 0.16 0.22 rg";
const GRAY = "0.42 0.45 0.50 rg";

function labelValue(y: number, label: string, value: string, x = 46) {
  return [
    `${BLACK}`,
    text("F2", 9, x, y, label),
    text("F1", 9, x + 88, y, value),
  ];
}

export function buildCompletionCertificatePdf(
  cert: CompletionCertificate,
): Uint8Array {
  const ops: string[] = [];
  ops.push(GRAY, text("F1", 8, 400, 760, `Generated on ${cert.generatedAt}`));
  ops.push(BLUE, text("F2", 11, 46, 760, "FinConnex Sign"));
  ops.push(BLUE, text("F2", 22, 160, 722, "Certificate of Completion"));
  ops.push("0.75 0.78 0.82 RG", "1 w", "46 708 520 0 m 566 708 l S");

  ops.push(BLUE, text("F2", 14, 46, 686, "Summary"));
  let y = 668;
  const summary: [string, string][] = [
    ["Document ID:", cert.envelopeId],
    ["Document name:", cert.documentName],
    [
      "Sent by:",
      cert.sentByEmail
        ? `${cert.sentByName} <${cert.sentByEmail}>`
        : cert.sentByName,
    ],
    ["Organization:", cert.organizationName],
  ];
  for (const [label, value] of summary) {
    ops.push(...labelValue(y, label, value));
    y -= 14;
  }
  ops.push(GRAY, text("F1", 8, 134, y, cert.organizationAddress));
  y -= 20;

  const leftMeta: [string, string][] = [
    ["Sent on:", cert.sentOn || "—"],
    ["Completed on:", cert.completedOn || "—"],
    ["Sign order:", cert.signOrder],
    ["No. of documents:", String(cert.documentCount)],
    ["Time zone:", cert.timezone],
  ];
  const rightMeta: [string, string][] = [
    ["Signers:", String(cert.signerCount)],
    ["Receives a copy:", String(cert.ccCount)],
    ["Approvers:", String(cert.approverCount)],
    ["Witnesses:", String(cert.witnessCount)],
    ["Recipient reviewers:", String(cert.reviewerCount)],
  ];
  const metaY = y;
  leftMeta.forEach(([label, value], i) => {
    ops.push(...labelValue(metaY - i * 14, label, value));
  });
  rightMeta.forEach(([label, value], i) => {
    ops.push(...labelValue(metaY - i * 14, label, value, 340));
  });
  y = metaY - 14 * 5 - 18;

  ops.push(BLUE, text("F2", 14, 46, y, "Recipients"));
  y -= 22;

  for (const signer of cert.signers) {
    if (y < 90) break;
    ops.push(BLUE, text("F1", 8, 46, y + 10, signer.role));
    ops.push(BLACK, text("F2", 11, 88, y + 12, signer.name));
    ops.push(GRAY, text("F1", 9, 88, y, signer.email));
    ops.push(BLUE, text("F1", 9, 400, y + 12, "Signature"));
    const sig = signer.signatureData?.startsWith("typed:")
      ? signer.signatureData.replace(/^typed:/, "")
      : signer.name;
    ops.push(text("F3", 14, 400, y - 4, sig));
    y -= 28;
    const rows: [string, string, string, string][] = [
      ["Emailed on:", signer.emailedAt || "—", "Accessed from:", signer.ip || "—"],
      ["Viewed on:", signer.viewedAt || "—", "Device used:", signer.device || "Web"],
      [
        "Terms agreed on:",
        signer.termsAgreedAt || "—",
        "Authentication type:",
        signer.authenticationType || "None",
      ],
      ["Signed on:", signer.signedAt || "—", "", ""],
    ];
    for (const [l1, v1, l2, v2] of rows) {
      ops.push(...labelValue(y, l1, v1));
      if (l2) ops.push(...labelValue(y, l2, v2, 340));
      y -= 14;
    }
    y -= 10;
  }

  const stream = ops.join("\n");
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>endobj\n",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
    "6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n",
    "7 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >>endobj\n",
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
  return new TextEncoder().encode(body);
}
