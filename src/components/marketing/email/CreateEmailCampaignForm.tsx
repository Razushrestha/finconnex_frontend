"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Users,
  Calendar,
  User,
  Type,
  FileText,
  AtSign,
} from "lucide-react";
import {
  EMAIL_CAMPAIGN_STATUSES,
  EMAIL_CAMPAIGN_TYPES,
  formatCampaignAt,
  nextEmailCampaignIds,
  upsertEmailCampaign,
  type EmailCampaignStatus,
  type EmailCampaignType,
} from "@/lib/marketing/email/types";
import {
  AUDIENCE_OPTIONS,
  EMAIL_TEMPLATE_SEEDS,
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

export function CreateEmailCampaignForm({
  layoutId: _l,
  redirect: _r,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<EmailCampaignType>("One-time");
  const [status, setStatus] = useState<EmailCampaignStatus>("Draft");
  const [audience, setAudience] = useState<string>(AUDIENCE_OPTIONS[0]);
  const [templateId, setTemplateId] = useState(EMAIL_TEMPLATE_SEEDS[0].id);
  const [subject, setSubject] = useState(EMAIL_TEMPLATE_SEEDS[0].subject);
  const [fromName, setFromName] = useState<string>(ACTIVITY_OWNERS[0]);
  const [fromEmail, setFromEmail] = useState("john@finconnex.example");
  const [scheduledAt, setScheduledAt] = useState("");
  const [previewText, setPreviewText] = useState(
    EMAIL_TEMPLATE_SEEDS[0].previewText,
  );
  const [body, setBody] = useState(EMAIL_TEMPLATE_SEEDS[0].bodyHtml);
  const [createdBy, setCreatedBy] = useState<string>(ACTIVITY_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onTemplateChange(id: string) {
    setTemplateId(id);
    const t = EMAIL_TEMPLATE_SEEDS.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setPreviewText(t.previewText);
    setBody(t.bodyHtml);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!type) next.type = "Type is required";
    if (!audience.trim()) next.audience = "Audience is required";
    if (!templateId) next.templateId = "Email template is required";
    if (!subject.trim()) next.subject = "Subject line is required";
    if (!fromName.trim()) next.fromName = "From name is required";
    if (!fromEmail.trim() || !fromEmail.includes("@"))
      next.fromEmail = "Valid from email required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextEmailCampaignIds();
    const template = EMAIL_TEMPLATE_SEEDS.find((t) => t.id === templateId)!;
    const created = upsertEmailCampaign({
      id: ids.id,
      campaignId: ids.campaignId,
      name: name.trim(),
      type,
      status,
      audience: audience.trim(),
      templateId,
      templateName: template.name,
      subject: subject.trim(),
      fromName: fromName.trim(),
      fromEmail: fromEmail.trim(),
      scheduledAt: scheduledAt || undefined,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0,
      previewText: previewText.trim() || undefined,
      body: body.trim() || undefined,
      createdBy,
      createdAt: new Date().toLocaleDateString("en-AU"),
      audit: [
        {
          id: `a-${Date.now()}`,
          at: formatCampaignAt(),
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
    router.push(`/marketing/email/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{
        label: "Email Campaigns",
        href: "/marketing/email",
      }}
      badge="§10.1"
      title="Create Email Campaign"
      subtitle="Bulk or drip email using the Templates Library — scored like Zoho Campaigns."
      tip="Name, Type, Audience, Template, Subject, and From are required."
      cardIcon={Mail}
      cardTitle="Campaign details"
      cardDescription="SRS §10.1 — starts as Draft until you schedule or launch"
      listHref="/marketing/email"
      saveLabel="Save draft"
      onSave={onSave}
    >
      <Field
        label="Name"
        required
        error={errors.name}
        className="sm:col-span-2"
      >
        <InputShell icon={Mail} error={!!errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="July rate-lock nurture"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Type" required error={errors.type}>
        <InputShell error={!!errors.type}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EmailCampaignType)}
            className={elevatedSelectClass()}
          >
            {EMAIL_CAMPAIGN_TYPES.map((t) => (
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
            onChange={(e) => setStatus(e.target.value as EmailCampaignStatus)}
            className={elevatedSelectClass()}
          >
            {EMAIL_CAMPAIGN_STATUSES.map((s) => (
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

      <Field
        label="Email template"
        required
        error={errors.templateId}
        className="sm:col-span-2"
      >
        <InputShell icon={FileText} error={!!errors.templateId}>
          <select
            value={templateId}
            onChange={(e) => onTemplateChange(e.target.value)}
            className={elevatedSelectClass(true)}
          >
            {EMAIL_TEMPLATE_SEEDS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field
        label="Subject line"
        required
        error={errors.subject}
        className="sm:col-span-2 lg:col-span-3"
      >
        <InputShell icon={Type} error={!!errors.subject}>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Lock in today's home loan rate"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="From name" required error={errors.fromName}>
        <InputShell icon={User} error={!!errors.fromName}>
          <input
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="From email" required error={errors.fromEmail}>
        <InputShell icon={AtSign} error={!!errors.fromEmail}>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field label="Scheduled date">
        <InputShell icon={Calendar}>
          <input
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            placeholder="23/07/2026 09:00"
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

      <Field label="Preview text" className="sm:col-span-2 lg:col-span-3">
        <InputShell>
          <input
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Inbox preview snippet…"
            className={elevatedInputClass()}
          />
        </InputShell>
      </Field>

      <Field label="Body" className="sm:col-span-2 lg:col-span-3">
        <TextAreaShell>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={elevatedTextareaClass}
            rows={6}
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
