"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Mail, Phone, Briefcase, UserRound } from "lucide-react";
import type { Email } from "@/lib/emails/types";
import { contactAddress, contactName, isOurAddress } from "@/lib/emails/mailbox";
import {
  findContactByEmail,
  findContactByName,
  listAllContacts,
} from "@/lib/contacts/store";
import type { ContactCardData } from "@/lib/contacts/types";
import { findDealById, listAllDeals } from "@/lib/deals/store";
import type { DealRecord } from "@/lib/deals/types";
import { listLeadColumns } from "@/lib/leads/store";
import type { LeadCardData } from "@/lib/leads/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 3;

const CLOSED_STAGES = new Set(["Closed Won", "Closed Lost"]);

function stripRelatedPrefix(value?: string) {
  return (value ?? "").replace(/^(Lead|Contact|Deal|Company):\s*/i, "").trim();
}

function relatedKind(value?: string): "Lead" | "Contact" | "Deal" | "Company" | null {
  const match = value?.trim().match(/^(Lead|Contact|Deal|Company):/i);
  if (!match?.[1]) return null;
  const kind = match[1].toLowerCase();
  if (kind === "lead") return "Lead";
  if (kind === "contact") return "Contact";
  if (kind === "deal") return "Deal";
  if (kind === "company") return "Company";
  return null;
}

function isWorkingDeal(dealId: string) {
  const found = findDealById(dealId);
  if (!found) return false;
  return !CLOSED_STAGES.has(found.stage.title);
}

function dealsForContact(contact: ContactCardData | null, personName: string) {
  const all = listAllDeals();
  const byId = new Map(all.map((deal) => [deal.id, deal]));
  const matched = new Map<string, DealRecord>();

  if (contact?.dealIds?.length) {
    for (const id of contact.dealIds) {
      const deal = byId.get(id);
      if (deal && isWorkingDeal(id)) matched.set(deal.id, deal);
    }
  }

  const name = personName.trim().toLowerCase();
  const contactId = contact?.id;
  for (const deal of all) {
    if (CLOSED_STAGES.has(findDealById(deal.id)?.stage.title ?? "")) continue;
    if (contactId && deal.contactId === contactId) {
      matched.set(deal.id, deal);
      continue;
    }
    if (deal.contact?.trim().toLowerCase() === name) {
      matched.set(deal.id, deal);
    }
  }

  return [...matched.values()];
}

function leadsForPerson(personName: string, emailAddr?: string) {
  const name = personName.trim().toLowerCase();
  const mail = emailAddr?.trim().toLowerCase();
  const leads: LeadCardData[] = [];
  for (const col of listLeadColumns()) {
    for (const card of col.cards) {
      const emailMatch = mail && card.email.trim().toLowerCase() === mail;
      const nameMatch = card.name.trim().toLowerCase() === name;
      if (emailMatch || nameMatch) leads.push(card);
    }
  }
  return leads;
}

function resolveContact(email: Email, personName: string): ContactCardData | null {
  const address = contactAddress(email);
  if (address) {
    const byEmail = findContactByEmail(address);
    if (byEmail) return byEmail;
  }
  if (personName) {
    const byName = findContactByName(personName);
    if (byName) return byName;
  }
  const fromCandidates = [email.from, ...email.to, ...(email.cc ?? [])].filter(
    (item) => item.includes("@") && !isOurAddress(item),
  );
  for (const candidate of fromCandidates) {
    const found = findContactByEmail(candidate);
    if (found) return found;
  }
  return (
    listAllContacts().find(
      (c) => c.name.trim().toLowerCase() === personName.trim().toLowerCase(),
    ) ?? null
  );
}

function OverflowChip({
  extra,
  expanded,
  onToggle,
}: {
  extra: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (extra <= 0) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-6 items-center rounded-full bg-slate-100 px-2 text-[11px] font-semibold text-slate-600 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
    >
      {expanded ? "Show less" : `+${extra}…`}
    </button>
  );
}

