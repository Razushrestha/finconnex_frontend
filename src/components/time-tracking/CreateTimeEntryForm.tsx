"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Timer,
  User,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Link2,
} from "lucide-react";
import {
  DEFAULT_RATES,
  RELATED_RECORD_OPTIONS,
  TIME_USERS,
  appendTimeAudit,
  formatTimeAt,
  formatTimeDate,
  nextTimeEntryIds,
  relatedLabel,
  upsertTimeEntry,
} from "@/lib/time-tracking/types";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  TextAreaShell,
  elevatedInputClass,
  elevatedSelectClass,
  elevatedTextareaClass,
} from "@/components/sales/CreateEntityForm";

interface Props {
  layoutId: string;
  redirect: boolean;
}

export function CreateTimeEntryForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [relatedIdx, setRelatedIdx] = useState(0);
  const [user, setUser] = useState<string>(TIME_USERS[0]);
  const [date, setDate] = useState(formatTimeDate());
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("0");
  const [billable, setBillable] = useState(true);
  const [rate, setRate] = useState(String(DEFAULT_RATES[TIME_USERS[0]] ?? 200));
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const related = RELATED_RECORD_OPTIONS[relatedIdx];

  const durationHours = useMemo(() => {
    const h = Number(hours) || 0;
    const m = Number(minutes) || 0;
    return Math.round((h + m / 60) * 100) / 100;
  }, [hours, minutes]);

  function validate() {
    const next: Record<string, string> = {};
    if (!user.trim()) next.user = "User is required";
    if (!date.trim()) next.date = "Date is required";
    if (durationHours <= 0) next.duration = "Duration must be greater than 0";
    if (billable && !(Number(rate) > 0)) next.rate = "Rate is required";
    if (!description.trim()) next.description = "Description is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextTimeEntryIds();
    const now = formatTimeAt();
    const entry = appendTimeAudit(
      {
        id: ids.id,
        entryId: ids.entryId,
        relatedTo: { ...related },
        user,
        date,
        durationHours,
        billable,
        rate: Number(rate) || 0,
        description: description.trim(),
        status: "Logged",
        createdBy: user,
        createdAt: now,
        modifiedAt: now,
        audit: [],
      },
      "Logged manually",
      user,
    );
    const created = upsertTimeEntry(entry);
    if (createAnother) {
      setHours("1");
      setMinutes("0");
      setDescription("");
      setErrors({});
      return;
    }
    router.push(`/time-tracking/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Time Tracking", href: "/time-tracking" }}
      badge="§23"
      title="Log time"
      subtitle="Capture billable or non-billable hours against a matter, deal, ticket, or project."
      tip="Related To, User, Date, Duration, and Description are required."
      cardIcon={Timer}
      cardTitle="Time entry"
      cardDescription="SRS §23: feeds Generate Invoice from Logged Time"
      listHref="/time-tracking"
      saveLabel="Log time"
      onSave={onSave}
    >
      <Field label="Related to" required className="sm:col-span-2">
        <InputShell icon={Link2}>
          <select
            className={elevatedSelectClass(true)}
            value={relatedIdx}
            onChange={(e) => setRelatedIdx(Number(e.target.value))}
          >
            {RELATED_RECORD_OPTIONS.map((r, i) => (
              <option key={`${r.kind}-${r.name}`} value={i}>
                {relatedLabel(r)}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="User" required error={errors.user}>
        <InputShell icon={User} error={!!errors.user}>
          <select
            className={elevatedSelectClass(true)}
            value={user}
            onChange={(e) => {
              const u = e.target.value;
              setUser(u);
              setRate(String(DEFAULT_RATES[u] ?? rate));
            }}
          >
            {TIME_USERS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Date" required error={errors.date}>
        <InputShell icon={Calendar} error={!!errors.date}>
          <input
            className={elevatedInputClass(true)}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="DD/MM/YYYY"
          />
        </InputShell>
      </Field>

      <Field label="Hours" required error={errors.duration}>
        <InputShell icon={Clock} error={!!errors.duration}>
          <input
            className={elevatedInputClass(true)}
            type="number"
            min={0}
            step={1}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </InputShell>
      </Field>

      <Field label="Minutes">
        <InputShell icon={Clock}>
          <input
            className={elevatedInputClass(true)}
            type="number"
            min={0}
            max={59}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </InputShell>
      </Field>

      <Field label="Billable">
        <InputShell icon={DollarSign}>
          <select
            className={elevatedSelectClass(true)}
            value={billable ? "Yes" : "No"}
            onChange={(e) => setBillable(e.target.value === "Yes")}
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </InputShell>
      </Field>

      <Field label="Rate (AUD / hour)" error={errors.rate}>
        <InputShell icon={DollarSign} error={!!errors.rate}>
          <input
            className={elevatedInputClass(true)}
            type="number"
            min={0}
            step={10}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={!billable}
          />
        </InputShell>
      </Field>

      <Field
        label="Description"
        required
        error={errors.description}
        className="sm:col-span-2"
      >
        <TextAreaShell error={!!errors.description}>
          <textarea
            className={elevatedTextareaClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What work was performed?"
          />
        </TextAreaShell>
      </Field>

      <p className="sm:col-span-2 text-[11px] text-slate-400">
        Duration = {durationHours.toFixed(2)} hours
        {billable
          ? ` · est. ${new Intl.NumberFormat("en-AU", {
              style: "currency",
              currency: "AUD",
            }).format(durationHours * (Number(rate) || 0))}`
          : ""}
      </p>
    </CreateEntityFormShell>
  );
}
