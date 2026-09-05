"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useModuleBack } from "@/hooks/useModuleBack";
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
import { RelatedInternalNotes } from "@/components/shared/RelatedInternalNotes";
import { TimelineFeed } from "@/components/sales/entity-detail";
import { useParentActivityTimeline } from "@/lib/activity-timeline";
import {
  deleteContact,
  findContactById,
  linkDealToContact,
  listAllContacts,
  unlinkDealFromContact,
  updateContact,
} from "@/lib/contacts/store";
import { isCrmContactId, tryCrmContact, replaceCrmContactTags } from "@/lib/contacts/api";
import {
  findDealById,
  linkContactToDeal,
  listAllDeals,
  unlinkContactFromDeal,
} from "@/lib/deals/store";
import { relatedToLabel } from "@/lib/related-entity";
import { emitRulesChange } from "@/lib/rules/storage";
import { softDeleteRecord } from "@/lib/rules";
import type { ContactCardData, ContactStatus } from "@/lib/contacts/types";
import { listRelatedCrmEmails, tryCrmEmail } from "@/lib/emails/api";
import { listRelatedCrmCalls, tryCrm as tryCrmCall } from "@/lib/calls/api";
import { listCrmTasks, tryCrmTask } from "@/lib/tasks/api";
import { listCrmDocuments, tryCrmDocument } from "@/lib/documents/library/api";
import type { Email } from "@/lib/emails/types";
import type { Call } from "@/lib/calls/types";
import type { Task } from "@/lib/tasks/types";
import type { LibraryDocument } from "@/lib/documents/library/types";

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
  "emails",
];

const RELATED_LIST_ACTIONS: Record<string, RelatedListAction> = {
  notes: { label: "Add a note", variant: "field" },
  attachments: { label: "Attach", variant: "button" },
  emails: { label: "Send Email", variant: "button" },
  "open-activities": { label: "Add", variant: "button" },
  deals: { label: "Link deal", variant: "button" },
};

interface FlatContact extends ContactCardData {
  statusTitle: ContactStatus;
  statusDotColor: string;
}

