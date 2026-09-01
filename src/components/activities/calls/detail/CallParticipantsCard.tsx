"use client";

import { initials } from "@/lib/activities/shared";

interface CallParticipantsCardProps {
  owner: string;
  calledBy?: string;
  contact?: string;
}

export function CallParticipantsCard({
  owner,
  calledBy,
  contact,
}: CallParticipantsCardProps) {
  const caller = calledBy?.trim();
  const people = [
    {
      name: owner,
      role: caller && caller === owner ? "Owner · Called" : "Owner",
    },
    ...(caller && caller !== owner
      ? [{ name: caller, role: "Called" }]
      : []),
    ...(contact && contact.trim() && contact.trim() !== owner && contact.trim() !== caller
      ? [{ name: contact.trim(), role: "Contact" }]
      : []),
  ];

  return (
    <section className="border-b border-slate-100 py-6">
      <h2 className="mb-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        Participants
      </h2>
      <div className="space-y-3">
        {people.map((person) => (
          <div key={`${person.role}-${person.name}`} className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3ECFB] text-xs font-bold text-[#5A32A3]">
              {initials(person.name || "P")}
            </span>
            <div className="min-w-0 flex-1 border-b border-slate-100 pb-2">
              <p className="text-xs font-medium text-slate-800">{person.name}</p>
              <p className="text-[10px] text-slate-400">{person.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
