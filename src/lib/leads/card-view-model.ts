/**
 * Assemble LeadCardViewModel from a lead record + activity index.
 * Dynamic fields, quick actions, and settings are fully wired (through Phase 9).
 */

import { initials as personInitials } from "@/lib/activities/shared";
import { listLeadActivityCandidates } from "@/lib/leads/activity-index";
import {
  pickActivitySummary,
  pickLastCompletedActivity,
} from "@/lib/leads/activity-summary";
import type {
  LeadCardDynamicField,
  LeadCardViewModel,
} from "@/lib/leads/card-types";
import {
  DEFAULT_LEAD_CARD_SETTINGS,
  MAX_DYNAMIC_FIELDS,
  type LeadCardSettings,
  loadLeadCardSettings,
} from "@/lib/leads/lead-card-settings";
import { buildQuickActionStates } from "@/lib/leads/quick-actions";
import type { LeadCardData, LeadRecord, LeadStatus } from "@/lib/leads/types";
import {
  parseCustomCardFieldKey,
} from "@/lib/custom-fields/types";
import { listActiveCustomFieldsForEntity } from "@/lib/custom-fields/store";
import { computeSlaForLeadCard } from "@/lib/pipeline-sla/lead-bridge";

/** Default dynamic fields when settings unavailable. */
const DEFAULT_DYNAMIC_KEYS = DEFAULT_LEAD_CARD_SETTINGS.dynamicFieldKeys;

const FIELD_LABELS: Record<string, string> = {
  company: "Company",
  email: "Email",
  phone: "Phone",
  source: "Lead Source",
  status: "Pipeline / Stage",
  tags: "Tags",
  industry: "Industry",
  companyWebsite: "Website",
  jobTitle: "Job Title",
  productInterest: "Product Interest",
  budgetRange: "Budget",
  estimatedValue: "Estimated Value",
  owner: "Owner",
  createdDate: "Created",
};

function customFieldLabel(customKey: string): string {
  try {
    const def = listActiveCustomFieldsForEntity("Lead").find(
      (f) => f.key === customKey,
    );
    if (def) return def.label;
  } catch {
    /* seed labels */
  }
  return customKey;
}

function readLeadField(lead: LeadRecord, key: string): string {
  const customKey = parseCustomCardFieldKey(key);
  if (customKey) {
    return lead.custom?.[customKey]?.trim() ?? "";
  }
  if (key === "tags") {
    const tags = lead.tags ?? [];
    return tags.map((t) => t.trim()).filter(Boolean).join(", ");
  }
  if (key === "status") {
    return lead.pipelineStage?.trim() || lead.status;
  }
  const v = (lead as unknown as Record<string, unknown>)[key];
  if (v == null) return "";
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean).join(", ");
  }
  return String(v);
}

function fieldLabelForKey(key: string): string {
  const customKey = parseCustomCardFieldKey(key);
  if (customKey) return customFieldLabel(customKey);
  return FIELD_LABELS[key] ?? key;
}

export function buildDynamicFields(
  lead: LeadRecord,
  keys: readonly string[] = DEFAULT_DYNAMIC_KEYS,
  max = MAX_DYNAMIC_FIELDS,
): LeadCardDynamicField[] {
  return keys
    .slice(0, max)
    .map((key) => ({
      key,
      label: fieldLabelForKey(key),
      value: readLeadField(lead, key),
    }))
    .filter((f) => f.value.trim().length > 0);
}

/** Bridge Kanban card + column status → LeadRecord for the view-model. */
export function leadCardDataToRecord(
  card: LeadCardData,
  status: LeadStatus,
): LeadRecord {
  const parts = card.name.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return {
    id: card.id,
    leadId: card.id,
    firstName,
    lastName,
    email: card.email,
    phone: card.phone,
    company: card.company,
    source: card.source,
    status,
    owner: card.owner,
    createdDate: card.createdDate,
    estimatedValue: card.estimatedValue,
    tags: card.tags,
    pipelineStage: card.pipelineStage,
    stageEnteredAt: card.stageEnteredAt,
    pipelineStartedAt: card.pipelineStartedAt,
    custom: card.custom,
    initials: card.initials,
    accentColorClass: card.accentColorClass,
    avatarBgClass: card.avatarBgClass,
  };
}

export function buildLeadCardViewModel(
  lead: LeadRecord,
  opts: {
    now?: Date;
    showOwnerAvatar?: boolean;
    dynamicFieldKeys?: readonly string[];
    cardSettings?: LeadCardSettings;
  } = {},
): LeadCardViewModel {
  const now = opts.now ?? new Date();
  const name = `${lead.firstName} ${lead.lastName}`.trim();
  const candidates = listLeadActivityCandidates(name, now);
  const settings = opts.cardSettings ?? loadLeadCardSettings();
  const showOwnerAvatar = opts.showOwnerAvatar ?? settings.showOwnerAvatar;
  const fieldKeys = opts.dynamicFieldKeys ?? settings.dynamicFieldKeys;
  const cardLike: LeadCardData = {
    id: lead.id,
    name,
    initials: lead.initials,
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
    avatarBgClass: lead.avatarBgClass,
  };

  return {
    id: lead.id,
    leadId: lead.leadId,
    name,
    status: lead.status,
    source: lead.source,
    owner: {
      name: lead.owner,
      initials: personInitials(lead.owner),
    },
    showOwnerAvatar,
    dynamicFields: buildDynamicFields(lead, fieldKeys),
    activitySummary: pickActivitySummary(candidates, now),
    lastActivity: pickLastCompletedActivity(candidates, now),
    quickActions: buildQuickActionStates(candidates, now),
    sla: computeSlaForLeadCard(cardLike, lead.status, now),
  };
}

export function buildLeadCardViewModelFromCard(
  card: LeadCardData,
  status: LeadStatus,
  opts?: {
    now?: Date;
    showOwnerAvatar?: boolean;
    dynamicFieldKeys?: readonly string[];
    cardSettings?: LeadCardSettings;
  },
): LeadCardViewModel {
  const now = opts?.now ?? new Date();
  const base = buildLeadCardViewModel(leadCardDataToRecord(card, status), {
    ...opts,
    now,
  });
  return {
    ...base,
    sla: computeSlaForLeadCard(card, status, now),
  };
}
