"use client";

import { useEffect, useState } from "react";
import { listAuditEvents, onRulesChange, type AuditEvent } from "@/lib/rules";

/** §28.4 Field-level / action change history for a record detail view */
export function RecordAuditHistory({
  module,
  recordId,
  localAudit,
}: {
  module: string;
  recordId: string;
  localAudit?: { id: string; at: string; action: string; actor: string }[];
}) {
  const [central, setCentral] = useState<AuditEvent[]>([]);

  function refresh() {
    setCentral(
      listAuditEvents().filter(
        (e) => e.module === module && e.recordId === recordId,
      ),
    );
  }

  useEffect(() => {
    refresh();
    return onRulesChange((kind) => {
      if (kind === "audit" || kind === "all") refresh();
    });
  }, [module, recordId]);

  const rows =
    central.length > 0
      ? central.map((e) => ({
          id: e.id,
          at: e.at,
          action: e.summary,
          actor: e.actor,
          fields: e.changes,
        }))
      : (localAudit ?? []).map((a) => ({
          id: a.id,
          at: a.at,
          action: a.action,
          actor: a.actor,
          fields: undefined as
            | { field: string; from: unknown; to: unknown }[]
            | undefined,
        }));

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        Change history · §28.4
      </h2>
      <ul className="space-y-2">
        {rows.length === 0 && (
          <li className="text-[12px] text-slate-400">No history yet.</li>
        )}
        {rows.map((r) => (
          <li
            key={r.id}
            className="border-b border-slate-50 pb-2 text-[12px] last:border-0"
          >
            <div className="flex flex-wrap gap-2">
              <span className="text-slate-400">{r.at}</span>
              <span className="font-medium text-slate-800">{r.action}</span>
              <span className="text-slate-400">· {r.actor}</span>
            </div>
            {r.fields && r.fields.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                {r.fields.map((f, i) => (
                  <li key={`${r.id}-${f.field}-${i}`}>
                    <span className="font-semibold text-slate-600">
                      {f.field}
                    </span>
                    : {String(f.from ?? "—")} → {String(f.to ?? "—")}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
