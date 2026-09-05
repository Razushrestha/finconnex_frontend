"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Phone,
  Clock as ClockIcon,
  CheckCircle2,
  StickyNote,
  Phone as PhoneIcon,
  DollarSign,
  Calendar,
  User,
  Percent,
  XCircle,
} from "lucide-react";
import {
  DEAL_CURRENCIES,
  OWNERS,
  type DealPipeline,
  type DealRecord,
  type DealStage,
} from "@/lib/deals/types";
import {
  findDealById,
  linkContactToDeal,
  markDealOutcome,
  unlinkContactFromDeal,
  updateDeal,
} from "@/lib/deals/store";
import { listAllContacts, findContactById } from "@/lib/contacts/store";
import { useRouter } from "next/navigation";
import { useModuleBack } from "@/hooks/useModuleBack";
import {
  EntityDetailHeader,
  ScoreGaugeCard,
  ContactInfoCard,
  ActivityComposer,
  ActivityTabs,
  TimelineFeed,
  NextStepCard,
  OrgInfoCard,
  RelatedContactsCard,
} from "@/components/sales/entity-detail";
import { useParentActivityTimeline } from "@/lib/activity-timeline";
import { RelatedInternalNotes } from "@/components/shared/RelatedInternalNotes";
import { relatedToLabel } from "@/lib/related-entity";
import { EditDealModal, type EditDealFormValues } from "./EditDealModal";
import { ComposeEmailModal } from "../ComposeEmailModal";
import { sendEmailDemoLive } from "@/lib/comms/send-gateway";
import { createEmail } from "@/lib/emails/store";
import { formatRulesAt, emitRulesChange } from "@/lib/rules/storage";
import { logEdit, notifyDealClosed } from "@/lib/rules";
import { listDealPipelines } from "@/lib/deals/store";

