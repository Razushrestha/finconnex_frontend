"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  createCrmUser,
  deleteCrmUser,
  listCrmUsers,
  updateCrmUser,
  type CrmUser,
  type CrmUserStatus,
} from "@/lib/settings/users-store";
import { ROLES, type HierarchyLevel } from "@/lib/rules/permissions";

const ROLE_OPTIONS = ROLES.map((r) => r.name);

/** Settings → Users & Access → Users */
export function UsersSettingsClient() {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    role: "User" as HierarchyLevel,
    team: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  function refresh() {
    setUsers(listCrmUsers());
  }

  useEffect(() => {
    refresh();
  }, []);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2400);
  }

  function resetDraft() {
    setDraft({ name: "", email: "", role: "User", team: "" });
    setEditingId(null);
  }

  function saveUser() {
    if (!draft.name.trim() || !draft.email.trim()) {
      flash("Name and email are required");
      return;
    }
    if (editingId) {
      updateCrmUser(editingId, {
        name: draft.name,
        email: draft.email,
        role: draft.role,
        team: draft.team,
      });
      flash("User updated");
    } else {
      createCrmUser(draft);
      flash("User invited");
    }
    resetDraft();
    refresh();
  }

  function startEdit(u: CrmUser) {
    setEditingId(u.id);
    setDraft({
      name: u.name,
      email: u.email,
      role: u.role,
      team: u.team ?? "",
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <h2 className="text-[16px] font-bold text-slate-900">Users</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          Demo user directory — invite, edit role/status, deactivate. Login still
          uses the static admin credential.
        </p>
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">{message}</p>
        ) : null}
      </div>

      <div className="space-y-3 border-b border-slate-100 px-5 py-4">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          {editingId ? "Edit user" : "Invite user"}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Full name"
            className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
          />
          <input
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            placeholder="Email"
            className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
          />
          <select
            value={draft.role}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                role: e.target.value as HierarchyLevel,
              }))
            }
            className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={draft.team}
            onChange={(e) => setDraft((d) => ({ ...d, team: e.target.value }))}
            placeholder="Team"
            className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveUser}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            {editingId ? "Save" : "Invite"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetDraft}
              className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      <ul className="divide-y divide-slate-50">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          >
            <div>
              <p className="text-[13px] font-semibold text-slate-800">{u.name}</p>
              <p className="text-[11px] text-slate-500">
                {u.email} · {u.role}
                {u.team ? ` · ${u.team}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={u.status}
                onChange={(e) => {
                  updateCrmUser(u.id, {
                    status: e.target.value as CrmUserStatus,
                  });
                  refresh();
                  flash("Status updated");
                }}
                className="h-8 rounded-lg border border-slate-200 px-2 text-[11px] font-medium text-slate-700"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Invited">Invited</option>
              </select>
              <button
                type="button"
                aria-label={`Edit ${u.name}`}
                onClick={() => startEdit(u)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${u.name}`}
                disabled={u.id === "user_john"}
                onClick={() => {
                  if (deleteCrmUser(u.id)) {
                    flash("User removed");
                    refresh();
                  } else {
                    flash("Cannot remove primary admin");
                  }
                }}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
