/** Local Support Tickets API */

import type { TicketsApi } from "@/lib/api/contracts";
import { apiFail, apiOk, ApiError, toApiError } from "@/lib/api/errors";
import { paginateLocal } from "@/lib/api/types";
import {
  appendTicketAudit,
  deleteTicket,
  formatTicketDate,
  getTicketById,
  listTickets,
  nextTicketIds,
  upsertTicket,
  type SupportTicket,
} from "@/lib/support/types";
import {
  assertTicketStatusChange,
  getRulesActor,
  softDeleteRecord,
} from "@/lib/rules";

export const localTicketsApi: TicketsApi = {
  async list(params) {
    try {
      let items = listTickets();
      if (params?.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (t) =>
            t.subject.toLowerCase().includes(q) ||
            t.ticketId.toLowerCase().includes(q) ||
            t.requester.toLowerCase().includes(q),
        );
      }
      return apiOk(paginateLocal(items, params));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async get(id) {
    try {
      const t = getTicketById(id);
      if (!t) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Ticket not found" }),
        );
      }
      return apiOk(t);
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async create(input) {
    try {
      const ids = nextTicketIds();
      const now = formatTicketDate();
      const actor = input.createdBy || getRulesActor().name;
      let ticket: SupportTicket = appendTicketAudit(
        {
          id: ids.id,
          ticketId: ids.ticketId,
          subject: input.subject.trim(),
          requester: input.requester,
          relatedAccount: input.relatedAccount,
          priority: input.priority,
          status: input.status,
          category: input.category as SupportTicket["category"],
          assignedTo: input.assignedTo,
          description: input.description.trim(),
          createdBy: actor,
          createdAt: now,
          modifiedAt: now,
          notes: [],
          audit: [],
        },
        "Created",
        actor,
      );
      if (input.assignedTo && input.status === "New") {
        ticket = appendTicketAudit(
          { ...ticket, status: "Open" },
          "Status → Open",
          actor,
        );
      }
      return apiOk(upsertTicket(ticket));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async update(id, patch) {
    try {
      const row = getTicketById(id);
      if (!row) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Ticket not found" }),
        );
      }
      const actor = getRulesActor().name;
      const next = appendTicketAudit(
        {
          ...row,
          ...patch,
          category: (patch.category as SupportTicket["category"]) ?? row.category,
          subject: patch.subject ?? row.subject,
          description: patch.description ?? row.description,
        },
        "Updated",
        actor,
      );
      return apiOk(upsertTicket(next));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async setStatus(id, input) {
    try {
      const row = getTicketById(id);
      if (!row) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Ticket not found" }),
        );
      }
      const gate = assertTicketStatusChange(row.status, input.status);
      if (!gate.ok) {
        return apiFail(
          new ApiError(409, { code: "CONFLICT", message: gate.message }),
        );
      }
      const actor = getRulesActor().name;
      const next = appendTicketAudit(
        { ...row, status: input.status },
        `Status → ${input.status}`,
        actor,
      );
      return apiOk(upsertTicket(next));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async remove(id) {
    try {
      const row = getTicketById(id);
      if (!row) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Ticket not found" }),
        );
      }
      const gate = softDeleteRecord({
        action: "support.tickets.delete",
        module: "support.tickets",
        recordId: id,
        recordLabel: row.ticketId,
        recordType: "Ticket",
        snapshot: row,
      });
      if (!gate.ok) {
        return apiFail(
          new ApiError(403, { code: "FORBIDDEN", message: gate.message }),
        );
      }
      deleteTicket(id);
      return apiOk({ id });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },
};
