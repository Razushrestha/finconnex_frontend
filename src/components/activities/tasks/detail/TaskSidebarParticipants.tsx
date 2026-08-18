"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { initials } from "@/lib/activities/shared";
import { useTaskSectionEdit } from "./TaskEditContext";

interface Participant {
  name: string;
  role: string;
}

interface TaskSidebarParticipantsProps {
  owner?: string;
  collaborators?: string[];
}

export function TaskSidebarParticipants({
  owner = "Alex Sterling",
  collaborators = ["Sarah Jenkins"],
}: TaskSidebarParticipantsProps) {
  const [people, setPeople] = useState<Participant[]>(() => [
    { name: owner, role: "Owner" },
    ...collaborators.map((name) => ({ name, role: "Collaborator" })),
  ]);
  const [draft, setDraft] = useState<Participant[]>(people);

  const editing = useTaskSectionEdit({
    start() {
      setDraft(people.map((p) => ({ ...p })));
    },
    save() {
      setPeople(
        draft
          .map((p) => ({ ...p, name: p.name.trim() }))
          .filter((p) => p.name),
      );
    },
    cancel() {
      setDraft(people.map((p) => ({ ...p })));
    },
  });

  return (
    <section className="border-b border-slate-100 py-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Participants
        </h2>
        {editing ? (
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => [...prev, { name: "", role: "Collaborator" }])
            }
            className="text-slate-400 hover:text-slate-700"
            aria-label="Add participant"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className="space-y-3">
        {(editing ? draft : people).map((person, index) => (
          <div key={`${person.role}-${index}`} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3ECFB] text-xs font-bold text-[#5A32A3]">
              {initials(person.name || "P")}
            </span>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  value={person.name}
                  onChange={(e) =>
                    setDraft((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, name: e.target.value } : row,
                      ),
                    )
                  }
                  placeholder="Name"
                  className="w-full border-b border-slate-200 bg-transparent text-xs font-medium text-slate-800 outline-none focus:border-violet-400"
                />
              ) : (
                <p className="text-xs font-medium text-slate-800">
                  {person.name}
                </p>
              )}
              <p className="text-[10px] text-slate-400">{person.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
