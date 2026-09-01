"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { deleteAdminUser } from "@/lib/admin/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  createCrmUser,
  deleteCrmUser,
  listCrmUsers,
  updateCrmUser,
  type CrmUser,
  type CrmUserStatus,
} from "@/lib/settings/users-store";
import { ROLES, type HierarchyLevel } from "@/lib/rules/permissions";
import {
  cancelCrmWorkspaceInvitation,
  deleteCrmWorkspaceMember,
  inviteCrmWorkspaceMember,
  persistRemoteWorkspaceMember,
  resendCrmWorkspaceInvitation,
  transferCrmWorkspaceOwnership,
  updateCrmWorkspaceMember,
} from "@/lib/workspace-members/api";
import {
  activateCrmWorkspaceMember,
  deactivateCrmWorkspaceMember,
} from "@/lib/workspace-operations/api";
import { useCrmWorkspaceMembers } from "@/lib/workspace-members/use-crm-workspace-members";
import {
  deleteWorkspaceMember,
  listWorkspaceMembers,
  type WorkspaceMember,
} from "@/lib/workspace-members/types";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = ROLES.map((r) => r.name);

/** Settings → Users & Access → Users */
export function UsersSettingsClient() {
  const [memberQuery, setMemberQuery] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const crm = useCrmWorkspaceMembers({ search: memberSearch });
  const live = crm.source === "api";
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    role: "User" as HierarchyLevel,
    team: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  function refreshLocal() {
    setUsers(listCrmUsers());
    setMembers(listWorkspaceMembers());
  }

  useEffect(() => {
    refreshLocal();
  }, [crm.source, crm.loading]);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2400);
  }

  function resetDraft() {
    setDraft({ name: "", email: "", role: "User", team: "" });
    setEditingId(null);
  }

  async function saveUser() {
    if (!draft.name.trim() || !draft.email.trim()) {
      flash("Name and email are required");
      return;
    }
    if (live) {
      setBusy(true);
      try {
        if (editingId) {
          persistRemoteWorkspaceMember(
            await updateCrmWorkspaceMember(editingId, { role: draft.role }),
          );
          flash("Member role updated");
        } else {
          persistRemoteWorkspaceMember(
            await inviteCrmWorkspaceMember({
              email: draft.email,
              name: draft.name,
              role: draft.role,
            }),
          );
          flash("Invitation sent");
        }
        resetDraft();
        crm.refresh();
      } catch (err) {
        flash(err instanceof Error ? err.message : "Could not save member");
      } finally {
        setBusy(false);
      }
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
    refreshLocal();
  }

  async function removeUser(u: CrmUser) {
    if (isUuid(u.id)) {
      try {
        await deleteAdminUser(u.id);
      } catch (err) {
        flash(err instanceof Error ? err.message : "Could not delete user");
        return;
      }
    }
    const removed = deleteCrmUser(u.id);
    if (removed || isUuid(u.id)) {
      flash("User removed");
      refreshLocal();
      return;
    }
    flash("Cannot remove primary admin");
  }

  async function removeMember(row: WorkspaceMember) {
    if (!window.confirm(`Remove ${row.name} from this workspace?`)) return;
    setBusy(true);
    try {
      await deleteCrmWorkspaceMember(row.id);
      deleteWorkspaceMember(row.id);
      crm.refresh();
      flash("Member removed");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not remove member");
    } finally {
      setBusy(false);
    }
  }

  async function onResend(row: WorkspaceMember) {
    setBusy(true);
    try {
      persistRemoteWorkspaceMember(await resendCrmWorkspaceInvitation(row.id));
      flash("Invitation resent");
      crm.refresh();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Resend failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCancelInvite(row: WorkspaceMember) {
    if (!window.confirm(`Cancel invitation for ${row.email}?`)) return;
    setBusy(true);
    try {
      await cancelCrmWorkspaceInvitation(row.id);
      deleteWorkspaceMember(row.id);
      crm.refresh();
      flash("Invitation cancelled");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAccept(row: WorkspaceMember) {
    setBusy(true);
    try {
      persistRemoteWorkspaceMember(
        await updateCrmWorkspaceMember(row.id, { accept: true }),
      );
      crm.refresh();
      flash("Invitation accepted");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setBusy(false);
    }
  }

  async function onToggleActive(row: WorkspaceMember) {
    setBusy(true);
    try {
      const next =
        row.status === "Inactive"
          ? await activateCrmWorkspaceMember(row.id)
          : await deactivateCrmWorkspaceMember(row.id);
      persistRemoteWorkspaceMember(next);
      crm.refresh();
      flash(row.status === "Inactive" ? "Member activated" : "Member deactivated");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onTransfer(row: WorkspaceMember) {
    if (!window.confirm(`Transfer workspace ownership to ${row.name}?`)) return;
    setBusy(true);
    try {
      persistRemoteWorkspaceMember(
        await transferCrmWorkspaceOwnership(row.id),
      );
      crm.refresh();
      flash("Ownership transferred");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  function startEditUser(u: CrmUser) {
    setEditingId(u.id);
    setDraft({
      name: u.name,
      email: u.email,
      role: u.role,
      team: u.team ?? "",
    });
  }

  function startEditMember(row: WorkspaceMember) {
    setEditingId(row.id);
    setDraft({
      name: row.name,
      email: row.email,
      role: row.role,
      team: row.team ?? "",
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[16px] font-bold text-slate-900">Users</h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              live
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {live ? "Live CRM" : crm.loading ? "Connecting…" : "Demo"}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {live
            ? "Workspace members — invite, update role, resend or cancel invitations, remove, and transfer ownership."
            : "Demo user directory — invite and edit locally. Deleting a UUID user calls DELETE /v1/admin/user/:id (platform admin)."}
        </p>
        {live ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
              Joined {crm.summary.joined}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
              Pending {crm.summary.pending}
            </span>
          </div>
        ) : null}
        {crm.error && !live ? (
          <p className="mt-2 text-[12px] font-medium text-amber-700">
            {crm.error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-2 text-[12px] font-medium text-violet-700">
            {message}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 border-b border-slate-100 px-5 py-4">
        <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          {editingId ? (live ? "Edit member role" : "Edit user") : "Invite user"}
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
            disabled={live && Boolean(editingId)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400 disabled:bg-slate-50"
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
          {!live ? (
            <input
              value={draft.team}
              onChange={(e) => setDraft((d) => ({ ...d, team: e.target.value }))}
              placeholder="Team"
              className="h-9 rounded-lg border border-slate-200 px-3 text-[12px] outline-none focus:border-violet-400"
            />
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveUser()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
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

      {live ? (
        <form
          className="flex items-center gap-2 border-b border-slate-100 px-5 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            setMemberSearch(memberQuery.trim());
          }}
        >
          <input
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
            placeholder="Search members and invitations…"
            className="h-8 flex-1 rounded-lg border border-slate-200 px-2.5 text-[12px]"
          />
          <button
            type="submit"
            className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700"
          >
            Search
          </button>
        </form>
      ) : null}

      {live ? (
        <ul className="divide-y divide-slate-50">
          {members.length === 0 ? (
            <li className="px-5 py-10 text-center text-[12px] text-slate-400">
              No workspace members.
            </li>
          ) : (
            members.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">
                    {row.name}
                    {row.isOwner ? (
                      <span className="ml-1.5 text-[10px] font-semibold text-violet-600">
                        Owner
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {row.email} · {row.role} · {row.status}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {row.status === "Invited" ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onAccept(row)}
                        className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onResend(row)}
                        className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600"
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onCancelInvite(row)}
                        className="h-7 rounded-lg border border-rose-200 px-2 text-[10px] font-semibold text-rose-700"
                      >
                        Cancel invite
                      </button>
                    </>
                  ) : (
                    <>
                      {!row.isOwner ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onToggleActive(row)}
                          className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600"
                        >
                          {row.status === "Inactive" ? "Activate" : "Deactivate"}
                        </button>
                      ) : null}
                      {!row.isOwner ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void onTransfer(row)}
                          className="h-7 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600"
                        >
                          Make owner
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label={`Edit ${row.name}`}
                        onClick={() => startEditMember(row)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${row.name}`}
                        disabled={busy || row.isOwner}
                        onClick={() => void removeMember(row)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      ) : (
        <ul className="divide-y divide-slate-50">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <p className="text-[13px] font-semibold text-slate-800">
                  {u.name}
                </p>
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
                    refreshLocal();
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
                  onClick={() => startEditUser(u)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${u.name}`}
                  disabled={u.id === "user_john"}
                  onClick={() => {
                    void removeUser(u);
                  }}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
