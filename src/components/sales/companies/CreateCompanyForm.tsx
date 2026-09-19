"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Phone,
  MapPin,
  Users,
  DollarSign,
  X,
  Loader2,
} from "lucide-react";
import {
  COMPANY_STATUSES,
  type CompanyStatus,
} from "@/lib/companies/types";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
} from "@/lib/users/assignable";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import { mergeCrmCompaniesIntoBoard } from "@/lib/companies/store";
import { createCrmCompany } from "@/lib/companies/api";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/notify/toast";

interface CreateCompanyFormProps {
  layoutId?: string;
  redirect?: boolean;
  variant?: "page" | "modal";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
}

interface FormState {
  companyName: string;
  website: string;
  industry: string;
  companySize: string;
  annualRevenue: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  status: CompanyStatus | "";
  owner: string;
  notes: string;
}

function makeInitialState(owner = ""): FormState {
  return {
    companyName: "",
    website: "",
    industry: "",
    companySize: "",
    annualRevenue: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "Australia",
    status: "Prospect",
    owner,
    notes: "",
  };
}

export function CreateCompanyForm({
  layoutId,
  redirect,
  variant = "page",
  open = true,
  onOpenChange,
  onCreated,
}: CreateCompanyFormProps) {
  void layoutId;
  void redirect;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => {
    const owners = listAssignableOwnersLocal();
    return makeInitialState(defaultAssignableOwnerId(owners));
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [submitted, setSubmitted] = useState(false);
  const [ownerOptions, setOwnerOptions] = useState(() =>
    listAssignableOwnersLocal(),
  );
  const ownerLabel =
    ownerOptions.find((o) => o.id === form.owner)?.name ?? form.owner;

  useEffect(() => {
    let cancelled = false;
    void loadAssignableOwners().then((options) => {
      if (cancelled || !options.length) return;
      setOwnerOptions(options);
      setForm((prev) => ({
        ...prev,
        owner: defaultAssignableOwnerId(options, prev.owner),
      }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const modalResetKey = `${variant}|${open}`;
  const [prevModalResetKey, setPrevModalResetKey] = useState(modalResetKey);
  if (prevModalResetKey !== modalResetKey) {
    setPrevModalResetKey(modalResetKey);
    if (variant === "modal" && open) {
      setForm((prev) => makeInitialState(prev.owner));
      setErrors({});
      setSubmitted(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.companyName.trim())
      next.companyName = "Company Name is required";
    if (!form.status) next.status = "Status is required";
    if (!form.owner.trim()) next.owner = "Owner is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function afterSave(createAnother: boolean) {
    onCreated?.();
    if (createAnother) {
      setForm(makeInitialState(form.owner));
      setErrors({});
      setSubmitted(false);
      return;
    }
    if (variant === "modal") {
      onOpenChange?.(false);
      return;
    }
    router.push("/sales/companies");
  }

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    try {
      const remote = await createCrmCompany({
        name: form.companyName.trim(),
        website: form.website.trim() || undefined,
        industry: form.industry.trim() || undefined,
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        annualRevenue: form.annualRevenue.trim() || undefined,
        status: form.status as CompanyStatus,
        owner: ownerLabel,
        ownerId: form.owner,
        notes: form.notes.trim() || undefined,
        companySize: form.companySize.trim() || undefined,
        address: form.address.trim() || undefined,
        state: form.state.trim() || undefined,
        country: form.country.trim() || undefined,
      });
      if (!remote) {
        throw new Error("The CRM did not return the new company.");
      }
      mergeCrmCompaniesIntoBoard([remote]);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "The CRM could not save this company.",
      );
      return;
    }
    afterSave(createAnother);
  }

  async function runSave(createAnother: boolean) {
    if (saving) return;
    setSaving(true);
    try {
      await handleSave(createAnother);
    } finally {
      window.setTimeout(() => setSaving(false), 350);
    }
  }

  const fields = (
    <>
      <Field
        label="Company Name"
        required
        error={submitted ? errors.companyName : undefined}
        className="col-span-full"
      >
        <InputShell
          icon={Building2}
          error={!!(submitted && errors.companyName)}
        >
          <input
            className={elevatedInputClass(true)}
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Enter company name"
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
            placeholder="Finance, Tech…"
          />
        </InputShell>
      </Field>
      <Field label="Company Size">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.companySize}
            onChange={(e) => update("companySize", e.target.value)}
            placeholder="e.g. 11–50"
          />
        </InputShell>
      </Field>
      <Field label="Annual Revenue">
        <InputShell icon={DollarSign}>
          <input
            className={elevatedInputClass(true)}
            value={form.annualRevenue}
            onChange={(e) => update("annualRevenue", e.target.value)}
            placeholder="$0.00"
          />
        </InputShell>
      </Field>
      <Field label="Phone">
        <InputShell icon={Phone}>
          <input
            className={elevatedInputClass(true)}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+61 400 000 000"
          />
        </InputShell>
      </Field>
      <Field label="Address" className="col-span-full">
        <InputShell icon={MapPin}>
          <input
            className={elevatedInputClass(true)}
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Street address"
          />
        </InputShell>
      </Field>
      <Field label="City">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Sydney"
          />
        </InputShell>
      </Field>
      <Field label="State">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="NSW"
          />
        </InputShell>
      </Field>
      <Field label="Country">
        <InputShell>
          <input
            className={elevatedInputClass(false)}
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="Australia"
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
            className={elevatedSelectClass(false)}
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as CompanyStatus)
            }
          >
            {COMPANY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
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
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {assignableOwnerLabel(o)}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Notes" className="col-span-full">
        <MentionNotesTextarea
          value={form.notes}
          onChange={(notes) => update("notes", notes)}
          placeholder="Account context, relationship notes… Type @ to assign someone."
        />
      </Field>
    </>
  );

  if (variant === "modal") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(90vh,840px)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">Create Company</DialogTitle>
          <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-zinc-800">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
              Create Company
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 dark:bg-zinc-900/40">
            <div className="grid grid-cols-1 content-start gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2">
              {fields}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              disabled={saving}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void runSave(true)}
              disabled={saving}
              className="h-8 rounded-md border border-violet-200 bg-violet-50 px-3 text-[12px] font-semibold text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
            >
              Save &amp; New
            </button>
            <button
              type="button"
              onClick={() => void runSave(false)}
              disabled={saving}
              className="inline-flex h-8 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-md bg-violet-600 px-4 text-[12px] font-semibold text-white transition-all hover:bg-violet-700 disabled:opacity-90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Company"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Companies", href: "/sales/companies" }}
      badge="New company"
      title="Create Company"
      subtitle="Add an account once: link contacts and deals to it as the relationship grows."
      tip="Tip: Company name, status & owner are enough to start."
      cardIcon={Building2}
      cardTitle="Company Information"
      cardDescription="Fields marked required are needed to save (SRS §6.3)"
      listHref="/sales/companies"
      saveLabel="Save Company"
      onSave={handleSave}
    >
      {fields}
    </CreateEntityFormShell>
  );
}
