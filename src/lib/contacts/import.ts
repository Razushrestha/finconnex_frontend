/** Contacts CSV import / export. */

import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  autoMapHeaders,
  downloadCsv,
  toCsv,
  type CsvRow,
} from "@/lib/import/csv";
import {
  createContact,
  listContactEmails,
  listContactGroups,
  saveContactGroups,
} from "@/lib/contacts/store";
import {
  CONTACT_SOURCES,
  CONTACT_STATUSES,
  type ContactSource,
  type ContactStatus,
} from "@/lib/contacts/types";
import { getRulesActor } from "@/lib/rules/actor";
import { assertUniqueEmail, listClaimedEmails } from "@/lib/rules/integrity";

export const CONTACT_IMPORT_FIELDS = [
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
    aliases: ["phone number", "telephone"],
  },
  {
    key: "mobile",
    label: "Mobile",
    required: false,
    aliases: ["mobile phone", "cell", "cellphone"],
  },
  {
    key: "company",
    label: "Company",
    required: false,
    aliases: ["company name", "account", "organization"],
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
    aliases: ["contact status"],
  },
  {
    key: "owner",
    label: "Owner",
    required: false,
    aliases: ["contact owner", "assigned to", "owner name"],
  },
] as const;

export type ContactImportFieldKey =
  (typeof CONTACT_IMPORT_FIELDS)[number]["key"];

export interface ContactImportSettings {
  skipDuplicates: boolean;
  updateExisting: boolean;
  defaultOwner: string;
  defaultStatus: ContactStatus;
  defaultSource: ContactSource;
}

export interface ContactImportRowResult {
  rowIndex: number;
  status: "ok" | "skip" | "error" | "update";
  message: string;
  email?: string;
  name: string;
}

export interface ContactImportPreview {
  results: ContactImportRowResult[];
  okCount: number;
  skipCount: number;
  errorCount: number;
  updateCount: number;
}

function cell(
  row: CsvRow,
  mapping: Record<string, string>,
  key: ContactImportFieldKey,
) {
  const header = mapping[key];
  if (!header) return "";
  return (row[header] ?? "").trim();
}

function asSource(value: string, fallback: ContactSource): ContactSource {
  return (
    CONTACT_SOURCES.find((s) => s.toLowerCase() === value.toLowerCase()) ??
    fallback
  );
}

function asStatus(value: string, fallback: ContactStatus): ContactStatus {
  return (
    CONTACT_STATUSES.find((s) => s.toLowerCase() === value.toLowerCase()) ??
    fallback
  );
}

export function defaultContactImportSettings(): ContactImportSettings {
  return {
    skipDuplicates: true,
    updateExisting: false,
    defaultOwner: getRulesActor().name || ACTIVITY_OWNERS[0],
    defaultStatus: "Active",
    defaultSource: "Website",
  };
}

export function suggestContactMapping(csvHeaders: string[]) {
  return autoMapHeaders(
    csvHeaders,
    CONTACT_IMPORT_FIELDS.map((f) => ({
      key: f.key,
      aliases: [...f.aliases],
    })),
  );
}

export function previewContactImport(
  rows: CsvRow[],
  mapping: Record<string, string>,
  settings: ContactImportSettings,
): ContactImportPreview {
  const claimed = new Set(listClaimedEmails());
  const contactEmails = new Set(
    listContactEmails().map((e) => e.trim().toLowerCase()),
  );
  const seenInFile = new Set<string>();
  const results: ContactImportRowResult[] = [];

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

    const existsOnContact = contactEmails.has(email);
    const existsAnywhere = claimed.has(email);

    if (existsOnContact && settings.updateExisting) {
      results.push({
        rowIndex: idx + 2,
        status: "update",
        message: "Will update existing contact",
        email,
        name,
      });
      return;
    }
    if (existsAnywhere && settings.skipDuplicates) {
      results.push({
        rowIndex: idx + 2,
        status: "skip",
        message: existsOnContact
          ? "Skipped (duplicate contact email)"
          : "Skipped (email used by a lead)",
        email,
        name,
      });
      return;
    }
    if (existsAnywhere) {
      results.push({
        rowIndex: idx + 2,
        status: "error",
        message: existsOnContact
          ? "Email already exists on a contact"
          : "Email already used by a lead",
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

export function applyContactImport(
  rows: CsvRow[],
  mapping: Record<string, string>,
  settings: ContactImportSettings,
) {
  const preview = previewContactImport(rows, mapping, settings);
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
    const mobile = cell(row, mapping, "mobile") || undefined;
    const company = cell(row, mapping, "company");
    const source = asSource(
      cell(row, mapping, "source"),
      settings.defaultSource,
    );
    const status = asStatus(
      cell(row, mapping, "status"),
      settings.defaultStatus,
    );
    const owner =
      cell(row, mapping, "owner") || settings.defaultOwner || ACTIVITY_OWNERS[0];

    if (result.status === "update") {
      let did = false;
      const next = listContactGroups().map((g) => ({
        ...g,
        contacts: g.contacts.map((c) => {
          if (c.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
            return c;
          }
          did = true;
          const name = `${firstName} ${lastName}`.trim();
          return {
            ...c,
            name,
            initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
            phone: phone || c.phone,
            mobile: mobile ?? c.mobile,
            company: company || c.company,
            source,
            owner,
          };
        }),
      }));
      if (did) {
        saveContactGroups(next);
        updated += 1;
      }
      return;
    }

    createContact({
      firstName,
      lastName,
      email,
      phone,
      mobile,
      company,
      source,
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

export function downloadContactImportErrorReport(preview: ContactImportPreview) {
  const failed = preview.results.filter(
    (r) => r.status === "error" || r.status === "skip",
  );
  downloadCsv(
    `contact-import-errors-${Date.now()}.csv`,
    toCsv(
      ["Row", "Name", "Email", "Status", "Message"],
      failed.map((r) => [r.rowIndex, r.name, r.email ?? "", r.status, r.message]),
    ),
  );
}

export function exportContactsCsv(options?: { ids?: string[] }) {
  const flat = listContactGroups().flatMap((g) =>
    g.contacts.map((c) => ({ ...c, status: g.title })),
  );
  const rows = options?.ids?.length
    ? flat.filter((c) => options.ids!.includes(c.id))
    : flat;

  downloadCsv(
    options?.ids?.length
      ? `contacts-selected-${Date.now()}.csv`
      : `contacts-${Date.now()}.csv`,
    toCsv(
      [
        "First Name",
        "Last Name",
        "Email",
        "Phone",
        "Mobile",
        "Company",
        "Lead Source",
        "Status",
        "Owner",
        "Created Date",
      ],
      rows.map((c) => {
        const parts = c.name.trim().split(/\s+/);
        return [
          parts[0] ?? "",
          parts.slice(1).join(" "),
          c.email,
          c.phone,
          c.mobile ?? "",
          c.company,
          c.source,
          c.status,
          c.owner,
          c.createdDate,
        ];
      }),
    ),
  );
  return rows.length;
}

export function sampleContactCsvTemplate() {
  return toCsv(
    [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Mobile",
      "Company",
      "Lead Source",
      "Status",
      "Owner",
    ],
    [
      [
        "Maya",
        "Chen",
        "maya.chen@example.com",
        "+1 415 555 0199",
        "+1 415 555 0188",
        "Fabrikam Inc.",
        "Referral",
        "Active",
        ACTIVITY_OWNERS[0],
      ],
    ],
  );
}
