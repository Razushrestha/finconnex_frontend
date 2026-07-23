"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Users, Calendar, User, FileText } from "lucide-react";
import {
  SMS_CAMPAIGN_STATUSES,
  SMS_CAMPAIGN_TYPES,
  formatSmsAt,
  nextSmsCampaignIds,
  upsertSmsCampaign,
  type SmsCampaignStatus,
  type SmsCampaignType,
} from "@/lib/marketing/sms/types";
import {
  AUDIENCE_OPTIONS,
  SMS_TEMPLATE_SEEDS,
} from "@/lib/marketing/templates/seed";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
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

const SMS_LIMIT = 160;

export function CreateSmsCampaignForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<SmsCampaignType>("Reminder");
  const [status, setStatus] = useState<SmsCampaignStatus>("Draft");
  const [audience, setAudience] = useState<string>(AUDIENCE_OPTIONS[4]);
  const [templateId, setTemplateId] = useState(SMS_TEMPLATE_SEEDS[0].id);
  const [message, setMessage] = useState(SMS_TEMPLATE_SEEDS[0].body);
  const [scheduledAt, setScheduledAt] = useState("");
  const [createdBy, setCreatedBy] = useState<string>(ACTIVITY_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onTemplateChange(id: string) {
    setTemplateId(id);
    const t = SMS_TEMPLATE_SEEDS.find((x) => x.id === id);
    if (t) setMessage(t.body);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!type) next.type = "Type is required";
    if (!audience.trim()) next.audience = "Audience is required";
    if (!message.trim()) next.message = "Message body is required";
    else if (message.length > SMS_LIMIT)
      next.message = `Keep under ${SMS_LIMIT} characters`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextSmsCampaignIds();
    const created = upsertSmsCampaign({
      id: ids.id,
      campaignId: ids.campaignId,
      name: name.trim(),
      type,
      status,
      audience: audience.trim(),
      message: message.trim(),
      templateId,
      scheduledAt: scheduledAt || undefined,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      replyCount: 0,
      createdBy,
      createdAt: new Date().toLocaleDateString("en-AU"),
      audit: [
        {
          id: `a-${Date.now()}`,
          at: formatSmsAt(),
          action: "Created",
          actor: createdBy,
        },
      ],
    });
    if (createAnother) {
      setName("");
      setErrors({});
      return;
    }
    router.push(`/marketing/sms/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "SMS Campaigns", href: "/marketing/sms" }}
      badge="§10.2"
      title="Create SMS Campaign"
      subtitle="Promotional, transactional, reminder, or automated short messages."
      tip="Name, Type, Audience, and Message are required."
      cardIcon={MessageSquare}
      cardTitle="SMS details"
      cardDescription="SRS §10.2 — keep copy under 160 characters"
      listHref="/marketing/sms"
      saveLabel="Save draft"
      onSave={onSave}
    >
      <Field label="Name" required error={errors.name} className="sm:col-span-2">
        <InputShell icon={MessageSquare} error={!!errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Appointment reminder — tomorrow"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Type" required error={errors.type}>
        <InputShell error={!!errors.type}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SmsCampaignType)}
            className={elevatedSelectClass()}
          >
            {SMS_CAMPAIGN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Status">
        <InputShell>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SmsCampaignStatus)}
            className={elevatedSelectClass()}
          >
            {SMS_CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Audience" required error={errors.audience}>
        <InputShell icon={Users} error={!!errors.audience}>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className={elevatedSelectClass(true)}
          >
            {AUDIENCE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Template" className="sm:col-span-2">
        <InputShell icon={FileText}>
          <select
            value={templateId}
            onChange={(e) => onTemplateChange(e.target.value)}
            className={elevatedSelectClass(true)}
          >
            {SMS_TEMPLATE_SEEDS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field
        label="Message body"
        required
        error={errors.message}
        className="col-span-full"
      >
        <TextAreaShell error={!!errors.message}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={elevatedTextareaClass}
            rows={4}
            maxLength={SMS_LIMIT + 20}
          />
        </TextAreaShell>
        <p className="mt-1 text-right text-[10px] tabular-nums text-slate-400">
          {message.length}/{SMS_LIMIT}
        </p>
      </Field>

      <Field label="Scheduled date">
        <InputShell icon={Calendar}>
          <input
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            placeholder="25/07/2026 16:00"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Created by">
        <InputShell icon={User}>
          <select
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            className={elevatedSelectClass(true)}
          >
            {ACTIVITY_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>
    </CreateEntityFormShell>
  );
}
