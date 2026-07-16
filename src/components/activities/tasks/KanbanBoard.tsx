// "use client";

// import { useState } from "react";
// import {
//   taskColumns as initialColumns,
//   type TaskColumn,
// } from "@/lib/tasks/types";
// import { KanbanColumn } from "./KanbanColumn";

// interface DragInfo {
//   taskId: string;
//   sourceColumnId: string;
// }

// export function KanbanBoard() {
//   const [columns, setColumns] = useState<TaskColumn[]>(initialColumns);
//   const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

//   function handleDragStartTask(
//     e: React.DragEvent<HTMLDivElement>,
//     taskId: string,
//     columnId: string,
//   ) {
//     setDragInfo({ taskId, sourceColumnId: columnId });
//     e.dataTransfer.effectAllowed = "move";
//   }

//   function handleDragEndTask() {
//     setDragInfo(null);
//   }

//   function handleDropTask(targetColumnId: string) {
//     if (!dragInfo) return;
//     const { taskId, sourceColumnId } = dragInfo;

//     if (sourceColumnId === targetColumnId) {
//       setDragInfo(null);
//       return;
//     }

//     setColumns((prev) => {
//       const sourceColumn = prev.find((c) => c.id === sourceColumnId);
//       const task = sourceColumn?.tasks.find((t) => t.taskId === taskId);
//       if (!task) return prev;

//       return prev.map((col) => {
//         if (col.id === sourceColumnId) {
//           return {
//             ...col,
//             tasks: col.tasks.filter((t) => t.taskId !== taskId),
//             count: col.count - 1,
//           };
//         }
//         if (col.id === targetColumnId) {
//           return {
//             ...col,
//             tasks: [task, ...col.tasks],
//             count: col.count + 1,
//           };
//         }
//         return col;
//       });
//     });

//     setDragInfo(null);
//   }

//   return (
//     <div className="h-full min-w-0">
//       <div className="flex h-full items-stretch gap-4 overflow-x-auto pb-3 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
//         {columns.map((column) => (
//           <KanbanColumn
//             key={column.id}
//             column={column}
//             draggingTaskId={dragInfo?.taskId ?? null}
//             onDragStartTask={handleDragStartTask}
//             onDragEndTask={handleDragEndTask}
//             onDropTask={handleDropTask}
//           />
//         ))}
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import {
  taskColumns as initialColumns,
  type TaskColumn,
} from "@/lib/tasks/types";
import { KanbanColumn } from "./KanbanColumn";

interface DragInfo {
  taskId: string;
  sourceColumnId: string;
}

export function KanbanBoard() {
  const [columns, setColumns] = useState<TaskColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);

  function handleDragStartTask(
    e: React.DragEvent<HTMLDivElement>,
    taskId: string,
    columnId: string,
  ) {
    setDragInfo({ taskId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEndTask() {
    setDragInfo(null);
  }

  function handleDropTask(targetColumnId: string) {
    if (!dragInfo) return;
    const { taskId, sourceColumnId } = dragInfo;

    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      return;
    }

    setColumns((prev) => {
      const sourceColumn = prev.find((c) => c.id === sourceColumnId);
      const task = sourceColumn?.tasks.find((t) => t.taskId === taskId);
      if (!task) return prev;

      return prev.map((col) => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.taskId !== taskId),
            count: col.count - 1,
          };
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            tasks: [task, ...col.tasks],
            count: col.count + 1,
          };
        }
        return col;
      });
    });

    setDragInfo(null);
  }

  return (
    // No overflow handling here anymore — the parent div in TasksPage owns
    // scrolling for whichever view is active. This just lays columns out
    // side by side and lets them overflow their container, which is what
    // triggers that parent's scrollbar. h-full still matters: it's what
    // lets each KanbanColumn size itself to the available height for its
    // own internal (vertical) task-list scroll.
    <div className="flex h-full items-stretch gap-4">
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          column={column}
          draggingTaskId={dragInfo?.taskId ?? null}
          onDragStartTask={handleDragStartTask}
          onDragEndTask={handleDragEndTask}
          onDropTask={handleDropTask}
        />
      ))}
    </div>
  );
}
