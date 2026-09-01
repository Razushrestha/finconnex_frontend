"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TaskFullTimeline } from "@/components/activities/tasks/detail/TaskFullTimeline";
import { findTaskById } from "@/lib/tasks/store";
import type { Task } from "@/lib/tasks/types";
import { onRulesChange } from "@/lib/rules";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TaskTimelinePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    function load() {
      setTask(findTaskById(id)?.task ?? null);
    }
    load();
    return onRulesChange(load);
  }, [id]);

  if (!task) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Task not found</p>
          <button
            type="button"
            onClick={() => router.push("/activities/tasks")}
            className="mt-3 rounded-lg bg-[#5A32A3] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Tasks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 py-6 lg:px-10">
      <button
        type="button"
        onClick={() => router.push(`/activities/tasks/detail/${task.taskId}`)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to task
      </button>
      <TaskFullTimeline task={task} />
    </div>
  );
}
