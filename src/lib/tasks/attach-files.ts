/** Shared task attachment path: storage upload, then POST /tasks/:id/attachments. */

import { uploadCrmStorageFile } from "@/lib/storage/api";
import {
  addCrmTaskAttachment,
  isCrmTaskId,
  persistRemoteTask,
  tryCrmTask,
} from "@/lib/tasks/api";
import { findTaskById, patchTask } from "@/lib/tasks/store";
import { formatTaskFileSize, type TaskFileAttachment } from "@/lib/tasks/types";

export async function uploadTaskFileBlobs(
  files: File[],
): Promise<TaskFileAttachment[]> {
  const rows: TaskFileAttachment[] = [];
  for (const file of files) {
    const local: TaskFileAttachment = {
      name: file.name,
      sizeLabel: formatTaskFileSize(file.size) || undefined,
    };
    try {
      const stored = await uploadCrmStorageFile(file);
      rows.push({
        ...local,
        name: stored.fileName || file.name,
        key: stored.key || undefined,
        url: stored.url || undefined,
      });
    } catch {
      rows.push(local);
    }
  }
  return rows;
}

export async function attachFilesToTask(
  taskId: string,
  files: File[],
): Promise<TaskFileAttachment[]> {
  if (!files.length) return findTaskById(taskId)?.task.attachments ?? [];
  const uploaded = await uploadTaskFileBlobs(files);
  let next = uploaded;
  if (isCrmTaskId(taskId)) {
    for (const row of uploaded) {
      if (!row.key) continue;
      const remote = await tryCrmTask(() =>
        addCrmTaskAttachment(taskId, { key: row.key, fileName: row.name }),
      );
      if (remote?.attachments?.length) next = remote.attachments;
    }
  }
  const current = findTaskById(taskId)?.task;
  const merged = [
    ...(current?.attachments ?? []).filter(
      (existing) =>
        !next.some(
          (row) =>
            (row.key && row.key === existing.key) ||
            (row.name === existing.name && row.sizeLabel === existing.sizeLabel),
        ),
    ),
    ...next,
  ];
  if (current) {
    persistRemoteTask({
      ...current,
      attachments: merged,
      attachmentsCount: merged.length,
    });
    patchTask(taskId, {
      attachments: merged,
      attachmentsCount: merged.length,
    });
  }
  return findTaskById(taskId)?.task.attachments ?? merged;
}
