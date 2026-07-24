/** Local Tasks API */

import type { TasksApi } from "@/lib/api/contracts";
import { apiFail, apiOk, ApiError, toApiError } from "@/lib/api/errors";
import { paginateLocal } from "@/lib/api/types";
import {
  createTask,
  deleteTask,
  findTaskById,
  listTaskColumns,
} from "@/lib/tasks/store";
import { softDeleteRecord } from "@/lib/rules";

export const localTasksApi: TasksApi = {
  async board() {
    try {
      return apiOk(listTaskColumns());
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async list(params) {
    try {
      const flat = listTaskColumns().flatMap((c) => c.tasks);
      let items = flat;
      if (params?.search) {
        const q = params.search.toLowerCase();
        items = items.filter((t) => t.title.toLowerCase().includes(q));
      }
      return apiOk(paginateLocal(items, params));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async get(id) {
    try {
      const found = findTaskById(id);
      if (!found) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Task not found" }),
        );
      }
      return apiOk(found.task);
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async create(input) {
    try {
      return apiOk(createTask(input));
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },

  async update() {
    return apiFail(
      new ApiError(501, {
        code: "NOT_IMPLEMENTED",
        message: "Task update via local API pending",
      }),
    );
  },

  async remove(id) {
    try {
      const found = findTaskById(id);
      if (!found) {
        return apiFail(
          new ApiError(404, { code: "NOT_FOUND", message: "Task not found" }),
        );
      }
      const gate = softDeleteRecord({
        action: "activities.tasks.delete",
        module: "activities.tasks",
        recordId: id,
        recordLabel: found.task.title,
        recordType: "Task",
        snapshot: { task: found.task, status: found.status },
      });
      if (!gate.ok) {
        return apiFail(
          new ApiError(403, { code: "FORBIDDEN", message: gate.message }),
        );
      }
      deleteTask(id);
      return apiOk({ id });
    } catch (e) {
      return apiFail(toApiError(e));
    }
  },
};
