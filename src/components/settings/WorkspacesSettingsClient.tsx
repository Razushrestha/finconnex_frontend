"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  listAdminWorkspaces,
  type AdminWorkspace,
} from "@/lib/admin/api";
import { leaveCrmWorkspace } from "@/lib/workspace-operations/api";
import { useCrmWorkspaceProfile } from "@/lib/workspace-operations/use-crm-workspace-profile";
import {
  createCrmWorkspace,
  deleteCrmWorkspace,
  getCrmWorkspace,
  persistRemoteWorkspace,
  tryCrmWorkspace,
  updateCrmWorkspace,
} from "@/lib/workspaces/api";
import { useCrmMyWorkspaces } from "@/lib/workspaces/use-crm-my-workspaces";
import {
  deleteStoredWorkspace,
  listStoredWorkspaces,
  type CrmWorkspaceRecord,
} from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Settings → Users & Access → Workspaces (platform admin). */
export function WorkspacesSettingsClient() {
  const current = useCrmWorkspaceProfile();
  const mine = useCrmMyWorkspaces();
  const [myRows, setMyRows] = useState<CrmWorkspaceRecord[]>([]);
  const [draft, setDraft] = useState({ name: "", slug: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: "", slug: "" });
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<AdminWorkspace[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveNote, setLeaveNote] = useState<string | null>(null);

  const refresh = useCallback(async (q: string) => {
    setError(null);
    const page = await listAdminWorkspaces({ page: 1, limit: 50, search: q });
    setItems(page.items);
    setTotal(page.total);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh("");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load workspaces (admin only)",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    setMyRows(listStoredWorkspaces());
  }, [mine.source, mine.loading]);

  useEffect(() => {
    const id = current.profile?.id;
    if (!id) return;
    void tryCrmWorkspace(() => getCrmWorkspace(id)).then((row) => {
      if (row) persistRemoteWorkspace(row);
    });
  }, [current.profile?.id]);

  async function onCreate() {
    if (!draft.name.trim()) {
      setLeaveNote("Workspace name is required");
      return;
    }
    setBusy(true);
    try {
      persistRemoteWorkspace(
        await createCrmWorkspace({
          name: draft.name,
          slug: draft.slug,
        }),
      );
      setDraft({ name: "", slug: "" });
      mine.refresh();
      setLeaveNote("Workspace created");
    } catch (err) {
      setLeaveNote(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit(id: string) {
    setBusy(true);
    try {
      persistRemoteWorkspace(
        await updateCrmWorkspace(id, { name: edit.name, slug: edit.slug }),
      );
      setEditId(null);
      mine.refresh();
      current.refresh();
      setLeaveNote("Workspace updated");
    } catch (err) {
      setLeaveNote(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(row: CrmWorkspaceRecord) {
    if (!window.confirm(`Soft-delete workspace “${row.name}”?`)) return;
    setBusy(true);
    try {
      await deleteCrmWorkspace(row.id);
      deleteStoredWorkspace(row.id);
      mine.refresh();
      setLeaveNote("Workspace deleted");
    } catch (err) {
      setLeaveNote(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function onLeave() {
    if (!window.confirm("Leave this workspace? Records may need reassignment.")) {
      return;
    }
    setLeaving(true);
    setLeaveNote(null);
    try {
      await leaveCrmWorkspace();
      setLeaveNote("You left the workspace.");
      current.refresh();
    } catch (err) {
      setLeaveNote(err instanceof Error ? err.message : "Could not leave");
    } finally {
      setLeaving(false);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await refresh(search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const profile = current.profile;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[16px] font-bold text-slate-900">
              Current workspace
            </h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                current.source === "api"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {current.source === "api"
                ? "Live CRM"
                : current.loading
                  ? "Connecting…"
                  : "Demo"}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Profile, plan, limits, usage, locale, and setup checklist.
          </p>
          {leaveNote ? (
            <p className="mt-2 text-[12px] font-medium text-violet-700">
              {leaveNote}
            </p>
          ) : null}
        </div>
        {profile ? (
          <div className="space-y-3 px-5 py-4">
            <div>
              <p className="text-[13px] font-semibold text-slate-800">
                {profile.name}
              </p>
              <p className="text-[11px] text-slate-500">
                {profile.slug || profile.id} · {profile.status} · {profile.plan}
              </p>
              <p className="text-[11px] text-slate-500">
                {[profile.locale, profile.timezone, profile.language, profile.currency]
                  .filter(Boolean)
                  .join(" · ") || "No locale set"}
              </p>
            </div>
            {Object.keys(profile.usage).length || Object.keys(profile.limits).length ? (
              <p className="text-[11px] text-slate-500">
                Usage{" "}
                {Object.entries(profile.usage)
                  .slice(0, 4)
                  .map(([k, v]) => `${k} ${v}${profile.limits[k] != null ? `/${profile.limits[k]}` : ""}`)
                  .join(" · ") || "—"}
              </p>
            ) : null}
            {profile.checklist.length ? (
              <ul className="space-y-1">
                {profile.checklist.map((item) => (
                  <li key={item.id} className="text-[11px] text-slate-600">
                    {item.done ? "✓" : "○"} {item.label}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              disabled={leaving}
              onClick={() => void onLeave()}
              className="h-8 rounded-lg border border-rose-200 px-3 text-[11px] font-semibold text-rose-700 disabled:opacity-50"
            >
              Leave workspace
            </button>
          </div>
        ) : (
          <p className="px-5 py-6 text-[12px] text-slate-400">
            {current.error ?? "Workspace profile unavailable."}
          </p>
        )}
      </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[16px] font-bold text-slate-900">My workspaces</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              mine.source === "api"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {mine.source === "api"
              ? "Live CRM"
              : mine.loading
                ? "Connecting…"
                : "Demo"}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-slate-500">
          List, create, update, and soft-delete workspaces you belong to.
        </p>
        {mine.error && mine.source !== "api" ? (
          <p className="mt-2 text-[12px] font-medium text-amber-700">
            {mine.error}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 border-b border-slate-100 px-5 py-4 sm:grid-cols-2">
        <input
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="New workspace name"
          className="h-9 rounded-lg border border-slate-200 px-3 text-[12px]"
        />
        <input
          value={draft.slug}
          onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
          placeholder="Slug (optional)"
          className="h-9 rounded-lg border border-slate-200 px-3 text-[12px]"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCreate()}
          className="h-8 w-fit rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          Create workspace
        </button>
      </div>
      <ul className="divide-y divide-slate-50">
        {myRows.length === 0 ? (
          <li className="px-5 py-8 text-center text-[12px] text-slate-400">
            No workspaces yet.
          </li>
        ) : (
          myRows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              {editId === row.id ? (
                <div className="flex w-full flex-wrap gap-2">
                  <input
                    value={edit.name}
                    onChange={(e) =>
                      setEdit((d) => ({ ...d, name: e.target.value }))
                    }
                    className="h-8 min-w-[140px] flex-1 rounded-lg border border-slate-200 px-2 text-[12px]"
                  />
                  <input
                    value={edit.slug}
                    onChange={(e) =>
                      setEdit((d) => ({ ...d, slug: e.target.value }))
                    }
                    className="h-8 min-w-[120px] flex-1 rounded-lg border border-slate-200 px-2 text-[12px]"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onSaveEdit(row.id)}
                    className="h-8 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditId(null)}
                    className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800">
                      {row.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {row.slug} · {row.status} · {row.plan}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(row.id);
                        setEdit({ name: row.name, slug: row.slug });
                      }}
                      className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDelete(row)}
                      className="h-7 rounded-lg border border-rose-200 px-2 text-[10px] font-semibold text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">All workspaces</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Platform admin list of every CRM workspace.
        </p>
        {error ? (
          <p className="mt-2 text-[12px] font-medium text-rose-600">{error}</p>
        ) : null}
      </div>

      <form
        onSubmit={onSearch}
        className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or slug"
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
        />
        <button
          type="submit"
          className="h-9 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
        >
          Search
        </button>
        <span className="text-[11px] text-slate-400">{total} total</span>
      </form>

      {loading && items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-slate-400">
          Loading workspaces…
        </p>
      ) : items.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-slate-400">
          No workspaces returned.
        </p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {items.map((ws) => (
            <li
              key={ws.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">
                  {ws.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {ws.slug} · {ws.plan} · {ws.memberCount} members
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p className="font-semibold text-slate-700">{ws.status}</p>
                <p>{formatWhen(ws.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
    </div>
  );
}
