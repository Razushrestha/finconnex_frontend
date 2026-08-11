"use client";

import { useState } from "react";
import {
  Building2,
  Mail,
  Phone,
  Clock as ClockIcon,
  Send,
  StickyNote,
  Phone as PhoneIcon,
  Award,
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
import { LeadCardData } from "@/lib/leads/types";
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

export function LeadDetailView({ card }: { card: LeadCardData }) {
  const [activeTab, setActiveTab] = useState("timeline");
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  function handleConvert(values: ConvertToDealFormValues) {
    console.log("convert lead to deal", card.id, values);
    // TODO: call your create-deal API/mutation here, then close + redirect.
    setIsConvertOpen(false);
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

  // Filter items based on active tab
  const filteredItems = allTimelineItems.filter((item) => {
    if (activeTab === "timeline") return true; // Timeline shows everything
    if (activeTab === "notes") return item.type === "note";
    if (activeTab === "emails") return item.type === "email";
    if (activeTab === "calls") return item.type === "call";
    return true;
  });

  return (
    <div className="mx-auto w-full p-3">
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
        onMoreActions={() => console.log("More actions clicked")}
      />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_280px]">
        {/* Left column */}
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
              { icon: Mail, label: "Email Address", value: card.email },
              { icon: Phone, label: "Phone Number", value: card.phone },
              { icon: ClockIcon, label: "Created", value: card.createdDate },
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
              { key: "calls", label: "Calls", icon: PhoneIcon, count: 1 },
            ]}
            activeKey={activeTab}
            onChange={setActiveTab}
          />
          <TimelineFeed
            items={filteredItems}
            onLoadMore={() => console.log("load more")}
          />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <NextStepCard
            title="Follow up on proposal"
            dueLabel="Due Tomorrow"
            dueTime="10:00 AM"
            onComplete={() => console.log("complete")}
            onEdit={() => console.log("edit next step")}
          />
          <OrgInfoCard
            name={card.company}
            fields={[
              { label: "Source", value: card.source },
              {
                label: "Est. Value",
                value: card.estimatedValue ?? "",
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
        defaultDealName={`${card.company} - New Deal`}
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
          console.log("send email", card.id, values);
          // TODO: call your send-email API/mutation here.
          setIsComposeOpen(false);
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
        statusOptions={LEAD_STATUS_OPTIONS}
        onSave={(values) => {
          console.log("save lead", card.id, values);
          // TODO: call your update-lead API/mutation here.
          setIsEditOpen(false);
        }}
      />
    </div>
  );
}
