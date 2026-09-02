"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
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
  importCrmWorkspaceMembers,
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
const TEAMS = ["Sales", "Marketing", "Support", "Operations"];
const PAGE_SIZES = [10, 25, 50];

const ROLE_CARD = {
  "System Admin": {
    icon: Shield,
    wrap: "bg-violet-100 text-violet-700",
  },
  "Org Admin": {
    icon: Building2,
    wrap: "bg-sky-100 text-sky-700",
  },
  Manager: {
    icon: Briefcase,
    wrap: "bg-emerald-100 text-emerald-700",
  },
  "Team Lead": {
    icon: Users,
    wrap: "bg-amber-100 text-amber-700",
  },
  User: {
    icon: UserRound,
    wrap: "bg-indigo-100 text-indigo-700",
  },
  "Read Only": {
    icon: Eye,
    wrap: "bg-slate-100 text-slate-600",
  },
} as const;

const ROLE_PILL: Record<HierarchyLevel, string> = {
  "System Admin": "bg-violet-100 text-violet-800",
  "Org Admin": "bg-sky-100 text-sky-800",
  Manager: "bg-emerald-100 text-emerald-800",
  "Team Lead": "bg-amber-100 text-amber-800",
  User: "bg-indigo-100 text-indigo-800",
  "Read Only": "bg-slate-100 text-slate-700",
};

const AVATAR_TONES = [
  "bg-violet-600",
  "bg-sky-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
];

type DirectoryRow = {
  id: string;
  name: string;
  email: string;
  role: HierarchyLevel;
  team: string;
  status: CrmUserStatus;
  isOwner: boolean;
  joinedAt?: string;
  source: "member" | "user";
  member?: WorkspaceMember;
  user?: CrmUser;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function avatarTone(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash] ?? AVATAR_TONES[0];
}

