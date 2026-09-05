/** Live lead board store: session-backed (production adapter: swap for API). */

import {
  LEAD_COLUMNS,
  type KanbanColumn,
  type LeadCardData,
  type LeadSource,
  type LeadStatus,
} from "@/lib/leads/types";
import {
  normalizeMortgageBoard,
  PIPELINE_STAGE_DOT,
  isMortgagePipelineStage,
  resolvePipelineStage,
} from "@/lib/pipeline-sla/board";
import { leadStatusToPipelineStage } from "@/lib/pipeline-sla/engine";
import type { MortgagePipelineStage } from "@/lib/pipeline-sla/types";
import { formatPipelineTimestamp } from "@/lib/pipeline-sla/ui";
import { createBoardStore } from "@/lib/rules/module-store";
import {
  fieldDiff,
  logCreate,
  logDelete,
  logEdit,
  logStatusChange,
} from "@/lib/rules/audit";
import { getRulesActor } from "@/lib/rules/actor";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";
import { emitLeadActivityChange } from "@/lib/leads/lead-extras-store";

function isUuid(value: string | null | undefined): boolean {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function leadActor(fallback?: string) {
  return getRulesActor().name || fallback || "System";
}

function leadSnapshot(card: LeadCardData) {
  const custom = card.custom ?? {};
  const flat: Record<string, unknown> = {
    name: card.name,
    email: card.email,
    phone: card.phone,
    company: card.company,
    owner: card.owner,
    source: card.source,
    tags: card.tags ?? [],
    estimatedValue: card.estimatedValue ?? "",
    isConverted: card.isConverted ?? false,
    convertedAt: card.convertedAt ?? "",
    convertedDealId: card.convertedDealId ?? "",
    convertedContactId: card.convertedContactId ?? "",
    convertedCompanyId: card.convertedCompanyId ?? "",
    archived: card.archived ?? false,
    pipelineStage: card.pipelineStage ?? "",
  };
  for (const [key, value] of Object.entries(custom)) {
    flat[`custom.${key}`] = value ?? "";
  }
  return flat;
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

function cloneSeed(): KanbanColumn[] {
  return normalizeMortgageBoard(
    LEAD_COLUMNS.map((col) => ({
      ...col,
      cards: col.cards.map((c) => ({ ...c })),
    })),
  );
}

function normalize(cols: KanbanColumn[]): KanbanColumn[] {
  return normalizeMortgageBoard(cols);
}

const board = createBoardStore({
  key: "sales:leads:board:v6",
  seed: cloneSeed,
});

const LEADS_BOARD_BACKUP = "finconnex.leads.board.backup.v1";

export function listLeadColumns(): KanbanColumn[] {
  const stored = normalize(board.list());
  const hasCards = stored.some((col) => col.cards.length > 0);
  if (hasCards) return stored;
  if (typeof localStorage === "undefined") return stored;
  try {
    const raw = localStorage.getItem(LEADS_BOARD_BACKUP);
    if (!raw) return stored;
    const backup = normalize(JSON.parse(raw) as KanbanColumn[]);
    if (backup.some((col) => col.cards.length > 0)) return backup;
  } catch {
    /* ignore */
  }
  return stored;
}

export function saveLeadColumns(cols: KanbanColumn[]) {
  const next = normalize(cols);
  board.save(next);
  if (typeof localStorage === "undefined") return;
  try {
    if (next.some((col) => col.cards.length > 0)) {
      localStorage.setItem(LEADS_BOARD_BACKUP, JSON.stringify(next));
    }
  } catch {
    /* quota / private mode */
  }
}

/** Keep locally saved leads that the CRM list/kanban did not return. */
export function mergeRemoteLeadColumns(remote: KanbanColumn[]): KanbanColumn[] {
  const remoteNorm = normalize(remote);
  const remoteIds = new Set(
    remoteNorm.flatMap((col) => col.cards.map((card) => card.id)),
  );
  const remoteEmails = new Set(
    remoteNorm
      .flatMap((col) => col.cards.map((card) => card.email.trim().toLowerCase()))
      .filter(Boolean),
  );
  const extras = listLeadColumns()
    .flatMap((col) => col.cards)
    .filter((card) => {
      if (remoteIds.has(card.id)) return false;
      const email = card.email.trim().toLowerCase();
      if (email && remoteEmails.has(email)) return false;
      if (isUuid(card.id)) return true;
      return /^l-\d{10,}-/.test(card.id);
    });
  if (!extras.length) return remoteNorm;
  const next = remoteNorm.map((col) => ({ ...col, cards: [...col.cards] }));
  for (const card of extras) {
    const stage =
      card.pipelineStage && isMortgagePipelineStage(card.pipelineStage)
        ? card.pipelineStage
        : "New Lead";
    const col = next.find((item) => item.title === stage) ?? next[0];
    if (!col) continue;
    col.cards.unshift(card);
  }
  return normalize(next);
}

export function listLeadEmails(): string[] {
  return listLeadColumns().flatMap((c) =>
    c.cards.map((card) => card.email.trim().toLowerCase()),
  );
}

export function findLeadByEmail(email: string) {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;
  for (const col of listLeadColumns()) {
    const card = col.cards.find(
      (item) => item.email.trim().toLowerCase() === needle,
    );
    if (card) {
      return {
        card,
        status: col.leadStatus,
        pipelineStage: col.title,
        columnId: col.id,
      };
    }
  }
  return null;
}

export function findLeadById(id: string) {
  for (const col of listLeadColumns()) {
    const card = col.cards.find((c) => c.id === id);
    if (card) {
      return {
        card,
        status: col.leadStatus,
        pipelineStage: col.title,
        columnId: col.id,
      };
    }
  }
  return null;
}

export function createLead(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  source?: LeadSource;
  status: LeadStatus;
  /** Prefer mortgage stage when provided (Session 17 create form). */
  pipelineStage?: string;
  owner: string;
  estimatedValue?: string;
}): LeadCardData {
  const cols = listLeadColumns();
  const stage: MortgagePipelineStage =
    (input.pipelineStage
      ? resolvePipelineStage(input.pipelineStage)
      : null) ?? leadStatusToPipelineStage(input.status);
  const target =
    cols.find((c) => c.title === stage) ??
    cols.find((c) => c.title === "New Lead") ??
    cols[0]!;
  const name = `${input.firstName} ${input.lastName}`.trim();
  const initials = `${input.firstName.charAt(0)}${input.lastName.charAt(0)}`.toUpperCase();
  const avatarIndex = cols.reduce((n, c) => n + c.cards.length, 0);
  const enteredAt = formatPipelineTimestamp(new Date());
  const card: LeadCardData = {
    id: newRulesId("l"),
    name,
    initials,
    company: input.company?.trim() || "",
    email: input.email.trim(),
    phone: input.phone?.trim() || "",
    owner: input.owner,
    createdDate: formatRulesAt().split(",")[0] ?? formatRulesAt(),
    source: input.source ?? "Website",
    estimatedValue: input.estimatedValue,
    pipelineStage: target.title,
    stageEnteredAt: enteredAt,
    pipelineStartedAt: enteredAt,
    accentColorClass:
      PIPELINE_STAGE_DOT[target.title] ?? target.dotColorClass,
    avatarBgClass: AVATAR_COLORS[avatarIndex % AVATAR_COLORS.length],
  };

  saveLeadColumns(
    cols.map((c) =>
      c.id === target.id
        ? { ...c, cards: [card, ...c.cards], leadCount: c.cards.length + 1 }
        : c,
    ),
  );
  logCreate("sales.leads", card.owner, card.id, card.name);
  emitLeadActivityChange();
  return card;
}

export function cloneLead(id: string): LeadCardData | null {
  const found = findLeadById(id);
  if (!found) return null;
  const cols = listLeadColumns();
  const target = cols.find((c) => c.id === found.columnId) ?? cols[0]!;
  const enteredAt = formatPipelineTimestamp(new Date());
  const copy: LeadCardData = {
    ...found.card,
    id: newRulesId("l"),
    name: `${found.card.name} (Copy)`,
    createdDate: formatRulesAt().split(",")[0] ?? formatRulesAt(),
    pipelineStage: target.title,
    stageEnteredAt: enteredAt,
    pipelineStartedAt: enteredAt,
    isConverted: false,
    convertedAt: undefined,
    convertedDealId: undefined,
    archived: false,
    tags: found.card.tags ? [...found.card.tags] : undefined,
    custom: found.card.custom ? { ...found.card.custom } : undefined,
  };
  saveLeadColumns(
    cols.map((c) =>
      c.id === target.id
        ? { ...c, cards: [copy, ...c.cards], leadCount: c.cards.length + 1 }
        : c,
    ),
  );
  logCreate("sales.leads", leadActor(copy.owner), copy.id, copy.name);
  emitLeadActivityChange();
  return copy;
}

export function deleteLead(id: string): LeadCardData | null {
  const found = findLeadById(id);
  if (!found) return null;
  saveLeadColumns(
    listLeadColumns().map((c) => ({
      ...c,
      cards: c.cards.filter((card) => card.id !== id),
      leadCount: c.cards.filter((card) => card.id !== id).length,
    })),
  );
  logDelete("sales.leads", leadActor(found.card.owner), found.card.id, found.card.name);
  emitLeadActivityChange();
  return found.card;
}

export function upsertLeadColumns(cols: KanbanColumn[]) {
  saveLeadColumns(cols);
}

export function updateLeadOwner(ids: string[], owner: string): number {
  if (!ids.length || !owner.trim()) return 0;
  const idSet = new Set(ids);
  let count = 0;
  saveLeadColumns(
    listLeadColumns().map((col) => ({
      ...col,
      cards: col.cards.map((card) => {
        if (!idSet.has(card.id)) return card;
        const nextOwner = owner.trim();
        if (card.owner !== nextOwner) {
          logEdit("sales.leads", leadActor(nextOwner), card.id, card.name, [
            { field: "owner", from: card.owner, to: nextOwner },
          ]);
        }
        count += 1;
        return { ...card, owner: nextOwner };
      }),
    })),
  );
  if (count) emitLeadActivityChange();
  return count;
}

export function deleteLeads(ids: string[]): number {
  if (!ids.length) return 0;
  const idSet = new Set(ids);
  let count = 0;
  saveLeadColumns(
    listLeadColumns().map((col) => {
      const kept = col.cards.filter((card) => {
        if (!idSet.has(card.id)) return true;
        logDelete("sales.leads", leadActor(card.owner), card.id, card.name);
        count += 1;
        return false;
      });
      return { ...col, cards: kept, leadCount: kept.length };
    }),
  );
  if (count) emitLeadActivityChange();
  return count;
}

export function updateLead(
  id: string,
  patch: Partial<
    Pick<
      LeadCardData,
      | "name"
      | "email"
      | "phone"
      | "company"
      | "owner"
      | "source"
      | "tags"
      | "estimatedValue"
      | "jobTitle"
      | "companyWebsite"
      | "linkedinUrl"
      | "websiteUrl"
      | "isConverted"
      | "convertedAt"
      | "convertedContactId"
      | "convertedDealId"
      | "convertedCompanyId"
      | "archived"
      | "custom"
    >
  > & { status?: LeadStatus; pipelineStage?: string },
): LeadCardData | null {
  const found = findLeadById(id);
  if (!found) return null;

  const nextName = patch.name?.trim() || found.card.name;
  const nextCustom =
    patch.custom !== undefined
      ? { ...(found.card.custom ?? {}), ...patch.custom }
      : found.card.custom;
  const nextCard: LeadCardData = {
    ...found.card,
    ...patch,
    name: nextName,
    initials:
      patch.name !== undefined
        ? nextName
            .split(" ")
            .filter(Boolean)
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || found.card.initials
        : found.card.initials,
    email:
      patch.email !== undefined ? patch.email.trim() : found.card.email,
    phone: patch.phone !== undefined ? patch.phone.trim() : found.card.phone,
    company:
      patch.company !== undefined ? patch.company.trim() : found.card.company,
    custom: nextCustom,
    estimatedValue:
      patch.estimatedValue !== undefined
        ? patch.estimatedValue
        : patch.custom?.loanAmount !== undefined
          ? patch.custom.loanAmount
          : found.card.estimatedValue,
  };

  let cols = listLeadColumns().map((c) => ({
    ...c,
    cards: c.cards.map((card) => (card.id === id ? nextCard : card)),
  }));

  const targetStage =
    (patch.pipelineStage
      ? resolvePipelineStage(patch.pipelineStage)
      : null) ??
    (patch.status ? leadStatusToPipelineStage(patch.status) : null);

  if (targetStage) {
    const without = cols.map((c) => ({
      ...c,
      cards: c.cards.filter((card) => card.id !== id),
      leadCount: c.cards.filter((card) => card.id !== id).length,
    }));
    const target =
      without.find((c) => c.title === targetStage) ?? without[0]!;
    const moved: LeadCardData = {
      ...nextCard,
      pipelineStage: target.title,
      stageEnteredAt: formatPipelineTimestamp(new Date()),
      accentColorClass:
        PIPELINE_STAGE_DOT[target.title] ?? target.dotColorClass,
    };
    cols = without.map((c) =>
      c.id === target.id
        ? {
            ...c,
            cards: [moved, ...c.cards],
            leadCount: c.cards.length + 1,
          }
        : c,
    );
    saveLeadColumns(cols);
    recordLeadMutation(found.card, found.pipelineStage, moved, target.title);
    return moved;
  }

  saveLeadColumns(cols);
  recordLeadMutation(found.card, found.pipelineStage, nextCard, found.pipelineStage);
  return nextCard;
}

export function upsertLeadFromCard(card: LeadCardData, status?: LeadStatus) {
  const stage: MortgagePipelineStage =
    card.pipelineStage && isMortgagePipelineStage(card.pipelineStage)
      ? card.pipelineStage
      : status
        ? leadStatusToPipelineStage(status)
        : "New Lead";
  const nextCard: LeadCardData = {
    ...card,
    pipelineStage: stage,
    accentColorClass: PIPELINE_STAGE_DOT[stage] ?? card.accentColorClass,
  };
  const without = listLeadColumns().map((col) => ({
    ...col,
    cards: col.cards.filter((c) => c.id !== card.id),
    leadCount: col.cards.filter((c) => c.id !== card.id).length,
  }));
  const target = without.find((c) => c.title === stage) ?? without[0];
  if (!target) return nextCard;
  saveLeadColumns(
    without.map((col) =>
      col.id === target.id
        ? {
            ...col,
            cards: [nextCard, ...col.cards],
            leadCount: col.cards.length + 1,
          }
        : col,
    ),
  );
  return nextCard;
}

function recordLeadMutation(
  before: LeadCardData,
  beforeStage: string,
  after: LeadCardData,
  afterStage: string,
) {
  const actor = leadActor(after.owner || before.owner);
  if (beforeStage !== afterStage) {
    logStatusChange(
      "sales.leads",
      actor,
      after.id,
      after.name,
      beforeStage,
      afterStage,
    );
  }

  const changes = fieldDiff(
    leadSnapshot({ ...before, pipelineStage: beforeStage }),
    leadSnapshot({ ...after, pipelineStage: afterStage }),
  ).filter((change) => change.field !== "pipelineStage");

  const converted = changes.filter(
    (change) =>
      change.field === "isConverted" ||
      change.field === "convertedAt" ||
      change.field === "convertedDealId" ||
      change.field === "convertedContactId" ||
      change.field === "convertedCompanyId",
  );
  const rest = changes.filter((change) => !converted.includes(change));

  if (converted.length) {
    logEdit("sales.leads", actor, after.id, after.name, converted);
  }
  if (rest.length) {
    logEdit("sales.leads", actor, after.id, after.name, rest);
  }
  emitLeadActivityChange();
}
