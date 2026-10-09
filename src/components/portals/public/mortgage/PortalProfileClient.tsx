"use client";

import { useEffect, useState } from "react";
import { InitialsAvatar } from "@/components/portals/public/mortgage/PortalBrand";
import { useMortgagePortal } from "@/components/portals/public/mortgage/useMortgagePortal";
import { getCrmContact, tryCrmContact } from "@/lib/contacts/api";
import { mergeCrmContactsIntoBoard } from "@/lib/contacts/store";
import { writePortalProfileToCrmContact } from "@/lib/portals/contact-sync";
import {
  syncMortgageClientFromCrmContact,
  type MortgageClient,
} from "@/lib/portals/mortgage";
import {
  getPortalBySlug,
  upsertPortal,
  type ClientPortal,
} from "@/lib/portals/types";

export function PortalProfileClient({ slug }: { slug: string }) {
  const { mortgage, update, logActivity, canWrite, isReadOnly, portal, reload } =
    useMortgagePortal(slug);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!portal) return;
    const sync = () => {
      const latest = getPortalBySlug(slug) ?? portal;
      syncMortgageClientFromCrmContact(latest);
      reload();
    };
    sync();

    let cancelled = false;
    void (async () => {
      const contactId =
        getPortalBySlug(slug)?.primaryContactId ?? portal.primaryContactId;
      if (!contactId) return;
      await tryCrmContact(async () => {
        const remote = await getCrmContact(contactId);
        if (!remote || cancelled) return;
        mergeCrmContactsIntoBoard([remote]);
        if (!cancelled) sync();
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [portal, reload, slug]);

  if (!mortgage || !portal) return null;
  const currentPortal: ClientPortal = portal;
  const { client, broker } = mortgage;
  const initials = `${client.firstName[0] ?? ""}${client.lastName[0] ?? ""}`;
  const locked = isReadOnly || !canWrite;

  function setField<K extends keyof MortgageClient>(key: K, value: MortgageClient[K]) {
    update((prev) => ({
      ...prev,
      client: { ...prev.client, [key]: value },
      factFind:
        key === "firstName" || key === "lastName"
          ? { ...prev.factFind, [key]: String(value) }
          : key === "phone"
            ? { ...prev.factFind, mobile: String(value) }
            : prev.factFind,
    }));
  }

  function save() {
    const nextPortal: ClientPortal = {
      ...currentPortal,
      primaryContactName: `${client.firstName} ${client.lastName}`.trim(),
      primaryContactEmail: client.email.trim(),
      primaryContactPhone: client.phone.trim() || undefined,
    };
    upsertPortal(nextPortal);
    writePortalProfileToCrmContact(nextPortal, {
      email: client.email,
      phone: client.phone,
      firstName: client.firstName,
      lastName: client.lastName,
    });
    logActivity("Updated profile");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Keep your contact details current so your broker can reach you.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="flex items-center gap-3">
          <InitialsAvatar initials={initials} size="lg" />
          <div>
            <div className="text-[16px] font-bold text-slate-900">
              {client.firstName} {client.lastName}
            </div>
            <div className="text-[12px] text-slate-500">{client.email}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <input
              value={client.firstName}
              disabled={locked}
              onChange={(e) => setField("firstName", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Last name">
            <input
              value={client.lastName}
              disabled={locked}
              onChange={(e) => setField("lastName", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={client.email}
              disabled={locked}
              onChange={(e) => setField("email", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Phone">
            <input
              value={client.phone}
              disabled={locked}
              onChange={(e) => setField("phone", e.target.value)}
              className={fieldClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <input
                value={client.address}
                disabled={locked}
                onChange={(e) => setField("address", e.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>
          <Field label="Preferred contact">
            <select
              value={client.preferredContact}
              disabled={locked}
              onChange={(e) =>
                setField("preferredContact", e.target.value as MortgageClient["preferredContact"])
              }
              className={fieldClass}
            >
              <option>Phone</option>
              <option>Email</option>
              <option>SMS</option>
            </select>
          </Field>
        </div>

        {!locked ? (
          <button
            type="button"
            onClick={save}
            className="mt-4 h-9 rounded-lg bg-[#5A32A3] px-4 text-[12px] font-semibold text-white"
          >
            {saved ? "Saved" : "Save changes"}
          </button>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="text-[13px] font-bold text-slate-900">Your broker</div>
        <p className="mt-1 text-[12px] text-slate-500">
          {broker.name} · {broker.title}
        </p>
        <p className="mt-1 text-[12px] text-slate-600">
          {broker.phone} · {broker.email}
        </p>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const fieldClass =
  "h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-[#5A32A3] disabled:bg-slate-50";
