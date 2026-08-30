import type { LeadCardData, LeadSource, LeadStatus } from "@/lib/leads/types";
import {
  PIPELINE_STAGE_DOT,
  pipelineStageToLeadStatus,
  stageColumnId,
} from "@/lib/pipeline-sla/board";
import { formatPipelineTimestamp } from "@/lib/pipeline-sla/ui";
import type { MortgagePipelineStage } from "@/lib/pipeline-sla/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import type { KanbanColumn } from "@/lib/leads/types";
import type {
  CrmCreateLeadInput,
  CrmLead,
  CrmLeadKanbanColumn,
  CrmLeadSource,
  CrmLeadStatus,
} from "@/lib/leads/api/types";

const AVATAR_COLORS = [
  "bg-amber-50 text-amber-600",
  "bg-pink-50 text-pink-600",
  "bg-teal-50 text-teal-600",
  "bg-blue-50 text-blue-600",
  "bg-indigo-50 text-indigo-600",
  "bg-violet-50 text-violet-600",
  "bg-emerald-50 text-emerald-600",
  "bg-rose-50 text-rose-600",
];

export function uiStatusToCrm(status: LeadStatus): CrmLeadStatus {
  switch (status) {
    case "Contacted":
      return "CONTACTED";
    case "Qualified":
      return "QUALIFIED";
    case "Unqualified":
      return "UNQUALIFIED";
    case "Converted":
      return "CONVERTED";
    default:
      return "NEW";
  }
}

export function crmStatusToUi(status: string): LeadStatus {
  switch (status) {
    case "CONTACTED":
    case "IN_PROGRESS":
      return "Contacted";
    case "QUALIFIED":
    case "NURTURE":
      return "Qualified";
    case "UNQUALIFIED":
    case "LOST":
      return "Unqualified";
    case "CONVERTED":
      return "Converted";
    default:
      return "New";
  }
}

export function crmStatusToPipelineStage(status: string): MortgagePipelineStage {
  switch (status) {
    case "IN_PROGRESS":
      return "Appointment Booked";
    case "CONTACTED":
      return "In Conversation";
    case "QUALIFIED":
      return "Waiting on Documents";
    case "NURTURE":
      return "Documents Received";
    case "CONVERTED":
      return "Settled";
    case "UNQUALIFIED":
    case "LOST":
      return "Lost";
    default:
      return "New Lead";
  }
}

export function pipelineStageToCrmStatus(stage: string): CrmLeadStatus {
  switch (stage) {
    case "Appointment Booked":
      return "IN_PROGRESS";
    case "In Conversation":
      return "CONTACTED";
    case "Waiting on Documents":
    case "Processing":
      return "QUALIFIED";
    case "Documents Received":
      return "NURTURE";
    case "Settled":
      return "CONVERTED";
    case "Lost":
      return "LOST";
    default:
      return "NEW";
  }
}

export function uiSourceToCrm(source: LeadSource): CrmLeadSource {
  switch (source) {
    case "Referral":
      return "REFERRAL";
    case "Social Media":
      return "SOCIAL_MEDIA";
    case "Email Campaign":
      return "EMAIL_CAMPAIGN";
    case "Cold Call":
      return "COLD_CALL";
    default:
      return source === "Website" ? "WEBSITE" : "OTHER";
  }
}

export function crmSourceToUi(source: string | null | undefined): LeadSource {
  switch (source) {
    case "REFERRAL":
      return "Referral";
    case "SOCIAL_MEDIA":
      return "Social Media";
    case "EMAIL_CAMPAIGN":
      return "Email Campaign";
    case "COLD_CALL":
      return "Cold Call";
    case "WEBSITE":
      return "Website";
    default:
      return "Other";
  }
}

function hashIndex(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return h;
}

function formatCreated(value?: string) {
  if (!value) return formatPipelineTimestamp(new Date()).split(",")[0] ?? "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatEstimatedValue(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return value.startsWith("$") ? value : `$${value}`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function parseEstimatedValue(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return undefined;
  return n.toFixed(2);
}

export function asHttpUrl(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes(".")) return `https://${raw}`;
  return undefined;
}

