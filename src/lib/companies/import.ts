/** Companies CSV import / export. */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  autoMapHeaders,
  downloadCsv,
  toCsv,
  type CsvRow,
} from "@/lib/import/csv";
import {
  createCompany,
  listCompanyGroups,
  listCompanyNames,
  saveCompanyGroups,
} from "@/lib/companies/store";
import {
  COMPANY_STATUSES,
  type CompanyStatus,
} from "@/lib/companies/types";
import { getRulesActor } from "@/lib/rules/actor";

export const COMPANY_INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Manufacturing",
  "Education",
  "Other",
] as const;

export const COMPANY_IMPORT_FIELDS = [
  {
    key: "name",
    label: "Company Name",
    required: true,
    aliases: ["company", "company name", "account", "organization", "name"],
  },
  {
    key: "website",
    label: "Website",
    required: false,
    aliases: ["url", "web", "site", "domain"],
  },
  {
    key: "industry",
    label: "Industry",
    required: false,
    aliases: ["sector", "vertical"],
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    aliases: ["phone number", "telephone"],
  },
  {
    key: "city",
    label: "City",
    required: false,
    aliases: ["town", "location"],
  },
  {
    key: "annualRevenue",
    label: "Annual Revenue",
    required: false,
    aliases: ["revenue", "annual revenue", "turnover"],
  },
  {
    key: "status",
    label: "Status",
    required: false,
    aliases: ["company status"],
  },
  {
    key: "owner",
    label: "Owner",
    required: false,
    aliases: ["company owner", "assigned to", "owner name"],
  },
] as const;

export type CompanyImportFieldKey =
  (typeof COMPANY_IMPORT_FIELDS)[number]["key"];

export interface CompanyImportSettings {
  skipDuplicates: boolean;
  updateExisting: boolean;
  defaultOwner: string;
  defaultStatus: CompanyStatus;
  defaultSource: string; // industry default (reuses modal source slot)
}

export interface CompanyImportRowResult {
  rowIndex: number;
  status: "ok" | "skip" | "error" | "update";
  message: string;
  email?: string;
  name: string;
}

export interface CompanyImportPreview {
  results: CompanyImportRowResult[];
  okCount: number;
  skipCount: number;
  errorCount: number;
  updateCount: number;
}

function cell(
  row: CsvRow,
  mapping: Record<string, string>,
  key: CompanyImportFieldKey,
) {
  const header = mapping[key];
  if (!header) return "";
  return (row[header] ?? "").trim();
}

function asStatus(value: string, fallback: CompanyStatus): CompanyStatus {
  return (
    COMPANY_STATUSES.find((s) => s.toLowerCase() === value.toLowerCase()) ??
    fallback
  );
}

export function defaultCompanyImportSettings(): CompanyImportSettings {
  return {
    skipDuplicates: true,
    updateExisting: false,
    defaultOwner: getRulesActor().name || ACTIVITY_OWNERS[0],
    defaultStatus: "Prospect",
    defaultSource: "Other",
  };
}

export function suggestCompanyMapping(csvHeaders: string[]) {
  return autoMapHeaders(
    csvHeaders,
    COMPANY_IMPORT_FIELDS.map((f) => ({
      key: f.key,
      aliases: [...f.aliases],
    })),
  );
}

