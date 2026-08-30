"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { EntityDetailHeader } from "@/components/shared/detail/EntityDetailHeader";
import { RelatedListSidebar } from "@/components/shared/detail/RelatedListSidebar";
import { DetailTabs } from "@/components/shared/detail/DetailTabs";
import {
  OverviewCard,
  phoneField,
} from "@/components/shared/detail/OverviewCard";
import {
  RelatedListCard,
  type RelatedListAction,
} from "@/components/shared/detail/RelatedListCard";
import type { RelatedListItem } from "@/components/shared/detail/types";
import {
  findContactById,
  listAllContacts,
  mergeCrmContactsIntoBoard,
  unlinkDealFromContact,
} from "@/lib/contacts/store";
import { getCrmContact, tryCrmContact } from "@/lib/contacts/api";
import {
  findDealById,
  linkContactToDeal,
  listAllDeals,
  unlinkContactFromDeal,
} from "@/lib/deals/store";
import { onRulesChange } from "@/lib/rules";
import { emitRulesChange } from "@/lib/rules/storage";
import type { ContactCardData } from "@/lib/contacts/types";
import type { DealRecord } from "@/lib/deals/types";

const RELATED_LIST_CATALOG: RelatedListItem[] = [
  { id: "deals", label: "Deals" },
  { id: "notes", label: "Notes" },
  { id: "connected-records", label: "Connected Records" },
  { id: "cadences", label: "Cadences" },
  { id: "attachments", label: "Attachments" },
  { id: "open-activities", label: "Open Activities" },
  { id: "cases", label: "Cases" },
  { id: "emails", label: "Emails" },
];

const DEFAULT_VISIBLE_RELATED_IDS = [
  "deals",
  "notes",
  "connected-records",
  "attachments",
  "open-activities",
];

const RELATED_LIST_ACTIONS: Record<string, RelatedListAction> = {
  notes: { label: "Add a note", variant: "field" },
  attachments: { label: "Attach", variant: "button" },
  emails: { label: "Send Email", variant: "button" },
  "open-activities": { label: "Add", variant: "button" },
  deals: { label: "Link deal", variant: "button" },
};

