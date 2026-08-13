/** Deals CSV import / export + clone. */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  autoMapHeaders,
  downloadCsv,
  toCsv,
  type CsvRow,
} from "@/lib/import/csv";
import {
  createDeal,
  listDealKeys,
  listDealPipelines,
  saveDealPipelines,
} from "@/lib/deals/store";
import {
  DEAL_CURRENCIES,
  DEAL_STAGES,
  type DealCurrency,
  type DealPipeline,
  type DealStageTitle,
} from "@/lib/deals/types";
import { getRulesActor } from "@/lib/rules/actor";
import { assertUniqueDealNameAccount } from "@/lib/rules/integrity";
import { newRulesId } from "@/lib/rules/storage";

export const DEAL_IMPORT_FIELDS = [
  {
    key: "dealName",
    label: "Deal Name",
    required: true,
    aliases: ["deal", "deal name", "name", "opportunity"],
  },
  {
    key: "account",
    label: "Account",
    required: true,
    aliases: ["company", "account name", "company name"],
  },
  {
    key: "contact",
    label: "Contact",
    required: false,
    aliases: ["contact name", "primary contact"],
  },
  {
    key: "stage",
    label: "Stage",
    required: false,
    aliases: ["deal stage", "pipeline stage", "status"],
  },
  {
    key: "dealValue",
    label: "Deal Value",
    required: false,
    aliases: ["value", "amount", "deal value", "revenue"],
  },
  {
    key: "currency",
    label: "Currency",
    required: false,
    aliases: ["curr"],
  },
  {
    key: "probability",
    label: "Probability",
    required: false,
    aliases: ["prob", "win probability", "%"],
  },
  {
    key: "owner",
    label: "Owner",
    required: false,
    aliases: ["deal owner", "assigned to", "owner name"],
  },
  {
    key: "closeDate",
    label: "Expected Close Date",
    required: false,
    aliases: ["close date", "expected close", "closing date"],
  },
] as const;

export type DealImportFieldKey = (typeof DEAL_IMPORT_FIELDS)[number]["key"];

export interface DealImportSettings {
  skipDuplicates: boolean;
  updateExisting: boolean;
  defaultOwner: string;
  defaultStatus: string; // stage
  defaultSource: string; // currency (reuse source slot)
}

export interface DealImportRowResult {
  rowIndex: number;
  status: "ok" | "skip" | "error" | "update";
  message: string;
  email?: string;
  name: string;
}

export interface DealImportPreview {
  results: DealImportRowResult[];
  okCount: number;
  skipCount: number;
  errorCount: number;
  updateCount: number;
}

function cell(
  row: CsvRow,
  mapping: Record<string, string>,
  key: DealImportFieldKey,
) {
  const header = mapping[key];
  if (!header) return "";
  return (row[header] ?? "").trim();
}

function dealKey(name: string, account: string) {
  return `${name.trim().toLowerCase()}::${account.trim().toLowerCase()}`;
}

function asStage(value: string, fallback: string): string {
  return (
    DEAL_STAGES.find((s) => s.toLowerCase() === value.toLowerCase()) ?? fallback
  );
}

function asCurrency(value: string, fallback: DealCurrency): DealCurrency {
  return (
    DEAL_CURRENCIES.find((c) => c.toLowerCase() === value.toLowerCase()) ??
    fallback
  );
}

export function defaultDealImportSettings(): DealImportSettings {
  return {
    skipDuplicates: true,
    updateExisting: false,
    defaultOwner: getRulesActor().name || ACTIVITY_OWNERS[0],
    defaultStatus: "Prospecting",
    defaultSource: "AUD",
  };
}

export function suggestDealMapping(csvHeaders: string[]) {
  return autoMapHeaders(
    csvHeaders,
    DEAL_IMPORT_FIELDS.map((f) => ({
      key: f.key,
      aliases: [...f.aliases],
    })),
  );
}

