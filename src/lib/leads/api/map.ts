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
  CrmCompanySize,
  CrmCreateLeadInput,
  CrmLead,
  CrmLeadKanbanColumn,
  CrmLeadSource,
  CrmLeadStatus,
} from "@/lib/leads/api/types";
import { CRM_COMPANY_SIZES } from "@/lib/leads/api/types";

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
      return "Waiting on Docs";
    case "NURTURE":
      return "Document Received";
    case "CONVERTED":
      return "Closed Won";
    case "UNQUALIFIED":
    case "LOST":
      return "Closed Lost";
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
    case "Waiting on Docs":
    case "Processing":
      return "QUALIFIED";
    case "Documents Received":
    case "Document Received":
      return "NURTURE";
    case "Settled":
    case "Closed Won":
      return "CONVERTED";
    case "Lost":
    case "Closed Lost":
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

export const CRM_COMPANY_SIZE_LABELS: Record<CrmCompanySize, string> = {
  MICRO: "1–9",
  SMALL: "10–49",
  MEDIUM: "50–249",
  LARGE: "250–999",
  ENTERPRISE: "1,000+",
};

export function uiCompanySizeToCrm(
  value: string | undefined,
): CrmCompanySize | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const upper = raw.toUpperCase().replace(/[\s,]/g, "");
  if ((CRM_COMPANY_SIZES as readonly string[]).includes(upper)) {
    return upper as CrmCompanySize;
  }
  const labeled = (Object.entries(CRM_COMPANY_SIZE_LABELS) as Array<
    [CrmCompanySize, string]
  >).find(([, label]) => label === raw);
  if (labeled) return labeled[0];
  if (/^1[-–—]9$/.test(raw)) return "MICRO";
  const compact = raw.toLowerCase().replace(/[\s–—,-]/g, "");
  if (compact.includes("enterprise") || compact.includes("1000")) {
    return "ENTERPRISE";
  }
  if (compact.includes("large") || compact.includes("250")) return "LARGE";
  if (compact.includes("medium") || compact.includes("50")) return "MEDIUM";
  if (compact.includes("small") || compact.includes("10") || compact.includes("11")) {
    return "SMALL";
  }
  if (compact.includes("micro") || compact.includes("1–9") || /^[1-9]$/.test(compact)) {
    return "MICRO";
  }
  return undefined;
}

export function crmCompanySizeToUi(
  value: string | null | undefined,
): string | undefined {
  if (!value) return undefined;
  const key = value.toUpperCase() as CrmCompanySize;
  return CRM_COMPANY_SIZE_LABELS[key] ?? value;
}

function opt(value: string | null | undefined): string | undefined {
  const t = value?.trim();
  return t || undefined;
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
    leadNumber: lead.leadNumber ?? undefined,
    jobTitle: opt(lead.jobTitle),
    industry: opt(lead.industry),
    companyWebsite: opt(lead.companyWebsite) ?? opt(lead.websiteUrl),
    companySize: crmCompanySizeToUi(lead.companySize),
    mobilePhone: opt(lead.mobilePhone),
    department: opt(lead.department),
    linkedinUrl: opt(lead.linkedinUrl),
    websiteUrl: opt(lead.websiteUrl),
    notes: opt(lead.notes),
    description: opt(lead.description),
    productInterest: opt(lead.productInterest),
    budgetRange: opt(lead.budgetRange),
    city: opt(lead.city),
    state: opt(lead.state),
    country: opt(lead.country),
    street: opt(lead.street),
    postalCode: opt(lead.postalCode),
    modifiedDate: formatCreated(lead.updatedAt),
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
  mobilePhone?: string;
  company?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  source?: LeadSource;
  productInterest?: string;
  budgetRange?: string;
  estimatedValue?: string;
  notes?: string;
  description?: string;
  ownerId?: string;
}): CrmCreateLeadInput {
  const website = asHttpUrl(input.companyWebsite) ?? asHttpUrl(input.websiteUrl);
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone?.trim() || undefined,
    mobilePhone: input.mobilePhone?.trim() || undefined,
    jobTitle: input.jobTitle?.trim() || undefined,
    linkedinUrl: asHttpUrl(input.linkedinUrl),
    websiteUrl: website,
    companyName: input.company?.trim() || undefined,
    companyWebsite: website,
    industry: input.industry?.trim() || undefined,
    companySize: uiCompanySizeToCrm(input.companySize),
    source: input.source ? uiSourceToCrm(input.source) : undefined,
    productInterest: input.productInterest?.trim() || undefined,
    budgetRange: input.budgetRange?.trim() || undefined,
    estimatedValue: parseEstimatedValue(input.estimatedValue),
    notes: input.notes?.trim() || undefined,
    description: input.description?.trim() || undefined,
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
