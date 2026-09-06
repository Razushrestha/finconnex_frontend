"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

interface Incident {
  id: string;
  loggedDate: string;
  subject: string;
  priority: string;
  resolutionTime: string;
  status: string;
  assignee: string;
}

interface IncidentLogProps {
  incidents?: Incident[];
  onLogIncident?: () => void;
}

export function IncidentLogTable({
  incidents = [],
  onLogIncident,
}: IncidentLogProps) {
  const displayIncidents = incidents;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Incident & Request Log
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Recent support requests processed under Agreement reference.
          </p>
        </div>

        <button
          type="button"
          onClick={onLogIncident}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-primary-foreground bg-primary hover:opacity-90 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Incident
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-3">Ticket ID</th>
              <th className="py-3 px-3">Logged Date</th>
              <th className="py-3 px-3">Subject</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Resolution Time</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Assignee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs">
            {displayIncidents.length > 0 ? (
              displayIncidents.map((inc) => (
                <tr
                  key={inc.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3.5 px-3 font-bold text-primary whitespace-nowrap">
                    {inc.id}
                  </td>
                  <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">
                    {inc.loggedDate}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-foreground min-w-[200px]">
                    {inc.subject}
                  </td>
                  <td className="py-3.5 px-3 font-semibold whitespace-nowrap">
                    {inc.priority}
                  </td>
                  <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">
                    {inc.resolutionTime}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {inc.status}
                  </td>
                  <td className="py-3.5 px-3 text-right font-medium text-foreground whitespace-nowrap">
                    {inc.assignee}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 text-center text-muted-foreground"
                >
                  No logged incidents found. Click{" "}
                  <span className="font-semibold text-foreground">
                    &quot;Log Incident&quot;
                  </span>{" "}
                  to add a support ticket.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
