"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Search,
  Route,
  Copy,
  Play,
  Pause,
} from "lucide-react";
import {
  JOURNEY_STATUS_STYLE,
  JOURNEY_STATUSES,
  JOURNEY_TRIGGERS,
  activeEnrollmentCount,
  cloneJourney,
  listJourneys,
  overallConversion,
  seedJourneys,
  upsertJourney,
  type JourneyStatus,
  type JourneyTrigger,
  type LifecycleJourney,
} from "@/lib/journeys/types";
import { cn } from "@/lib/utils";

export default function JourneysPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LifecycleJourney[]>(seedJourneys);
  const [statusFilter, setStatusFilter] = useState<JourneyStatus | "All">(
    "All",
  );
  const [triggerFilter, setTriggerFilter] = useState<JourneyTrigger | "All">(
    "All",
  );
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setRows(listJourneys());
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }

  const filtered = useMemo(() => {
    let data = rows;
    if (statusFilter !== "All")
      data = data.filter((j) => j.status === statusFilter);
    if (triggerFilter !== "All")
      data = data.filter((j) => j.trigger === triggerFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (j) =>
          j.name.toLowerCase().includes(q) ||
          j.journeyId.toLowerCase().includes(q) ||
          j.createdBy.toLowerCase().includes(q),
      );
    }
    return data;
  }, [rows, statusFilter, triggerFilter, search]);

  function toggleStatus(j: LifecycleJourney) {
    const nextStatus: JourneyStatus =
      j.status === "Active" ? "Paused" : "Active";
    const updated = upsertJourney({
      ...j,
      status: nextStatus,
      updatedAt: new Date().toLocaleString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    setRows(listJourneys());
    flash(`${updated.journeyId} → ${nextStatus}`);
  }

  function onClone(j: LifecycleJourney) {
    const copy = upsertJourney(cloneJourney(j));
    setRows(listJourneys());
    flash(`Cloned as ${copy.journeyId}`);
    router.push(`/journeys/${copy.id}`);
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Journeys
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Route className="h-2.5 w-2.5" />
              Lifecycle
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/journeys/create")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Build journey
          </button>
        </div>

        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("All")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              statusFilter === "All"
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200",
            )}
          >
            All {rows.length}
          </button>
          {JOURNEY_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                statusFilter === s
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              {s} {rows.filter((j) => j.status === s).length}
            </button>
          ))}
          <select
            value={triggerFilter}
            onChange={(e) =>
              setTriggerFilter(e.target.value as JourneyTrigger | "All")
            }
            className="ml-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none"
          >
            <option value="All">All triggers</option>
            {JOURNEY_TRIGGERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search journeys…"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-[12px] outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2.5">Journey</th>
                <th className="px-3 py-2.5">Trigger</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Steps</th>
                <th className="px-3 py-2.5">Enrolled</th>
                <th className="px-3 py-2.5">Conversion</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => (
                <tr
                  key={j.id}
                  className="border-t border-slate-50 hover:bg-violet-50/40"
                >
                  <td
                    className="cursor-pointer px-4 py-3"
                    onClick={() => router.push(`/journeys/${j.id}`)}
                  >
                    <div className="font-semibold text-slate-900">
                      {j.journeyId}
                    </div>
                    <div className="text-[11px] text-slate-700">{j.name}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{j.trigger}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        JOURNEY_STATUS_STYLE[j.status],
                      )}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{j.steps.length}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">
                    {activeEnrollmentCount(j)}
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-800">
                    {overallConversion(j)}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        title={j.status === "Active" ? "Pause" : "Activate"}
                        onClick={() => toggleStatus(j)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                      >
                        {j.status === "Active" ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Clone"
                        onClick={() => onClone(j)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    No journeys match
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