function formatJoined(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fieldClass() {
  return "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
}

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
  const [roleFilter, setRoleFilter] = useState<HierarchyLevel | "All">("All");
  const [teamFilter, setTeamFilter] = useState("All");
  const [tableQuery, setTableQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);
  const inviteRef = useRef<HTMLDivElement>(null);

  function refreshLocal() {
    setUsers(listCrmUsers());
    setMembers(listWorkspaceMembers());
  }

  useEffect(() => {
    refreshLocal();
  }, [crm.source, crm.loading]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, teamFilter, tableQuery, live]);

  function flash(msg: string) {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2400);
  }

  function resetDraft() {
    setDraft({ name: "", email: "", role: "User", team: "" });
    setEditingId(null);
  }

  const rows: DirectoryRow[] = useMemo(() => {
    if (live) {
      return members.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        team: row.team ?? "",
        status: row.status,
        isOwner: row.isOwner,
        joinedAt: row.joinedAt,
        source: "member" as const,
        member: row,
      }));
    }
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team: user.team ?? "",
      status: user.status,
      isOwner: user.id === "user_john",
      joinedAt: user.joinedAt,
      source: "user" as const,
      user,
    }));
  }, [live, members, users]);

  const roleCounts = useMemo(() => {
    const counts = Object.fromEntries(ROLE_OPTIONS.map((role) => [role, 0])) as Record<
      HierarchyLevel,
      number
    >;
    for (const row of rows) counts[row.role] += 1;
    return counts;
  }, [rows]);

  const teams = useMemo(() => {
    const set = new Set(TEAMS);
    for (const row of rows) if (row.team) set.add(row.team);
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== "All" && row.role !== roleFilter) return false;
      if (teamFilter !== "All" && row.team !== teamFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q) ||
        row.team.toLowerCase().includes(q)
      );
    });
  }, [rows, roleFilter, teamFilter, tableQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  async function saveUser(mode: "invite" | "add" = "invite") {
    if (!draft.name.trim() || !draft.email.trim()) {
      flash("Name and email are required");
      return;
    }
    if (live) {
      setBusy(true);
      try {
        if (editingId) {
          persistRemoteWorkspaceMember(
            await updateCrmWorkspaceMember(editingId, {
              role: draft.role,
              team: draft.team,
            }),
          );
          flash("Member updated");
        } else {
          persistRemoteWorkspaceMember(
            await inviteCrmWorkspaceMember({
              email: draft.email,
              name: draft.name,
              role: draft.role,
              team: draft.team,
              joinImmediately: mode === "add",
            }),
          );
          flash(
            mode === "add" ? "User added to the workspace" : "Invitation sent",
          );
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
      createCrmUser({
        ...draft,
        status: mode === "add" ? "Active" : "Invited",
      });
      flash(mode === "add" ? "User added" : "Invitation sent");
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
    setInviteOpen(true);
    inviteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startEditMember(row: WorkspaceMember) {
    setEditingId(row.id);
    setDraft({
      name: row.name,
      email: row.email,
      role: row.role,
      team: row.team ?? "",
    });
    setInviteOpen(true);
    inviteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function importCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        const text = String(reader.result ?? "");
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        const rows: Array<{
          name: string;
          email: string;
          role: HierarchyLevel;
          team?: string;
        }> = [];
        for (const line of lines) {
          const [name, email, roleRaw, team] = line
            .split(",")
            .map((p) => p.trim());
          if (!name || !email || name.toLowerCase() === "name") continue;
          const role = ROLE_OPTIONS.includes(roleRaw as HierarchyLevel)
            ? (roleRaw as HierarchyLevel)
            : "User";
          rows.push({ name, email, role, team });
        }
        if (!rows.length) {
          flash("No valid rows found");
          return;
        }
        if (live) {
          setBusy(true);
          try {
            const result = await importCrmWorkspaceMembers(
              rows.map((row) => ({
                ...row,
                joinImmediately: false,
              })),
            );
            crm.refresh();
            const failed = result.failed.length;
            flash(
              failed
                ? `Imported ${result.invited} users, ${failed} failed`
                : `Imported ${result.invited} users`,
            );
          } catch (err) {
            flash(err instanceof Error ? err.message : "Import failed");
          } finally {
            setBusy(false);
          }
          return;
        }
        for (const row of rows) createCrmUser(row);
        refreshLocal();
        flash(`Imported ${rows.length} users`);
      })();
    };
    reader.readAsText(file);
  }

  const canSend = Boolean(draft.name.trim() && draft.email.trim()) && !busy;

  return (
    <div className="mx-auto flex max-w-[1920px] flex-col gap-5 p-4 sm:p-5 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
              Users
            </h1>
            <p className="mt-0.5 max-w-xl text-[13px] text-slate-500">
              Invite teammates by email and assign a workspace role. Owners and
              admins can change roles, send invitations, and remove members.
            </p>
          </div>
        </div>
        <form
          className="relative w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setMemberSearch(memberQuery.trim());
            setTableQuery(memberQuery.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={memberQuery}
            onChange={(e) => {
              setMemberQuery(e.target.value);
              setTableQuery(e.target.value);
            }}
            placeholder="Search users, email or role..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-14 text-[13px] outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
            ⌘K
          </kbd>
        </form>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ROLES.map((role) => {
          const meta = ROLE_CARD[role.name];
          const Icon = meta.icon;
          const selected = roleFilter === role.name;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() =>
                setRoleFilter((current) =>
                  current === role.name ? "All" : role.name,
                )
              }
              className={cn(
                "rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors",
                selected
                  ? "border-violet-400 ring-2 ring-violet-100"
                  : "border-slate-200 hover:border-slate-300",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    meta.wrap,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[18px] font-semibold text-slate-400">
                  {roleCounts[role.name]}
                </span>
              </div>
              <p className="mt-3 text-[14px] font-semibold text-slate-900">
                {role.name}
              </p>
              <p className="mt-1 text-[12px] leading-snug text-slate-500">
                {role.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-slate-900">Users</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                live
                  ? "bg-violet-100 text-violet-700"
                  : "bg-violet-100 text-violet-700",
              )}
            >
              {live ? "Live CRM" : crm.loading ? "Connecting…" : "Demo"}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-[12px] text-slate-500">
            {live
              ? "Workspace members — invite, update role, resend or cancel invitations, remove, and transfer ownership."
              : "Demo user directory — invite and edit locally. Deleting a UUID user calls DELETE /v1/admin/user/:id (platform admin)."}
          </p>
          {live ? (
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Joined {crm.summary.joined} · Pending {crm.summary.pending}
            </p>
          ) : null}
          {crm.error && !live ? (
            <p className="mt-1 text-[12px] font-medium text-amber-700">
              Sign in with a workspace to manage members
            </p>
          ) : null}
          {message ? (
            <p className="mt-1 text-[12px] font-medium text-violet-700">
              {message}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <>
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) importCsv(file);
              }}
            />
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-3.5 w-3.5" />
              Import Users
            </button>
          </>
          <button
            type="button"
            onClick={() => {
              setInviteOpen(true);
              inviteRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Invite User
          </button>
        </div>
      </div>

      {inviteOpen ? (
        <div
          ref={inviteRef}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-violet-600" />
            <h3 className="text-[14px] font-semibold text-slate-900">
              {editingId ? "Edit user" : "Invite new user"}
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-600">
                Full name
              </span>
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="Enter full name"
                className={fieldClass()}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-600">
                Email
              </span>
              <input
                value={draft.email}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, email: e.target.value }))
                }
                placeholder="Enter email address"
                disabled={live && Boolean(editingId)}
                className={cn(fieldClass(), "disabled:bg-slate-50")}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-600">
                Role
              </span>
              <select
                value={draft.role}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    role: e.target.value as HierarchyLevel,
                  }))
                }
                className={fieldClass()}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium text-slate-600">
                Team (optional)
              </span>
              <input
                list="users-team-options"
                value={draft.team}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, team: e.target.value }))
                }
                placeholder="Sales"
                className={fieldClass()}
              />
              <datalist id="users-team-options">
                {teams.map((team) => (
                  <option key={team} value={team} />
                ))}
              </datalist>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {editingId ? (
              <>
                <button
                  type="button"
                  onClick={resetDraft}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-[12px] font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={() => void saveUser("invite")}
                  className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={() => void saveUser("add")}
                  className="inline-flex h-10 min-w-[88px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={() => void saveUser("invite")}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-violet-600 px-4 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
                >
                  Send invite
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h3 className="text-[14px] font-semibold text-slate-900">
            All Users ({filtered.length})
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as HierarchyLevel | "All")
              }
              className="h-9 rounded-xl border border-slate-200 px-2.5 text-[12px] text-slate-700 outline-none focus:border-violet-400"
            >
              <option value="All">All Roles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 px-2.5 text-[12px] text-slate-700 outline-none focus:border-violet-400"
            >
              <option value="All">All Teams</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={tableQuery}
                onChange={(e) => setTableQuery(e.target.value)}
                placeholder="Search users..."
                className="h-9 w-44 rounded-xl border border-slate-200 pl-8 pr-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-violet-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Team</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-[13px] text-slate-400"
                  >
                    No users match these filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const RoleIcon = ROLE_CARD[row.role].icon;
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-50 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
                              avatarTone(row.name),
                            )}
                          >
                            {initials(row.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-slate-900">
                              {row.name}
                              {row.isOwner ? (
                                <span className="ml-1.5 text-[10px] font-semibold text-violet-600">
                                  Owner
                                </span>
                              ) : null}
                            </p>
                            <p className="truncate text-[12px] text-slate-500">
                              {row.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            ROLE_PILL[row.role],
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {row.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-slate-700">
                        {row.team || "—"}
                      </td>
                      <td className="px-3 py-3">
                        {row.source === "user" && row.user ? (
                          <select
                            value={row.status}
                            onChange={(e) => {
                              updateCrmUser(row.id, {
                                status: e.target.value as CrmUserStatus,
                              });
                              refreshLocal();
                              flash("Status updated");
                            }}
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-medium text-slate-700"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Invited">Invited</option>
                          </select>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                row.status === "Active"
                                  ? "bg-emerald-500"
                                  : row.status === "Invited"
                                    ? "bg-amber-500"
                                    : "bg-slate-400",
                              )}
                            />
                            {row.status}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[13px] text-slate-600">
                        {formatJoined(row.joinedAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="relative flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${row.name}`}
                            onClick={() => {
                              if (row.user) startEditUser(row.user);
                              else if (row.member) startEditMember(row.member);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`More actions for ${row.name}`}
                            onClick={() =>
                              setMenuId((id) => (id === row.id ? null : row.id))
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {menuId === row.id ? (
                            <div className="absolute top-8 right-0 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              {row.member && row.status === "Invited" ? (
                                <>
                                  <MenuItem
                                    label="Accept"
                                    onClick={() => {
                                      setMenuId(null);
                                      void onAccept(row.member!);
                                    }}
                                  />
                                  <MenuItem
                                    label="Resend invite"
                                    onClick={() => {
                                      setMenuId(null);
                                      void onResend(row.member!);
                                    }}
                                  />
                                  <MenuItem
                                    label="Cancel invite"
                                    danger
                                    onClick={() => {
                                      setMenuId(null);
                                      void onCancelInvite(row.member!);
                                    }}
                                  />
                                </>
                              ) : null}
                              {row.member && row.status !== "Invited" && !row.isOwner ? (
                                <>
                                  <MenuItem
                                    label={
                                      row.status === "Inactive"
                                        ? "Activate"
                                        : "Deactivate"
                                    }
                                    onClick={() => {
                                      setMenuId(null);
                                      void onToggleActive(row.member!);
                                    }}
                                  />
                                  <MenuItem
                                    label="Make owner"
                                    onClick={() => {
                                      setMenuId(null);
                                      void onTransfer(row.member!);
                                    }}
                                  />
                                </>
                              ) : null}
                              <MenuItem
                                label="Delete"
                                danger
                                disabled={row.isOwner}
                                onClick={() => {
                                  setMenuId(null);
                                  if (row.user) void removeUser(row.user);
                                  else if (row.member) void removeMember(row.member);
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[12px] text-slate-500">
          <p>
            Showing{" "}
            {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to{" "}
            {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}{" "}
            users
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 7)
              .map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={cn(
                    "h-8 min-w-8 rounded-lg px-2 text-[12px] font-semibold",
                    n === safePage
                      ? "bg-violet-600 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {n}
                </button>
              ))}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg p-1.5 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-8 rounded-lg border border-slate-200 px-2 text-[12px]"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium disabled:opacity-40",
        danger
          ? "text-rose-600 hover:bg-rose-50"
          : "text-slate-700 hover:bg-slate-50",
      )}
    >
      {danger ? <Trash2 className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}