export function CrmProfileCard({ email }: { email: Email }) {
  const [showAllDeals, setShowAllDeals] = useState(false);
  const [showAllLeads, setShowAllLeads] = useState(false);

  const profile = useMemo(() => {
    const kind = relatedKind(email.relatedTo);
    const personName =
      stripRelatedPrefix(email.relatedTo) || contactName(email) || "Unknown";
    const contact = resolveContact(email, personName);
    const address =
      contact?.email ||
      contactAddress(email) ||
      [email.from, ...email.to].find((item) => item.includes("@") && !isOurAddress(item)) ||
      "";
    const phone = contact?.phone || contact?.mobile || "";
    const company = contact?.company || "—";
    const deals = dealsForContact(contact, personName);
    const leads = leadsForPerson(personName, address || undefined);

    // If relatedTo points at a deal by name, include it
    if (kind === "Deal" && personName) {
      const named = listAllDeals().find(
        (deal) => deal.name.trim().toLowerCase() === personName.toLowerCase(),
      );
      if (named && isWorkingDeal(named.id) && !deals.some((d) => d.id === named.id)) {
        deals.unshift(named);
      }
    }

    return {
      personName: contact?.name || personName,
      contact,
      email: address || "—",
      phone: phone || "—",
      company,
      role: contact ? "Contact" : kind === "Lead" ? "Lead" : "Client / Lead",
      deals,
      leads: contact
        ? leads.filter(
            (lead) =>
              lead.email.trim().toLowerCase() === contact.email.trim().toLowerCase() ||
              lead.name.trim().toLowerCase() === contact.name.trim().toLowerCase(),
          )
        : leads,
      initials: contact?.initials || initials(personName),
      avatarClass: contact?.avatarBgClass || avatarColor(personName),
    };
  }, [email]);

  const visibleDeals = showAllDeals
    ? profile.deals
    : profile.deals.slice(0, MAX_VISIBLE);
  const extraDeals = Math.max(0, profile.deals.length - MAX_VISIBLE);
  const visibleLeads = showAllLeads
    ? profile.leads
    : profile.leads.slice(0, MAX_VISIBLE);
  const extraLeads = Math.max(0, profile.leads.length - MAX_VISIBLE);

  const contactHref = profile.contact
    ? `/sales/contacts/detail/${profile.contact.id}`
    : null;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
            profile.avatarClass,
          )}
        >
          {profile.initials}
        </div>
        <div className="min-w-0">
          {contactHref ? (
            <Link
              href={contactHref}
              className="block truncate text-sm font-semibold text-[#5A32A3] hover:underline"
            >
              {profile.personName}
            </Link>
          ) : (
            <h4 className="truncate text-sm font-semibold text-slate-800">
              {profile.personName}
            </h4>
          )}
          <p className="text-[11px] text-slate-400">{profile.role}</p>
        </div>
      </div>

      <hr className="border-slate-100" />

      <div className="space-y-2 text-[12px]">
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-slate-400">Contact name</span>
          {contactHref ? (
            <Link
              href={contactHref}
              className="min-w-0 truncate text-right font-medium text-[#5A32A3] hover:underline"
            >
              {profile.personName}
            </Link>
          ) : (
            <span className="min-w-0 truncate text-right font-medium text-slate-800">
              {profile.personName}
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex shrink-0 items-center gap-1 text-slate-400">
            <Mail className="h-3 w-3" />
            Email
          </span>
          {profile.email !== "—" ? (
            <a
              href={`mailto:${profile.email}`}
              className="min-w-0 truncate text-right font-medium text-slate-800 hover:text-[#5A32A3]"
            >
              {profile.email}
            </a>
          ) : (
            <span className="text-right font-medium text-slate-400">—</span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex shrink-0 items-center gap-1 text-slate-400">
            <Phone className="h-3 w-3" />
            Phone
          </span>
          {profile.phone !== "—" ? (
            <a
              href={`tel:${profile.phone.replace(/\s+/g, "")}`}
              className="min-w-0 truncate text-right font-medium text-slate-800 hover:text-[#5A32A3]"
            >
              {profile.phone}
            </a>
          ) : (
            <span className="text-right font-medium text-slate-400">—</span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-slate-400">Company</span>
          <span className="min-w-0 truncate text-right font-medium text-slate-800">
            {profile.company}
          </span>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          <Briefcase className="h-3 w-3" />
          Working deals
        </p>
        {visibleDeals.length === 0 ? (
          <p className="text-[12px] text-slate-400">No working deals</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {visibleDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`/sales/deals/detail/${deal.id}`}
                className="inline-flex max-w-full items-center truncate rounded-full bg-[#F3ECFB] px-2.5 py-1 text-[11px] font-semibold text-[#5A32A3] hover:bg-[#E9DDF8]"
                title={deal.name}
              >
                {deal.name}
              </Link>
            ))}
            <OverflowChip
              extra={extraDeals}
              expanded={showAllDeals}
              onToggle={() => setShowAllDeals((v) => !v)}
            />
          </div>
        )}
      </div>

      {profile.leads.length > 0 ? (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            <UserRound className="h-3 w-3" />
            Related leads
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visibleLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/sales/leads/detail/${lead.id}`}
                className="inline-flex max-w-full items-center truncate rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                title={lead.name}
              >
                {lead.name}
              </Link>
            ))}
            <OverflowChip
              extra={extraLeads}
              expanded={showAllLeads}
              onToggle={() => setShowAllLeads((v) => !v)}
            />
          </div>
        </div>
      ) : null}

      {contactHref ? (
        <Link
          href={contactHref}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
        >
          View Full Profile <ExternalLink className="h-3 w-3" />
        </Link>
      ) : null}
    </div>
  );
}