export function previewDealImport(
  rows: CsvRow[],
  mapping: Record<string, string>,
  settings: DealImportSettings,
): DealImportPreview {
  const claimed = new Set(listDealKeys());
  const seenInFile = new Set<string>();
  const results: DealImportRowResult[] = [];

  rows.forEach((row, idx) => {
    const dealName = cell(row, mapping, "dealName");
    const account = cell(row, mapping, "account");
    const key = dealKey(dealName, account);

    if (!dealName || !account) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: "Deal Name and Account are required",
        name: dealName || "(unnamed)",
        email: account,
      });
      return;
    }

    if (seenInFile.has(key)) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: "Duplicate Deal Name + Account within this file",
        name: dealName,
        email: account,
      });
      return;
    }
    seenInFile.add(key);

    const exists = claimed.has(key);
    if (exists && settings.updateExisting) {
      results.push({
        rowIndex: idx + 2,
        status: "update",
        message: "Will update existing deal",
        name: dealName,
        email: account,
      });
      return;
    }
    if (exists && settings.skipDuplicates) {
      results.push({
        rowIndex: idx + 2,
        status: "skip",
        message: "Skipped (duplicate Deal Name + Account)",
        name: dealName,
        email: account,
      });
      return;
    }
    if (exists) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: "Deal Name + Account already exists",
        name: dealName,
        email: account,
      });
      return;
    }

    const uniq = assertUniqueDealNameAccount(dealName, account);
    if (!uniq.ok && uniq.code !== "DEAL_NOT_UNIQUE") {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: uniq.message,
        name: dealName,
        email: account,
      });
      return;
    }

    results.push({
      rowIndex: idx + 2,
      status: "ok",
      message: "Ready to import",
      name: dealName,
      email: account,
    });
  });

  return {
    results,
    okCount: results.filter((r) => r.status === "ok").length,
    skipCount: results.filter((r) => r.status === "skip").length,
    errorCount: results.filter((r) => r.status === "error").length,
    updateCount: results.filter((r) => r.status === "update").length,
  };
}

export function applyDealImport(
  rows: CsvRow[],
  mapping: Record<string, string>,
  settings: DealImportSettings,
) {
  const preview = previewDealImport(rows, mapping, settings);
  let imported = 0;
  let updated = 0;

  rows.forEach((row, idx) => {
    const result = preview.results[idx];
    if (!result || (result.status !== "ok" && result.status !== "update")) {
      return;
    }

    const dealName = cell(row, mapping, "dealName");
    const account = cell(row, mapping, "account");
    const contact = cell(row, mapping, "contact") || undefined;
    const stage = asStage(cell(row, mapping, "stage"), settings.defaultStatus);
    const dealValue = cell(row, mapping, "dealValue") || "0";
    const currency = asCurrency(
      cell(row, mapping, "currency") || settings.defaultSource,
      (settings.defaultSource as DealCurrency) || "AUD",
    );
    const probabilityRaw = cell(row, mapping, "probability");
    const probability = probabilityRaw
      ? Number.parseInt(probabilityRaw.replace(/%/g, ""), 10)
      : undefined;
    const owner =
      cell(row, mapping, "owner") || settings.defaultOwner || ACTIVITY_OWNERS[0];
    const closeDate = cell(row, mapping, "closeDate") || undefined;

    if (result.status === "update") {
      const pipelines = listDealPipelines();
      let did = false;
      for (const pipe of Object.keys(pipelines) as DealPipeline[]) {
        pipelines[pipe] = pipelines[pipe].map((stageCol) => ({
          ...stageCol,
          deals: stageCol.deals.map((d) => {
            if (dealKey(d.name, d.account) !== dealKey(dealName, account)) {
              return d;
            }
            did = true;
            return {
              ...d,
              contact: contact ?? d.contact,
              value: dealValue.startsWith("$") ? dealValue : `$${dealValue}`,
              currency,
              probability:
                Number.isFinite(probability) && probability !== undefined
                  ? probability
                  : d.probability,
              owner,
              closeDate: closeDate ?? d.closeDate,
            };
          }),
        }));
      }
      if (did) {
        saveDealPipelines(pipelines);
        updated += 1;
      }
      return;
    }

    createDeal({
      dealName,
      account,
      contact,
      stage: stage as DealStageTitle,
      dealValue,
      currency,
      probability: Number.isFinite(probability) ? probability : undefined,
      owner,
      closeDate,
    });
    imported += 1;
  });

  return {
    imported,
    updated,
    skipped: preview.skipCount,
    errors: preview.errorCount,
  };
}

