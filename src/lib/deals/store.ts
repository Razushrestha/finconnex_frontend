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
import {
  findContactById,
  linkDealToContact,
  unlinkDealFromContact,
} from "@/lib/contacts/store";

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
  void import("@/lib/deals/api").then(async ({ createCrmDeal, toCreateDealBody, tryCrmDeal }) => {
    const remote = await tryCrmDeal(() =>
      createCrmDeal(
        toCreateDealBody({
          name: deal.name,
          account: deal.account,
          contact: deal.contact,
          stage: target.title,
          value: deal.value,
          currency: deal.currency,
          probability: deal.probability,
          owner: deal.owner,
          closeDate: deal.closeDate,
        }),
      ),
    );
    if (!remote) return;
    if (remote.id !== deal.id) deleteDeal(deal.id);
    mergeCrmDealsIntoBoard([remote]);
  });
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
  if (found) {
    saveDealPipelines(pipelines);
    void import("@/lib/deals/api").then(({ deleteCrmDeal, tryCrmDeal, isCrmDealId }) => {
      if (isCrmDealId(id)) void tryCrmDeal(() => deleteCrmDeal(id));
    });
  }
  return found;
}

export type DealLocation = {
  deal: DealRecord;
  stage: DealStage;
  pipeline: DealPipeline;
};

export function findDealById(id: string): DealLocation | null {
  const pipelines = listDealPipelines();
  for (const pipe of Object.keys(pipelines) as DealPipeline[]) {
    for (const stage of pipelines[pipe]) {
      const deal = stage.deals.find((d) => d.id === id);
      if (deal) return { deal, stage, pipeline: pipe };
    }
  }
  return null;
}

function parseDealValue(value: string): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Σ(value × probability/100) for a stage. */
export function stageWeightedForecast(stage: DealStage): number {
  return stage.deals.reduce(
    (sum, d) => sum + parseDealValue(d.value) * (d.probability / 100),
    0,
  );
}

export function updateDeal(
  id: string,
  patch: Partial<
    Pick<
      DealRecord,
      | "name"
      | "account"
      | "contact"
      | "contactId"
      | "value"
      | "currency"
      | "probability"
      | "owner"
      | "closeDate"
      | "tags"
    >
  > & { stageTitle?: string },
): DealLocation | null {
  const found = findDealById(id);
  if (!found) return null;

  const nextDeal: DealRecord = {
    ...found.deal,
    ...patch,
    name: patch.name?.trim() || found.deal.name,
    account: patch.account?.trim() || found.deal.account,
    contact:
      patch.contact !== undefined
        ? patch.contact.trim() || undefined
        : found.deal.contact,
    value: patch.value
      ? patch.value.trim().startsWith("$")
        ? patch.value.trim()
        : `$${patch.value.trim()}`
      : found.deal.value,
  };

  const pipelines = listDealPipelines();
  const stages = pipelines[found.pipeline];
  const targetTitle = patch.stageTitle ?? found.stage.title;
  const target =
    stages.find((s) => s.title === targetTitle) ?? found.stage;

  const without = stages.map((s) => ({
    ...s,
    deals: s.deals.filter((d) => d.id !== id),
  }));

  const moved: DealRecord = {
    ...nextDeal,
    accentColorClass: target.dotColorClass,
    probability:
      targetTitle === "Closed Won"
        ? 100
        : targetTitle === "Closed Lost"
          ? 0
          : nextDeal.probability,
  };

  pipelines[found.pipeline] = without.map((s) =>
    s.id === target.id ? { ...s, deals: [moved, ...s.deals] } : s,
  );
  saveDealPipelines(pipelines);
  void import("@/lib/deals/api").then(({ updateCrmDeal, toCreateDealBody, tryCrmDeal, isCrmDealId }) => {
    if (!isCrmDealId(id)) return;
    void tryCrmDeal(() =>
      updateCrmDeal(
        id,
        toCreateDealBody({
          name: moved.name,
          account: moved.account,
          contact: moved.contact,
          contactId: moved.contactId,
          stage: target.title,
          value: moved.value,
          currency: moved.currency,
          probability: moved.probability,
          owner: moved.owner,
          closeDate: moved.closeDate,
        }),
      ),
    );
  });
  return { deal: moved, stage: target, pipeline: found.pipeline };
}

