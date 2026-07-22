"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  User,
  Building2,
  Type,
  Link2,
  Shield,
  Home,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import {
  PORTAL_ACCESS_LEVELS,
  PORTAL_CLIENTS,
  PORTAL_MODULES,
  PORTAL_OWNERS,
  PORTAL_STATUSES,
  appendPortalAudit,
  formatPortalDate,
  nextPortalIds,
  portalPublicPath,
  uniqueSlug,
  upsertPortal,
  type PortalAccessLevel,
  type PortalModule,
  type PortalStatus,
} from "@/lib/portals/types";
import {
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { cn } from "@/lib/utils";

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
  const [clientId, setClientId] = useState<string>(PORTAL_CLIENTS[0].id);
  const [slug, setSlug] = useState("greystone");
  const [status, setStatus] = useState<PortalStatus>("Active");
  const [accessLevel, setAccessLevel] =
    useState<PortalAccessLevel>("Full");
  const [modules, setModules] = useState<PortalModule[]>([
    "Deals",
    "Documents",
    "Tickets",
    "Invoices",
  ]);
  const [createdBy, setCreatedBy] = useState<string>(PORTAL_OWNERS[0]);
  const [contactName, setContactName] = useState<string>(PORTAL_CLIENTS[0].contact);
  const [contactEmail, setContactEmail] = useState<string>(PORTAL_CLIENTS[0].email);
  const [contactTouched, setContactTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(false);

  const client =
    PORTAL_CLIENTS.find((c) => c.id === clientId) ?? PORTAL_CLIENTS[0];

  function onClientChange(id: string) {
    setClientId(id);
    const c = PORTAL_CLIENTS.find((x) => x.id === id);
    if (c) {
      if (!slugTouched) {
        setSlug(uniqueSlug(c.name.split(" ")[0] ?? c.name));
      }
      if (!contactTouched) {
        setContactName(c.contact);
        setContactEmail(c.email);
      }
    }
  }

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(uniqueSlug(v || client.name));
  }

  function toggleModule(m: PortalModule) {
    setModules((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!clientId) next.clientId = "Client is required";
    if (!status) next.status = "Status is required";
    if (!accessLevel) next.accessLevel = "Access level is required";
    if (!contactName.trim()) next.contactName = "Primary contact name is required";
    if (!contactEmail.trim()) next.contactEmail = "Primary contact email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()))
      next.contactEmail = "Enter a valid email";
    if (!slug.trim()) next.slug = "Portal URL slug is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextPortalIds();
    const finalSlug = uniqueSlug(slug);
    const created = upsertPortal(
      appendPortalAudit(
        {
          id: ids.id,
          portalId: ids.portalId,
          name: name.trim(),
          clientId: client.id,
          clientName: client.name,
          slug: finalSlug,
          status,
          accessLevel,
          modules,
          primaryContactName: contactName.trim(),
          primaryContactEmail: contactEmail.trim(),
          createdBy,
          createdAt: formatPortalDate(),
          activity: [],
          audit: [],
        },
        "Created",
        createdBy,
      ),
    );
    if (createAnother) {
      setName("");
      setSlugTouched(false);
      setErrors({});
      return;
    }
    router.push(`/portals/${created.id}`);
  }

  const inputSm = (hasIcon?: boolean) =>
    cn(elevatedInputClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");
  const selectSm = (hasIcon?: boolean) =>
    cn(elevatedSelectClass(hasIcon), "!h-9 !text-[12px] !rounded-lg");

  const publicUrl = portalPublicPath(slug || "…");

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.09),_transparent_65%)]"
      />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-1 flex-col p-2.5 sm:p-3 lg:p-4">
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
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <Link href="/portals" className="hover:text-slate-600">
                Client Portal
              </Link>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              New portal
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <Globe className="h-2.5 w-2.5" />
              §12
            </span>
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
              onClick={() => onSave(true)}
              className="inline-flex h-8 items-center rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
            >
              Save &amp; New
            </button>
            <button
              type="button"
              onClick={() => onSave(false)}
              className="inline-flex h-8 items-center rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700"
            >
              Create portal
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

                <CompactField label="Client" required error={errors.clientId}>
                  <InputShell icon={Building2} error={!!errors.clientId}>
                    <select
                      className={selectSm(true)}
                      value={clientId}
                      onChange={(e) => onClientChange(e.target.value)}
                    >
                      {PORTAL_CLIENTS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>

                <CompactField label="Primary contact name" required error={errors.contactName}>
                  <InputShell icon={User} error={!!errors.contactName}>
                    <input
                      className={inputSm(true)}
                      value={contactName}
                      onChange={(e) => {
                        setContactTouched(true);
                        setContactName(e.target.value);
                      }}
                      placeholder="Contact name"
                    />
                  </InputShell>
                </CompactField>

                <CompactField label="Primary contact email" required error={errors.contactEmail}>
                  <InputShell icon={User} error={!!errors.contactEmail}>
                    <input
                      className={inputSm(true)}
                      type="email"
                      value={contactEmail}
                      onChange={(e) => {
                        setContactTouched(true);
                        setContactEmail(e.target.value);
                      }}
                      placeholder="contact@example.com"
                    />
                  </InputShell>
                </CompactField>

                <CompactField
                  label="URL slug"
                  required
                  error={errors.slug}
                >
                  <InputShell icon={Link2} error={!!errors.slug}>
                    <input
                      className={inputSm(true)}
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        );
                      }}
                      placeholder="greystone"
                    />
                  </InputShell>
                </CompactField>

                <CompactField label="Status" required error={errors.status}>
                  <InputShell>
                    <select
                      className={selectSm(false)}
                      value={status}
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

                <CompactField label="Created by">
                  <InputShell icon={User}>
                    <select
                      className={selectSm(true)}
                      value={createdBy}
                      onChange={(e) => setCreatedBy(e.target.value)}
                    >
                      {PORTAL_OWNERS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </InputShell>
                </CompactField>
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

            {/* Side summary — fills remaining area */}
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
                      {client.name}
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
                    <span className="font-semibold text-slate-700">{status}</span>
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
                      {contactName.trim() || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Email</span>
                    <span className="truncate font-semibold text-slate-700">
                      {contactEmail.trim() || "—"}
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
                Clients sign in at this URL with no CRM chrome — deals,
                documents, invoices, and tickets based on the modules you enable.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
