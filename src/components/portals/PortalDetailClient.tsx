"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Trash2,
  Mail,
  KeyRound,
  Ban,
  PauseCircle,
  PlayCircle,
  ExternalLink,
  Save,
  Shield,
  LayoutGrid,
  Activity,
  Download,
} from "lucide-react";
import {
  PORTAL_ACCESS_LEVELS,
  PORTAL_ACCESS_STYLE,
  PORTAL_CLIENTS,
  PORTAL_MODULES,
  PORTAL_STATUSES,
  PORTAL_STATUS_STYLE,
  appendPortalActivity,
  appendPortalAudit,
  deletePortal,
  exportPortalsCsv,
  formatPortalAt,
  getPortalById,
  portalPublicPath,
  uniqueSlug,
  upsertPortal,
  type ClientPortal,
  type PortalAccessLevel,
  type PortalModule,
  type PortalStatus,
} from "@/lib/portals/types";
import { cn } from "@/lib/utils";
import {
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import {
  assertRequired,
  fieldDiff,
  logEdit,
  softDeleteRecord,
  stripSystemFields,
} from "@/lib/rules";
import { RecordAuditHistory } from "@/components/rules/RecordAuditHistory";

export function PortalDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [row, setRow] = useState<ClientPortal | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [tab, setTab] = useState<"edit" | "access" | "activity">("edit");

  // Editable draft fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const p = getPortalById(id) ?? null;
    setRow(p);
    if (p) {
      setName(p.name);
      setSlug(p.slug);
      setClientId(p.clientId);
      setContactName(p.primaryContactName);
      setContactEmail(p.primaryContactEmail);
      setDirty(false);
    }
  }, [id]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  function save(next: ClientPortal, msg?: string) {
    upsertPortal(next);
    setRow(next);
    if (msg) flash(msg);
  }

  function setStatus(status: PortalStatus) {
    if (!row) return;
    let next = appendPortalAudit(
      { ...row, status },
      `Status → ${status}`,
      row.createdBy,
    );
    next = appendPortalActivity(next, `Status → ${status}`, row.createdBy);
    save(next, status === "Inactive" ? "Deactivated" : status === "Suspended" ? "Suspended" : `Status → ${status}`);
  }

  function setAccess(accessLevel: PortalAccessLevel) {
    if (!row) return;
    let next = appendPortalAudit(
      { ...row, accessLevel },
      `Access → ${accessLevel}`,
      row.createdBy,
    );
    next = appendPortalActivity(next, `Access → ${accessLevel}`, row.createdBy);
    save(next, `Access → ${accessLevel}`);
  }

  function toggleModule(m: PortalModule) {
    if (!row) return;
    const enabling = !row.modules.includes(m);
    const modules = enabling
      ? [...row.modules, m]
      : row.modules.filter((x) => x !== m);
    let next = appendPortalAudit(
      { ...row, modules },
      enabling ? `Module enabled: ${m}` : `Module disabled: ${m}`,
      row.createdBy,
    );
    next = appendPortalActivity(
      next,
      enabling ? `Module on: ${m}` : `Module off: ${m}`,
      row.createdBy,
    );
    save(next);
  }

  function sendInvite() {
    if (!row) return;
    if (row.status !== "Active") {
      flash("Activate portal before inviting");
      return;
    }
    let next = appendPortalAudit(
      { ...row, inviteSentAt: formatPortalAt() },
      "Invite sent",
      row.createdBy,
    );
    next = appendPortalActivity(
      next,
      `Invite sent to ${row.primaryContactEmail}`,
      row.createdBy,
    );
    save(next, `Invite sent to ${row.primaryContactEmail}`);
  }

  function resetPassword() {
    if (!row) return;
    let next = appendPortalAudit(row, "Password reset sent", row.createdBy);
    next = appendPortalActivity(
      next,
      `Password reset → ${row.primaryContactEmail}`,
      row.createdBy,
    );
    save(next, "Password reset sent (mock)");
  }

  function saveEdits() {
    if (!row) return;
    const req = assertRequired(
      {
        name,
        slug,
        contactName,
        contactEmail,
      },
      ["name", "slug", "contactName", "contactEmail"],
    );
    if (!req.ok) {
      flash(req.message);
      return;
    }
    const client =
      PORTAL_CLIENTS.find((c) => c.id === clientId) ??
      PORTAL_CLIENTS.find((c) => c.id === row.clientId);
    const finalSlug = uniqueSlug(slug, row.id);
    const patch = stripSystemFields({
      name: name.trim(),
      slug: finalSlug,
      clientId: client?.id ?? row.clientId,
      clientName: client?.name ?? row.clientName,
      primaryContactName: contactName.trim(),
      primaryContactEmail: contactEmail.trim(),
    });
    let next: ClientPortal = { ...row, ...patch };
    next = appendPortalAudit(next, "Edited portal details", row.createdBy);
    next = appendPortalActivity(next, "Portal details updated", row.createdBy);
    const changes = fieldDiff(
      row as unknown as Record<string, unknown>,
      next as unknown as Record<string, unknown>,
      [
        "name",
        "slug",
        "clientId",
        "primaryContactName",
        "primaryContactEmail",
      ],
    );
    logEdit("portals", row.createdBy, row.id, row.portalId, changes);
    save(next, "Changes saved");
    setSlug(finalSlug);
    setDirty(false);
  }

  if (!row) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-slate-50 text-sm text-slate-500">
        Portal not found
      </div>
    );
  }

  const inputSm = (hasIcon?: boolean) =>
    cn(elevatedInputClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");
  const selectSm = (hasIcon?: boolean) =>
    cn(elevatedSelectClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.10),_transparent_65%)]"
      />
      {toast ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        {/* Header */}
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/portals")}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link href="/" className="flex items-center gap-0.5 hover:text-slate-600">
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <Link href="/portals" className="hover:text-slate-600">
                Client Portal
              </Link>
              <span>/</span>
            </nav>
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
              {row.portalId}
            </h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                PORTAL_STATUS_STYLE[row.status],
              )}
            >
              {row.status}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                PORTAL_ACCESS_STYLE[row.accessLevel],
              )}
            >
              {row.accessLevel}
            </span>
          </div>
          <Link
            href={portalPublicPath(row.slug)}
            target="_blank"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open portal
          </Link>
        </div>

        {/* §12 Actions toolbar */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
          <span className="mr-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Actions
          </span>
          <button
            type="button"
            onClick={() => exportPortalsCsv([row], `${row.portalId}.csv`)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={sendInvite}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-600 px-2.5 text-[11px] font-semibold text-white"
          >
            <Mail className="h-3.5 w-3.5" />
            Send invite
          </button>
          <button
            type="button"
            onClick={resetPassword}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Reset password
          </button>
          {row.status === "Active" ? (
            <>
              <button
                type="button"
                onClick={() => setStatus("Inactive")}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600"
              >
                <PauseCircle className="h-3.5 w-3.5" />
                Deactivate
              </button>
              <button
                type="button"
                onClick={() => setStatus("Suspended")}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[11px] font-semibold text-rose-700"
              >
                <Ban className="h-3.5 w-3.5" />
                Suspend
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setStatus("Active")}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Activate
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Delete ${row.portalId}?`)) return;
              const gate = softDeleteRecord({
                action: "portals.delete",
                module: "portals",
                recordId: row.id,
                recordLabel: row.portalId,
                recordType: "Client Portal",
                snapshot: row,
              });
              if (!gate.ok) {
                flash(gate.message);
                return;
              }
              deletePortal(row.id);
              router.push("/portals");
            }}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-2.5 flex flex-wrap gap-1">
          {(
            [
              { id: "edit" as const, label: "Edit", icon: Save },
              { id: "access" as const, label: "Manage access & modules", icon: Shield },
              { id: "activity" as const, label: "View activity", icon: Activity },
            ] as const
          ).map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              type="button"
              onClick={() => setTab(tid)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold",
                tab === tid
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          {tab === "edit" ? (
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[13px] font-bold text-slate-900">
                    Edit portal
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Update name, client, URL, and primary contact
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveEdits}
                  disabled={!dirty}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-lg px-3 text-[11px] font-semibold text-white",
                    dirty
                      ? "bg-violet-600 hover:bg-violet-700"
                      : "cursor-not-allowed bg-slate-300",
                  )}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save changes
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Portal ID">
                  <InputShell>
                    <input
                      className={cn(inputSm(false), "cursor-not-allowed bg-slate-50 text-slate-500")}
                      value={row.portalId}
                      readOnly
                    />
                  </InputShell>
                </Field>
                <Field label="Portal URL" className="sm:col-span-2">
                  <InputShell>
                    <input
                      className={cn(inputSm(false), "cursor-not-allowed bg-slate-50 text-violet-700")}
                      value={portalPublicPath(slug || row.slug)}
                      readOnly
                    />
                  </InputShell>
                </Field>
                <Field label="Name *" className="sm:col-span-2 xl:col-span-3">
                  <InputShell>
                    <input
                      className={inputSm(false)}
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </InputShell>
                </Field>
                <Field label="Client *">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={clientId}
                      onChange={(e) => {
                        const c = PORTAL_CLIENTS.find(
                          (x) => x.id === e.target.value,
                        );
                        setClientId(e.target.value);
                        if (c) {
                          setContactName(c.contact);
                          setContactEmail(c.email);
                        }
                        setDirty(true);
                      }}
                    >
                      {PORTAL_CLIENTS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>
                <Field label="URL slug *">
                  <InputShell>
                    <input
                      className={inputSm(false)}
                      value={slug}
                      onChange={(e) => {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        );
                        setDirty(true);
                      }}
                    />
                  </InputShell>
                  <p className="mt-1 text-[10px] text-violet-600">
                    {portalPublicPath(slug || "…")}
                  </p>
                </Field>
                <Field label="Status (lifecycle)">
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={row.status}
                      onChange={(e) =>
                        setStatus(e.target.value as PortalStatus)
                      }
                    >
                      {PORTAL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </Field>
                <Field label="Primary contact name *">
                  <InputShell>
                    <input
                      className={inputSm(false)}
                      value={contactName}
                      onChange={(e) => {
                        setContactName(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </InputShell>
                </Field>
                <Field label="Primary contact email *" className="sm:col-span-2 xl:col-span-2">
                  <InputShell>
                    <input
                      className={inputSm(false)}
                      value={contactEmail}
                      onChange={(e) => {
                        setContactEmail(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </InputShell>
                </Field>
              </div>
            </div>
          ) : null}

          {tab === "access" ? (
            <div className="grid flex-1 grid-cols-1 lg:grid-cols-2">
              <div className="border-b border-slate-100 p-4 sm:p-5 lg:border-r lg:border-b-0">
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-violet-600" />
                  <div>
                    <h2 className="text-[13px] font-bold text-slate-900">
                      Manage access
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Full · Limited · Read-only
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {PORTAL_ACCESS_LEVELS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAccess(a)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition-colors",
                        row.accessLevel === a
                          ? "border-violet-300 bg-violet-50"
                          : "border-slate-200 bg-white hover:border-violet-200",
                      )}
                    >
                      <div className="text-[12px] font-bold text-slate-900">
                        {a}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {a === "Full"
                          ? "View and act — pay invoices, sign, raise tickets"
                          : a === "Limited"
                            ? "View all enabled modules; sign, tasks, tickets — no payments"
                            : "View only — no sign, pay, or ticket actions"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-violet-600" />
                  <div>
                    <h2 className="text-[13px] font-bold text-slate-900">
                      Configure modules
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {row.modules.length} of {PORTAL_MODULES.length} enabled
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PORTAL_MODULES.map((m) => {
                    const on = row.modules.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleModule(m)}
                        className={cn(
                          "rounded-lg px-3 py-2.5 text-left text-[11px] font-semibold transition-colors",
                          on
                            ? "bg-violet-600 text-white shadow-sm"
                            : "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
                        )}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "activity" ? (
            <div className="grid flex-1 grid-cols-1 md:grid-cols-2">
              <div className="border-b border-slate-100 p-4 sm:p-5 md:border-r md:border-b-0">
                <h2 className="mb-3 text-[13px] font-bold text-slate-900">
                  Client activity
                </h2>
                <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                  {row.activity.length === 0 ? (
                    <li className="text-[12px] text-slate-400">No activity yet</li>
                  ) : (
                    row.activity.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                      >
                        <div className="text-[12px] font-semibold text-slate-800">
                          {a.action}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {a.actor} · {a.at}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="p-4 sm:p-5">
                <h2 className="mb-3 text-[13px] font-bold text-slate-900">
                  Admin audit
                </h2>
                <ul className="max-h-[420px] space-y-2 overflow-y-auto">
                  {row.audit.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-lg border border-slate-100 px-3 py-2"
                    >
                      <div className="text-[12px] font-semibold text-slate-800">
                        {a.action}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {a.actor} · {a.at}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          <RecordAuditHistory
            module="portals"
            recordId={row.id}
            localAudit={row.audit}
          />
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-[11px] font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  );
}