export function markDealOutcome(
  id: string,
  outcome: "won" | "lost",
): DealLocation | null {
  const found = findDealById(id);
  if (!found) return null;
  const title = outcome === "won" ? "Closed Won" : "Closed Lost";
  return updateDeal(id, {
    stageTitle: title,
    probability: outcome === "won" ? 100 : 0,
    closeDate: formatRulesAt().split(",")[0] || found.deal.closeDate,
  });
}

export function deleteDeals(ids: string[]): number {
  let n = 0;
  for (const id of ids) {
    if (deleteDeal(id)) n += 1;
  }
  return n;
}

export function updateDealOwners(ids: string[], owner: string): number {
  const nextOwner = owner.trim();
  if (!nextOwner || !ids.length) return 0;
  let n = 0;
  for (const id of ids) {
    if (updateDeal(id, { owner: nextOwner })) n += 1;
  }
  return n;
}

/** Link a contact record to a deal (and reverse). */
export function linkContactToDeal(
  dealId: string,
  contactId: string,
): DealLocation | null {
  const contact = findContactById(contactId)?.contact;
  if (!contact) return null;

  const found = findDealById(dealId);
  if (!found) return null;

  if (found.deal.contactId && found.deal.contactId !== contactId) {
    unlinkDealFromContact(found.deal.contactId, dealId);
  }

  linkDealToContact(contactId, dealId);
  void import("@/lib/deals/api").then(({ addCrmDealContact, tryCrmDeal, isCrmDealId }) => {
    if (isCrmDealId(dealId) && isCrmDealId(contactId)) {
      void tryCrmDeal(() => addCrmDealContact(dealId, { contactId }));
    }
  });

  const pipelines = listDealPipelines();
  pipelines[found.pipeline] = pipelines[found.pipeline].map((s) => ({
    ...s,
    deals: s.deals.map((d) =>
      d.id === dealId
        ? { ...d, contactId, contact: contact.name }
        : d,
    ),
  }));
  saveDealPipelines(pipelines);
  return findDealById(dealId);
}

export function unlinkContactFromDeal(dealId: string): DealLocation | null {
  const found = findDealById(dealId);
  if (!found) return null;
  if (found.deal.contactId) {
    unlinkDealFromContact(found.deal.contactId, dealId);
    const contactId = found.deal.contactId;
    void import("@/lib/deals/api").then(({ removeCrmDealContact, tryCrmDeal, isCrmDealId }) => {
      if (isCrmDealId(dealId) && isCrmDealId(contactId)) {
        void tryCrmDeal(() => removeCrmDealContact(dealId, contactId));
      }
    });
  }
  const pipelines = listDealPipelines();
  pipelines[found.pipeline] = pipelines[found.pipeline].map((s) => ({
    ...s,
    deals: s.deals.map((d) =>
      d.id === dealId ? { ...d, contactId: undefined, contact: undefined } : d,
    ),
  }));
  saveDealPipelines(pipelines);
  return findDealById(dealId);
}

export function listAllDeals(): DealRecord[] {
  return Object.values(listDealPipelines()).flatMap((stages) =>
    stages.flatMap((s) => s.deals),
  );
}

/** Replace the board with live CRM pipelines (empty columns are a valid live result). */
export function replaceCrmDealPipelines(
  remote: Record<DealPipeline, DealStage[]>,
) {
  saveDealPipelines(remote);
}

export function mergeCrmDealsIntoBoard(
  deals: Array<DealRecord & { stageTitle?: string }>,
) {
  const pipelines = listDealPipelines();
  const ids = new Set(deals.map((d) => d.id));
  for (const pipe of Object.keys(pipelines) as DealPipeline[]) {
    pipelines[pipe] = pipelines[pipe].map((s) => ({
      ...s,
      deals: s.deals.filter(
        (d) => !ids.has(d.id) && !/^(d-p\d+|d-\d+|r-\d+|c-\d+|i-\d+)$/.test(d.id),
      ),
    }));
  }
  for (const deal of deals) {
    const title = deal.stageTitle ?? "Prospecting";
    const stages = pipelines.Deals;
    const target =
      stages.find((s) => s.title === title) ?? stages[0];
    if (!target) continue;
    target.deals.unshift({
      ...deal,
      accentColorClass: target.dotColorClass,
    });
  }
  saveDealPipelines(pipelines);
}
