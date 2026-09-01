/** Centered empty copy inside a kanban stage well. */
export function KanbanEmptyStage({ entity }: { entity: string }) {
  return (
    <div className="flex min-h-[180px] flex-1 items-center justify-center px-3 py-10 text-center text-xs text-slate-400">
      No {entity} found
    </div>
  );
}
