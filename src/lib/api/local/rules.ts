/** Local Rules / audit / recycle-bin API */

import type { RulesApi } from "@/lib/api/contracts";
import { apiFail, apiOk, ApiError, toApiError } from "@/lib/api/errors";
import { paginateLocal } from "@/lib/api/types";
import {
  can,
  getRulesActor,
  listAuditEvents,
  listRecycleBin,
  purgeRecycleBinItem,
  restoreRecord,
} from "@/lib/rules";

export const localRulesApi: RulesApi = {
  async listAudit(params) {
    try {
      return apiOk(paginateLocal(listAuditEvents(), params));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async listRecycleBin() {
    try {
      return apiOk(listRecycleBin());
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async restore(id) {
    try {
      const result = restoreRecord(id);
      if (!result.ok) {
        return apiFail(
          new ApiError(400, {
            code: result.code === "PERMISSION_DENIED" ? "FORBIDDEN" : "VALIDATION",
            message: result.message,
          }),
        );
      }
      if (!result.item) {
        return apiFail(
          new ApiError(404, {
            code: "NOT_FOUND",
            message: "Recycle Bin item not found",
          }),
        );
      }
      return apiOk(result.item);
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async purge(id) {
    try {
      const actor = getRulesActor();
      if (
        !can({
          role: actor.role ?? "User",
          resource: "recycle-bin.purge",
          scope: "action",
        })
      ) {
        return apiFail(
          new ApiError(403, {
            code: "FORBIDDEN",
            message: "Cannot purge recycle bin items",
          }),
        );
      }
      const item = purgeRecycleBinItem(id, actor.name);
      if (!item) {
        return apiFail(
          new ApiError(404, {
            code: "NOT_FOUND",
            message: "Recycle Bin item not found",
          }),
        );
      }
      return apiOk({ id });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async myPermissions() {
    try {
      const actor = getRulesActor();
      return apiOk({
        role: actor.role ?? "User",
        canDelete: can({
          role: actor.role ?? "User",
          resource: "sales.leads.delete",
          scope: "action",
        }),
      });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },
};
