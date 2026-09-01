"use client";

import { useState } from "react";
import { useTaskSectionEdit } from "@/components/activities/tasks/detail/TaskEditContext";

interface CallNotesFieldsProps {
  agenda?: string;
  onSave: (next: { agenda: string }) => void;
}

export function CallNotesFields({ agenda, onSave }: CallNotesFieldsProps) {
  const [agendaDraft, setAgendaDraft] = useState(agenda ?? "");

  const editing = useTaskSectionEdit({
    start() {
      setAgendaDraft(agenda ?? "");
    },
    save() {
      onSave({
        agenda: agendaDraft.trim(),
      });
    },
    cancel() {
      setAgendaDraft(agenda ?? "");
    },
  });

  return (
    <section className="border-b border-slate-100 py-7">
      <h2 className="mb-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        Agenda
      </h2>
      {editing ? (
        <textarea
          rows={3}
          value={agendaDraft}
          onChange={(e) => setAgendaDraft(e.target.value)}
          placeholder="Add agenda…"
          className="w-full resize-none border-0 border-b border-slate-200 bg-transparent p-0 pb-2 text-sm leading-relaxed text-slate-700 outline-none focus:border-violet-400"
        />
      ) : agenda ? (
        <p className="text-sm leading-relaxed text-slate-700">{agenda}</p>
      ) : (
        <p className="text-2xl font-light leading-none text-slate-300">—</p>
      )}
    </section>
  );
}
