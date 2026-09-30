"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, DollarSign, Globe, Phone, Users } from "lucide-react";
import {
  COMPANY_STATUSES,
  type CompanyStatus,
} from "@/lib/companies/types";
import { findCompanyById, updateCompany } from "@/lib/companies/store";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
} from "@/lib/users/assignable";
import { logEdit, requireAction } from "@/lib/rules";
import { emitRulesChange } from "@/lib/rules/storage";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import { toast } from "@/lib/notify/toast";

type FormState = {
  companyName: string;
  website: string;
  industry: string;
  annualRevenue: string;
  phone: string;
  city: string;
  status: CompanyStatus | "";
  owner: string;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CO";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function EditCompanyForm({
  companyId,
  variant = "page",
  open = true,
  onOpenChange,
  onSaved,
}: {
  companyId: string;
  variant?: "page" | "modal";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const found = useMemo(() => findCompanyById(companyId), [companyId]);
  const [ownerOptions, setOwnerOptions] = useState(() =>
    listAssignableOwnersLocal(),
  );

  const initial = useMemo(() => {
    if (!found) return null;
    const owner =
      (found.company.ownerId &&
        ownerOptions.some((o) => o.id === found.company.ownerId) &&
        found.company.ownerId) ||
      ownerOptions.find((o) => o.name === found.company.owner)?.id ||
      found.company.ownerId ||
      defaultAssignableOwnerId(ownerOptions, found.company.owner);
    return {
      companyName: found.company.name,
      website: found.company.website ?? "",
      industry: found.company.industry ?? "",
      annualRevenue: found.company.annualRevenue ?? "",
      phone: found.company.phone ?? "",
      city: found.company.city ?? "",
      status: found.status,
      owner,
    } satisfies FormState;
  }, [found, ownerOptions]);

  const [form, setForm] = useState<FormState | null>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((options) => {
      if (cancelled || !options.length) return;
      setOwnerOptions(options);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setForm((prev) => {
      if (!prev || !found) return prev;
      if (ownerOptions.some((o) => o.id === prev.owner)) return prev;
      const next =
        (found.company.ownerId &&
          ownerOptions.find((o) => o.id === found.company.ownerId)?.id) ||
        ownerOptions.find((o) => o.name === found.company.owner)?.id ||
        defaultAssignableOwnerId(ownerOptions, found.company.owner);
      return next ? { ...prev, owner: next } : prev;
    });
  }, [found, ownerOptions]);

  const modalResetKey = `${variant}|${open}|${companyId}|${initial?.companyName ?? ""}`;
  const [prevModalResetKey, setPrevModalResetKey] = useState(modalResetKey);
  if (prevModalResetKey !== modalResetKey) {
    setPrevModalResetKey(modalResetKey);
    if (variant === "modal" && open && initial) {
      setForm(initial);
      setErrors({});
      setSubmitted(false);
    }
  }

  if (!found || !form) {
    if (variant === "modal") return null;
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Company not found.
      </div>
    );
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function validate(current: FormState) {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!current.companyName.trim()) next.companyName = "Company name is required";
    if (!current.status) next.status = "Status is required";
    if (!current.owner.trim()) next.owner = "Owner is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSave() {
    if (!form || !found) return;
    setSubmitted(true);
    if (!validate(form)) return;
    const gate = requireAction("sales.companies.edit");
    if (!gate.ok) {
      toast.error(gate.message);
      return;
    }
    const name = form.companyName.trim();
    const ownerMeta = ownerOptions.find((o) => o.id === form.owner);
    const updated = updateCompany(companyId, {
      name,
      initials: initialsFromName(name),
      website: form.website.trim(),
      industry: form.industry.trim(),
      phone: form.phone.trim(),
      city: form.city.trim() || undefined,
      annualRevenue: form.annualRevenue.trim() || undefined,
      status: form.status || found.status,
      owner: ownerMeta?.name ?? found.company.owner,
      ownerId: ownerMeta?.id ?? (form.owner || found.company.ownerId),
    });
    if (!updated) {
      toast.error("Could not save company.");
      return;
    }
    logEdit("sales.companies", ownerMeta?.name ?? form.owner, companyId, name, [
      { field: "name", from: found.company.name, to: name },
    ]);
    emitRulesChange("all");
    toast.success("Company updated");
    onSaved?.();
    if (variant === "modal") {
      onOpenChange?.(false);
      return;
    }
    router.push(`/sales/companies/detail/${companyId}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Companies", href: "/sales/companies" }}
      badge="Edit company"
      title={`Edit ${found.company.name}`}
      subtitle="Update company details."
      tip="Changes sync to CRM when signed in with a live company."
      cardIcon={Building2}
      cardTitle="Company Information"
      cardDescription="Changes sync to CRM when signed in."
      listHref={`/sales/companies/detail/${companyId}`}
      saveLabel="Save Changes"
      onSave={handleSave}
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      showCreateAnother={false}
    >
      <Field
        label="Company Name"
        required
        error={submitted ? errors.companyName : undefined}
        className="col-span-full"
      >
        <InputShell icon={Building2} error={!!(submitted && errors.companyName)}>
          <input
            className={elevatedInputClass(true)}
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Website">
        <InputShell icon={Globe}>
          <input
            className={elevatedInputClass(true)}
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://"
          />
        </InputShell>
      </Field>
      <Field label="Industry">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Annual Revenue">
        <InputShell icon={DollarSign}>
          <input
            className={elevatedInputClass(true)}
            value={form.annualRevenue}
            onChange={(e) => update("annualRevenue", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="Phone">
        <InputShell icon={Phone}>
          <input
            className={elevatedInputClass(true)}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field label="City">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </InputShell>
      </Field>
      <Field
        label="Status"
        required
        error={submitted ? errors.status : undefined}
      >
        <InputShell error={!!(submitted && errors.status)}>
          <select
            className={elevatedSelectClass(true)}
            value={form.status}
            onChange={(e) => update("status", e.target.value as CompanyStatus)}
          >
            {COMPANY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field
        label="Owner"
        required
        error={submitted ? errors.owner : undefined}
      >
        <InputShell icon={Users} error={!!(submitted && errors.owner)}>
          <select
            className={elevatedSelectClass(true)}
            value={form.owner}
            onChange={(e) => update("owner", e.target.value)}
          >
            {ownerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {assignableOwnerLabel(option)}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
    </CreateEntityFormShell>
  );
}
