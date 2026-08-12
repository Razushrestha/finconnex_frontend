"use client";

import React from "react";
import { ListOrdered } from "lucide-react";

interface MeetingAgendaProps {
  agenda?: string;
}

export function MeetingAgenda({ agenda }: MeetingAgendaProps) {
  const items = agenda
    ? agenda.split(". ").filter(Boolean)
    : ["No agenda items provided."];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListOrdered className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-card-foreground">
          Agenda
        </h3>
      </div>
      <div className="space-y-2.5 pl-1">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 text-sm text-card-foreground/90"
          >
            <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <p className="leading-relaxed">
              {item}
              {item.endsWith(".") ? "" : "."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
