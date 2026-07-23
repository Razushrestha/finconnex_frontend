/** Local Deals API */

import type { DealsApi } from "@/lib/api/contracts";
import { apiFail, apiOk, ApiError, toApiError } from "@/lib/api/errors";
import { paginateLocal } from "@/lib/api/types";
import {
  createDeal,
  deleteDeal,
  listDealPipelines,
  saveDealPipelines,
} from "@/lib/deals/store";
import type { DealPipeline, DealRecord } from "@/lib/deals/types";
import {
  assertDealStageChange,
  assertUniqueDealNameAccount,
  softDeleteRecord,
} from "@/lib/rules";

function findDeal(id: string): {
  deal: DealRecord;
  stage: string;
  pipeline: DealPipeline;
  stageId: string;
} | null {
  const pipelines = listDealPipelines();
  for (const pipe of Object.keys(pipelines) as DealPipeline[]) {
    for (const stage of pipelines[pipe]) {
      const deal = stage.deals.find((d) => d.id === id);
      if (deal) {
        return {
          deal,
          stage: stage.title,
          pipeline: pipe,
          stageId: stage.id,
        };
      }
    }
  }
  return null;
}

export const localDealsApi: DealsApi = {
  async pipelines() {
    try {
      return apiOk(listDealPipelines());
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async list(params) {
    try {
      const pipelines = listDealPipelines();
      const pipe = params?.pipeline;
      const flat: (DealRecord & { stage: string; pipeline: DealPipeline })[] =
        [];
      for (const p of Object.keys(pipelines) as DealPipeline[]) {
        if (pipe && p !== pipe) continue;
        for (const stage of pipelines[p]) {
          for (const d of stage.deals) {
            flat.push({ ...d, stage: stage.title, pipeline: p });
          }
        }
      }
      return apiOk(paginateLocal(flat, params));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async get(id) {
    try {
      const found = findDeal(id);
      if (!found) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Deal not found" }),
        );
      }
      return apiOk({
        ...found.deal,
        stage: found.stage,
        pipeline: found.pipeline,
      });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async create(input) {
    try {
      const uniq = assertUniqueDealNameAccount(input.dealName, input.account);
      if (!uniq.ok) {
        return apiFail(
          new ApiError(409, {
            code: "CONFLICT",
            message: uniq.message,
            fields: { dealName: uniq.message },
          }),
        );
      }
      return apiOk(createDeal(input));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async setStage(id, input) {
    try {
      const found = findDeal(id);
      if (!found) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Deal not found" }),
        );
      }
      const gate = assertDealStageChange(found.stage, input.stage);
      if (!gate.ok) {
        return apiFail(
          new ApiError(409, { code: "CONFLICT", message: gate.message }),
        );
      }
      const pipe = input.pipeline ?? found.pipeline;
      const pipelines = listDealPipelines();
      const stages = pipelines[pipe];
      const target = stages.find((s) => s.title === input.stage);
      if (!target) {
        return apiFail(
          new ApiError(400, {
            code: "VALIDATION",
            message: "Unknown stage",
          }),
        );
      }
      const updated = {
        ...found.deal,
        accentColorClass: target.dotColorClass,
      };
      pipelines[pipe] = stages.map((s) => {
        if (s.id === found.stageId && found.pipeline === pipe) {
          return { ...s, deals: s.deals.filter((d) => d.id !== id) };
        }
        if (s.id === target.id) {
          return {
            ...s,
            deals: [
              updated,
              ...s.deals.filter((d) => d.id !== id),
            ],
          };
        }
        return {
          ...s,
          deals: s.deals.filter((d) => d.id !== id),
        };
      });
      // also remove from original pipeline if different
      if (found.pipeline !== pipe) {
        pipelines[found.pipeline] = pipelines[found.pipeline].map((s) => ({
          ...s,
          deals: s.deals.filter((d) => d.id !== id),
        }));
      }
      saveDealPipelines(pipelines);
      return apiOk(updated);
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async remove(id) {
    try {
      const found = findDeal(id);
      if (!found) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Deal not found" }),
        );
      }
      const gate = softDeleteRecord({
        action: "sales.deals.delete",
        module: "sales.deals",
        recordId: id,
        recordLabel: found.deal.name,
        recordType: "Deal",
        snapshot: {
          deal: found.deal,
          stage: found.stage,
          pipeline: found.pipeline,
        },
      });
      if (!gate.ok) {
        return apiFail(
          new ApiError(403, { code: "FORBIDDEN", message: gate.message }),
        );
      }
      deleteDeal(id);
      return apiOk({ id });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },
};
