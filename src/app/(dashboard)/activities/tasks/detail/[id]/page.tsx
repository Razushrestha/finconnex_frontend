"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Priority, Task, TaskStatus } from "@/lib/tasks/types";
import { findTaskById, addTaskActivityNote, patchTask, updateTaskDescription, updateTaskStatus } from "@/lib/tasks/store";
import {
  cancelCrmTask,
  completeCrmTask,
  getCrmTask,
  isCrmTaskId,
  persistRemoteTask,
  reopenCrmTask,
  syncTaskStatus,
  tryCrmTask,
  updateCrmTask,
} from "@/lib/tasks/api";
import { TaskDetailsView } from "@/components/activities/tasks/detail/TaskDetailsView";
import { onRulesChange } from "@/lib/rules";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TaskDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    function loadTask() {
      const found = findTaskById(id);
      if (
        found?.task.status === "Completed" &&
        (!found.task.completedBy || !found.task.completedDate)
      ) {
        setTask(updateTaskStatus(id, "Completed") ?? found.task);
        return;
      }
      setTask(found?.task ?? null);
    }
    loadTask();
    const off = onRulesChange(loadTask);
    let cancelled = false;
    void (async () => {
      if (!isCrmTaskId(id)) return;
      const remote = await tryCrmTask(() => getCrmTask(id));
      if (cancelled || !remote) return;
      persistRemoteTask(remote);
      setTask(remote);
    })();
    return () => {
      cancelled = true;
      off();
    };
  }, [id]);

  function applyRemote(run: () => Promise<Task | null>) {
    void tryCrmTask(run).then((remote) => {
      if (!remote) return;
      persistRemoteTask(remote);
      setTask(remote);
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

  if (!task) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Task not found</p>
          <button
            type="button"
            onClick={() => router.push("/activities/tasks")}
            className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <TaskDetailsView
      task={task}
      onBack={() => router.push("/activities/tasks")}
      onUpdateStatus={handleUpdateStatus}
      onUpdateDescription={handleUpdateDescription}
      onAddNote={handleAddNote}
      onSaveDetails={handleSaveDetails}
    />
  );
}