export function ContactDetailView({
  contact,
  statusTitle,
  statusDotColor,
  contacts,
  contactIndex,
}: {
  contact: FlatContact;
  statusTitle: ContactStatus;
  statusDotColor: string;
  contacts: FlatContact[];
  contactIndex: number;
}) {
  const router = useRouter();
  const back = useModuleBack("/sales/contacts", "Back to Contacts");
  const [activeRelated, setActiveRelated] = useState("deals");
  const [activeTab, setActiveTab] = useState("Overview");
  const [visibleRelatedIds, setVisibleRelatedIds] = useState<string[]>(
    DEFAULT_VISIBLE_RELATED_IDS,
  );
  const [revision, setRevision] = useState(0);
  const [linkDealId, setLinkDealId] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [crmEmails, setCrmEmails] = useState<Email[]>([]);
  const [crmCalls, setCrmCalls] = useState<Call[]>([]);
  const [crmTasks, setCrmTasks] = useState<Task[]>([]);
  const [crmDocs, setCrmDocs] = useState<LibraryDocument[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);

  const crmEnabled = isCrmContactId(contact.id);
  const relatedLabel = `Contact: ${contact.name}`;

  const {
    feedItems: timelineItems,
    loading: timelineLoading,
    error: timelineError,
  } = useParentActivityTimeline({
    relatedType: "CONTACT",
    relatedId: contact.id,
    filters: { limit: 25 },
    enabled: crmEnabled && activeTab === "Timeline",
  });

  useEffect(() => {
    if (!crmEnabled) {
      setCrmEmails([]);
      setCrmCalls([]);
      setCrmTasks([]);
      setCrmDocs([]);
      return;
    }
    let cancelled = false;
    setCrmLoading(true);
    void (async () => {
      const [emails, calls, tasks, docs] = await Promise.all([
        tryCrmEmail(() => listRelatedCrmEmails("CONTACT", contact.id)),
        tryCrmCall(() => listRelatedCrmCalls("CONTACT", contact.id)),
        tryCrmTask(() =>
          listCrmTasks({ relatedType: "CONTACT", relatedId: contact.id, limit: 50 }),
        ),
        tryCrmDocument(() => listCrmDocuments({ contactId: contact.id, limit: 50 })),
      ]);
      if (cancelled) return;
      setCrmEmails(emails ?? []);
      setCrmCalls(calls ?? []);
      setCrmTasks(tasks ?? []);
      setCrmDocs(docs ?? []);
      setCrmLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [contact.id, crmEnabled, revision]);

  const linkedDeals = useMemo(() => {
    void revision;
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
    const linked = new Set(linkedDeals.map((d) => d.id));
    return listAllDeals().filter((d) => !linked.has(d.id));
  }, [linkedDeals, revision]);

  const openTasks = useMemo(
    () =>
      crmTasks.filter(
        (t) => t.status !== "Completed" && t.status !== "Cancelled",
      ),
    [crmTasks],
  );

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

  function handleDelete() {
    const gate = softDeleteRecord({
      action: "sales.contacts.delete",
      module: "sales.contacts",
      recordId: contact.id,
      recordLabel: contact.name,
      recordType: "Contact",
      snapshot: { contact, status: statusTitle },
    });
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    if (!window.confirm(`Delete ${contact.name}?`)) return;
    deleteContact(contact.id);
    emitRulesChange("all");
    router.push(back.href);
  }

  const prevContact =
    contactIndex > 0 ? contacts[contactIndex - 1] : undefined;
  const nextContact =
    contactIndex < contacts.length - 1 ? contacts[contactIndex + 1] : undefined;

  const overviewFields = [
    { id: "owner", label: "Contact Owner", value: contact.owner },
    { id: "company", label: "Company", value: contact.company || "—" },
    ...(contact.jobTitle
      ? [{ id: "jobTitle", label: "Job Title", value: contact.jobTitle }]
      : []),
    ...(contact.department
      ? [{ id: "department", label: "Department", value: contact.department }]
      : []),
    {
      id: "email",
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
    },
    phoneField("phone", "Phone", contact.phone),
    ...(contact.mobile ? [phoneField("mobile", "Mobile", contact.mobile)] : []),
    ...(contact.linkedinUrl
      ? [
          {
            id: "linkedin",
            label: "LinkedIn",
            value: contact.linkedinUrl,
            href: contact.linkedinUrl,
          },
        ]
      : []),
    ...(contact.lifecycleStage
      ? [
          {
            id: "lifecycle",
            label: "Lifecycle Stage",
            value: contact.lifecycleStage,
          },
        ]
      : []),
    {
      id: "doNotContact",
      label: "Do Not Contact",
      value: contact.doNotContact ? "Yes" : "No",
    },
    { id: "source", label: "Source", value: contact.source },
    { id: "created", label: "Created Date", value: contact.createdDate },
    { id: "deals", label: "Linked Deals", value: String(linkedDeals.length) },
    ...(contact.notes
      ? [{ id: "notes", label: "Notes", value: contact.notes }]
      : []),
  ];

  function renderRelatedPanel(item: RelatedListItem) {
    if (item.id === "deals") {
      return (
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
                  linkDealToContact(contact.id, linkDealId);
                  emitRulesChange("all");
                  setLinkDealId("");
                  setRevision((n) => n + 1);
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
                        setRevision((n) => n + 1);
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
      );
    }

    if (item.id === "notes") {
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-[13px] font-semibold text-slate-800">Notes</h3>
          <RelatedInternalNotes
            relatedTo={relatedLabel}
            relatedType="CONTACT"
            relatedId={contact.id}
            onNotify={notify}
            compact
          />
        </div>
      );
    }

    if (item.id === "emails") {
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-[13px] font-semibold text-slate-800">
              Emails ({crmEmails.length})
            </h3>
            <button
              type="button"
              onClick={() => router.push("/activities/emails/create")}
              className="text-[11px] font-semibold text-violet-700 hover:underline"
            >
              Send Email
            </button>
          </div>
          {crmLoading && crmEnabled ? (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">
              Loading emails…
            </p>
          ) : crmEmails.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">
              {crmEnabled ? "No emails yet." : "Sign in with a CRM contact to load emails."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {crmEmails.map((email) => (
                <li key={email.id} className="px-4 py-2.5">
                  <p className="text-[13px] font-semibold text-slate-800">
                    {email.subject || "(no subject)"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {email.status} · {email.sentDate || "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (item.id === "open-activities") {
      const items = crmEnabled
        ? openTasks
        : crmCalls.slice(0, 5);
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-[13px] font-semibold text-slate-800">
              Open Activities ({items.length})
            </h3>
          </div>
          {crmLoading && crmEnabled ? (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">
              Loading activities…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">
              No open activities.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {crmEnabled
                ? openTasks.map((task) => (
                    <li key={task.taskId} className="px-4 py-2.5">
                      <p className="text-[13px] font-semibold text-slate-800">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {task.status} · {task.dueDate || task.taskType}
                      </p>
                    </li>
                  ))
                : crmCalls.map((call) => (
                    <li key={call.id} className="px-4 py-2.5">
                      <p className="text-[13px] font-semibold text-slate-800">
                        {call.subject}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {call.status} · {call.date}
                      </p>
                    </li>
                  ))}
            </ul>
          )}
        </div>
      );
    }

    if (item.id === "attachments") {
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-[13px] font-semibold text-slate-800">
              Attachments ({crmDocs.length})
            </h3>
          </div>
          {crmLoading && crmEnabled ? (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">
              Loading documents…
            </p>
          ) : crmDocs.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">
              {crmEnabled ? "No documents yet." : "Documents load for CRM contacts when signed in."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {crmDocs.map((doc) => (
                <li key={doc.id} className="px-4 py-2.5">
                  <p className="text-[13px] font-semibold text-slate-800">
                    {doc.fileName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {doc.folder} · {doc.uploadedAt}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    return (
      <RelatedListCard
        title={item.label}
        action={RELATED_LIST_ACTIONS[item.id]}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      <EntityDetailHeader
        avatarFallback={contact.initials}
        avatarClassName={contact.avatarBgClass}
        name={contact.name}
        relatedLabel={contact.company}
        onRelatedClick={() => {}}
        tags={contact.tags ?? []}
        relatedTo={relatedToLabel("Contact", contact.name)}
        onTagsChange={(tags) => {
          updateContact(contact.id, { tags });
          if (crmEnabled) {
            void tryCrmContact(() => replaceCrmContactTags(contact.id, tags));
          }
          setRevision((n) => n + 1);
        }}
        actions={[
          {
            label: "Send Email",
            onClick: () => router.push("/activities/emails/create"),
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
          { label: "Delete", destructive: true, onClick: handleDelete },
        ]}
        onBack={() => router.push(back.href)}
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
                    className={`h-1.5 w-1.5 rounded-full ${statusDotColor}`}
                  />
                  {statusTitle}
                </span>
              }
            />

            {activeTab === "Overview" ? (
              <OverviewCard fields={overviewFields} />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-[13px] font-semibold text-slate-800">
                  Activity Timeline
                </h3>
                {!crmEnabled ? (
                  <p className="text-center text-[12px] text-slate-400">
                    Timeline is available for CRM contacts when signed in.
                  </p>
                ) : (
                  <>
                    <TimelineFeed items={timelineItems} />
                    {timelineLoading ? (
                      <p className="mt-2 text-center text-[12px] text-slate-400">
                        Refreshing timeline…
                      </p>
                    ) : null}
                    {!timelineLoading &&
                    timelineError &&
                    timelineItems.length === 0 ? (
                      <p className="mt-2 text-center text-[12px] text-slate-400">
                        {timelineError}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            )}

            {visibleRelatedIds.map((id) => {
              const item = RELATED_LIST_CATALOG.find((i) => i.id === id);
              if (!item) return null;
              return (
                <div key={item.id} id={`related-list-${item.id}`}>
                  {renderRelatedPanel(item)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildFlatContacts(revision: number): FlatContact[] {
  void revision;
  return listAllContacts().map((c) => {
    const found = findContactById(c.id);
    return {
      ...c,
      statusTitle: found?.status ?? "Active",
      statusDotColor: c.accentColorClass,
    } satisfies FlatContact;
  });
}
