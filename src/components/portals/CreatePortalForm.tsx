"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  User,
  Building2,
  Type,
  Shield,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import {
  PORTAL_ACCESS_LEVELS,
  PORTAL_MODULES,
  appendPortalAudit,
  formatPortalDate,
  upsertPortal,
  type PortalAccessLevel,
  type PortalModule,
} from "@/lib/portals/types";
import {
  createCrmClientPortal,
} from "@/lib/portals/api";
import { listCrmCompanies } from "@/lib/companies/api";
import { loadCrmContacts } from "@/lib/contacts/api";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";
import { defaultActorName } from "@/lib/rules/actor";

interface Props {
  layoutId: string;
  redirect: boolean;
}

function CompactField({
  label,
  required,
  error,
  className,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-[11px] font-semibold text-slate-600">
        {label}
        {required ? <span className="ml-0.5 text-rose-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-[10px] font-medium text-rose-500">{error}</p>
      ) : hint ? (
        <p className="text-[10px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function CreatePortalForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactId, setContactId] = useState("");
  const [accessLevel, setAccessLevel] =
    useState<PortalAccessLevel>("Limited");
  const [modules, setModules] = useState<PortalModule[]>([
    "Deals",
    "Documents",
    "Tickets",
    "Invoices",
  ]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [contacts, setContacts] = useState<
    Array<{ id: string; name: string; email: string; companyId?: string }>
  >([]);
  const [catalogError, setCatalogError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [companyRows, contactRows] = await Promise.all([
          listCrmCompanies({ limit: 100 }),
          loadCrmContacts({ limit: 100 }),
        ]);
        if (cancelled) return;
        setCompanies(
          companyRows
            .map((row) => ({ id: row.company.id, name: row.company.name }))
            .filter((row) => isUuid(row.id)),
        );
        setContacts(
          contactRows
            .map((row) => ({
              id: row.contact.id,
              name: row.contact.name,
              email: row.contact.email,
              companyId: row.contact.companyId,
            }))
            .filter((row) => isUuid(row.id)),
        );
        setCatalogError("");
      } catch (err) {
        if (!cancelled) {
          setCatalogError(
            err instanceof Error ? err.message : "Could not load companies and contacts",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const companyContacts = useMemo(
    () => contacts.filter((row) => row.companyId === clientId),
    [contacts, clientId],
  );
  const client = companies.find((c) => c.id === clientId);
  const contact = companyContacts.find((c) => c.id === contactId);

  function onClientChange(id: string) {
    setClientId(id);
    setContactId("");
  }

  function onNameChange(v: string) {
    setName(v);
  }

  function toggleModule(m: PortalModule) {
    setModules((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!isUuid(clientId)) next.clientId = "Pick a CRM company";
    if (!isUuid(contactId)) next.contactId = "Pick a CRM contact on that company";
    if (!accessLevel) next.accessLevel = "Access level is required";
    if (!modules.length) next.modules = "Enable at least one module";
    if (!companies.length) next.clientId = "Create a CRM company first";
    if (isUuid(clientId) && !companyContacts.length) {
      next.contactId = "This company has no CRM contacts";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSave(createAnother: boolean) {
    if (!validate() || !client || !contact) return;
    setSaving(true);
    setErrors((prev) => ({ ...prev, form: "" }));
    try {
      const remote = await createCrmClientPortal({
        name: name.trim(),
        companyId: client.id,
        primaryContactId: contact.id,
        accessLevel,
        modules,
      });
      if (!remote?.id) throw new Error("CRM did not create the client portal");
      upsertPortal(
        appendPortalAudit(
          {
            ...remote,
            clientName: remote.clientName || client.name,
            primaryContactName: remote.primaryContactName || contact.name,
            primaryContactEmail: remote.primaryContactEmail || contact.email,
            createdBy: defaultActorName(),
            createdAt: remote.createdAt || formatPortalDate(),
          },
          "Created",
          defaultActorName(),
        ),
      );
      if (createAnother) {
        setName("");
        setContactId("");
        setErrors({});
        return;
      }
      router.push(`/portals/${remote.id}`);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err instanceof Error ? err.message : "Could not create the portal",
      }));
    } finally {
      setSaving(false);
    }
  }

  const inputSm = (hasIcon?: boolean) =>
    cn(elevatedInputClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");
  const selectSm = (hasIcon?: boolean) =>
    cn(elevatedSelectClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");

  const publicUrl = "Assigned by CRM on create";

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-slate-50">

      <div className="relative mx-auto flex w-full max-w-[1920px] flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/portals")}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600"
              aria-label="Back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              New portal
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push("/portals")}
              className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void onSave(true)}
              disabled={saving}
              className="inline-flex h-8 items-center rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-40"
            >
              Save &amp; New
            </button>
            <button
              type="button"
              onClick={() => void onSave(false)}
              disabled={saving}
              className="inline-flex h-8 items-center rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-40"
            >
              {saving ? "Creating…" : "Create portal"}
            </button>
          </div>
        </div>

        {/* Full-width single surface */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100/80 bg-white shadow-sm">
          <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
            {/* Main fields */}
            <div className="border-b border-slate-100 p-4 sm:p-5 lg:border-r lg:border-b-0">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Portal details
              </p>
              <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                <CompactField
                  label="Name"
                  required
                  error={errors.name}
                  className="sm:col-span-2 xl:col-span-3"
                >
                  <InputShell icon={Type} error={!!errors.name}>
                    <input
                      className={inputSm(true)}
                      value={name}
                      onChange={(e) => onNameChange(e.target.value)}
                      placeholder="e.g. Greystone Client Portal"
                    />
                  </InputShell>
                </CompactField>

                <CompactField label="Company" required error={errors.clientId}>
                  <InputShell icon={Building2} error={!!errors.clientId}>
                    <select
                      className={selectSm(true)}
                      value={clientId}
                      onChange={(e) => onClientChange(e.target.value)}
                    >
                      <option value="">Select a CRM company</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                <CompactField
                  label="Primary contact"
                  required
                  error={errors.contactId}
                  className="sm:col-span-2"
                >
                  <InputShell icon={User} error={!!errors.contactId}>
                    <select
                      className={selectSm(true)}
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      disabled={!clientId}
                    >
                      <option value="">
                        {clientId
                          ? "Select a contact on this company"
                          : "Pick a company first"}
                      </option>
                      {companyContacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.email ? ` · ${c.email}` : ""}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                <CompactField
                  label="Access level"
                  required
                  error={errors.accessLevel}
                >
                  <InputShell icon={Shield} error={!!errors.accessLevel}>
                    <select
                      className={selectSm(true)}
                      value={accessLevel}
                      onChange={(e) =>
                        setAccessLevel(e.target.value as PortalAccessLevel)
                      }
                    >
                      {PORTAL_ACCESS_LEVELS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                {errors.form || catalogError ? (
                  <p className="sm:col-span-2 xl:col-span-3 text-[12px] font-medium text-rose-600">
                    {errors.form || catalogError}
                  </p>
                ) : null}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Allowed modules
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {modules.length} of {PORTAL_MODULES.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
                  {PORTAL_MODULES.map((m) => {
                    const on = modules.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleModule(m)}
                        className={cn(
                          "rounded-lg px-2.5 py-2 text-left text-[11px] font-semibold transition-colors",
                          on
                            ? "bg-violet-600 text-white shadow-sm shadow-violet-600/20"
                            : "bg-slate-50 text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-100",
                        )}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Side summary: fills remaining area */}
            <aside className="flex flex-col bg-slate-50/60 p-4 sm:p-5">
              <p className="mb-3 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                Preview
              </p>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/25">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-slate-900">
                      {name.trim() || "Untitled portal"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {client?.name ?? "No client"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Portal ID</span>
                    <span className="font-semibold text-slate-500">Auto-assigned</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Status</span>
                    <span className="font-semibold text-slate-700">Active</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Access</span>
                    <span className="font-semibold text-slate-700">
                      {accessLevel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Contact</span>
                    <span className="truncate font-semibold text-slate-700">
                      {contact?.name.trim() || ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Email</span>
                    <span className="truncate font-semibold text-slate-700">
                      {contact?.email.trim() || ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Modules</span>
                    <span className="font-semibold text-slate-700">
                      {modules.length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                    Public URL
                  </p>
                  <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2">
                    <ExternalLink className="h-3 w-3 shrink-0 text-violet-500" />
                    <code className="truncate text-[11px] font-medium text-violet-700">
                      {publicUrl}
                    </code>
                  </div>
                </div>
              </div>

              <p className="mt-auto pt-4 text-[11px] leading-relaxed text-slate-400">
                Clients sign in at this URL with no CRM chrome: deals,
                documents, invoices, and tickets based on the modules you enable.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
