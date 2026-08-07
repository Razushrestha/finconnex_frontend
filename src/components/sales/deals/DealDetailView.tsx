"use client";

import { useState } from "react";
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
} from "lucide-react";
import {
  DEAL_CURRENCIES,
  OWNERS,
  type DealPipeline,
  type DealRecord,
  type DealStage,
} from "@/lib/deals/types";
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
  type TimelineItemData,
} from "@/components/sales/entity-detail";
import { EditDealModal, type EditDealFormValues } from "./EditDealModal";
import { ComposeEmailModal } from "../ComposeEmailModal";

/**
 * A deal's stage/pipeline aren't on DealRecord itself — they're implicit
 * in which DEAL_PIPELINE_STAGES bucket it's found in — so the page passes
 * all three in, same as findDealById's return shape.
 */
export function DealDetailView({
  deal,
  stage,
  pipeline,
  pipelineStages,
}: {
  deal: DealRecord;
  stage: DealStage;
  pipeline: DealPipeline;
  /** All stage titles for this deal's pipeline, for the edit-stage dropdown. */
  pipelineStages: DealStage[];
}) {
  const [activeTab, setActiveTab] = useState("timeline");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const isClosed =
    stage.title === "Closed Won" || stage.title === "Closed Lost";
  const probabilityBandIndex =
    deal.probability >= 70 ? 2 : deal.probability >= 40 ? 1 : 0;

  const timelineItems: TimelineItemData[] = [
    {
      id: "d1",
      type: "activity",
      icon: CheckCircle2,
      iconTone: "success",
      title: `Moved to ${stage.title}`,
      timestampLabel: "2 hours ago",
      body: `Stage changed by ${deal.owner}.`,
    },
  ];

  function handleEditSave(values: EditDealFormValues) {
    console.log("save deal", deal.id, values);
    setIsEditOpen(false);
  }

  return (
    <div className="mx-auto w-full p-3">
      <EntityDetailHeader
        breadcrumb={[
          { label: "All Deals", href: "/sales/deals" },
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
        tags={[{ label: pipeline }]}
        primaryAction={
          !isClosed
            ? {
                label: "Mark as Won",
                icon: CheckCircle2,
                onClick: () => console.log("mark as won", deal.id),
              }
            : undefined
        }
        quickActions={[
          {
            label: "Email",
            icon: Mail,
            onClick: deal.contact ? () => setIsComposeOpen(true) : undefined,
          },
          { label: "Call", icon: Phone },
        ]}
        onEditDetails={() => setIsEditOpen(true)}
        onMoreActions={() => console.log("Clicked")}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_280px]">
        {/* Left column */}
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

        {/* Center column */}
        <div className="space-y-3">
          <ActivityComposer onSubmit={(text) => console.log("post", text)} />
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
          <TimelineFeed items={timelineItems} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <NextStepCard
            title={isClosed ? "Deal closed" : `Advance past ${stage.title}`}
            dueLabel={
              deal.closeDate
                ? `Target close: ${deal.closeDate}`
                : "No close date set"
            }
            onComplete={() => console.log("complete next step", deal.id)}
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
                      id: `${deal.id}-contact`,
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
          />
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
            // DealRecord has no email field — wire this up once deals
            // link to a Contact/Lead record with a real email address.
            email: "",
            initials: deal.initials,
          }}
          defaultGreeting={`Hi ${deal.contact.split(" ")[0]},`}
          onSend={(values) => {
            console.log("send email", deal.id, values);
            // TODO: call your send-email API/mutation here.
            setIsComposeOpen(false);
          }}
        />
      )}
    </div>
  );
}
