function pdfSafe(value: string) {
  return value.replace(/[^\x20-\x7E]/g, " ").replace(/[()\\]/g, "");
}

/** One-page PDF built from plain text, used when creating a document in the browser. */
export function textPdfFile(fileName: string, lines: string[]): File {
  const wrapped = lines
    .flatMap((line) => {
      const text = pdfSafe(line).replace(/\s+/g, " ").trim();
      if (!text) return [""];
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += 90) chunks.push(text.slice(i, i + 90));
      return chunks;
    })
    .slice(0, 36);
  const commands = wrapped
    .map(
      (line, index) =>
        `BT /F1 12 Tf 72 ${740 - index * 18} Td (${line}) Tj ET`,
    )
    .join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${commands.length} >> stream\n${commands}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const base = pdfSafe(fileName).trim() || "document";
  const name = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
  return new File([pdf], name, { type: "application/pdf" });
}
