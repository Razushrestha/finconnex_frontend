/** Live lead board store: session-backed (production adapter: swap for API). */

import {
  LEAD_COLUMNS,
  type KanbanColumn,
  type LeadCardData,
  type LeadSource,
  type LeadStatus,
} from "@/lib/leads/types";
import {
  isMortgagePipelineStage,
  normalizeMortgageBoard,
  PIPELINE_STAGE_DOT,
} from "@/lib/pipeline-sla/board";
import { leadStatusToPipelineStage } from "@/lib/pipeline-sla/engine";
import type { MortgagePipelineStage } from "@/lib/pipeline-sla/types";
import { formatPipelineTimestamp } from "@/lib/pipeline-sla/ui";
import { createBoardStore } from "@/lib/rules/module-store";
import { formatRulesAt, newRulesId } from "@/lib/rules/storage";

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

export function listLeadColumns(): KanbanColumn[] {
  return normalize(board.list());
}

export function saveLeadColumns(cols: KanbanColumn[]) {
  board.save(normalize(cols));
}

export function listLeadEmails(): string[] {
  return listLeadColumns().flatMap((c) =>
    c.cards.map((card) => card.email.trim().toLowerCase()),
  );
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
    input.pipelineStage && isMortgagePipelineStage(input.pipelineStage)
      ? input.pipelineStage
      : leadStatusToPipelineStage(input.status);
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
  return card;
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
  return found.card;
}

export function upsertLeadColumns(cols: KanbanColumn[]) {
  saveLeadColumns(cols);
}
