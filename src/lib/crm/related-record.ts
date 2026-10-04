"use client";

import { useEffect, useState } from "react";

import { getCrmCompany } from "@/lib/companies/api";
import { getCrmContact } from "@/lib/contacts/api";
import { getCrmDeal } from "@/lib/deals/api";
import { fetchLeadById } from "@/lib/leads/api";

/** CRM records that other features (bookings, notifications) point at. */
export type CrmRecordKind = "Lead" | "Contact" | "Deal" | "Company";

const RECORD_PATH: Record<CrmRecordKind, string> = {
  Lead: "/sales/leads/detail",
  Contact: "/sales/contacts/detail",
  Deal: "/sales/deals/detail",
  Company: "/sales/companies/detail",
};

/** The record's detail page. */
export function crmRecordHref(kind: CrmRecordKind, id: string): string {
  return `${RECORD_PATH[kind]}/${encodeURIComponent(id)}`;
}

/** The record's display name, or null when it can't be read. */
export async function crmRecordName(kind: CrmRecordKind, id: string): Promise<string | null> {
  if (kind === "Lead") {
    const lead = await fetchLeadById(id);
    return lead ? `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || null : null;
  }
  if (kind === "Contact") return (await getCrmContact(id))?.contact.name || null;
  if (kind === "Deal") return (await getCrmDeal(id))?.name || null;
  return (await getCrmCompany(id))?.company.name || null;
}

/** Loads a record's name for display; null until loaded or if unreadable. */
export function useCrmRecordName(kind?: CrmRecordKind, id?: string): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!kind || !id) return;
    let alive = true;
    void crmRecordName(kind, id)
      .then((value) => {
        if (alive) setName(value);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      setName(null);
    };
  }, [kind, id]);
  return name;
}
