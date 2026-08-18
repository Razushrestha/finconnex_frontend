"use client";

import type { Priority, Task, TaskStatus } from "@/lib/tasks/types";
import { TaskEditProvider } from "./TaskEditContext";
import { TaskHeader } from "./TaskHeader";
import { TaskMetadataCard } from "./TaskMetadataCard";
import { TaskRemindersCard } from "./TaskRemindersCard";
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
  onSaveDetails?: (next: {
    title: string;
    dueDate: string;
    assignedTo: string;
    priority: Priority;
  }) => void;
}

export function TaskDetailsView({
  task,
  onBack,
  onUpdateStatus,
  onUpdateDescription,
  onAddNote,
  onSaveDetails,
}: TaskDetailsViewProps) {
  return (
    <TaskEditProvider>
      <div className="min-h-screen bg-white">
        <div className="px-6 lg:px-10">
          <TaskHeader onBack={onBack} onUpdateStatus={onUpdateStatus} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="px-6 lg:border-r lg:border-slate-100 lg:px-10">
            <TaskMetadataCard
              task={task}
              onUpdateStatus={onUpdateStatus}
              onSaveDetails={onSaveDetails}
            />
            <TaskRemindersCard
              taskId={task.taskId}
              reminders={task.reminders}
              dueDate={task.dueDate}
            />
            <TaskDescriptionCard
              description={task.description}
              editable
              onSave={onUpdateDescription}
            />
            <TaskChecklistCard taskId={task.taskId} items={task.actionItems} />
            <TaskActivityTabs notes={task.activityNotes} onAddNote={onAddNote} />
          </div>

          <aside className="px-6 py-6 lg:px-8">
            <TaskSidebarContext />
            <TaskSidebarParticipants
              owner={task.assignedTo}
              collaborators={task.collaborators}
            />
            <TaskSidebarTimeline />
          </aside>
        </div>
      </div>
    </TaskEditProvider>
  );
}
