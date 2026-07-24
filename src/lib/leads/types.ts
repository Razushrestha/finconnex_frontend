import type { MortgagePipelineStage } from "@/lib/pipeline-sla/types";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";
import {
  PIPELINE_STAGE_DOT,
  pipelineStageToLeadStatus,
  stageColumnId,
} from "@/lib/pipeline-sla/board";

export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Email Campaign",
  "Cold Call",
  "Other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

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
  createdDate: string;
  source: LeadSource;
  estimatedValue?: string;
  /** Spec §4 example field — shown when selected in Lead Card settings. */
  tags?: string[];
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

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function toCard(
  lead: Omit<LeadRecord, "initials" | "accentColorClass" | "avatarBgClass"> & {
    accentColorClass: string;
    avatarIndex: number;
  },
): LeadCardData {
  return {
    id: lead.id,
    name: `${lead.firstName} ${lead.lastName}`,
    initials: initials(lead.firstName, lead.lastName),
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    owner: lead.owner,
    createdDate: lead.createdDate,
    source: lead.source,
    estimatedValue: lead.estimatedValue,
    tags: lead.tags,
    pipelineStage: lead.pipelineStage,
    stageEnteredAt: lead.stageEnteredAt,
    pipelineStartedAt: lead.pipelineStartedAt,
    custom: lead.custom,
    accentColorClass: lead.accentColorClass,
    avatarBgClass: AVATAR_COLORS[lead.avatarIndex % AVATAR_COLORS.length],
  };
}

