"use client";

import { useEffect, useMemo, useState } from "react";
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
  deleteCompany,
  findCompanyById,
  listCompanyGroups,
  updateCompany,
} from "@/lib/companies/store";
import { isCrmCompanyId } from "@/lib/companies/api";
import { listAllDeals } from "@/lib/deals/store";
import { relatedToLabel } from "@/lib/related-entity";
import { emitRulesChange } from "@/lib/rules/storage";
import { softDeleteRecord } from "@/lib/rules";
import type { CompanyCardData, CompanyStatus } from "@/lib/companies/types";
import { composeEmailsHref } from "@/lib/emails/href";
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
  { id: "contacts", label: "Contacts" },
  { id: "attachments", label: "Attachments" },
  { id: "open-activities", label: "Open Activities" },
  { id: "emails", label: "Emails" },
];

const DEFAULT_VISIBLE_RELATED_IDS = [
  "deals",
  "notes",
  "attachments",
  "open-activities",
  "emails",
];

const RELATED_LIST_ACTIONS: Record<string, RelatedListAction> = {
  notes: { label: "Add a note", variant: "field" },
  attachments: { label: "Attach", variant: "button" },
  emails: { label: "Send Email", variant: "button" },
  "open-activities": { label: "Add", variant: "button" },
  deals: { label: "View deals", variant: "button" },
};

export interface FlatCompany extends CompanyCardData {
  statusTitle: CompanyStatus;
  statusDotColor: string;
}

