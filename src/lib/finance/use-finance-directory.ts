"use client";

import { useEffect, useState } from "react";
import { loadCrmContacts } from "@/lib/contacts/api";
import { listCrmDeals } from "@/lib/deals/api";
import { listCrmInvoices } from "@/lib/finance/invoices/api";
import { replaceCrmInvoices } from "@/lib/finance/invoices/types";
import { listCrmProducts } from "@/lib/finance/products/api";
import { replaceCrmProducts } from "@/lib/finance/products/types";
import type { FinanceClientOption } from "@/lib/finance/related-prefill";
import { defaultActorName } from "@/lib/rules/actor";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";

export const FINANCE_CATALOGUE_EVENT = "finance-catalogue";

export function financeOwnerOptions(
  owners: readonly string[],
  current: string,
): string[] {
  const names = owners.map((name) => name.trim()).filter(Boolean);
  if (current && !names.includes(current)) return [current, ...names];
  return names;
}

/**
 * Live contacts, workspace members, deals, catalogue products, and invoices
 * for finance create forms. Empty lists stay empty — nothing is invented.
 */
export function useFinanceDirectory() {
  const [clients, setClients] = useState<FinanceClientOption[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [deals, setDeals] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [contacts, members, dealRows, products, invoices] =
        await Promise.allSettled([
          loadCrmContacts({ limit: 100 }),
          listCrmWorkspaceMembers(),
          listCrmDeals({ limit: 100 }),
          listCrmProducts({ limit: 100 }),
          listCrmInvoices({ limit: 100 }),
        ]);
      if (cancelled) return;

      if (contacts.status === "fulfilled") {
        const seen = new Set<string>();
        const options: FinanceClientOption[] = [];
        for (const row of contacts.value) {
          const id = row.contact.id?.trim();
          const name = row.contact.name?.trim();
          if (!id || !name || seen.has(id)) continue;
          seen.add(id);
          const company = row.contact.company?.trim();
          options.push({
            id,
            name: company ? `${name} · ${company}` : name,
            contact: name,
            email: row.contact.email?.trim() || "",
          });
        }
        setClients(options);
      }

      const actor = defaultActorName().trim();
      if (members.status === "fulfilled") {
        const names = [
          ...new Set(
            members.value
              .filter((member) => member.status !== "Inactive")
              .map((member) => member.name.trim())
              .filter(Boolean),
          ),
        ];
        setOwners(actor && !names.includes(actor) ? [actor, ...names] : names);
      } else if (actor) {
        setOwners([actor]);
      }

      if (dealRows.status === "fulfilled") {
        setDeals([
          ...new Set(
            dealRows.value.map((deal) => deal.name.trim()).filter(Boolean),
          ),
        ]);
      }

      if (products.status === "fulfilled") {
        replaceCrmProducts(products.value);
        window.dispatchEvent(new Event(FINANCE_CATALOGUE_EVENT));
      }
      if (invoices.status === "fulfilled") {
        replaceCrmInvoices(invoices.value);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { clients, owners, deals, ready };
}
