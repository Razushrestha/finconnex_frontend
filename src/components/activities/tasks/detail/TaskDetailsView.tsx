"use client";

import type { Task, TaskStatus } from "@/lib/tasks/types";
import { TaskHeader } from "./TaskHeader";
import { TaskMetadataCard } from "./TaskMetadataCard";
import { TaskDescriptionCard } from "./TaskDescriptionCard";
import { TaskChecklistCard } from "./TaskChecklistCard";
import { TaskActivityTabs } from "./TaskActivityTabs";
import { TaskSidebarContext } from "./TaskSidebarContext";
import { TaskSidebarParticipants } from "./TaskSidebarParticipants";
import { TaskSidebarTimeline } from "./TaskSidebarTimeline";

interface TaskDetailsViewProps {
  task: Task;
  onBack: () => void;
  onUpdateStatus: (status: TaskStatus) => void;
  onUpdateDescription?: (description: string) => void;
  onAddNote?: (body: string) => void;
}

export function TaskDetailsView({
  task,
  onBack,
  onUpdateStatus,
  onUpdateDescription,
  onAddNote,
}: TaskDetailsViewProps) {
  return (
    <div className="min-h-screen bg-background px-4 py-2">
      <TaskHeader task={task} onBack={onBack} onUpdateStatus={onUpdateStatus} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TaskMetadataCard task={task} onUpdateStatus={onUpdateStatus} />
          <TaskDescriptionCard
            description={task.description}
            editable
            onSave={onUpdateDescription}
          />
          <TaskChecklistCard
            taskId={task.taskId}
            items={task.actionItems}
          />
          <TaskActivityTabs
            notes={task.activityNotes}
            onAddNote={onAddNote}
          />
        </div>

        <div className="space-y-6">
          <TaskSidebarContext />
          <TaskSidebarParticipants />
          <TaskSidebarTimeline />
        </div>
      </div>
    </div>
  );
}
