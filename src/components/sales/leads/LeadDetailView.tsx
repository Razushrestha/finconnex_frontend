"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LeadCardData, type LeadStatus } from "@/lib/leads/types";
import { logCreate, logEdit } from "@/lib/rules";
import { emitRulesChange } from "@/lib/rules/storage";
import { updateLead } from "@/lib/leads/store";
import { convertCrmLead, createCrmDeal, syncLeadStatus, updateCrmLead } from "@/lib/leads/api";
import { mapCrmLeadToCard } from "@/lib/leads/api/map";
import { isUuid } from "@/lib/activity-timeline/auth";
import { upsertLeadFromCard } from "@/lib/leads/store";
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
import { LeadMortgageDetail } from "./detail/LeadMortgageDetail";

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
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  function notify(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2800);
  }

  async function handleConvert(values: ConvertToDealFormValues) {
    if (isUuid(card.id)) {
      try {
        const deal = await createCrmDeal({
          name: values.dealName,
          value: values.amount || card.estimatedValue,
          expectedCloseDate: values.expectedCloseDate,
          stage: values.dealStage,
          companyId: card.companyId,
          ownerId: card.ownerId,
        });
        if (!deal?.id) {
          notify("Could not create deal on the server");
          return;
        }
        const converted = await convertCrmLead(card.id, {
          convertedDealId: deal.id,
        });
        if (converted) {
          setCard(mapCrmLeadToCard(converted));
          upsertLeadFromCard(mapCrmLeadToCard(converted));
        }
        setIsConvertOpen(false);
        notify(`Deal created · ${values.dealName}`);
        router.push(`/sales/deals/detail/${deal.id}`);
        return;
      } catch (err) {
        notify(err instanceof Error ? err.message : "Convert failed");
        return;
      }
    }
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

  return (
    <div className="relative mx-auto w-full max-w-[1920px] p-3 lg:p-5 2xl:px-8">
      {flash ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">
          {flash}
        </div>
      ) : null}

      <LeadMortgageDetail
        card={card}
        onCall={() => notify("Starting call…")}
        onEmail={() => setIsComposeOpen(true)}
        onConvert={() => setIsConvertOpen(true)}
        onEdit={() => setIsEditOpen(true)}
        onMore={() => notify("More actions…")}
        onStatusChange={(pipelineStage) => {
          void (async () => {
            if (isUuid(card.id)) {
              const live = await syncLeadStatus(card.id, pipelineStage);
              if (live) {
                setCard(live);
                notify(`Status set to ${pipelineStage}`);
                return;
              }
            }
            const updated = updateLead(card.id, { pipelineStage });
            if (updated) {
              setCard(updated);
              notify(`Status set to ${pipelineStage}`);
            }
          })();
        }}
        onStartCall={() => notify("Starting call…")}
        onReschedule={() => notify("Reschedule next action…")}
      />

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
          void (async () => {
            const name = `${values.firstName} ${values.lastName}`.trim();
            let statusOpt: LeadStatus | undefined;
            if (
              (LEAD_STATUS_OPTIONS as readonly string[]).includes(values.status)
            ) {
              statusOpt = values.status as LeadStatus;
            }
            if (isUuid(card.id)) {
              try {
                const live = await updateCrmLead(card.id, {
                  firstName: values.firstName,
                  lastName: values.lastName,
                  email: values.email,
                  phone: values.phone,
                  companyName: values.companyName,
                  jobTitle: values.jobTitle,
                });
                if (live) {
                  let mapped = mapCrmLeadToCard(live);
                  if (values.status && !statusOpt) {
                    const moved = await syncLeadStatus(card.id, values.status);
                    if (moved) mapped = moved;
                  }
                  setCard(mapped);
                  upsertLeadFromCard(mapped);
                  notify("Lead saved");
                  setIsEditOpen(false);
                  return;
                }
              } catch (err) {
                notify(err instanceof Error ? err.message : "Save failed");
                return;
              }
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
          })();
        }}
      />
    </div>
  );
}
