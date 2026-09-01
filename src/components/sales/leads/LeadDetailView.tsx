"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useModuleBack } from "@/hooks/useModuleBack";
import { LeadCardData, type LeadStatus } from "@/lib/leads/types";
import { logCreate, logEdit } from "@/lib/rules";
import { emitRulesChange } from "@/lib/rules/storage";
import {
  cloneLead,
  deleteLead,
  updateLead,
  upsertLeadFromCard,
} from "@/lib/leads/store";
import { convertCrmLead, createCrmDeal, syncLeadStatus, updateCrmLead } from "@/lib/leads/api";
import { mapCrmLeadToCard } from "@/lib/leads/api/map";
import { isUuid } from "@/lib/activity-timeline/auth";
import { leadSendHref } from "@/lib/leads/convert-actions";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";
import type { LeadMoreAction } from "@/components/sales/leads/LeadMoreMenu";
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
  const back = useModuleBack("/sales/leads", "Back to Leads");
  const [card, setCard] = useState(initial);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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
    convertLocally(values);
  }

  function handleMoreAction(action: LeadMoreAction) {
    if (action === "clone") {
      const copy = cloneLead(card.id);
      if (!copy) return;
      emitRulesChange("all");
      notify(`Cloned ${copy.name}`);
      router.push(`/sales/leads/detail/${encodeURIComponent(copy.id)}`);
      return;
    }
    if (action === "share") {
      void navigator.clipboard.writeText(window.location.href);
      notify("Lead link copied");
      return;
    }
    if (action === "print") {
      window.print();
      return;
    }
    if (action === "export") {
      const rows = [
        ["Name", "Email", "Phone", "Company", "Owner", "Source", "Stage", "Tags"],
        [
          card.name,
          card.email,
          card.phone,
          card.company,
          card.owner,
          card.source,
          card.pipelineStage ?? "",
          (card.tags ?? []).join("; "),
        ],
      ];
      const csv = rows
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${card.name.replace(/\s+/g, "-").toLowerCase()}-lead.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify("Lead exported");
      return;
    }
    if (action === "meet-now") {
      router.push(
        leadSendHref("/activities/meetings/create", card),
      );
      return;
    }
    if (action === "delete") {
      if (!window.confirm(`Delete ${card.name}? This cannot be undone.`)) return;
      deleteLead(card.id);
      emitRulesChange("all");
      notify("Lead deleted");
      router.push(back.href);
      return;
    }
    if (action === "archive") {
      const updated = updateLead(card.id, { archived: true });
      if (updated) setCard(updated);
      emitRulesChange("all");
      notify("Lead archived");
      return;
    }
    if (action === "history") {
      setHistoryOpen(true);
    }
  }

  function convertLocally(values: ConvertToDealFormValues) {
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
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[1920px] flex-col overflow-hidden px-3 py-3 lg:px-5">
      {flash ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">
          {flash}
        </div>
      ) : null}

      <LeadMortgageDetail
        card={card}
        backHref={back.href}
        backLabel={back.label}
        onCall={() => undefined}
        onEmail={() => setIsComposeOpen(true)}
        onConvert={() => setIsConvertOpen(true)}
        onEdit={() => setIsEditOpen(true)}
        onMoreAction={handleMoreAction}
        onTagsChange={(tags) => {
          const updated = updateLead(card.id, { tags });
          if (updated) setCard(updated);
        }}
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
        onLeadPatch={(patch) => {
          const updated = updateLead(card.id, patch);
          if (updated) {
            setCard(updated);
            notify("Lead field saved");
            return;
          }
          setCard((current) => ({
            ...current,
            ...patch,
            custom: { ...(current.custom ?? {}), ...(patch.custom ?? {}) },
          }));
        }}
        onStartCall={() => undefined}
        onReschedule={() => notify("Reschedule next action…")}
        onComplete={() => notify("Next action marked completed")}
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
            const to = values.toList?.length
              ? values.toList
              : values.to
                ? values.to.split(/[,;]+/).map((part) => part.trim()).filter(Boolean)
                : [card.email];
            if (values.sendAt) {
              createEmail({
                subject: values.subject || "(no subject)",
                body: values.body || "",
                from: "noreply@finconnex.demo",
                to,
                cc: values.ccList,
                bcc: values.bccList,
                status: "Scheduled",
                sentDate: values.sendAt,
                relatedTo: `Lead: ${card.name}`,
              });
              setIsComposeOpen(false);
              notify("Email scheduled");
              return;
            }
            const result = await sendEmailDemoLive({
              email: to[0],
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
              to,
              cc: values.ccList,
              bcc: values.bccList,
              status: "Sent",
              sentDate: formatRulesAt(),
              relatedTo: `Lead: ${card.name}`,
            });
            setIsComposeOpen(false);
            notify(
              to.length > 1
                ? `Email sent to ${to.length} recipients`
                : "Email sent via demo gateway",
            );
          })();
        }}
      />

      {historyOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-slate-900">
                Change history
              </h2>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-md px-2 py-1 text-[12px] font-medium text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <RecordAuditHistory module="sales.leads" recordId={card.id} />
          </div>
        </div>
      ) : null}

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
