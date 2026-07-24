/** Live deals pipeline store: session-backed (production adapter: swap for API). */

import {
  DEAL_PIPELINE_STAGES,
  type DealCurrency,
  type DealPipeline,
  type DealRecord,
  type DealStage,
  type DealStageTitle,
} from "@/lib/deals/types";
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

function cloneSeed(): Record<DealPipeline, DealStage[]> {
  const out = {} as Record<DealPipeline, DealStage[]>;
  for (const [pipe, stages] of Object.entries(DEAL_PIPELINE_STAGES) as [
    DealPipeline,
    DealStage[],
  ][]) {
    out[pipe] = stages.map((s) => ({
      ...s,
      deals: s.deals.map((d) => ({ ...d })),
    }));
  }
  return out;
}

const board = createBoardStore({
  key: "sales:deals:pipelines:v1",
  seed: cloneSeed,
});

export function listDealPipelines(): Record<DealPipeline, DealStage[]> {
  const raw = board.list();
  const out = {} as Record<DealPipeline, DealStage[]>;
  for (const [pipe, stages] of Object.entries(raw) as [
    DealPipeline,
    DealStage[],
  ][]) {
    out[pipe] = stages.map((s) => ({
      ...s,
      deals: s.deals.map((d) => ({ ...d })),
    }));
  }
  return out;
}

export function saveDealPipelines(pipelines: Record<DealPipeline, DealStage[]>) {
  const out = {} as Record<DealPipeline, DealStage[]>;
  for (const [pipe, stages] of Object.entries(pipelines) as [
    DealPipeline,
    DealStage[],
  ][]) {
    out[pipe] = stages.map((s) => ({
      ...s,
      deals: s.deals.map((d) => ({ ...d })),
    }));
  }
  board.save(out);
}

export function listDealKeys(): string[] {
  const keys: string[] = [];
  for (const stages of Object.values(listDealPipelines())) {
    for (const stage of stages) {
      for (const d of stage.deals) {
        keys.push(`${d.name.trim().toLowerCase()}::${d.account.trim().toLowerCase()}`);
      }
    }
  }
  return keys;
}

export function createDeal(input: {
  dealName: string;
  account: string;
  contact?: string;
  stage: DealStageTitle | string;
  dealValue: string;
  currency: DealCurrency;
  probability?: number;
  owner: string;
  closeDate?: string;
  pipeline?: DealPipeline;
}): DealRecord {
  const pipe = input.pipeline ?? "Deals";
  const pipelines = listDealPipelines();
  const stages = pipelines[pipe] ?? pipelines.Deals;
  const target =
    stages.find((s) => s.title === input.stage) ?? stages[0];
  const words = input.dealName.trim().split(/\s+/);
  const initials = (
    (words[0]?.[0] ?? "D") + (words[1]?.[0] ?? words[0]?.[1] ?? "L")
  ).toUpperCase();
  const avatarIndex = stages.reduce((n, s) => n + s.deals.length, 0);
  const deal: DealRecord = {
    id: newRulesId("d"),
    name: input.dealName.trim(),
    initials,
    account: input.account.trim(),
    contact: input.contact?.trim() || undefined,
    value: input.dealValue.trim().startsWith("$")
      ? input.dealValue.trim()
      : `$${input.dealValue.trim()}`,
    currency: input.currency,
    probability: input.probability ?? 10,
    owner: input.owner,
    closeDate: input.closeDate?.trim() || formatRulesAt().split(",")[0] || "",
    accentColorClass: target.dotColorClass,
    avatarBgClass: AVATAR_COLORS[avatarIndex % AVATAR_COLORS.length],
  };

  pipelines[pipe] = stages.map((s) =>
    s.id === target.id ? { ...s, deals: [deal, ...s.deals] } : s,
  );
  saveDealPipelines(pipelines);
  return deal;
}

export function deleteDeal(id: string): DealRecord | null {
  const pipelines = listDealPipelines();
  let found: DealRecord | null = null;
  for (const pipe of Object.keys(pipelines) as DealPipeline[]) {
    pipelines[pipe] = pipelines[pipe].map((s) => {
      const hit = s.deals.find((d) => d.id === id);
      if (hit) found = hit;
      return { ...s, deals: s.deals.filter((d) => d.id !== id) };
    });
  }
  if (found) saveDealPipelines(pipelines);
  return found;
}