export function DealDetailView({
  deal: initialDeal,
  stage: initialStage,
  pipeline: initialPipeline,
  pipelineStages: initialStages,
}: {
  deal: DealRecord;
  stage: DealStage;
  pipeline: DealPipeline;
  pipelineStages: DealStage[];
}) {
  const [deal, setDeal] = useState(initialDeal);
  const [stage, setStage] = useState(initialStage);
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [pipelineStages, setPipelineStages] = useState(initialStages);
  const [activeTab, setActiveTab] = useState("timeline");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [linkContactId, setLinkContactId] = useState("");
  const router = useRouter();
  const back = useModuleBack("/sales/deals", "All Deals");

  function refresh() {
    const loc = findDealById(deal.id);
    if (!loc) return;
    setDeal(loc.deal);
    setStage(loc.stage);
    setPipeline(loc.pipeline);
    setPipelineStages(listDealPipelines()[loc.pipeline] ?? []);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  function notify(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2800);
  }

  const isClosed =
    stage.title === "Closed Won" || stage.title === "Closed Lost";
  const probabilityBandIndex =
    deal.probability >= 70 ? 2 : deal.probability >= 40 ? 1 : 0;

  const {
    feedItems: timelineItems,
    loading: timelineLoading,
    error: timelineError,
  } = useParentActivityTimeline({
    relatedType: "DEAL",
    relatedId: deal.id,
    filters: { limit: 25 },
  });

  function handleEditSave(values: EditDealFormValues) {
    const loc = updateDeal(deal.id, {
      name: values.name,
      account: values.account,
      contact: values.contact,
      value: values.value,
      currency: values.currency,
      probability: values.probability,
      owner: values.owner,
      closeDate: values.closeDate,
      stageTitle: values.stageTitle,
    });
    if (loc) {
      setDeal(loc.deal);
      setStage(loc.stage);
      setPipeline(loc.pipeline);
      setPipelineStages(listDealPipelines()[loc.pipeline] ?? []);
      logEdit(
        "sales.deals",
        values.owner,
        deal.id,
        values.name,
        [
          { field: "name", from: deal.name, to: values.name },
          { field: "stage", from: stage.title, to: values.stageTitle },
        ],
      );
      emitRulesChange("all");
      notify("Deal saved");
    }
    setIsEditOpen(false);
  }

  function closeOutcome(outcome: "won" | "lost") {
    const loc = markDealOutcome(deal.id, outcome);
    if (!loc) {
      notify(`No "${outcome === "won" ? "Closed Won" : "Closed Lost"}" stage`);
      return;
    }
    setDeal(loc.deal);
    setStage(loc.stage);
    setPipeline(loc.pipeline);
    notifyDealClosed({
      owner: loc.deal.owner,
      dealName: loc.deal.name,
      stage: loc.stage.title,
      relatedTo: loc.deal.name,
      relatedHref: `/sales/deals/detail/${loc.deal.id}`,
    });
    emitRulesChange("all");
    notify(outcome === "won" ? "Marked as Won" : "Marked as Lost");
  }

  return (
    <div className="relative mx-auto w-full max-w-[1920px] p-3 lg:p-5 2xl:px-8">
      {flash ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">
          {flash}
        </div>
      ) : null}

      <EntityDetailHeader
        breadcrumb={[
          { label: back.label, href: back.href },
          { label: deal.account, href: "#" },
        ]}
        initials={deal.initials}
        name={deal.name}
        subtitleParts={[deal.contact ?? deal.owner, deal.account]}
        status={{
          label: stage.title,
          tone:
            stage.title === "Closed Won"
              ? "success"
              : stage.title === "Closed Lost"
                ? "danger"
                : "info",
        }}
        tags={deal.tags ?? []}
        relatedTo={relatedToLabel("Deal", deal.name)}
        onTagsChange={(tags) => {
          const loc = updateDeal(deal.id, { tags });
          if (loc) setDeal(loc.deal);
        }}
        primaryAction={
          !isClosed
            ? {
                label: "Mark as Won",
                icon: CheckCircle2,
                onClick: () => closeOutcome("won"),
              }
            : undefined
        }
        quickActions={[
          {
            label: "Email",
            icon: Mail,
            onClick: deal.contact ? () => setIsComposeOpen(true) : undefined,
          },
          ...(!isClosed
            ? [
                {
                  label: "Mark Lost",
                  icon: XCircle,
                  onClick: () => closeOutcome("lost"),
                },
              ]
            : []),
          { label: "Call", icon: Phone },
        ]}
        onEditDetails={() => setIsEditOpen(true)}
        onMoreActions={() => notify("More actions…")}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(260px,360px)] 2xl:gap-6">
        <div className="space-y-4">
          <ScoreGaugeCard
            title="Win Probability"
            score={deal.probability}
            bands={[
              { label: "Low", color: "slate" },
              { label: "Medium", color: "amber" },
              { label: "High", color: "emerald" },
            ]}
            activeBandIndex={probabilityBandIndex}
          />
          <ContactInfoCard
            title="Deal Info"
            fields={[
              {
                icon: DollarSign,
                label: "Amount",
                value: `${deal.value} ${deal.currency}`,
              },
              { icon: Calendar, label: "Close Date", value: deal.closeDate },
              { icon: User, label: "Owner", value: deal.owner },
              {
                icon: Percent,
                label: "Primary Contact",
                value: deal.contact ?? "Not set",
              },
            ]}
          />
        </div>

        <div className="space-y-3">
          {activeTab === "notes" ? null : (
            <ActivityComposer onSubmit={(text) => notify(`Posted: ${text.slice(0, 40)}`)} />
          )}
          <ActivityTabs
            tabs={[
              { key: "timeline", label: "Timeline", icon: ClockIcon },
              { key: "notes", label: "Notes", icon: StickyNote },
              { key: "emails", label: "Emails", icon: Mail },
              { key: "calls", label: "Calls", icon: PhoneIcon },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
          {activeTab === "notes" ? (
            <RelatedInternalNotes
              relatedTo={`Deal: ${deal.name}`}
              relatedType="DEAL"
              relatedId={deal.id}
              onNotify={notify}
            />
          ) : (
            <>
              <TimelineFeed items={timelineItems} />
              {timelineLoading ? (
                <p className="text-center text-[12px] text-slate-400">
                  Refreshing timeline…
                </p>
              ) : null}
              {!timelineLoading && timelineError && timelineItems.length === 0 ? (
                <p className="text-center text-[12px] text-slate-400">
                  {timelineError}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-4">
          <NextStepCard
            title={isClosed ? "Deal closed" : `Advance past ${stage.title}`}
            dueLabel={
              deal.closeDate
                ? `Target close: ${deal.closeDate}`
                : "No close date set"
            }
            onComplete={() =>
              !isClosed ? closeOutcome("won") : notify("Already closed")
            }
          />
          <OrgInfoCard
            name={deal.account}
            fields={[
              { label: "Pipeline", value: pipeline },
              { label: "Stage", value: stage.title },
            ]}
          />
          <RelatedContactsCard
            title="Stakeholders"
            contacts={
              deal.contact
                ? [
                    {
                      id: deal.contactId ?? `${deal.id}-contact`,
                      name: deal.contact,
                      role: "Primary Contact",
                      initials: deal.contact
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase(),
                    },
                  ]
                : []
            }
            totalCount={deal.contact ? 1 : 0}
            onViewAll={() => {
              if (deal.contactId) {
                router.push(`/sales/contacts/detail/${deal.contactId}`);
              }
            }}
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Link contact
            </p>
            <div className="flex flex-wrap gap-2">
              <select
                value={linkContactId}
                onChange={(e) => setLinkContactId(e.target.value)}
                className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-[11px]"
              >
                <option value="">Select contact…</option>
                {listAllContacts().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!linkContactId}
                onClick={() => {
                  if (!linkContactId) return;
                  linkContactToDeal(deal.id, linkContactId);
                  emitRulesChange("all");
                  setLinkContactId("");
                  refresh();
                  notify("Contact linked");
                }}
                className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-40"
              >
                Link
              </button>
              {deal.contactId || deal.contact ? (
                <button
                  type="button"
                  onClick={() => {
                    unlinkContactFromDeal(deal.id);
                    emitRulesChange("all");
                    refresh();
                    notify("Contact unlinked");
                  }}
                  className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
                >
                  Unlink
                </button>
              ) : null}
            </div>
            {deal.contactId && findContactById(deal.contactId) ? (
              <button
                type="button"
                onClick={() =>
                  router.push(`/sales/contacts/detail/${deal.contactId}`)
                }
                className="mt-2 text-[11px] font-semibold text-violet-700 hover:underline"
              >
                Open contact record
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <EditDealModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Deal: ${deal.name}`}
        initialValues={{
          name: deal.name,
          account: deal.account,
          contact: deal.contact ?? "",
          value: deal.value,
          currency: deal.currency,
          probability: deal.probability,
          owner: deal.owner,
          closeDate: deal.closeDate,
          stageTitle: stage.title,
        }}
        stageOptions={pipelineStages.map((s) => s.title)}
        currencyOptions={DEAL_CURRENCIES}
        ownerOptions={OWNERS}
        onSave={handleEditSave}
      />

      {deal.contact && (
        <ComposeEmailModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          recipient={{
            name: deal.contact,
            email: `${deal.contact.toLowerCase().replace(/\s+/g, ".")}@example.com`,
            initials: deal.initials,
          }}
          defaultGreeting={`Hi ${deal.contact.split(" ")[0]},`}
          onSend={(values) => {
            void (async () => {
              const fallback = `${deal.contact!.toLowerCase().replace(/\s+/g, ".")}@example.com`;
              const to = values.toList?.length
                ? values.toList
                : values.to
                  ? values.to.split(/[,;]+/).map((part) => part.trim()).filter(Boolean)
                  : [fallback];
              createEmail({
                subject: values.subject || "(no subject)",
                body: values.body || "",
                from: "noreply@finconnex.demo",
                to,
                cc: values.ccList,
                bcc: values.bccList,
                status: "Sent",
                sentDate: formatRulesAt(),
                relatedTo: `Deal: ${deal.name}`,
              });
              setIsComposeOpen(false);
              notify("Email sent");
              void sendEmailDemoLive({
                email: to[0],
                subject: values.subject,
                body: values.body,
              });
            })();
          }}
        />
      )}
    </div>
  );
}
