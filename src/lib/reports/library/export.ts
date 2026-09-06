import { downloadCsv, toCsv } from "@/lib/import/csv";
import { formatCell } from "@/lib/reports/library/format";
import type { ReportDef, ReportResult } from "@/lib/reports/library/types";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tableMatrix(def: ReportDef, result: ReportResult) {
  return result.rows.map((row) =>
    def.columns.map((col) => formatCell(row.cells[col.id], col.kind)),
  );
}

export function exportLibraryCsv(def: ReportDef, result: ReportResult) {
  downloadCsv(`${def.id}.csv`, toCsv(def.columns.map((c) => c.label), tableMatrix(def, result)));
}

export function exportLibraryExcel(def: ReportDef, result: ReportResult) {
  const head = def.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = result.rows
    .map(
      (row) =>
        `<tr>${def.columns
          .map((c) => `<td>${escapeHtml(formatCell(row.cells[c.id], c.kind))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(def.name)}</title></head><body>
<h2>${escapeHtml(def.name)}</h2><p>${escapeHtml(def.purpose)}</p>
<table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${def.id}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLibraryPdf(def: ReportDef, result: ReportResult) {
  const kpis = result.kpis
    .map(
      (k) =>
        `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;min-width:120px"><div style="font-size:11px;color:#64748b">${escapeHtml(k.label)}</div><div style="font-size:18px;font-weight:700">${escapeHtml(String(k.value))}</div></div>`,
    )
    .join("");
  const head = def.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = result.rows
    .map(
      (row) =>
        `<tr>${def.columns
          .map((c) => `<td>${escapeHtml(formatCell(row.cells[c.id], c.kind))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(def.name)}</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;margin:32px;color:#0f172a}
h1{font-size:22px;margin:0} p{color:#64748b} table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0} th{color:#64748b;font-size:10px;text-transform:uppercase}
.kpis{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}</style></head><body>
<h1>${escapeHtml(def.name)}</h1><p>${escapeHtml(def.purpose)}</p>
<div class="kpis">${kpis}</div>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
