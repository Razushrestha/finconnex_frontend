import type { SignatureRequest } from "@/lib/documents/signature/types";

export function ExportSignatureLogCsv(
  requests: SignatureRequest[],
  filename = "e-signature-log.csv",
) {
  const header = [
    "ID",
    "Document",
    "Signer",
    "Status",
    "Sent",
    "Signed",
    "Expiry",
  ];
  const rows = requests.map((r) =>
    [
      r.signatureRequestId,
      r.documentName,
      r.signer,
      r.status,
      r.sentDate ?? "",
      r.signedDate ?? "",
      r.expiryDate,
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
