/** Leads CSV import: field map, validate, apply to board store. */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  autoMapHeaders,
  downloadCsv,
  toCsv,
  type CsvRow,
} from "@/lib/import/csv";
import {
  createLead,
  listLeadColumns,
  listLeadEmails,
  saveLeadColumns,
} from "@/lib/leads/store";
import { importCrmLeads, refreshCrmLeadsBoard } from "@/lib/leads/api";
import { toCrmCreateBody, uiSourceToCrm, uiStatusToCrm } from "@/lib/leads/api/map";
import {
  LEAD_STATUSES,
  coerceLeadSource,
  type LeadSource,
  type LeadStatus,
} from "@/lib/leads/types";
import { getRulesActor } from "@/lib/rules/actor";
import { assertUniqueEmail, listClaimedEmails } from "@/lib/rules/integrity";

export const LEAD_IMPORT_FIELDS = [
  {
    key: "firstName",
    label: "First Name",
    required: true,
    aliases: ["first name", "firstname", "first", "given name"],
  },
  {
    key: "lastName",
    label: "Last Name",
    required: true,
    aliases: ["last name", "lastname", "last", "surname", "family name"],
  },
  {
    key: "email",
    label: "Email",
    required: true,
    aliases: ["e-mail", "email address", "mail"],
  },
  {
    key: "phone",
    label: "Phone",
    required: false,
    aliases: ["phone number", "mobile", "cell", "telephone"],
  },
  {
    key: "company",
    label: "Company",
    required: false,
    aliases: ["company name", "account", "organization", "organisation"],
  },
  {
    key: "source",
    label: "Lead Source",
    required: false,
    aliases: ["source", "lead source", "origin"],
  },
  {
    key: "status",
    label: "Status",
    required: false,
    aliases: ["lead status", "stage"],
  },
  {
    key: "owner",
    label: "Owner",
    required: false,
    aliases: ["lead owner", "assigned to", "owner name"],
  },
  {
    key: "estimatedValue",
    label: "Estimated Value",
    required: false,
    aliases: ["value", "deal value", "estimated value", "amount"],
  },
] as const;

export type LeadImportFieldKey = (typeof LEAD_IMPORT_FIELDS)[number]["key"];

export interface LeadImportSettings {
  skipDuplicates: boolean;
  updateExisting: boolean;
  defaultOwner: string;
  defaultStatus: LeadStatus;
  defaultSource: LeadSource;
}

export interface LeadImportRowResult {
  rowIndex: number;
  status: "ok" | "skip" | "error" | "update";
  message: string;
  email: string;
  name: string;
}

export interface LeadImportPreview {
  results: LeadImportRowResult[];
  okCount: number;
  skipCount: number;
  errorCount: number;
  updateCount: number;
}

function cell(
  row: CsvRow,
  mapping: Record<string, string>,
  key: LeadImportFieldKey,
): string {
  const header = mapping[key];
  if (!header) return "";
  return (row[header] ?? "").trim();
}

function asSource(value: string, fallback: LeadSource): LeadSource {
  if (!value.trim()) return fallback;
  return coerceLeadSource(value);
}

function asStatus(value: string, fallback: LeadStatus): LeadStatus {
  const hit = LEAD_STATUSES.find(
    (s) => s.toLowerCase() === value.toLowerCase(),
  );
  return hit ?? fallback;
}

export function defaultLeadImportSettings(): LeadImportSettings {
  return {
    skipDuplicates: true,
    updateExisting: false,
    defaultOwner: getRulesActor().name || ACTIVITY_OWNERS[0],
    defaultStatus: "New",
    defaultSource: "Website",
  };
}

export function suggestLeadMapping(csvHeaders: string[]) {
  return autoMapHeaders(
    csvHeaders,
    LEAD_IMPORT_FIELDS.map((f) => ({
      key: f.key,
      aliases: [...f.aliases],
    })),
  );
}

