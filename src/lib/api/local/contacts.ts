/** Local Contacts API */

import type { ContactsApi } from "@/lib/api/contracts";
import { apiFail, apiOk, ApiError, toApiError } from "@/lib/api/errors";
import { paginateLocal } from "@/lib/api/types";
import {
  createContact,
  deleteContact,
  findContactById,
  listContactGroups,
} from "@/lib/contacts/store";
import type { ContactStatus } from "@/lib/contacts/types";
import { assertUniqueEmail, softDeleteRecord } from "@/lib/rules";

export const localContactsApi: ContactsApi = {
  async board() {
    try {
      return apiOk(listContactGroups());
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async list(params) {
    try {
      const flat = listContactGroups().flatMap((g) =>
        g.contacts.map((c) => ({
          ...c,
          status: g.title as ContactStatus,
        })),
      );
      let items = flat;
      if (params?.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q),
        );
      }
      return apiOk(paginateLocal(items, params));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async get(id) {
    try {
      const found = findContactById(id);
      if (!found) {
        return apiFail(
          new ApiError(404, {
            code: "NOT_FOUND",
            message: "Contact not found",
          }),
        );
      }
      return apiOk({ ...found.contact, status: found.status });
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
      return apiOk(createContact(input));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async update(id, _patch) {
    const found = findContactById(id);
    if (!found) {
      return apiFail(
        new ApiError(404, { code: "NOT_FOUND", message: "Contact not found" }),
      );
    }
    return apiFail(
      new ApiError(501, {
        code: "NOT_IMPLEMENTED",
        message: "Contact update via API local adapter pending: use UI edit",
      }),
    );
  },

  async remove(id) {
    try {
      const found = findContactById(id);
      if (!found) {
        return apiFail(
          new ApiError(404, {
            code: "NOT_FOUND",
            message: "Contact not found",
          }),
        );
      }
      const gate = softDeleteRecord({
        action: "sales.contacts.delete",
        module: "sales.contacts",
        recordId: id,
        recordLabel: found.contact.name,
        recordType: "Contact",
        snapshot: { contact: found.contact, status: found.status },
      });
      if (!gate.ok) {
        return apiFail(
          new ApiError(403, { code: "FORBIDDEN", message: gate.message }),
        );
      }
      deleteContact(id);
      return apiOk({ id });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },
};