function websiteHref(raw?: string) {
  const value = (raw ?? "").trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function namesEqual(a?: string | null, b?: string | null) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export function CompanyDetailView({
  company,
  statusTitle,
  statusDotColor,
  companies,
  companyIndex,
}: {
  company: FlatCompany;
  statusTitle: CompanyStatus;
  statusDotColor: string;
  companies: FlatCompany[];
  companyIndex: number;
}) {
  const router = useRouter();
  const back = useModuleBack("/sales/companies", "Back to Companies");
  const [activeRelated, setActiveRelated] = useState("deals");
  const [activeTab, setActiveTab] = useState("Overview");
  const [visibleRelatedIds, setVisibleRelatedIds] = useState<string[]>(
    DEFAULT_VISIBLE_RELATED_IDS,
  );
  const [revision, setRevision] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [crmEmails, setCrmEmails] = useState<Email[]>([]);
  const [crmCalls, setCrmCalls] = useState<Call[]>([]);
  const [crmTasks, setCrmTasks] = useState<Task[]>([]);
  const [crmDocs, setCrmDocs] = useState<LibraryDocument[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);

  const crmEnabled = isCrmCompanyId(company.id);
  const relatedLabel = relatedToLabel("Company", company.name);

  const {
    feedItems: timelineItems,
    loading: timelineLoading,
    error: timelineError,
  } = useParentActivityTimeline({
    relatedType: "COMPANY",
    relatedId: company.id,
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
        tryCrmEmail(() => listRelatedCrmEmails("COMPANY", company.id)),
        tryCrmCall(() => listRelatedCrmCalls("COMPANY", company.id)),
        tryCrmTask(() =>
          listCrmTasks({ relatedType: "COMPANY", relatedId: company.id, limit: 50 }),
        ),
        tryCrmDocument(() =>
          listCrmDocuments({ companyId: company.id, limit: 50 }),
        ),
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
  }, [company.id, crmEnabled, revision]);

  const linkedDeals = useMemo(() => {
    void revision;
    return listAllDeals().filter((d) => namesEqual(d.account, company.name));
  }, [company.name, revision]);

  const openTasks = useMemo(
    () =>
      crmTasks.filter(
        (t) => t.status !== "Completed" && t.status !== "Cancelled",
      ),
    [crmTasks],
  );

  const overviewFields = useMemo(
    () => [
      { id: "owner", label: "Company Owner", value: company.owner || "—" },
      { id: "status", label: "Status", value: statusTitle },
      {
        id: "website",
        label: "Website",
        value: company.website || "—",
        href: websiteHref(company.website),
      },
      { id: "industry", label: "Industry", value: company.industry || "—" },
      phoneField("phone", "Phone", company.phone || "—"),
      { id: "city", label: "City", value: company.city || "—" },
      {
        id: "revenue",
        label: "Annual Revenue",
        value: company.annualRevenue || "—",
      },
      { id: "deals", label: "Linked Deals", value: String(linkedDeals.length) },
    ],
    [company, statusTitle, linkedDeals.length],
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
      action: "sales.companies.delete",
      module: "sales.companies",
      recordId: company.id,
      recordLabel: company.name,
      recordType: "Company",
      snapshot: { company, status: statusTitle },
    });
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    if (!window.confirm(`Delete ${company.name}?`)) return;
    deleteCompany(company.id);
    emitRulesChange("all");
    router.push(back.href);
  }

  const prevCompany =
    companyIndex > 0 ? companies[companyIndex - 1] : undefined;
  const nextCompany =
    companyIndex < companies.length - 1
      ? companies[companyIndex + 1]
      : undefined;

  function renderRelatedPanel(item: RelatedListItem) {
    if (item.id === "deals") {
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-[13px] font-semibold text-slate-800">
              Deals ({linkedDeals.length})
            </h3>
          </div>
          {linkedDeals.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">
              No deals linked to this company.
            </p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {linkedDeals.map((deal) => (
                <li key={deal.id}>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/sales/deals/detail/${deal.id}`)
                    }
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50"
                  >
                    <p className="text-[13px] font-semibold text-slate-800">
                      {deal.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {deal.value} · {deal.owner}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (item.id === "notes") {
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-[13px] font-semibold text-slate-800">
            Notes
          </h3>
          <RelatedInternalNotes
            relatedTo={`Company: ${company.name}`}
            relatedType="COMPANY"
            relatedId={company.id}
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
              onClick={() =>
                router.push(
                  composeEmailsHref({
                    relatedKind: "Company",
                    relatedName: company.name,
                    relatedId: company.id,
                  }),
                )
              }
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
              {crmEnabled
                ? "No emails yet."
                : "Sign in with a CRM company to load emails."}
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
      const items = crmEnabled ? openTasks : crmCalls.slice(0, 5);
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
              {crmEnabled
                ? "No documents yet."
                : "Documents load for CRM companies when signed in."}
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
        avatarFallback={company.initials}
        avatarClassName={company.avatarBgClass}
        name={company.name}
        tags={company.tags ?? []}
        relatedTo={relatedLabel}
        onTagsChange={(tags) => {
          updateCompany(company.id, { tags });
          setRevision((n) => n + 1);
        }}
        actions={[
          {
            label: "Send Email",
            onClick: () =>
              router.push(
                composeEmailsHref({
                  relatedKind: "Company",
                  relatedName: company.name,
                  relatedId: company.id,
                }),
              ),
          },
        ]}
        moreMenuItems={[
          { label: "Delete", destructive: true, onClick: handleDelete },
        ]}
        onBack={() => router.push(back.href)}
        onPrev={
          prevCompany
            ? () =>
                router.push(
                  `/sales/companies/detail/${encodeURIComponent(prevCompany.id)}`,
                )
            : undefined
        }
        onNext={
          nextCompany
            ? () =>
                router.push(
                  `/sales/companies/detail/${encodeURIComponent(nextCompany.id)}`,
                )
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
                    Timeline is available for CRM companies when signed in.
                  </p>
                ) : (
                  <>
                    <TimelineFeed items={timelineItems} />
                    {timelineLoading ? (
                      <p className="mt-2 text-center text-[12px] text-slate-400">
                        Loading timeline…
                      </p>
                    ) : null}
                    {timelineError ? (
                      <p className="mt-2 text-center text-[12px] text-rose-500">
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
                <div key={item.id} id={`related-list-${id}`}>
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

export function buildFlatCompanies(revision: number): FlatCompany[] {
  void revision;
  return listCompanyGroups().flatMap((group) =>
    group.companies.map((c) => {
      const found = findCompanyById(c.id);
      return {
        ...c,
        statusTitle: found?.status ?? group.title,
        statusDotColor: found?.company.accentColorClass ?? group.dotColorClass,
      } satisfies FlatCompany;
    }),
  );
}
