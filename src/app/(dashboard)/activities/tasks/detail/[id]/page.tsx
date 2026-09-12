"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useModuleBack } from "@/hooks/useModuleBack";
import type { Priority, Task, TaskActionItem, TaskStatus } from "@/lib/tasks/types";
import { findTaskById, addTaskActivityNote, patchTask, updateTaskDescription, updateTaskStatus } from "@/lib/tasks/store";
import {
  cancelCrmTask,
  completeCrmTask,
  getCrmTask,
  isCrmTaskId,
  listCrmTasks,
  persistRemoteTask,
  reopenCrmTask,
  syncTaskStatus,
  tryCrmTask,
  updateCrmTask,
} from "@/lib/tasks/api";
import { attachFilesToTask } from "@/lib/tasks/attach-files";
import { TaskDetailsView } from "@/components/activities/tasks/detail/TaskDetailsView";
import { onRulesChange } from "@/lib/rules";

function TaskDetailPageInner() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? "");
  const router = useRouter();
  const back = useModuleBack("/activities/tasks", "Back to Tasks");
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function readLocal() {
      const found = findTaskById(id);
      if (
        found?.task.status === "Completed" &&
        (!found.task.completedBy || !found.task.completedDate)
      ) {
        return updateTaskStatus(id, "Completed") ?? found.task;
      }
      return found?.task ?? null;
    }

    async function loadRemote() {
      const local = readLocal();
      if (local) setTask(local);
      if (!isCrmTaskId(id)) {
        if (!cancelled) setLoading(false);
        return;
      }
      let remote = await tryCrmTask(() => getCrmTask(id));
      if (!remote) {
        const listed = await tryCrmTask(() => listCrmTasks());
        remote = listed?.find((row) => row.taskId === id) ?? null;
      }
      if (cancelled) return;
      if (remote) {
        setTask(persistRemoteTask(remote) ?? remote);
      } else if (!local) {
        setTask(null);
      }
      setLoading(false);
    }

    void loadRemote();
    const off = onRulesChange(() => {
      const next = readLocal();
      if (next) setTask(next);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [id]);

  function applyRemote(run: () => Promise<Task | null>) {
    void tryCrmTask(run).then((remote) => {
      if (!remote) return;
      const stored = persistRemoteTask(remote);
      if (stored) setTask(stored);
    });
  }

  function handleUpdateStatus(newStatus: TaskStatus) {
    const updated = updateTaskStatus(id, newStatus);
    if (updated) setTask(updated);
    if (newStatus === "Completed") applyRemote(() => completeCrmTask(id));
    else if (newStatus === "Cancelled") applyRemote(() => cancelCrmTask(id));
    else if (newStatus === "Not Started") applyRemote(() => reopenCrmTask(id));
    else applyRemote(() => syncTaskStatus(id, newStatus));
  }

  function handleUpdateDescription(description: string) {
    const updated = updateTaskDescription(id, description);
    if (updated) setTask(updated);
    applyRemote(() => updateCrmTask(id, { description }));
  }

  function handleAddNote(body: string) {
    const updated = addTaskActivityNote(id, body);
    if (updated) setTask(updated);
  }

  function handleChangeActionItems(items: TaskActionItem[]) {
    const updated = findTaskById(id)?.task;
    if (updated) setTask({ ...updated, actionItems: items });
    applyRemote(() => updateCrmTask(id, { actionItems: items }));
  }

  async function handleAddFiles(files: File[]) {
    const attached = await attachFilesToTask(id, files);
    setTask(
      findTaskById(id)?.task ??
        (task
          ? { ...task, attachments: attached, attachmentsCount: attached.length }
          : task),
    );
  }

  function handleSaveDetails(next: {
    title: string;
    dueDate: string;
    assignedTo: string;
    priority: Priority;
  }) {
    const updated = patchTask(id, next);
    if (updated) setTask(updated);
    applyRemote(() => updateCrmTask(id, next));
  }

  if (loading && !task) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading task…</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Task not found</p>
          <button
            type="button"
            onClick={() => router.push(back.href)}
            className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {back.label}
          </button>
        </div>
      </div>
    );
  }

  return (
    <TaskDetailsView
      task={task}
      onBack={() => router.push(back.href)}
      backLabel={back.label}
      onUpdateStatus={handleUpdateStatus}
      onUpdateDescription={handleUpdateDescription}
      onAddNote={handleAddNote}
      onChangeActionItems={handleChangeActionItems}
      onAddFiles={handleAddFiles}
      onSaveDetails={handleSaveDetails}
    />
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center px-4">
          <p className="text-sm text-slate-500">Loading task…</p>
        </div>
      }
    >
      <TaskDetailPageInner />
    </Suspense>
  );
}