export function previewCompanyImport(
  rows: CsvRow[],
  mapping: Record<string, string>,
  settings: CompanyImportSettings,
): CompanyImportPreview {
  const claimed = new Set(listCompanyNames());
  const seenInFile = new Set<string>();
  const results: CompanyImportRowResult[] = [];

  rows.forEach((row, idx) => {
    const name = cell(row, mapping, "name");
    const key = name.toLowerCase();

    if (!name) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: "Company Name is required",
        name: "(unnamed)",
      });
      return;
    }

    if (seenInFile.has(key)) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: "Duplicate company name within this file",
        name,
      });
      return;
    }
    seenInFile.add(key);

    const exists = claimed.has(key);
    if (exists && settings.updateExisting) {
      results.push({
        rowIndex: idx + 2,
        status: "update",
        message: "Will update existing company",
        name,
        email: cell(row, mapping, "website"),
      });
      return;
    }
    if (exists && settings.skipDuplicates) {
      results.push({
        rowIndex: idx + 2,
        status: "skip",
        message: "Skipped (duplicate company name)",
        name,
      });
      return;
    }
    if (exists) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: "Company name already exists",
        name,
      });
      return;
    }

    results.push({
      rowIndex: idx + 2,
      status: "ok",
      message: "Ready to import",
      name,
      email: cell(row, mapping, "website"),
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

export function applyCompanyImport(
  rows: CsvRow[],
  mapping: Record<string, string>,
  settings: CompanyImportSettings,
) {
  const preview = previewCompanyImport(rows, mapping, settings);
  let imported = 0;
  let updated = 0;

  rows.forEach((row, idx) => {
    const result = preview.results[idx];
    if (!result || (result.status !== "ok" && result.status !== "update")) {
      return;
    }

    const name = cell(row, mapping, "name");
    const website = cell(row, mapping, "website");
    const industry =
      cell(row, mapping, "industry") || settings.defaultSource || "";
    const phone = cell(row, mapping, "phone");
    const city = cell(row, mapping, "city") || undefined;
    const annualRevenue = cell(row, mapping, "annualRevenue") || undefined;
    const status = asStatus(cell(row, mapping, "status"), settings.defaultStatus);
    const owner =
      cell(row, mapping, "owner") || settings.defaultOwner || ACTIVITY_OWNERS[0];

    if (result.status === "update") {
      let did = false;
      const next = listCompanyGroups().map((g) => ({
        ...g,
        companies: g.companies.map((c) => {
          if (c.name.trim().toLowerCase() !== name.toLowerCase()) return c;
          did = true;
          return {
            ...c,
            website: website || c.website,
            industry: industry || c.industry,
            phone: phone || c.phone,
            city: city ?? c.city,
            annualRevenue: annualRevenue ?? c.annualRevenue,
            owner,
          };
        }),
      }));
      if (did) {
        saveCompanyGroups(next);
        updated += 1;
      }
      return;
    }

    createCompany({
      name,
      website,
      industry,
      phone,
      city,
      annualRevenue,
      status,
      owner,
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

export function downloadCompanyImportErrorReport(preview: CompanyImportPreview) {
  const failed = preview.results.filter(
    (r) => r.status === "error" || r.status === "skip",
  );
  downloadCsv(
    `company-import-errors-${Date.now()}.csv`,
    toCsv(
      ["Row", "Name", "Status", "Message"],
      failed.map((r) => [r.rowIndex, r.name, r.status, r.message]),
    ),
  );
}

export function exportCompaniesCsv(options?: { ids?: string[] }) {
  const flat = listCompanyGroups().flatMap((g) =>
    g.companies.map((c) => ({ ...c, status: g.title })),
  );
  const rows = options?.ids?.length
    ? flat.filter((c) => options.ids!.includes(c.id))
    : flat;

  downloadCsv(
    options?.ids?.length
      ? `companies-selected-${Date.now()}.csv`
      : `companies-${Date.now()}.csv`,
    toCsv(
      [
        "Company Name",
        "Website",
        "Industry",
        "Phone",
        "City",
        "Annual Revenue",
        "Status",
        "Owner",
      ],
      rows.map((c) => [
        c.name,
        c.website,
        c.industry,
        c.phone,
        c.city ?? "",
        c.annualRevenue ?? "",
        c.status,
        c.owner,
      ]),
    ),
  );
  return rows.length;
}

export function sampleCompanyCsvTemplate() {
  return toCsv(
    [
      "Company Name",
      "Website",
      "Industry",
      "Phone",
      "City",
      "Annual Revenue",
      "Status",
      "Owner",
    ],
    [
      [
        "Harbor Lending Group",
        "harborlending.example.com",
        "Finance",
        "+61 2 9000 2222",
        "Melbourne",
        "$2.1M",
        "Prospect",
        ACTIVITY_OWNERS[0],
      ],
    ],
  );
}
