/** Local Leads API → session board store + soft-delete */

import type { LeadsApi } from "@/lib/api/contracts";
import { apiFail, apiOk, ApiError, toApiError } from "@/lib/api/errors";
import { paginateLocal } from "@/lib/api/types";
import {
  createLead,
  deleteLead,
  findLeadById,
  listLeadColumns,
  saveLeadColumns,
} from "@/lib/leads/store";
import { leadStatusToPipelineStage } from "@/lib/pipeline-sla/engine";
import { formatPipelineTimestamp } from "@/lib/pipeline-sla/ui";
import {
  assertLeadStatusChange,
  assertUniqueEmail,
  softDeleteRecord,
} from "@/lib/rules";

export const localLeadsApi: LeadsApi = {
  async board() {
    try {
      return apiOk(listLeadColumns());
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async list(params) {
    try {
      const flat = listLeadColumns().flatMap((col) =>
        col.cards.map((card) => ({
          ...card,
          status: col.leadStatus,
          pipelineStage: card.pipelineStage ?? col.title,
        })),
      );
      let items = flat;
      if (params?.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.company.toLowerCase().includes(q),
        );
      }
      return apiOk(paginateLocal(items, params));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async get(id) {
    try {
      const found = findLeadById(id);
      if (!found) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Lead not found" }),
        );
      }
      return apiOk({ ...found.card, status: found.status });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async create(input) {
    try {
      const uniq = assertUniqueEmail(input.email);
      if (!uniq.ok) {
        return apiFail(
          new ApiError(409, {
            code: "CONFLICT",
            message: uniq.message,
            fields: { email: uniq.message },
          }),
        );
      }
      const card = createLead(input);
      return apiOk(card);
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async update(id, patch) {
    try {
      const found = findLeadById(id);
      if (!found) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Lead not found" }),
        );
      }
      if (patch.email && patch.email !== found.card.email) {
        const uniq = assertUniqueEmail(patch.email, {
          excludeEmail: found.card.email,
        });
        if (!uniq.ok) {
          return apiFail(
            new ApiError(409, {
              code: "CONFLICT",
              message: uniq.message,
              fields: { email: uniq.message },
            }),
          );
        }
      }
      const nextCard = {
        ...found.card,
        name:
          patch.firstName || patch.lastName
            ? `${patch.firstName ?? found.card.name.split(" ")[0]} ${
                patch.lastName ?? found.card.name.split(" ").slice(1).join(" ")
              }`.trim()
            : found.card.name,
        email: patch.email ?? found.card.email,
        phone: patch.phone ?? found.card.phone,
        company: patch.company ?? found.card.company,
        source: patch.source ?? found.card.source,
        owner: patch.owner ?? found.card.owner,
        estimatedValue: patch.estimatedValue ?? found.card.estimatedValue,
      };
      const cols = listLeadColumns().map((col) => ({
        ...col,
        cards: col.cards.map((c) => (c.id === id ? nextCard : c)),
      }));
      saveLeadColumns(cols);
      return apiOk(nextCard);
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async setStatus(id, input) {
    try {
      const found = findLeadById(id);
      if (!found) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Lead not found" }),
        );
      }
      const gate = assertLeadStatusChange(found.status, input.status);
      if (!gate.ok) {
        return apiFail(
          new ApiError(409, { code: "CONFLICT", message: gate.message }),
        );
      }
      const cols = listLeadColumns();
      const source = cols.find((c) => c.id === found.columnId);
      const stage = leadStatusToPipelineStage(input.status);
      const target =
        cols.find((c) => c.title === stage) ??
        cols.find((c) => c.leadStatus === input.status);
      if (!source || !target) {
        return apiFail(
          new ApiError(400, {
            code: "VALIDATION",
            message: "Invalid status",
          }),
        );
      }
      const enteredAt = formatPipelineTimestamp(new Date());
      const card = {
        ...found.card,
        accentColorClass: target.dotColorClass,
        pipelineStage: target.title,
        stageEnteredAt: enteredAt,
        pipelineStartedAt:
          found.card.pipelineStartedAt ??
          found.card.stageEnteredAt ??
          found.card.createdDate,
      };
      saveLeadColumns(
        cols.map((c) => {
          if (c.id === source.id) {
            return {
              ...c,
              cards: c.cards.filter((x) => x.id !== id),
              leadCount: c.cards.filter((x) => x.id !== id).length,
            };
          }
          if (c.id === target.id) {
            return {
              ...c,
              cards: [card, ...c.cards],
              leadCount: c.cards.length + 1,
            };
          }
          return c;
        }),
      );
      return apiOk(card);
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async remove(id) {
    try {
      const found = findLeadById(id);
      if (!found) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Lead not found" }),
        );
      }
      const gate = softDeleteRecord({
        action: "sales.leads.delete",
        module: "sales.leads",
        recordId: id,
        recordLabel: found.card.name,
        recordType: "Lead",
        snapshot: { card: found.card, status: found.status },
      });
      if (!gate.ok) {
        return apiFail(
          new ApiError(403, {
            code: "FORBIDDEN",
            message: gate.message,
          }),
        );
      }
      deleteLead(id);
      return apiOk({ id });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },
};
