"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { CONTACT_GROUPS, type ContactCardData } from "@/lib/contacts/types";

// Full catalog of related lists available on a Contact — shown via the
// "Add Related List" modal. Counts are placeholders until each list is
// wired to real data.
const RELATED_LIST_CATALOG: RelatedListItem[] = [
  { id: "notes", label: "Notes" },
  { id: "connected-records", label: "Connected Records" },
  { id: "cadences", label: "Cadences" },
  { id: "attachments", label: "Attachments" },
  { id: "open-activities", label: "Open Activities" },
  { id: "cases", label: "Cases" },
  { id: "quotes", label: "Quotes" },
  { id: "closed-activities", label: "Closed Activities" },
  { id: "invoices", label: "Invoices" },
  { id: "invited-meetings", label: "Invited Meetings" },
  { id: "products", label: "Products" },
  { id: "sales-orders", label: "Sales Orders" },
  { id: "purchase-orders", label: "Purchase Orders" },
  { id: "emails", label: "Emails" },
  { id: "voice-of-customer", label: "Voice of the Customer" },
];

// Shown on first load; the rest are reachable through "Add Related List".
const DEFAULT_VISIBLE_RELATED_IDS = [
  "notes",
  "connected-records",
  "cadences",
  "attachments",
  "open-activities",
];

const RELATED_LIST_ACTIONS: Record<string, RelatedListAction> = {
  notes: { label: "Add a note", variant: "field" },
  attachments: {
    label: "Attach",
    variant: "button",
  },
  emails: {
    label: "Send Email",
    variant: "button",
  },
  "open-activities": {
    label: "Add",
    variant: "button",
  },
};

interface FlatContact extends ContactCardData {
  statusTitle: string;
  statusDotColor: string;
}

function flattenContacts(): FlatContact[] {
  return CONTACT_GROUPS.flatMap((group) =>
    group.contacts.map((c) => ({
      ...c,
      statusTitle: group.title,
      statusDotColor: group.dotColorClass,
    })),
  );
}

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeRelated, setActiveRelated] = useState("notes");
  const [activeTab, setActiveTab] = useState("Overview");
  const [visibleRelatedIds, setVisibleRelatedIds] = useState<string[]>(
    DEFAULT_VISIBLE_RELATED_IDS,
  );

  const contacts = useMemo(() => flattenContacts(), []);
  const index = contacts.findIndex((c) => c.id === params.id);
  const contact = index >= 0 ? contacts[index] : undefined;

  function handleSelectRelated(id: string) {
    setActiveRelated(id);
    document
      .getElementById(`related-list-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          links={[]}
          onAddLink={() => {}}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">
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
              ]}
            />

            {visibleRelatedIds.map((id) => {
              const item = RELATED_LIST_CATALOG.find((i) => i.id === id);
              if (!item) return null;
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
