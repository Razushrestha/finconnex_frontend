"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home,
  Scale,
  Shield,
  Bell,
  History,
  Trash2,
  Lock,
  CheckCircle2,
} from "lucide-react";
import {
  RULES_SECTIONS,
  ROLES,
  PERMISSION_GRANTS,
  canRestoreModule,
  listAuditEvents,
  listRecycleBin,
  onRulesChange,
  restoreRecord,
  type AuditEvent,
  type RecycleBinItem,
} from "@/lib/rules";
import { cn } from "@/lib/utils";

const SECTION_ICONS = {
  "28.1": Shield,
  "28.2": Scale,
  "28.3": Bell,
  "28.4": History,
  "28.5": Lock,
} as const;

export function RulesHubClient() {
  const [tab, setTab] = useState<"overview" | "audit" | "bin" | "rbac">(
    "overview",
  );
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [bin, setBin] = useState<RecycleBinItem[]>([]);

  function refresh() {
    setAudit(listAuditEvents());
    setBin(listRecycleBin());
  }

  useEffect(() => {
    refresh();
    return onRulesChange(() => refresh());
  }, [tab]);

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      <div className="relative mx-auto max-w-[1200px] p-2.5 sm:p-3 lg:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <nav className="mb-1 flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-600">Cross-Module Rules</span>
            </nav>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
                Cross-Module Rules
              </h1>
              <span className="rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
                §28
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Shared integrity, transitions, notifications, audit, soft-delete,
              and RBAC: enforced on create/edit/delete across CRM modules.
            </p>
          </div>
          <Link
            href="/settings/data-management/recycle-bin"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Recycle Bin settings
          </Link>
        </div>

        <div className="mb-3 flex flex-wrap gap-1">
          {(
            [
              ["overview", "Overview"],
              ["audit", "Audit trail"],
              ["bin", "Recycle Bin"],
              ["rbac", "Permissions"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold",
                tab === id
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {RULES_SECTIONS.map((s) => {
              const Icon =
                SECTION_ICONS[s.id as keyof typeof SECTION_ICONS] ?? Scale;
              return (
                <section
                  key={s.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold tracking-wide text-violet-600 uppercase">
                        {s.id}
                      </p>
                      <h2 className="text-[14px] font-bold text-slate-900">
                        {s.title}
                      </h2>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {s.points.map((p) => (
                      <li
                        key={p}
                        className="flex gap-1.5 text-[12px] text-slate-600"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {tab === "audit" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 text-[12px] font-semibold text-slate-700">
              Central audit log · {audit.length} events
            </div>
            <ul className="max-h-[60vh] divide-y divide-slate-50 overflow-y-auto">
              {audit.length === 0 && (
                <li className="px-4 py-10 text-center text-[12px] text-slate-400">
                  Actions across modules will appear here (create, edit, delete,
                  status, login).
                </li>
              )}
              {audit.map((e) => (
                <li key={e.id} className="px-4 py-2.5 text-[12px]">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-slate-400">{e.at}</span>
                    <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                      {e.action}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {e.summary}
                    </span>
                    <span className="text-slate-400">
                      · {e.module} · {e.actor}
                    </span>
                  </div>
                  {e.changes && e.changes.length > 0 && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Fields:{" "}
                      {e.changes
                        .map(
                          (c) =>
                            `${c.field}: ${String(c.from ?? "")} → ${String(c.to ?? "")}`,
                        )
                        .join("; ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "bin" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 text-[12px] font-semibold text-slate-700">
              Recycle Bin · unlimited retention · {bin.length} items
            </div>
            <ul className="divide-y divide-slate-50">
              {bin.length === 0 && (
                <li className="px-4 py-10 text-center text-[12px] text-slate-400">
                  Deleted records land here (e.g. Support tickets).
                </li>
              )}
              {bin.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[12px]"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {item.recordLabel}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.recordType} · {item.module} · deleted{" "}
                      {item.deletedAt} by {item.deletedBy}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canRestoreModule(item.module)}
                    onClick={() => {
                      const result = restoreRecord(item.id);
                      if (!result.ok) {
                        window.alert(result.message);
                        return;
                      }
                      refresh();
                    }}
                    className="h-8 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "rbac" && (
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-[13px] font-bold text-slate-900">
                Hierarchy levels
              </h2>
              <ul className="space-y-2">
                {ROLES.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                  >
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {r.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      L{r.level}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-[13px] font-bold text-slate-900">
                Sample grants
              </h2>
              <p className="mb-2 text-[11px] text-slate-400">
                Module · field · record (Owner/Team/Public) · action
              </p>
              <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
                {PERMISSION_GRANTS.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-xl border border-slate-100 px-3 py-2 text-[11px]"
                  >
                    <span className="font-semibold text-violet-700">
                      {g.role}
                    </span>
                    <span className="text-slate-400"> · {g.scope} · </span>
                    <span className="font-medium text-slate-800">
                      {g.resource}
                    </span>
                    <span
                      className={cn(
                        "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        g.allowed
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700",
                      )}
                    >
                      {g.allowed ? "allow" : "deny"}
                    </span>
                    {g.recordAccess && (
                      <p className="mt-0.5 text-slate-400">
                        Record: {g.recordAccess.join(" / ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
