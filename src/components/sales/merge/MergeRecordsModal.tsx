"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  defaultCompanyMergeChoices,
  defaultContactMergeChoices,
  mergeCompanies,
  mergeContacts,
  type CompanyMergeChoices,
  type ContactMergeChoices,
  type MergeFieldChoice,
} from "@/lib/sales/merge";
import { listContactGroups } from "@/lib/contacts/store";
import { listCompanyGroups } from "@/lib/companies/store";
import type { ContactCardData } from "@/lib/contacts/types";
import type { CompanyCardData } from "@/lib/companies/types";

type Mode = "contacts" | "companies";

export interface MergeRecordsModalProps {
  open: boolean;
  mode: Mode;
  /** Prefill from selection toolbar when exactly 2 ids are selected. */
  initialIds?: [string, string] | null;
  onClose: () => void;
  onMerged?: (message: string) => void;
}

function FieldPick({
  label,
  primary,
  secondary,
  value,
  onChange,
}: {
  label: string;
  primary: string;
  secondary: string;
  value: MergeFieldChoice;
  onChange: (v: MergeFieldChoice) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-t border-border py-2 text-xs">
      <div className="font-medium text-muted-foreground">{label}</div>
      <label className="flex items-start gap-1.5">
        <input
          type="radio"
          checked={value === "primary"}
          onChange={() => onChange("primary")}
          className="mt-0.5"
        />
        <span className="break-all text-foreground">{primary || "—"}</span>
      </label>
      <label className="flex items-start gap-1.5">
        <input
          type="radio"
          checked={value === "secondary"}
          onChange={() => onChange("secondary")}
          className="mt-0.5"
        />
        <span className="break-all text-foreground">{secondary || "—"}</span>
      </label>
    </div>
  );
}

export function MergeRecordsModal({
  open,
  mode,
  initialIds,
  onClose,
  onMerged,
}: MergeRecordsModalProps) {
  const options = useMemo(() => {
    if (mode === "contacts") {
      return listContactGroups().flatMap((g) =>
        g.contacts.map((c) => ({
          id: c.id,
          label: `${c.name} · ${c.email}`,
          contact: c,
          company: null as CompanyCardData | null,
        })),
      );
    }
    return listCompanyGroups().flatMap((g) =>
      g.companies.map((c) => ({
        id: c.id,
        label: `${c.name} · ${c.website || c.industry || "no website"}`,
        contact: null as ContactCardData | null,
        company: c,
      })),
    );
  }, [mode, open]);

  const [primaryId, setPrimaryId] = useState("");
  const [secondaryId, setSecondaryId] = useState("");
  const [contactChoices, setContactChoices] = useState<ContactMergeChoices>(
    defaultContactMergeChoices,
  );
  const [companyChoices, setCompanyChoices] = useState<CompanyMergeChoices>(
    defaultCompanyMergeChoices,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPrimaryId(initialIds?.[0] ?? "");
    setSecondaryId(initialIds?.[1] ?? "");
    setContactChoices(defaultContactMergeChoices());
    setCompanyChoices(defaultCompanyMergeChoices());
    setError(null);
  }, [open, initialIds]);

  if (!open) return null;

  const primaryContact = options.find((o) => o.id === primaryId)?.contact;
  const secondaryContact = options.find((o) => o.id === secondaryId)?.contact;
  const primaryCompany = options.find((o) => o.id === primaryId)?.company;
  const secondaryCompany = options.find((o) => o.id === secondaryId)?.company;

  function handleClose() {
    setError(null);
    onClose();
  }

  function confirm() {
    setError(null);
    if (!primaryId || !secondaryId) {
      setError("Pick a primary and a secondary record");
      return;
    }
    if (mode === "contacts") {
      const result = mergeContacts({
        primaryId,
        secondaryId,
        choices: contactChoices,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onMerged?.(`Merged into ${result.contact.name}`);
      handleClose();
      return;
    }
    const result = mergeCompanies({
      primaryId,
      secondaryId,
      choices: companyChoices,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onMerged?.(`Merged into ${result.company.name}`);
    handleClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-records-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-white text-card-foreground shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="merge-records-title"
              className="text-sm font-semibold text-foreground"
            >
              Merge {mode === "contacts" ? "Contacts" : "Companies"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Keep the primary record; secondary is moved to Recycle Bin
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-medium text-muted-foreground">Primary</span>
              <select
                value={primaryId}
                onChange={(e) => setPrimaryId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5"
              >
                <option value="">Select…</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id} disabled={o.id === secondaryId}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              <span className="font-medium text-muted-foreground">
                Secondary (will be removed)
              </span>
              <select
                value={secondaryId}
                onChange={(e) => setSecondaryId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5"
              >
                <option value="">Select…</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id} disabled={o.id === primaryId}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {primaryContact && secondaryContact && mode === "contacts" && (
            <div>
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Field</span>
                <span>Primary</span>
                <span>Secondary</span>
              </div>
              {(
                [
                  ["name", "Name", primaryContact.name, secondaryContact.name],
                  ["email", "Email", primaryContact.email, secondaryContact.email],
                  ["phone", "Phone", primaryContact.phone, secondaryContact.phone],
                  [
                    "mobile",
                    "Mobile",
                    primaryContact.mobile ?? "",
                    secondaryContact.mobile ?? "",
                  ],
                  [
                    "company",
                    "Company",
                    primaryContact.company,
                    secondaryContact.company,
                  ],
                  ["owner", "Owner", primaryContact.owner, secondaryContact.owner],
                  [
                    "source",
                    "Source",
                    primaryContact.source,
                    secondaryContact.source,
                  ],
                ] as const
              ).map(([key, label, pVal, sVal]) => (
                <FieldPick
                  key={key}
                  label={label}
                  primary={pVal}
                  secondary={sVal}
                  value={contactChoices[key]}
                  onChange={(v) =>
                    setContactChoices((prev) => ({ ...prev, [key]: v }))
                  }
                />
              ))}
            </div>
          )}

          {primaryCompany && secondaryCompany && mode === "companies" && (
            <div>
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Field</span>
                <span>Primary</span>
                <span>Secondary</span>
              </div>
              {(
                [
                  ["name", "Name", primaryCompany.name, secondaryCompany.name],
                  [
                    "website",
                    "Website",
                    primaryCompany.website,
                    secondaryCompany.website,
                  ],
                  [
                    "industry",
                    "Industry",
                    primaryCompany.industry,
                    secondaryCompany.industry,
                  ],
                  ["phone", "Phone", primaryCompany.phone, secondaryCompany.phone],
                  [
                    "city",
                    "City",
                    primaryCompany.city ?? "",
                    secondaryCompany.city ?? "",
                  ],
                  [
                    "annualRevenue",
                    "Revenue",
                    primaryCompany.annualRevenue ?? "",
                    secondaryCompany.annualRevenue ?? "",
                  ],
                  ["owner", "Owner", primaryCompany.owner, secondaryCompany.owner],
                ] as const
              ).map(([key, label, pVal, sVal]) => (
                <FieldPick
                  key={key}
                  label={label}
                  primary={pVal}
                  secondary={sVal}
                  value={companyChoices[key]}
                  onChange={(v) =>
                    setCompanyChoices((prev) => ({ ...prev, [key]: v }))
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Merge records
          </button>
        </div>
      </div>
    </div>
  );
}
