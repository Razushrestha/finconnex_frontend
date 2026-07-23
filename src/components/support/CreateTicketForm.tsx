"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HelpCircle,
  User,
  Building2,
  Type,
  FileText,
  Flag,
} from "lucide-react";
import {
  SUPPORT_ACCOUNTS,
  SUPPORT_AGENTS,
  SUPPORT_REQUESTERS,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  appendTicketAudit,
  formatTicketDate,
  nextTicketIds,
  upsertTicket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support/types";
import {
  getRulesActor,
  logCreate,
  notifyOwnerAssigned,
  requireAction,
  requiredFieldErrors,
} from "@/lib/rules";
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

export function CreateTicketForm({ layoutId: _l, redirect: _r }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [requester, setRequester] = useState<string>(SUPPORT_REQUESTERS[0]);
  const [relatedAccount, setRelatedAccount] = useState<string>("");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [status, setStatus] = useState<TicketStatus>("New");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [description, setDescription] = useState("");
  const [createdBy, setCreatedBy] = useState<string>(SUPPORT_AGENTS[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next = requiredFieldErrors(
      { subject, requester, priority, status, description },
      ["subject", "requester", "priority", "status", "description"],
    );
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSave(createAnother: boolean) {
    if (!validate()) return;
    const gate = requireAction("support.tickets.create");
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    const ids = nextTicketIds();
    const now = formatTicketDate();
    const actor = getRulesActor().name || createdBy;
    let ticket = appendTicketAudit(
      {
        id: ids.id,
        ticketId: ids.ticketId,
        subject: subject.trim(),
        requester,
        relatedAccount: relatedAccount || undefined,
        priority,
        status,
        category: category || undefined,
        assignedTo: assignedTo || undefined,
        description: description.trim(),
        createdBy: actor,
        createdAt: now,
        modifiedAt: now,
        notes: [],
        audit: [],
      },
      "Created",
      actor,
    );
    if (assignedTo) {
      ticket = appendTicketAudit(
        ticket,
        `Assigned to ${assignedTo}`,
        actor,
      );
      if (status === "New") {
        ticket = appendTicketAudit(
          { ...ticket, status: "Open" },
          "Status → Open",
          actor,
        );
      }
      notifyOwnerAssigned({
        owner: assignedTo,
        entityLabel: `Ticket ${ticket.ticketId}`,
        relatedTo: ticket.ticketId,
        relatedHref: `/support/${ticket.id}`,
      });
    }
    const created = upsertTicket(ticket);
    logCreate("support.tickets", actor, created.id, created.ticketId);
    if (createAnother) {
      setSubject("");
      setDescription("");
      setErrors({});
      return;
    }
    router.push(`/support/${created.id}`);
  }

  return (
    <CreateEntityFormShell
      breadcrumbParent={{ label: "Support", href: "/support" }}
      badge="§11"
      title="Create Support Ticket"
      subtitle="Track post-sale issues with the same rigour as the sales pipeline."
      tip="Subject, Requester, Priority, Status, and Description are required."
      cardIcon={HelpCircle}
      cardTitle="Ticket details"
      cardDescription="SRS §11 — feeds Customer Satisfaction Score on Analytics"
      listHref="/support"
      saveLabel="Create ticket"
      onSave={onSave}
    >
      <Field label="Subject" required error={errors.subject} className="sm:col-span-2">
        <InputShell icon={Type} error={!!errors.subject}>
          <input
            className={elevatedInputClass(true)}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Portal login fails after refinance close"
          />
        </InputShell>
      </Field>

      <Field label="Requester" required error={errors.requester}>
        <InputShell icon={User} error={!!errors.requester}>
          <select
            className={elevatedSelectClass(true)}
            value={requester}
            onChange={(e) => setRequester(e.target.value)}
          >
            {SUPPORT_REQUESTERS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Related account">
        <InputShell icon={Building2}>
          <select
            className={elevatedSelectClass(true)}
            value={relatedAccount}
            onChange={(e) => setRelatedAccount(e.target.value)}
          >
            <option value="">— None —</option>
            {SUPPORT_ACCOUNTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Priority" required error={errors.priority}>
        <InputShell icon={Flag} error={!!errors.priority}>
          <select
            className={elevatedSelectClass(true)}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Status" required error={errors.status}>
        <InputShell>
          <select
            className={elevatedSelectClass(false)}
            value={status}
            onChange={(e) => setStatus(e.target.value as TicketStatus)}
          >
            {TICKET_STATUSES.filter(
              (s) => !["Resolved", "Closed", "Reopened"].includes(s),
            ).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Category">
        <InputShell icon={FileText}>
          <select
            className={elevatedSelectClass(true)}
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as TicketCategory | "")
            }
          >
            <option value="">— None —</option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Assigned to">
        <InputShell icon={User}>
          <select
            className={elevatedSelectClass(true)}
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {SUPPORT_AGENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field label="Created by">
        <InputShell icon={User}>
          <select
            className={elevatedSelectClass(true)}
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
          >
            {SUPPORT_AGENTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </InputShell>
      </Field>

      <Field
        label="Description"
        required
        error={errors.description}
        className="sm:col-span-2 lg:col-span-3"
      >
        <TextAreaShell error={!!errors.description}>
          <textarea
            className={elevatedTextareaClass}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail…"
          />
        </TextAreaShell>
      </Field>
    </CreateEntityFormShell>
  );
}
