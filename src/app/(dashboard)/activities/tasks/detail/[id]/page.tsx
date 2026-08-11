"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { taskColumns, type TaskStatus } from "@/lib/tasks/types";
import { TaskDetailsView } from "@/components/activities/tasks/detail/TaskDetailsView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TaskDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const allTasks = taskColumns.flatMap((col) => col.tasks);
  const initialTask = allTasks.find((t) => t.taskId === id) || allTasks[0];

  const [currentTask, setCurrentTask] = useState(initialTask);

  const handleUpdateStatus = (newStatus: TaskStatus) => {
    setCurrentTask((prev) => ({
      ...prev,
      status: newStatus,
    }));
  };

  return (
    <TaskDetailsView
      task={currentTask}
      onBack={() => router.back()}
      onUpdateStatus={handleUpdateStatus}
    />
  );
}