export function previewLeadImport(
  rows: CsvRow[],
  mapping: Record<string, string>,
  settings: LeadImportSettings,
): LeadImportPreview {
  const claimed = new Set(listClaimedEmails());
  const leadEmails = new Set(
    listLeadEmails().map((e) => e.trim().toLowerCase()),
  );
  const seenInFile = new Set<string>();
  const results: LeadImportRowResult[] = [];

  rows.forEach((row, idx) => {
    const firstName = cell(row, mapping, "firstName");
    const lastName = cell(row, mapping, "lastName");
    const email = cell(row, mapping, "email").toLowerCase();
    const name = `${firstName} ${lastName}`.trim() || "(unnamed)";

    if (!firstName || !lastName) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: "First Name and Last Name are required",
        email,
        name,
      });
      return;
    }
    if (!email) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: "Email is required",
        email,
        name,
      });
      return;
    }

    const uniq = assertUniqueEmail(email);
    if (!uniq.ok && uniq.code === "EMAIL_INVALID") {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: uniq.message,
        email,
        name,
      });
      return;
    }

    if (seenInFile.has(email)) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: "Duplicate email within this file",
        email,
        name,
      });
      return;
    }
    seenInFile.add(email);

    const existsOnLead = leadEmails.has(email);
    const existsAnywhere = claimed.has(email);

    if (existsOnLead && settings.updateExisting) {
      results.push({
        rowIndex: idx + 2,
        status: "update",
        message: "Will update existing lead",
        email,
        name,
      });
      return;
    }
    if (existsAnywhere && settings.skipDuplicates) {
      results.push({
        rowIndex: idx + 2,
        status: "skip",
        message: existsOnLead
          ? "Skipped (duplicate lead email)"
          : "Skipped (email used by a contact)",
        email,
        name,
      });
      return;
    }
    if (existsAnywhere) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: existsOnLead
          ? "Email already exists on a lead"
          : "Email already used by a contact",
        email,
        name,
      });
      return;
    }

    results.push({
      rowIndex: idx + 2,
      status: "ok",
      message: "Ready to import",
      email,
      name,
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

export async function applyLeadImport(
  rows: CsvRow[],
  mapping: Record<string, string>,
  settings: LeadImportSettings,
): Promise<{ imported: number; updated: number; skipped: number; errors: number }> {
  const preview = previewLeadImport(rows, mapping, settings);
  const crmRows = rows
    .map((row, idx) => {
      const result = preview.results[idx];
      if (!result || (result.status !== "ok" && result.status !== "update")) {
        return null;
      }
      return toCrmCreateBody({
        firstName: cell(row, mapping, "firstName"),
        lastName: cell(row, mapping, "lastName"),
        email: cell(row, mapping, "email"),
        phone: cell(row, mapping, "phone"),
        company: cell(row, mapping, "company"),
        source: asSource(cell(row, mapping, "source"), settings.defaultSource),
        estimatedValue: cell(row, mapping, "estimatedValue") || undefined,
      });
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (crmRows.length) {
    try {
      const live = await importCrmLeads({
        rows: crmRows,
        duplicateHandling: settings.updateExisting ? "UPDATE" : "SKIP",
        defaultStatus: uiStatusToCrm(settings.defaultStatus),
        defaultSource: uiSourceToCrm(settings.defaultSource),
      });
      if (live) {
        await refreshCrmLeadsBoard();
        return {
          imported: live.created,
          updated: live.updated,
          skipped: live.skipped + preview.skipCount,
          errors: live.errors.length + preview.errorCount,
        };
      }
    } catch {
      /* fall through to local import */
    }
  }

  let imported = 0;
  let updated = 0;

  rows.forEach((row, idx) => {
    const result = preview.results[idx];
    if (!result || (result.status !== "ok" && result.status !== "update")) {
      return;
    }

    const firstName = cell(row, mapping, "firstName");
    const lastName = cell(row, mapping, "lastName");
    const email = cell(row, mapping, "email");
    const phone = cell(row, mapping, "phone");
    const company = cell(row, mapping, "company");
    const source = asSource(cell(row, mapping, "source"), settings.defaultSource);
    const status = asStatus(cell(row, mapping, "status"), settings.defaultStatus);
    const owner =
      cell(row, mapping, "owner") || settings.defaultOwner || ACTIVITY_OWNERS[0];
    const estimatedValue = cell(row, mapping, "estimatedValue") || undefined;

    if (result.status === "update") {
      const cols = listLeadColumns();
      let didUpdate = false;
      const next = cols.map((col) => ({
        ...col,
        cards: col.cards.map((card) => {
          if (card.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
            return card;
          }
          didUpdate = true;
          const name = `${firstName} ${lastName}`.trim();
          return {
            ...card,
            name,
            initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
            phone: phone || card.phone,
            company: company || card.company,
            source,
            owner,
            estimatedValue: estimatedValue ?? card.estimatedValue,
          };
        }),
      }));
      if (didUpdate) {
        saveLeadColumns(next);
        updated += 1;
      }
      return;
    }

    createLead({
      firstName,
      lastName,
      email,
      phone,
      company,
      source,
      status,
      owner,
      estimatedValue,
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

export function downloadLeadImportErrorReport(preview: LeadImportPreview) {
  const failed = preview.results.filter(
    (r) => r.status === "error" || r.status === "skip",
  );
  const csv = toCsv(
    ["Row", "Name", "Email", "Status", "Message"],
    failed.map((r) => [r.rowIndex, r.name, r.email, r.status, r.message]),
  );
  downloadCsv(`lead-import-errors-${Date.now()}.csv`, csv);
}

export function exportLeadsCsv(options?: { ids?: string[] }) {
  const flat = listLeadColumns().flatMap((col) =>
    col.cards.map((card) => ({
      ...card,
      status: col.leadStatus,
    })),
  );
  const rows = options?.ids?.length
    ? flat.filter((c) => options.ids!.includes(c.id))
    : flat;

  const csv = toCsv(
    [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Company",
      "Lead Source",
      "Status",
      "Owner",
      "Estimated Value",
      "Created Date",
    ],
    rows.map((c) => {
      const parts = c.name.trim().split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ");
      return [
        firstName,
        lastName,
        c.email,
        c.phone,
        c.company,
        c.source,
        c.status,
        c.owner,
        c.estimatedValue ?? "",
        c.createdDate,
      ];
    }),
  );
  downloadCsv(
    options?.ids?.length
      ? `leads-selected-${Date.now()}.csv`
      : `leads-${Date.now()}.csv`,
    csv,
  );
  return rows.length;
}

export function sampleLeadCsvTemplate(): string {
  return toCsv(
    [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Company",
      "Lead Source",
      "Status",
      "Owner",
      "Estimated Value",
    ],
    [
      [
        "Ava",
        "Nguyen",
        "ava.nguyen@example.com",
        "+1 415 555 0101",
        "Northwind Traders",
        "Website",
        "New",
        ACTIVITY_OWNERS[0],
        "25000",
      ],
    ],
  );
}

export function knownLeadEmails() {
  return listLeadEmails();
}
