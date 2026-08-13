"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Mail,
  Phone,
  Clock as ClockIcon,
  Send,
  StickyNote,
  Phone as PhoneIcon,
} from "lucide-react";
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
import { LeadCardData, type LeadStatus } from "@/lib/leads/types";
import { canField, logCreate, logEdit } from "@/lib/rules";
import { emitRulesChange } from "@/lib/rules/storage";
import { updateLead } from "@/lib/leads/store";
import { createDeal } from "@/lib/deals/store";
import { sendEmailDemoLive } from "@/lib/comms/send-gateway";
import { createEmail } from "@/lib/emails/store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import { formatRulesAt } from "@/lib/rules/storage";
import {
  ConvertToDealFormValues,
  ConvertToDealModal,
} from "./ConvertToDealModal";
import { ComposeEmailModal } from "../ComposeEmailModal";
import { EditLeadModal } from "./EditLeadModal";

const LEAD_STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Qualified",
  "Unqualified",
  "Converted",
];

const DEAL_STAGES = [
  "Discovery",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

export function LeadDetailView({ card: initial }: { card: LeadCardData }) {
  const router = useRouter();
  const [card, setCard] = useState(initial);
  const [activeTab, setActiveTab] = useState("timeline");
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  function notify(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2800);
  }

  function handleConvert(values: ConvertToDealFormValues) {
    const deal = createDeal({
      dealName: values.dealName,
      account: card.company || card.name,
      contact: card.name,
      stage: values.dealStage,
      dealValue: values.amount || card.estimatedValue || "$0",
      currency: "AUD",
      owner: card.owner || ACTIVITY_OWNERS[0],
      closeDate: values.expectedCloseDate,
    });
    const updated = updateLead(card.id, {
      status: "Converted",
      isConverted: true,
      convertedAt: new Date().toISOString(),
      convertedDealId: deal.id,
    });
    if (updated) setCard(updated);
    logCreate(
      "sales.deals",
      card.owner || ACTIVITY_OWNERS[0],
      deal.id,
      deal.name,
    );
    emitRulesChange("all");
    setIsConvertOpen(false);
    notify(`Deal created · ${deal.name}`);
    router.push(`/sales/deals/detail/${deal.id}`);
  }

  const allTimelineItems: TimelineItemData[] = [
    {
      id: "t1",
      type: "email",
      icon: Mail,
      iconTone: "info",
      title: "Email Sent: Q4 Strategy Proposal",
      timestampLabel: "3 hours ago",
      body: "Hi there, following up on our conversation yesterday...",
      attachment: { label: "1 Attachment" },
      statusChip: "Opened 10m ago",
    },
    {
      id: "t2",
      type: "call",
      icon: PhoneIcon,
      iconTone: "neutral",
      title: "Discovery Call",
      timestampLabel: "Yesterday, 1:00 PM",
      metaLine: "Duration 43m 12s · Outcome: Positive",
      quote: "Mentioned they are actively evaluating vendors...",
    },
    {
      id: "t3",
      type: "note",
      icon: StickyNote,
      iconTone: "neutral",
      title: "Internal Note: Pricing Feedback",
      timestampLabel: "2 days ago",
      body: "Client mentioned they have room in their annual budget if we can bundle onboarding.",
    },
  ];

  const filteredItems = allTimelineItems.filter((item) => {
    if (activeTab === "timeline") return true;
    if (activeTab === "notes") return item.type === "note";
    if (activeTab === "emails") return item.type === "email";
    if (activeTab === "calls") return item.type === "call";
    return true;
  });

  return (
    <div className="relative mx-auto w-full max-w-[1920px] p-3 lg:p-5 2xl:px-8">
      {flash ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">
          {flash}
        </div>
      ) : null}

      <EntityDetailHeader
        breadcrumb={[
          { label: "All Leads", href: "/sales/leads" },
          { label: card.company, href: "#" },
        ]}
        initials={card.initials}
        isOnline
        name={card.name}
        subtitleParts={[card.company]}
        status={{
          label: card.pipelineStage ?? "New Lead",
          tone: "success",
        }}
        tags={card.tags?.map((tag) => ({ label: tag, icon: Building2 })) ?? []}
        primaryAction={{
          label: "Convert to Deal",
          icon: Send,
          onClick: () => setIsConvertOpen(true),
        }}
        quickActions={[
          { label: "Email", icon: Mail, onClick: () => setIsComposeOpen(true) },
          { label: "Call", icon: Phone },
        ]}
        onEditDetails={() => setIsEditOpen(true)}
        onMoreActions={() => notify("More actions…")}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(260px,360px)] 2xl:gap-6">
        <div className="space-y-4">
          <ScoreGaugeCard
            title="Lead Score"
            score={88}
            trendLabel="+5"
            bands={[
              { label: "Cold", color: "slate" },
              { label: "Warm", color: "amber" },
              { label: "Hot", color: "rose" },
            ]}
            activeBandIndex={2}
          />
          <ContactInfoCard
            fields={[
              {
                icon: Mail,
                label: "Email Address",
                value: canField("sales.leads.email") ? card.email : "••••",
              },
              {
                icon: Phone,
                label: "Phone Number",
                value: canField("sales.leads.phone") ? card.phone : "••••",
              },
              { icon: ClockIcon, label: "Created", value: card.createdDate },
            ]}
          />
        </div>

        <div className="space-y-3">
          <ActivityComposer onSubmit={(text) => notify(`Posted: ${text.slice(0, 40)}`)} />
          <ActivityTabs
            tabs={[
              { key: "timeline", label: "Timeline", icon: ClockIcon },
              { key: "notes", label: "Notes", icon: StickyNote },
              { key: "emails", label: "Emails", icon: Mail },
              { key: "calls", label: "Calls", icon: PhoneIcon, count: 1 },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
          <TimelineFeed
            items={filteredItems}
            onLoadMore={() => notify("Load more…")}
          />
        </div>

        <div className="space-y-4">
          <NextStepCard
            title="Follow up on proposal"
            dueLabel="Due Tomorrow"
            dueTime="10:00 AM"
            onComplete={() => notify("Next step completed")}
            onEdit={() => notify("Edit next step…")}
          />
          <OrgInfoCard
            name={card.company}
            fields={[
              { label: "Source", value: card.source },
              {
                label: "Est. Value",
                value: canField("sales.leads.estimatedValue")
                  ? (card.estimatedValue ?? "")
                  : "••••",
              },
            ]}
          />
          <RelatedContactsCard contacts={[]} totalCount={0} />
        </div>
      </div>

      <ConvertToDealModal
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        primaryContact={{
          name: card.name,
          company: card.company,
          initials: card.initials,
        }}
        dealStages={DEAL_STAGES}
        defaultDealName={`${card.company || card.name} - New Deal`}
        onConvert={handleConvert}
      />

      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        recipient={{
          name: card.name,
          email: card.email,
          initials: card.initials,
          isOnline: true,
        }}
        defaultGreeting={`Hi ${card.name.split(" ")[0]},`}
        onSend={(values) => {
          void (async () => {
            const result = await sendEmailDemoLive({
              email: card.email,
              subject: values.subject,
              body: values.body,
            });
            if (!result.ok) {
              notify(result.message);
              return;
            }
            createEmail({
              subject: values.subject || "(no subject)",
              body: values.body || "",
              from: "noreply@finconnex.demo",
              to: [card.email],
              status: "Sent",
              sentDate: formatRulesAt(),
              relatedTo: `Lead: ${card.name}`,
            });
            setIsComposeOpen(false);
            notify("Email sent via demo gateway");
          })();
        }}
      />

      <EditLeadModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Lead: ${card.name}`}
        initialValues={{
          firstName: card.name.split(" ")[0] ?? "",
          lastName: card.name.split(" ").slice(1).join(" "),
          email: card.email,
          phone: card.phone,
          linkedinUrl: "",
          companyName: card.company,
          jobTitle: "",
          website: "",
          status: card.pipelineStage ?? LEAD_STATUS_OPTIONS[0],
        }}
        statusOptions={[...LEAD_STATUS_OPTIONS, card.pipelineStage ?? ""].filter(
          Boolean,
        )}
        onSave={(values) => {
          const name = `${values.firstName} ${values.lastName}`.trim();
          let statusOpt: LeadStatus | undefined;
          if (
            (LEAD_STATUS_OPTIONS as readonly string[]).includes(values.status)
          ) {
            statusOpt = values.status as LeadStatus;
          }
          const patch: Parameters<typeof updateLead>[1] = {
            name,
            email: values.email,
            phone: values.phone ?? "",
            company: values.companyName ?? "",
          };
          if (statusOpt) patch.status = statusOpt;
          else if (values.status) patch.pipelineStage = values.status;
          const updated = updateLead(card.id, patch);
          if (updated) {
            setCard(updated);
            logEdit(
              "sales.leads",
              card.owner || ACTIVITY_OWNERS[0],
              card.id,
              name,
              [
                { field: "name", from: card.name, to: name },
                { field: "email", from: card.email, to: values.email },
              ],
            );
            emitRulesChange("all");
            notify("Lead saved");
          }
          setIsEditOpen(false);
        }}
      />
    </div>
  );
}
