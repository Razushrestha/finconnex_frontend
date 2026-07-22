"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Users, Calendar, User, FileText } from "lucide-react";
import {
  WHATSAPP_CAMPAIGN_STATUSES,
  formatWaAt,
  nextWhatsAppCampaignIds,
  upsertWhatsAppCampaign,
  type WhatsAppCampaignStatus,
} from "@/lib/marketing/whatsapp/types";
import {
  AUDIENCE_OPTIONS,
  WHATSAPP_TEMPLATE_SEEDS,
} from "@/lib/marketing/templates/seed";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";
import {
  CreateEntityFormShell,
  Field,
  InputShell,
  elevatedInputClass,
  elevatedSelectClass,
} from "@/components/sales/CreateEntityForm";

interface Props {
  layoutId: string;
  redirect: boolean;
}

export function CreateWhatsAppCampaignForm({
  layoutId: _l,
  redirect: _r,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(WHATSAPP_TEMPLATE_SEEDS[0].id);
  const [audience, setAudience] = useState<string>(AUDIENCE_OPTIONS[4]);
  const [status, setStatus] = useState<WhatsAppCampaignStatus>("Draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [createdBy, setCreatedBy] = useState<string>(ACTIVITY_OWNERS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const template = WHATSAPP_TEMPLATE_SEEDS.find((t) => t.id === templateId)!;

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    if (!templateId) next.templateId = "Approved WhatsApp template is required";
    if (!audience.trim()) next.audience = "Audience is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const ids = nextWhatsAppCampaignIds();
    const created = upsertWhatsAppCampaign({
      id: ids.id,
      campaignId: ids.campaignId,
      name: name.trim(),
      templateId,
      templateName: template.name,
      templateApproval: template.approvalStatus,
      templateBody: template.body,
      templateHeader: template.header,
      templateButtons: template.buttons,
      audience: audience.trim(),
      status,
      scheduledAt: scheduledAt || undefined,
      sentCount: 0,
      deliveredCount: 0,
      readCount: 0,
      failedCount: 0,
      replyCount: 0,
      createdBy,
      createdAt: new Date().toLocaleDateString("en-AU"),
      audit: [
        {
          id: `a-${Date.now()}`,
          at: formatWaAt(),
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
    router.push(`/marketing/whatsapp/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{
        label: "WhatsApp Campaigns",
        href: "/marketing/whatsapp",
      }}
      badge="§10.3"
      title="Create WhatsApp Campaign"
      subtitle="Broadcast via WhatsApp Business API using Meta-approved templates."
      tip="Name, approved template, and audience are required. Launch only when Approved."
      cardIcon={MessageCircle}
      cardTitle="WhatsApp campaign"
      cardDescription="SRS §10.3 — template pre-approval required"
      listHref="/marketing/whatsapp"
      saveLabel="Save draft"
      onSave={onSave}
    >
      <Field
        label="Name"
        required
        error={errors.name}
        className="sm:col-span-2 lg:col-span-3"
      >
        <InputShell icon={MessageCircle} error={!!errors.name}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Appointment reminders — this week"
            className={elevatedInputClass(true)}
          />
        </InputShell>
      </Field>

      <Field
        label="WhatsApp template"
        required
        error={errors.templateId}
        className="sm:col-span-2"
      >
        <InputShell icon={FileText} error={!!errors.templateId}>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className={elevatedSelectClass(true)}
          >
            {WHATSAPP_TEMPLATE_SEEDS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.approvalStatus}
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

      <Field label="Status">
        <InputShell>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as WhatsAppCampaignStatus)
            }
            className={elevatedSelectClass()}
          >
            {WHATSAPP_CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Scheduled date">
        <InputShell icon={Calendar}>
          <input
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            placeholder="19/07/2026 16:00"
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

      <div className="sm:col-span-2 lg:col-span-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <p className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
            Template preview · {template.approvalStatus}
          </p>
          {template.header ? (
            <p className="mt-2 text-[12px] font-bold text-slate-800">
              {template.header}
            </p>
          ) : null}
          <p className="mt-1 text-[13px] leading-relaxed text-slate-700">
            {template.body}
          </p>
          {template.buttons?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {template.buttons.map((b) => (
                <span
                  key={b}
                  className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </CreateEntityFormShell>
  );
}