/** Session 17 — Kanban columns = mortgage pipeline stages (PDF). */
export const LEAD_COLUMNS: KanbanColumn[] = [
  {
    ...emptyStageColumn("New Lead", "$4,50,000"),
    leadCount: 1,
    cards: [
      toCard({
        id: "l-nl1",
        leadId: "L-000",
        firstName: "Jamie",
        lastName: "Cole",
        email: "jamie.cole@example.com",
        phone: "+61 400 100 000",
        company: "Cole Homes",
        source: "Website",
        status: "New",
        owner: "John Smith",
        createdDate: "23/07/2026",
        estimatedValue: "$4,50,000",
        tags: ["First Home"],
        pipelineStage: "New Lead",
        // Fixed demo clock 23/07/2026 12:00 → 15 mins into 30-min stage SLA
        stageEnteredAt: "23/07/2026 11:45 AM",
        pipelineStartedAt: "23/07/2026 11:45 AM",
        accentColorClass: PIPELINE_STAGE_DOT["New Lead"],
        avatarIndex: 0,
      }),
    ],
  },
  emptyStageColumn("Appointment Booked"),
  {
    ...emptyStageColumn("In Conversation", "$11,10,000"),
    leadCount: 4,
    cards: [
      toCard({
        id: "l-n1",
        leadId: "L-001",
        firstName: "William",
        lastName: "Anderson",
        email: "william.a@example.com",
        phone: "+61 400 111 001",
        company: "Anderson Finance",
        source: "Website",
        status: "Contacted",
        owner: "John Smith",
        createdDate: "23/07/2026",
        estimatedValue: "$3,50,000",
        tags: ["Refinance", "Hot"],
        pipelineStage: "In Conversation",
        stageEnteredAt: "19/07/2026 12:00 PM",
        pipelineStartedAt: "16/07/2026 12:00 PM",
        custom: {
          leadScore: "86",
          referralSource: "Website",
          preferredBranch: "Sydney CBD",
        },
        accentColorClass: PIPELINE_STAGE_DOT["In Conversation"],
        avatarIndex: 0,
      }),
      toCard({
        id: "l-n3",
        leadId: "L-003",
        firstName: "Arjun",
        lastName: "Mehta",
        email: "arjun.m@example.com",
        phone: "+61 400 111 003",
        company: "Mehta Advisors",
        source: "Cold Call",
        status: "Contacted",
        owner: "Tejas Gokhe",
        createdDate: "10/07/2026",
        estimatedValue: "$2,60,000",
        pipelineStage: "In Conversation",
        stageEnteredAt: "20/07/2026 09:00 AM",
        pipelineStartedAt: "01/07/2026 09:00 AM",
        accentColorClass: PIPELINE_STAGE_DOT["In Conversation"],
        avatarIndex: 2,
      }),
      toCard({
        id: "l-c1",
        leadId: "L-004",
        firstName: "Katherina",
        lastName: "Brooks",
        email: "k.brooks@example.com",
        phone: "+61 400 222 001",
        company: "Blue Sky Media",
        source: "Email Campaign",
        status: "Contacted",
        owner: "Roshna Abraham",
        createdDate: "15/07/2026",
        estimatedValue: "$1,90,000",
        pipelineStage: "In Conversation",
        stageEnteredAt: "15/07/2026 10:00 AM",
        pipelineStartedAt: "14/07/2026 10:00 AM",
        accentColorClass: PIPELINE_STAGE_DOT["In Conversation"],
        avatarIndex: 3,
      }),
      toCard({
        id: "l-c3",
        leadId: "L-006",
        firstName: "Amit",
        lastName: "Verma",
        email: "amit.v@example.com",
        phone: "+61 400 222 003",
        company: "Coastal Star Logistics",
        source: "Website",
        status: "Contacted",
        owner: "Shiva Kadhka",
        createdDate: "17/07/2026",
        estimatedValue: "$4,10,000",
        pipelineStage: "In Conversation",
        stageEnteredAt: "17/07/2026 09:00 AM",
        pipelineStartedAt: "16/07/2026 09:00 AM",
        accentColorClass: PIPELINE_STAGE_DOT["In Conversation"],
        avatarIndex: 5,
      }),
    ],
  },
  {
    ...emptyStageColumn("Waiting on Documents", "$9,80,000"),
    leadCount: 3,
    cards: [
      toCard({
        id: "l-n2",
        leadId: "L-002",
        firstName: "Chloe",
        lastName: "Ramirez",
        email: "chloe.r@example.com",
        phone: "+61 400 111 002",
        company: "Riverstone Capital",
        source: "Referral",
        status: "Qualified",
        owner: "Shiva Kadhka",
        createdDate: "13/07/2026",
        estimatedValue: "$2,10,000",
        tags: ["Partner", "Priority"],
        pipelineStage: "Waiting on Documents",
        stageEnteredAt: "20/07/2026 10:00 AM",
        pipelineStartedAt: "13/07/2026 12:00 PM",
        custom: {
          leadScore: "72",
          referralSource: "Partner",
        },
        accentColorClass: PIPELINE_STAGE_DOT["Waiting on Documents"],
        avatarIndex: 1,
      }),
      toCard({
        id: "l-c2",
        leadId: "L-005",
        firstName: "Jennifer",
        lastName: "Adams",
        email: "j.adams@example.com",
        phone: "+61 400 222 002",
        company: "Adams Group",
        source: "Social Media",
        status: "Qualified",
        owner: "John Smith",
        createdDate: "16/07/2026",
        estimatedValue: "$3,50,000",
        pipelineStage: "Waiting on Documents",
        stageEnteredAt: "01/07/2026 10:00 AM",
        pipelineStartedAt: "20/06/2026 10:00 AM",
        accentColorClass: PIPELINE_STAGE_DOT["Waiting on Documents"],
        avatarIndex: 4,
      }),
      toCard({
        id: "l-q1",
        leadId: "L-007",
        firstName: "Elizabeth",
        lastName: "Morgan",
        email: "e.morgan@example.com",
        phone: "+61 400 333 001",
        company: "Novawave Systems",
        source: "Referral",
        status: "Qualified",
        owner: "Tejas Gokhe",
        createdDate: "12/07/2026",
        estimatedValue: "$4,20,000",
        pipelineStage: "Waiting on Documents",
        stageEnteredAt: "12/07/2026 11:00 AM",
        pipelineStartedAt: "10/07/2026 11:00 AM",
        accentColorClass: PIPELINE_STAGE_DOT["Waiting on Documents"],
        avatarIndex: 6,
      }),
    ],
  },
  {
    ...emptyStageColumn("Documents Received", "$2,80,000"),
    leadCount: 1,
    cards: [
      toCard({
        id: "l-q2",
        leadId: "L-008",
        firstName: "Samantha",
        lastName: "Reed",
        email: "s.reed@example.com",
        phone: "+61 400 333 002",
        company: "Silverhawk Consulting",
        source: "Website",
        status: "Qualified",
        owner: "John Smith",
        createdDate: "13/07/2026",
        estimatedValue: "$2,80,000",
        pipelineStage: "Documents Received",
        stageEnteredAt: "22/07/2026 09:00 AM",
        pipelineStartedAt: "13/07/2026 09:00 AM",
        accentColorClass: PIPELINE_STAGE_DOT["Documents Received"],
        avatarIndex: 7,
      }),
    ],
  },
  emptyStageColumn("Processing"),
  {
    ...emptyStageColumn("Settled", "$5,70,000"),
    leadCount: 2,
    cards: [
      toCard({
        id: "l-v1",
        leadId: "L-011",
        firstName: "Jonathan",
        lastName: "Mitchell",
        email: "j.mitchell@example.com",
        phone: "+61 400 555 001",
        company: "Mitchell Partners",
        source: "Referral",
        status: "Converted",
        owner: "John Smith",
        createdDate: "05/07/2026",
        estimatedValue: "$1,50,000",
        pipelineStage: "Settled",
        stageEnteredAt: "20/07/2026 10:00 AM",
        pipelineStartedAt: "01/06/2026 10:00 AM",
        accentColorClass: PIPELINE_STAGE_DOT.Settled,
        avatarIndex: 2,
      }),
      toCard({
        id: "l-v2",
        leadId: "L-012",
        firstName: "Priya",
        lastName: "Nair",
        email: "priya.n@example.com",
        phone: "+61 400 555 002",
        company: "Fabrikam Inc.",
        source: "Website",
        status: "Converted",
        owner: "Tejas Gokhe",
        createdDate: "06/07/2026",
        estimatedValue: "$4,20,000",
        pipelineStage: "Settled",
        stageEnteredAt: "18/07/2026 10:00 AM",
        pipelineStartedAt: "01/06/2026 10:00 AM",
        accentColorClass: PIPELINE_STAGE_DOT.Settled,
        avatarIndex: 3,
      }),
    ],
  },
  {
    ...emptyStageColumn("Lost", "$3,70,000"),
    leadCount: 2,
    cards: [
      toCard({
        id: "l-u1",
        leadId: "L-009",
        firstName: "Alexandra",
        lastName: "Bennett",
        email: "a.bennett@example.com",
        phone: "+61 400 444 001",
        company: "Bright Bay Co.",
        source: "Other",
        status: "Unqualified",
        owner: "Roshna Abraham",
        createdDate: "10/07/2026",
        estimatedValue: "$2,20,000",
        pipelineStage: "Lost",
        stageEnteredAt: "10/07/2026 12:00 PM",
        pipelineStartedAt: "08/07/2026 12:00 PM",
        accentColorClass: PIPELINE_STAGE_DOT.Lost,
        avatarIndex: 0,
      }),
      toCard({
        id: "l-u2",
        leadId: "L-010",
        firstName: "Meera",
        lastName: "Kapoor",
        email: "m.kapoor@example.com",
        phone: "+61 400 444 002",
        company: "Harborview Supply",
        source: "Cold Call",
        status: "Unqualified",
        owner: "Shiva Kadhka",
        createdDate: "11/07/2026",
        estimatedValue: "$1,50,000",
        pipelineStage: "Lost",
        stageEnteredAt: "11/07/2026 12:00 PM",
        pipelineStartedAt: "09/07/2026 12:00 PM",
        accentColorClass: PIPELINE_STAGE_DOT.Lost,
        avatarIndex: 1,
      }),
    ],
  },
];

export const OWNERS = [
  "John Smith",
  "Shiva Kadhka",
  "Tejas Gokhe",
  "Roshna Abraham",
] as const;
