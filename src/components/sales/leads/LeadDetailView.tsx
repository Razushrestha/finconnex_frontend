"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LeadCardData, type LeadStatus } from "@/lib/leads/types";
import { logCreate, logEdit } from "@/lib/rules";
import { emitRulesChange } from "@/lib/rules/storage";
import { updateLead } from "@/lib/leads/store";
import {
  assignCrmLeadOwner,
  changeCrmLeadLifecycleStage,
  changeCrmLeadRating,
  changeCrmLeadScore,
  convertCrmLead,
  createCrmDeal,
  linkCrmLeadCompany,
  softDeleteCrmLead,
  syncLeadStatus,
  unassignCrmLeadOwner,
  unlinkCrmLeadCompany,
  updateCrmLead,
} from "@/lib/leads/api";
import { asHttpUrl, mapCrmLeadToCard } from "@/lib/leads/api/map";
import { isUuid } from "@/lib/activity-timeline/auth";
import { deleteLead, upsertLeadFromCard } from "@/lib/leads/store";
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

const LIFECYCLE_STAGES = [
  "SUBSCRIBER",
  "LEAD",
  "MQL",
  "SQL",
  "OPPORTUNITY",
  "CUSTOMER",
] as const;

const RATINGS = ["HOT", "WARM", "COLD"] as const;

export function LeadDetailView({ card: initial }: { card: LeadCardData }) {
  const router = useRouter();
  const [card, setCard] = useState(initial);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  function applyLive(live: ReturnType<typeof mapCrmLeadToCard>) {
    setCard(live);
    upsertLeadFromCard(live);
    return live;
  }

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
        onMore={() => setIsMoreOpen((open) => !open)}
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

      {isMoreOpen ? (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[12px] font-bold tracking-wide text-slate-700 uppercase">
              CRM actions
            </h3>
            <button
              type="button"
              onClick={() => setIsMoreOpen(false)}
              className="text-[11px] font-semibold text-slate-500"
            >
              Close
            </button>
          </div>
          <p className="mb-3 text-[11px] text-slate-500">
            {card.lifecycleStage ? `Lifecycle ${card.lifecycleStage}` : "No lifecycle"}
            {card.rating ? ` · ${card.rating}` : ""}
            {typeof card.score === "number" ? ` · Score ${card.score}` : ""}
            {card.ownerId ? ` · Owner ${card.ownerId.slice(0, 8)}…` : " · Unassigned"}
            {card.companyId ? ` · Company linked` : " · No company"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              onClick={() => {
                void (async () => {
                  const ownerId = window.prompt("Assign owner — workspace member UUID");
                  if (!ownerId?.trim() || !isUuid(card.id)) return;
                  try {
                    const live = await assignCrmLeadOwner(card.id, ownerId.trim());
                    if (live) applyLive(mapCrmLeadToCard(live));
                    notify("Owner assigned");
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "Owner assign failed");
                  }
                })();
              }}
            >
              Assign owner
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              onClick={() => {
                void (async () => {
                  if (!isUuid(card.id)) return;
                  try {
                    const live = await unassignCrmLeadOwner(card.id);
                    if (live) applyLive(mapCrmLeadToCard(live));
                    notify("Owner removed");
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "Unassign failed");
                  }
                })();
              }}
            >
              Unassign owner
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              onClick={() => {
                void (async () => {
                  const companyId = window.prompt("Link company — workspace company UUID");
                  if (!companyId?.trim() || !isUuid(card.id)) return;
                  try {
                    const live = await linkCrmLeadCompany(card.id, companyId.trim());
                    if (live) applyLive(mapCrmLeadToCard(live));
                    notify("Company linked");
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "Link failed");
                  }
                })();
              }}
            >
              Link company
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              onClick={() => {
                void (async () => {
                  if (!isUuid(card.id)) return;
                  try {
                    const live = await unlinkCrmLeadCompany(card.id);
                    if (live) applyLive(mapCrmLeadToCard(live));
                    notify("Company unlinked");
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "Unlink failed");
                  }
                })();
              }}
            >
              Unlink company
            </button>
            {LIFECYCLE_STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                onClick={() => {
                  void (async () => {
                    if (!isUuid(card.id)) return;
                    try {
                      const live = await changeCrmLeadLifecycleStage(card.id, stage);
                      if (live) applyLive(mapCrmLeadToCard(live));
                      notify(`Lifecycle ${stage}`);
                    } catch (err) {
                      notify(err instanceof Error ? err.message : "Lifecycle failed");
                    }
                  })();
                }}
              >
                {stage}
              </button>
            ))}
            {RATINGS.map((rating) => (
              <button
                key={rating}
                type="button"
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                onClick={() => {
                  void (async () => {
                    if (!isUuid(card.id)) return;
                    try {
                      const live = await changeCrmLeadRating(card.id, rating);
                      if (live) applyLive(mapCrmLeadToCard(live));
                      notify(`Rating ${rating}`);
                    } catch (err) {
                      notify(err instanceof Error ? err.message : "Rating failed");
                    }
                  })();
                }}
              >
                {rating}
              </button>
            ))}
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              onClick={() => {
                void (async () => {
                  if (!isUuid(card.id)) return;
                  try {
                    const live = await changeCrmLeadRating(card.id, null);
                    if (live) applyLive(mapCrmLeadToCard(live));
                    notify("Rating cleared");
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "Clear rating failed");
                  }
                })();
              }}
            >
              Clear rating
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
              onClick={() => {
                void (async () => {
                  const raw = window.prompt("Lead score (0–100)", String(card.score ?? 50));
                  if (raw == null || !isUuid(card.id)) return;
                  const score = Number(raw);
                  if (!Number.isFinite(score)) {
                    notify("Enter a number");
                    return;
                  }
                  try {
                    const live = await changeCrmLeadScore(card.id, score);
                    if (live) applyLive(mapCrmLeadToCard(live));
                    notify(`Score ${score}`);
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "Score failed");
                  }
                })();
              }}
            >
              Set score
            </button>
            <button
              type="button"
              className="rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600"
              onClick={() => {
                void (async () => {
                  if (!window.confirm(`Delete ${card.name}?`)) return;
                  deleteLead(card.id);
                  if (isUuid(card.id)) {
                    try {
                      await softDeleteCrmLead(card.id);
                    } catch (err) {
                      notify(err instanceof Error ? err.message : "Delete failed");
                      return;
                    }
                  }
                  router.push("/sales/leads");
                })();
              }}
            >
              Delete lead
            </button>
          </div>
        </div>
      ) : null}

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
          linkedinUrl: card.linkedinUrl ?? "",
          companyName: card.company,
          jobTitle: card.jobTitle ?? "",
          website: card.companyWebsite ?? card.websiteUrl ?? "",
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
                  linkedinUrl: asHttpUrl(values.linkedinUrl),
                  companyWebsite: asHttpUrl(values.website),
                  websiteUrl: asHttpUrl(values.website),
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
              jobTitle: values.jobTitle,
              companyWebsite: values.website,
              linkedinUrl: values.linkedinUrl,
              websiteUrl: values.website,
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
