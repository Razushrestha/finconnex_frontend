"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Building2,
  Mail,
  Phone,
  Smartphone,
  Users,
} from "lucide-react";
import {
  CONTACT_SOURCES,
  CONTACT_STATUSES,
  type ContactSource,
  type ContactStatus,
} from "@/lib/contacts/types";
import { listCompanyGroups } from "@/lib/companies/store";
import { useCrmCompanies } from "@/lib/companies/use-crm-companies";
import { isUuid } from "@/lib/activity-timeline/auth";
import {
  assignableOwnerLabel,
  defaultAssignableOwnerId,
  listAssignableOwnersLocal,
  loadAssignableOwners,
} from "@/lib/users/assignable";
import { createContact } from "@/lib/contacts/store";
import { optionalPhoneError } from "@/lib/contacts/phone";
import {
  logCreate,
  notifyOwnerAssigned,
  requireAction,
  requiredFieldErrors,
} from "@/lib/rules";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";

interface CreateContactFormProps {
  layoutId: string;
  redirect: boolean;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile: string;
  leadSource: ContactSource | "";
  status: ContactStatus | "";
  owner: string;
  company: string;
}

const initialState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  mobile: "",
  leadSource: "",
  status: "Active",
  owner: "",
  company: "",
};

export function CreateContactForm({
  layoutId,
  redirect,
}: CreateContactFormProps) {
  const router = useRouter();
  const crmCompanies = useCrmCompanies();
  const [form, setForm] = useState<FormState>(() => {
    const owners = listAssignableOwnersLocal();
    return { ...initialState, owner: defaultAssignableOwnerId(owners) };
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

  const companies = useMemo(() => {
    void crmCompanies.source;
    return listCompanyGroups()
      .flatMap((group) => group.companies)
      .filter((company) => isUuid(company.id));
  }, [crmCompanies.source, crmCompanies.loading]);

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

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {
      ...requiredFieldErrors(form as unknown as Record<string, unknown>, [
        "firstName",
        "lastName",
        "email",
        "status",
        "owner",
      ]),
    };
    if (form.email.trim() && !next.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        next.email = "Enter a valid email";
      }
    }
    const phoneError = optionalPhoneError(form.phone);
    if (phoneError) next.phone = phoneError;
    const mobileError = optionalPhoneError(form.mobile);
    if (mobileError) next.mobile = mobileError;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    const gate = requireAction("sales.contacts.create");
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    try {
      const contact = await createContact({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone,
        mobile: form.mobile,
        companyId: form.company,
        source: form.leadSource || "Website",
        status: form.status || "Active",
        owner: ownerLabel,
        ownerId: form.owner,
      });
      const label = contact.name;
      logCreate("sales.contacts", ownerLabel, contact.id, label);
      notifyOwnerAssigned({
        owner: ownerLabel,
        entityLabel: `Contact ${label}`,
        relatedTo: label,
        relatedHref: "/sales/contacts",
        type: "Lead Assigned",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save contact";
      window.alert(message);
      return;
    }
    if (createAnother) {
      setForm({ ...initialState, owner: form.owner, status: "Active" });
      setErrors({});
      setSubmitted(false);
      return;
    }
    router.push("/sales/contacts");
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Contacts", href: "/sales/contacts" }}
      badge="New contact"
      title="Create Contact"
      subtitle="Add someone you work with: link them to a company and keep the relationship warm."
      tip="Tip: First name, last name, email, status & owner are enough to start."
      cardIcon={User}
      cardTitle="Contact Information"
      cardDescription="Fields marked required are needed to save (SRS §6.2)"
      listHref="/sales/contacts"
      saveLabel="Save Contact"
      onSave={handleSave}
    >
      <Field
        label="First Name"
        required
        error={submitted ? errors.firstName : undefined}
      >
        <InputShell icon={User} error={!!(submitted && errors.firstName)}>
          <input
            className={elevatedInputClass(true)}
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            placeholder="Alex"
          />
        </InputShell>
      </Field>
      <Field
        label="Last Name"
        required
        error={submitted ? errors.lastName : undefined}
      >
        <InputShell icon={User} error={!!(submitted && errors.lastName)}>
          <input
            className={elevatedInputClass(true)}
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            placeholder="Morgan"
          />
        </InputShell>
      </Field>
      <Field
        label="Email"
        required
        error={submitted ? errors.email : undefined}
      >
        <InputShell icon={Mail} error={!!(submitted && errors.email)}>
          <input
            type="email"
            className={elevatedInputClass(true)}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="alex@company.com"
          />
        </InputShell>
      </Field>
      <Field
        label="Phone"
        error={submitted ? errors.phone : undefined}
      >
        <InputShell icon={Phone} error={!!(submitted && errors.phone)}>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={elevatedInputClass(true)}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+61 400 000 000"
          />
        </InputShell>
      </Field>
      <Field
        label="Mobile"
        error={submitted ? errors.mobile : undefined}
      >
        <InputShell icon={Smartphone} error={!!(submitted && errors.mobile)}>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={elevatedInputClass(true)}
            value={form.mobile}
            onChange={(e) => update("mobile", e.target.value)}
            placeholder="+61 400 000 000"
          />
        </InputShell>
      </Field>
      <Field label="Company">
        <InputShell icon={Building2}>
          <select
            className={elevatedSelectClass(true)}
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
          >
            <option value="">Select company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
      <Field label="Lead Source">
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={form.leadSource}
            onChange={(e) =>
              update("leadSource", e.target.value as ContactSource | "")
            }
          >
            <option value="">Select source</option>
            {CONTACT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
              update("status", e.target.value as ContactStatus)
            }
          >
            {CONTACT_STATUSES.map((s) => (
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
    </CreateEntityFormShell>
  );
}