interface FlatContact extends ContactCardData {
  statusTitle: string;
  statusDotColor: string;
}

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeRelated, setActiveRelated] = useState("deals");
  const [activeTab, setActiveTab] = useState("Overview");
  const [visibleRelatedIds, setVisibleRelatedIds] = useState<string[]>(
    DEFAULT_VISIBLE_RELATED_IDS,
  );
  const [revision, setRevision] = useState(0);
  const [linkDealId, setLinkDealId] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    return onRulesChange(() => setRevision((n) => n + 1));
  }, []);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    void tryCrmContact(async () => {
      const remote = await getCrmContact(id);
      if (remote) {
        mergeCrmContactsIntoBoard([remote]);
        setRevision((n) => n + 1);
      }
    });
  }, [params.id]);

  const contacts = useMemo(() => {
    void revision;
    return listAllContacts().map((c) => {
      const found = findContactById(c.id);
      return {
        ...c,
        statusTitle: found?.status ?? "Active",
        statusDotColor: c.accentColorClass,
      } satisfies FlatContact;
    });
  }, [revision]);

  const index = contacts.findIndex((c) => c.id === params.id);
  const contact = index >= 0 ? contacts[index] : undefined;

  const linkedDeals = useMemo(() => {
    void revision;
    if (!contact) return [] as DealRecord[];
    const ids = new Set(contact.dealIds ?? []);
    const byName = listAllDeals().filter(
      (d) =>
        ids.has(d.id) ||
        d.contactId === contact.id ||
        d.contact?.trim().toLowerCase() === contact.name.trim().toLowerCase(),
    );
    const map = new Map(byName.map((d) => [d.id, d]));
    return Array.from(map.values());
  }, [contact, revision]);

  const unlinkableDealOptions = useMemo(() => {
    void revision;
    if (!contact) return [];
    const linked = new Set(linkedDeals.map((d) => d.id));
    return listAllDeals().filter((d) => !linked.has(d.id));
  }, [contact, linkedDeals, revision]);

  function handleSelectRelated(id: string) {
    setActiveRelated(id);
    document
      .getElementById(`related-list-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function notify(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2400);
  }

  if (!contact) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-400">
        Contact not found.
      </div>
    );
  }

  const prevContact = index > 0 ? contacts[index - 1] : undefined;
  const nextContact =
    index < contacts.length - 1 ? contacts[index + 1] : undefined;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <EntityDetailHeader
        avatarFallback={contact.initials}
        avatarClassName={contact.avatarBgClass}
        name={contact.name}
        relatedLabel={contact.company}
        onRelatedClick={() => {}}
        onAddTag={() => {}}
        actions={[
          {
            label: "Send Email",
            onClick: () => router.push(`/activities/emails/create`),
          },
          {
            label: "Edit",
            variant: "secondary",
            onClick: () => router.push(`/sales/contacts/${contact.id}/edit`),
          },
        ]}
        moreMenuItems={[
          { label: "Clone" },
          { label: "Send SMS" },
          { label: "Delete", destructive: true },
        ]}
        onBack={() => router.push("/sales/contacts")}
        onPrev={
          prevContact
            ? () => router.push(`/sales/contacts/detail/${prevContact.id}`)
            : undefined
        }
        onNext={
          nextContact
            ? () => router.push(`/sales/contacts/detail/${nextContact.id}`)
            : undefined
        }
      />

      <div className="flex min-h-0 flex-1">
        <RelatedListSidebar
          allItems={RELATED_LIST_CATALOG}
          visibleIds={visibleRelatedIds}
          onVisibleIdsChange={setVisibleRelatedIds}
          activeId={activeRelated}
          onSelect={handleSelectRelated}
          links={linkedDeals.slice(0, 3).map((d) => ({
            id: d.id,
            label: d.name,
            href: `/sales/deals/detail/${d.id}`,
          }))}
          onAddLink={() => setActiveRelated("deals")}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">
            {flash ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-800">
                {flash}
              </p>
            ) : null}
            <DetailTabs
              tabs={["Overview", "Timeline"]}
              active={activeTab}
              onChange={setActiveTab}
              trailing={
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${contact.statusDotColor}`}
                  />
                  {contact.statusTitle}
                </span>
              }
            />

            <OverviewCard
              fields={[
                { id: "owner", label: "Contact Owner", value: contact.owner },
                { id: "company", label: "Company", value: contact.company },
                {
                  id: "email",
                  label: "Email",
                  value: contact.email,
                  href: `mailto:${contact.email}`,
                },
                phoneField("phone", "Phone", contact.phone),
                ...(contact.mobile
                  ? [phoneField("mobile", "Mobile", contact.mobile)]
                  : []),
                { id: "source", label: "Source", value: contact.source },
                {
                  id: "created",
                  label: "Created Date",
                  value: contact.createdDate,
                },
                {
                  id: "deals",
                  label: "Linked Deals",
                  value: String(linkedDeals.length),
                },
              ]}
            />

            {visibleRelatedIds.map((id) => {
              const item = RELATED_LIST_CATALOG.find((i) => i.id === id);
              if (!item) return null;
              if (item.id === "deals") {
                return (
                  <div key={item.id} id={`related-list-${item.id}`}>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                        <h3 className="text-[13px] font-semibold text-slate-800">
                          Deals ({linkedDeals.length})
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={linkDealId}
                            onChange={(e) => setLinkDealId(e.target.value)}
                            className="h-8 max-w-[200px] rounded-lg border border-slate-200 px-2 text-[11px]"
                          >
                            <option value="">Select deal…</option>
                            {unlinkableDealOptions.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!linkDealId}
                            onClick={() => {
                              if (!linkDealId) return;
                              linkContactToDeal(linkDealId, contact.id);
                              emitRulesChange("all");
                              setLinkDealId("");
                              notify("Deal linked");
                            }}
                            className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-40"
                          >
                            Link
                          </button>
                        </div>
                      </div>
                      {linkedDeals.length === 0 ? (
                        <p className="px-4 py-6 text-center text-[12px] text-slate-400">
                          No deals linked yet.
                        </p>
                      ) : (
                        <ul className="divide-y divide-slate-50">
                          {linkedDeals.map((d) => {
                            const loc = findDealById(d.id);
                            return (
                              <li
                                key={d.id}
                                className="flex items-center justify-between gap-3 px-4 py-2.5"
                              >
                                <div>
                                  <Link
                                    href={`/sales/deals/detail/${d.id}`}
                                    className="text-[13px] font-semibold text-violet-700 hover:underline"
                                  >
                                    {d.name}
                                  </Link>
                                  <p className="text-[11px] text-slate-500">
                                    {d.value} {d.currency}
                                    {loc ? ` · ${loc.stage.title}` : ""}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    unlinkContactFromDeal(d.id);
                                    unlinkDealFromContact(contact.id, d.id);
                                    emitRulesChange("all");
                                    notify("Deal unlinked");
                                  }}
                                  className="text-[11px] font-semibold text-red-600 hover:underline"
                                >
                                  Unlink
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              }
              return (
                <div key={item.id} id={`related-list-${item.id}`}>
                  <RelatedListCard
                    title={item.label}
                    action={RELATED_LIST_ACTIONS[item.id]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
