import type { MortgagePipelineStage } from "@/lib/pipeline-sla/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import {
  PIPELINE_STAGE_DOT,
  pipelineStageToLeadStatus,
  stageColumnId,
} from "@/lib/pipeline-sla/board";

export const LEAD_SOURCES = [
  "Website",
  "Google Ads",
  "Facebook",
  "Instagram",
  "TikTok",
  "Google",
  "Existing Client Referral",
  "Referral Partner",
  "Employee Referral",
  "Phone",
  "Event / Seminar",
  "Imported / Manual",
  "Other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

const LEGACY_LEAD_SOURCES: Record<string, LeadSource> = {
  referral: "Existing Client Referral",
  "social media": "Facebook",
  "email campaign": "Other",
  "cold call": "Phone",
};

export function coerceLeadSource(
  value: string | null | undefined,
): LeadSource {
  const raw = value?.trim() ?? "";
  if (!raw) return "Website";
  const hit = LEAD_SOURCES.find((s) => s.toLowerCase() === raw.toLowerCase());
  if (hit) return hit;
  return LEGACY_LEAD_SOURCES[raw.toLowerCase()] ?? "Other";
}

export const LOAN_PURPOSES = [
  "Purchase",
  "Refinance",
  "Investment",
] as const;
export type LoanPurpose = (typeof LOAN_PURPOSES)[number];

/** SRS §6.1 Status* — still used as CRM bridge; Kanban columns are mortgage stages (Session 17). */
export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Unqualified",
  "Converted",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Session 17 — filter / board column titles = mortgage pipeline stages. */
export const LEAD_PIPELINE_STAGES = MORTGAGE_PIPELINE_STAGES;
export type LeadPipelineStage = MortgagePipelineStage;

export interface LeadRecord {
  id: string;
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: string;
  jobTitle?: string;
  source: LeadSource;
  status: LeadStatus;
  owner: string;
  createdDate: string;
  notes?: string;
  productInterest?: string;
  budgetRange?: string;
  estimatedValue?: string;
  /** Spec §4 example field — shown when selected in Lead Card settings. */
  tags?: string[];
  pipelineStage?: string;
  stageEnteredAt?: string;
  pipelineStartedAt?: string;
  /** Values keyed by Custom Field `key` (not `cf:` prefix). */
  custom?: Record<string, string>;
  initials: string;
  accentColorClass: string;
  avatarBgClass: string;
}

/** Kanban card shape (SRS: Name, Company, Email, Phone, Owner, Created Date) */
export interface LeadCardData {
  id: string;
  name: string;
  initials: string;
  company: string;
  email: string;
  phone: string;
  owner: string;
  /** CRM workspace member UUID when loaded from the live API. */
  ownerId?: string;
  /** Linked CRM company UUID. */
  companyId?: string;
  leadNumber?: number | null;
  jobTitle?: string;
  industry?: string;
  companyWebsite?: string;
  companySize?: string;
  mobilePhone?: string;
  department?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  notes?: string;
  description?: string;
  productInterest?: string;
  budgetRange?: string;
  city?: string;
  state?: string;
  country?: string;
  street?: string;
  postalCode?: string;
  modifiedDate?: string;
  lifecycleStage?: string;
  rating?: string;
  score?: number;
  createdDate: string;
  source: LeadSource;
  estimatedValue?: string;
  /** Spec §4 example field — shown when selected in Lead Card settings. */
  tags?: string[];
  followerIds?: string[];
  /**
   * Session 16 — mortgage pipeline stage for SLA (optional override).
   * When omitted, derived from Kanban LeadStatus.
   */
  pipelineStage?: string;
  /** ISO or flexible date — when current pipeline stage was entered. */
  stageEnteredAt?: string;
  /** Pipeline start (New Lead) timestamp for milestone clocks. */
  pipelineStartedAt?: string;
  /** Values keyed by Custom Field `key` (not `cf:` prefix). */
  custom?: Record<string, string>;
  /** PDF §3.1 conversion metadata */
  isConverted?: boolean;
  convertedAt?: string;
  convertedContactId?: string;
  convertedDealId?: string;
  convertedCompanyId?: string;
  archived?: boolean;
  nextBest?: {
    kind: string;
    id: string;
    title: string;
    at: string;
    priority?: string;
  } | null;
  redFlags?: Array<{ code: string; label: string }>;
  sla?: {
    badgeBand?: string;
    badgeLabel?: string;
    detail?: string;
  } | null;
  accentColorClass: string;
  avatarBgClass: string;
}

export interface KanbanColumn {
  id: string;
  /** Mortgage pipeline stage (Session 17 Kanban column). */
  title: LeadPipelineStage;
  /** Bridged CRM LeadStatus for forms / legacy APIs. */
  leadStatus: LeadStatus;
  dotColorClass: string;
  leadCount: number;
  totalAmount: string;
  cards: LeadCardData[];
}

function emptyStageColumn(
  stage: LeadPipelineStage,
  totalAmount = "$0",
): KanbanColumn {
  return {
    id: stageColumnId(stage),
    title: stage,
    leadStatus: pipelineStageToLeadStatus(stage),
    dotColorClass: PIPELINE_STAGE_DOT[stage],
    leadCount: 0,
    totalAmount,
    cards: [],
  };
}

export function findLeadCardById(id: string): LeadCardData | undefined {
  for (const column of LEAD_COLUMNS) {
    const card = column.cards.find((c) => c.id === id);
    if (card) return card;
  }
  return undefined;
}

/** Session 17 — Kanban columns = mortgage pipeline stages (PDF). */
export const LEAD_COLUMNS: KanbanColumn[] = [
  {
    ...emptyStageColumn("New Lead", "$4,50,000"),
    leadCount: 1,
    cards: [],
  },
  emptyStageColumn("Appointment Booked"),
  emptyStageColumn("Appointment Missed"),
  {
    ...emptyStageColumn("In Conversation", "$11,10,000"),
    leadCount: 4,
    cards: [],
  },
  emptyStageColumn("Hold"),
  emptyStageColumn("No Answer"),
  {
    ...emptyStageColumn("Waiting on Docs", "$9,80,000"),
    leadCount: 3,
    cards: [],
  },
  {
    ...emptyStageColumn("Document Received", "$2,80,000"),
    leadCount: 1,
    cards: [],
  },
  emptyStageColumn("Findings"),
  emptyStageColumn("Research & Servicing"),
  emptyStageColumn("Servicing Completed"),
  emptyStageColumn("Loan Proposal Presented"),
  emptyStageColumn("Future Potential Clients"),
  {
    ...emptyStageColumn("Closed Won", "$5,70,000"),
    leadCount: 2,
    cards: [],
  },
  {
    ...emptyStageColumn("Closed Lost", "$3,70,000"),
    leadCount: 2,
    cards: [],
  },
];

export const OWNERS: readonly string[] = [];
