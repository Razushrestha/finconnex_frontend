import {
  primarySignerLabel,
  signedCount,
  type SignatureRequest,
} from "@/lib/documents/signature/types";

export function ExportSignatureLogCsv(
  requests: SignatureRequest[],
  filename = "e-signature-log.csv",
) {
  const header = [
    "ID",
    "Document",
    "Signers",
    "Progress",
    "Status",
    "Sent",
    "Signed",
    "Expiry",
  ];
  const rows = requests.map((r) => {
    const total = (r.signers ?? []).filter((s) => s.role !== "CC").length;
    return [
      r.signatureRequestId,
      r.documentName,
      primarySignerLabel(r),
      total ? `${signedCount(r)}/${total}` : "",
      r.status,
      r.sentDate ?? "",
      r.signedDate ?? "",
      r.expiryDate,
    ];
  });
  const rowLines = rows.map((cols) =>
    cols
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...rowLines].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