export function downloadDealImportErrorReport(preview: DealImportPreview) {
  const failed = preview.results.filter(
    (r) => r.status === "error" || r.status === "skip",
  );
  downloadCsv(
    `deal-import-errors-${Date.now()}.csv`,
    toCsv(
      ["Row", "Deal Name", "Account", "Status", "Message"],
      failed.map((r) => [r.rowIndex, r.name, r.email ?? "", r.status, r.message]),
    ),
  );
}

export function exportDealsCsv(options?: {
  ids?: string[];
  pipeline?: DealPipeline;
}) {
  const pipelines = listDealPipelines();
  let rows = Object.entries(pipelines).flatMap(([pipe, stages]) =>
    stages.flatMap((s) =>
      s.deals.map((d) => ({
        ...d,
        stage: s.title,
        pipeline: pipe as DealPipeline,
      })),
    ),
  );
  if (options?.pipeline) {
    rows = rows.filter((d) => d.pipeline === options.pipeline);
  }
  if (options?.ids?.length) {
    rows = rows.filter((d) => options.ids!.includes(d.id));
  }

  downloadCsv(
    options?.ids?.length
      ? `deals-selected-${Date.now()}.csv`
      : `deals-${Date.now()}.csv`,
    toCsv(
      [
        "Deal Name",
        "Account",
        "Contact",
        "Stage",
        "Deal Value",
        "Currency",
        "Probability",
        "Owner",
        "Expected Close Date",
        "Pipeline",
      ],
      rows.map((d) => [
        d.name,
        d.account,
        d.contact ?? "",
        d.stage,
        d.value,
        d.currency,
        d.probability,
        d.owner,
        d.closeDate,
        d.pipeline,
      ]),
    ),
  );
  return rows.length;
}

export function sampleDealCsvTemplate() {
  return toCsv(
    [
      "Deal Name",
      "Account",
      "Contact",
      "Stage",
      "Deal Value",
      "Currency",
      "Probability",
      "Owner",
      "Expected Close Date",
    ],
    [
      [
        "Harbor Refinance Package",
        "Harbor Lending Group",
        "Maya Chen",
        "Prospecting",
        "85000",
        "AUD",
        "20",
        ACTIVITY_OWNERS[0],
        "15 Oct 2026",
      ],
    ],
  );
}

/** Clone a deal with a unique name suffix; places copy in same stage. */
export function cloneDeal(id: string): { ok: true; id: string; name: string } | { ok: false; message: string } {
  const pipelines = listDealPipelines();
  for (const pipe of Object.keys(pipelines) as DealPipeline[]) {
    for (const stage of pipelines[pipe]) {
      const source = stage.deals.find((d) => d.id === id);
      if (!source) continue;

      let suffix = 2;
      let newName = `${source.name} (Copy)`;
      while (listDealKeys().includes(dealKey(newName, source.account))) {
        newName = `${source.name} (Copy ${suffix})`;
        suffix += 1;
      }

      const copy = {
        ...source,
        id: newRulesId("d"),
        name: newName,
      };

      pipelines[pipe] = pipelines[pipe].map((s) =>
        s.id === stage.id ? { ...s, deals: [copy, ...s.deals] } : s,
      );
      saveDealPipelines(pipelines);
      return { ok: true, id: copy.id, name: copy.name };
    }
  }
  return { ok: false, message: "Deal not found" };
}
