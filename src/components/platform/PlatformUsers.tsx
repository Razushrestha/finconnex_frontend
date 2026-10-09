"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Search } from "lucide-react";
import { deleteAdminUser } from "@/lib/admin/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import { confirmDialog } from "@/lib/notify/dialog";
import {
  listPlatformUsers,
  setPlatformUserGlobalRole,
  type PlatformGlobalRole,
  type PlatformUser,
} from "@/lib/platform/api";

const GLOBAL_ROLES: PlatformGlobalRole[] = [
  "USER",
  "ADMIN",
  "DEVELOPER",
  "SUPER_ADMIN",
];

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PlatformUsers() {
  const [items, setItems] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});

  const [deleteId, setDeleteId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteNote, setDeleteNote] = useState<string | null>(null);
  const limit = 20;

  const refresh = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPlatformUsers({ page: p, limit, search: q });
      setItems(result.items);
      setTotal(result.total);
      setRoleDraft(
        Object.fromEntries(result.items.map((u) => [u.id, u.globalRole])),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(query, page);
  }, [refresh, query, page]);

  async function saveRole(user: PlatformUser) {
    const next = (roleDraft[user.id] ?? user.globalRole).toUpperCase();
    if (next === user.globalRole.toUpperCase()) return;
    if (
      !(await confirmDialog({
        title: "Change global role?",
        message: `Set ${user.email || user.userName} globalRole to ${next}?`,
        confirmText: "Change role",
      }))
    ) {
      setRoleDraft((prev) => ({ ...prev, [user.id]: user.globalRole }));
      return;
    }
    setBusyId(user.id);
    setError(null);
    try {
      await setPlatformUserGlobalRole(user.id, next);
      await refresh(query, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update role");
      setRoleDraft((prev) => ({ ...prev, [user.id]: user.globalRole }));
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(event: FormEvent) {
    event.preventDefault();
    setDeleteNote(null);
    setError(null);
    const id = deleteId.trim();
    if (!isUuid(id)) {
      setError("Enter the user’s UUID from Nest (User.id).");
      return;
    }
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setError("Type DELETE to confirm. This cannot be undone from the UI.");
      return;
    }
    setDeleteBusy(true);
    try {
      await deleteAdminUser(id);
      setDeleteNote(`Deleted user ${id}.`);
      setDeleteId("");
      setDeleteConfirm("");
      await refresh(query, page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Platform users
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Cross-tenant directory via{" "}
            <span className="font-mono text-[12px]">GET /v1/platform/users</span>
            . Role changes call{" "}
            <span className="font-mono text-[12px]">
              PATCH /v1/platform/users/:id/global-role
            </span>
            .
          </p>
        </div>
        <form
          className="relative w-full sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or name"
            className="h-11 w-full rounded-full border border-slate-200 bg-white pr-4 pl-10 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
          />
        </form>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-sm shadow-slate-200/60">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Global role</th>
                <th className="px-5 py-3">Workspaces</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-slate-400">
                    No users match this search.
                  </td>
                </tr>
              ) : (
                items.map((user) => {
                  const draft = roleDraft[user.id] ?? user.globalRole;
                  const dirty =
                    draft.toUpperCase() !== user.globalRole.toUpperCase();
                  return (
                    <tr key={user.id} className="hover:bg-violet-50/40">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {user.name || user.userName || "—"}
                        </p>
                        <p className="text-[12px] text-slate-500">{user.email}</p>
                        <p className="font-mono text-[10px] text-slate-400">
                          {user.id}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={draft}
                          disabled={busyId === user.id}
                          onChange={(e) =>
                            setRoleDraft((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                          className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[12px] outline-none focus:border-[var(--brand-primary)]"
                        >
                          {GLOBAL_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                          {!GLOBAL_ROLES.includes(
                            user.globalRole as PlatformGlobalRole,
                          ) ? (
                            <option value={user.globalRole}>
                              {user.globalRole}
                            </option>
                          ) : null}
                        </select>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {user.workspaceCount}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {formatWhen(user.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          disabled={!dirty || busyId === user.id}
                          onClick={() => void saveRole(user)}
                          className="inline-flex h-8 items-center rounded-full bg-[var(--brand-primary)] px-3 text-[11px] font-semibold text-white disabled:opacity-40"
                        >
                          {busyId === user.id ? "Saving…" : "Save role"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[12px] text-slate-500">
          <span>
            {total} user{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full px-3 py-1 ring-1 ring-slate-200 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-1 py-1">
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full px-3 py-1 ring-1 ring-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => void onDelete(e)}
        className="space-y-4 rounded-3xl border border-rose-100 bg-white p-6 shadow-sm"
      >
        <div>
          <h3 className="text-lg font-semibold text-rose-800">
            Dangerous user delete
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Legacy{" "}
            <span className="font-mono text-[12px]">
              DELETE /v1/admin/user/:id
            </span>{" "}
            — removes the global user record, not a single membership.
          </p>
        </div>
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Prefer soft lifecycle on workspaces. Use this only when you already
          know the UUID.
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">User id</span>
          <input
            value={deleteId}
            onChange={(e) => setDeleteId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
            className="h-11 w-full rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
            disabled={deleteBusy}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">
            Type DELETE to confirm
          </span>
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
            disabled={deleteBusy}
          />
        </label>
        {deleteNote ? (
          <p className="text-sm text-emerald-700">{deleteNote}</p>
        ) : null}
        <button
          type="submit"
          disabled={deleteBusy}
          className="inline-flex h-11 items-center rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {deleteBusy ? "Deleting…" : "Delete user"}
        </button>
      </form>
    </div>
  );
}