export function mapCrmLeadToCard(lead: CrmLead): LeadCardData {
  const stage = crmStatusToPipelineStage(lead.status);
  const first = lead.firstName?.trim() || "";
  const last = lead.lastName?.trim() || "";
  const name = `${first} ${last}`.trim() || lead.email;
  const enteredAt = formatPipelineTimestamp(
    lead.updatedAt ? new Date(lead.updatedAt) : new Date(),
  );
  const created = formatCreated(lead.createdAt);
  return {
    id: lead.id,
    name,
    initials: `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "LD",
    company: lead.companyName?.trim() || "",
    email: lead.email,
    phone: lead.phone?.trim() || lead.mobilePhone?.trim() || "",
    owner: lead.ownerId ?? "Unassigned",
    ownerId: lead.ownerId ?? undefined,
    companyId: lead.companyId ?? undefined,
    lifecycleStage: lead.lifecycleStage ?? undefined,
    rating: lead.rating ?? undefined,
    score: typeof lead.score === "number" ? lead.score : undefined,
    createdDate: created,
    source: crmSourceToUi(lead.source),
    estimatedValue: formatEstimatedValue(lead.estimatedValue),
    pipelineStage: stage,
    stageEnteredAt: enteredAt,
    pipelineStartedAt: created,
    isConverted: lead.isConverted,
    convertedAt: lead.convertedAt ?? undefined,
    convertedContactId: lead.convertedContactId ?? undefined,
    convertedDealId: lead.convertedDealId ?? undefined,
    convertedCompanyId: lead.convertedCompanyId ?? undefined,
    accentColorClass: PIPELINE_STAGE_DOT[stage],
    avatarBgClass: AVATAR_COLORS[hashIndex(lead.id)],
  };
}

export function kanbanColumnsToBoard(
  columns: CrmLeadKanbanColumn[],
): KanbanColumn[] {
  const byStage = new Map<MortgagePipelineStage, LeadCardData[]>();
  for (const col of columns) {
    const stage = crmStatusToPipelineStage(col.status);
    const cards = (col.records ?? []).map(mapCrmLeadToCard);
    byStage.set(stage, [...(byStage.get(stage) ?? []), ...cards]);
  }

  return MORTGAGE_PIPELINE_STAGES.map((stage) => {
    const cards = byStage.get(stage) ?? [];
    const total = cards.reduce((sum, card) => {
      const n = Number((card.estimatedValue ?? "").replace(/[^0-9.]/g, ""));
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    return {
      id: stageColumnId(stage),
      title: stage,
      leadStatus: pipelineStageToLeadStatus(stage),
      dotColorClass: PIPELINE_STAGE_DOT[stage],
      leadCount: cards.length,
      totalAmount: formatEstimatedValue(String(total)) ?? "$0",
      cards,
    };
  });
}

export function toCrmCreateBody(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  companyWebsite?: string;
  industry?: string;
  jobTitle?: string;
  source?: LeadSource;
  productInterest?: string;
  budgetRange?: string;
  estimatedValue?: string;
  notes?: string;
  ownerId?: string;
}): CrmCreateLeadInput {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone?.trim() || undefined,
    jobTitle: input.jobTitle?.trim() || undefined,
    companyName: input.company?.trim() || undefined,
    companyWebsite: asHttpUrl(input.companyWebsite),
    industry: input.industry?.trim() || undefined,
    source: input.source ? uiSourceToCrm(input.source) : undefined,
    productInterest: input.productInterest?.trim() || undefined,
    budgetRange: input.budgetRange?.trim() || undefined,
    estimatedValue: parseEstimatedValue(input.estimatedValue),
    notes: input.notes?.trim() || undefined,
    ownerId: input.ownerId,
  };
}

export function uiDealStageToCrm(stage: string): string {
  const key = stage.toLowerCase();
  if (key.includes("propos")) return "PROPOSAL";
  if (key.includes("negot")) return "NEGOTIATION";
  if (key.includes("won")) return "CLOSED_WON";
  if (key.includes("lost")) return "CLOSED_LOST";
  if (key.includes("qualif")) return "QUALIFICATION";
  return "PROSPECTING";
}
