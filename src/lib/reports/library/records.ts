import { listCalls } from "@/lib/calls/store";
import { listAllContacts, listContactGroups } from "@/lib/contacts/store";
import { listCompanyGroups } from "@/lib/companies/store";
import { listDealPipelines } from "@/lib/deals/store";
import { parseMoney, rangeStart, type DashboardDateRange } from "@/lib/dashboard/layout";
import { listDocumentRequests } from "@/lib/documents/requests/types";
import { listEmails } from "@/lib/emails/store";
import { listEstimates } from "@/lib/finance/estimates/types";
import { listInvoices } from "@/lib/finance/invoices/types";
import { listPayments } from "@/lib/finance/payments/types";
import { listProducts } from "@/lib/finance/products/types";
import { listLeadColumns } from "@/lib/leads/store";
import { coerceLeadSource } from "@/lib/leads/types";
import { listEmailCampaigns } from "@/lib/marketing/email/types";
import { listSmsCampaigns } from "@/lib/marketing/sms/types";
import { listWhatsAppCampaigns } from "@/lib/marketing/whatsapp/types";
import { listMeetings } from "@/lib/meetings/store";
import { listReminders } from "@/lib/reminders/store";
import { formatRelatedTo } from "@/lib/activities/shared";
import { listAllTasks } from "@/lib/tasks/store";
import { daysBetween, loanFromText, ownerFromEmail, parseDate } from "@/lib/reports/library/format";
import { filterVisibleOwners, teamForOwner } from "@/lib/reports/library/scope";
import type { LibraryFilters } from "@/lib/reports/library/types";

export type CrmLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  owner: string;
  team: string;
  source: string;
  status: string;
  stage: string;
  loanType: string;
  createdAt: Date | null;
  createdRaw: string;
  value: number;
  converted: boolean;
  convertedAt: Date | null;
  lastTouch: Date | null;
  lostReason: string;
  campaign: string;
  ageDays: number;
};

export type CrmDeal = {
  id: string;
  name: string;
  account: string;
  contact: string;
  owner: string;
  team: string;
  stage: string;
  status: string;
  loanType: string;
  value: number;
  probability: number;
  weighted: number;
  closeAt: Date | null;
  closeRaw: string;
  won: boolean;
  lost: boolean;
  lostReason: string;
  ageDays: number;
};

export type CrmActivity = {
  id: string;
  kind: "Task" | "Call" | "Email" | "Meeting" | "Follow-up";
  title: string;
  owner: string;
  team: string;
  status: string;
  related: string;
  at: Date | null;
  rawDate: string;
  extra: string;
  overdue?: boolean;
};

export function inDateRange(at: Date | null, range: DashboardDateRange, now: Date) {
  if (!at) return range === "all";
  const start = rangeStart(range, now);
  return !start || at >= start;
}

export function campaignNameFor(source: string, tags: string[] = []) {
  const blob = [source, ...tags].join(" ").toLowerCase();
  const campaigns = loadCampaigns();
  const hit = campaigns.find((c) => blob.includes(c.name.toLowerCase().slice(0, 12)));
  if (hit) return hit.name;
  if (blob.includes("google")) return "Google Ads";
  if (blob.includes("facebook") || blob.includes("meta") || blob.includes("instagram")) {
    return "Meta Ads";
  }
  if (blob.includes("referral")) return "Referral";
  if (blob.includes("website") || blob.includes("organic")) return "Website";
  return source || "Unassigned";
}

export function loadCampaigns() {
  return [
    ...listEmailCampaigns().map((c) => ({
      id: c.id,
      name: c.name,
      channel: "Email" as const,
      status: c.status,
      owner: c.createdBy,
      sent: c.sentCount,
      engaged: c.openCount + c.clickCount,
      createdAt: parseDate(c.createdAt),
      createdRaw: c.createdAt,
    })),
    ...listSmsCampaigns().map((c) => ({
      id: c.id,
      name: c.name,
      channel: "SMS" as const,
      status: c.status,
      owner: c.createdBy,
      sent: c.sentCount,
      engaged: c.replyCount,
      createdAt: parseDate(c.createdAt),
      createdRaw: c.createdAt,
    })),
    ...listWhatsAppCampaigns().map((c) => ({
      id: c.id,
      name: c.name,
      channel: "WhatsApp" as const,
      status: c.status,
      owner: c.createdBy,
      sent: c.sentCount,
      engaged: c.replyCount ?? 0,
      createdAt: parseDate(c.createdAt),
      createdRaw: c.createdAt,
    })),
  ];
}

function lastTouchFor(name: string, created: Date | null) {
  const key = name.toLowerCase();
  const stamps: Date[] = [];
  for (const call of listCalls()) {
    const blob = `${call.relatedTo ?? ""} ${call.contact ?? ""}`.toLowerCase();
    const at = parseDate(call.date);
    if (at && blob.includes(key)) stamps.push(at);
  }
  for (const email of listEmails()) {
    const blob = `${email.relatedTo ?? ""} ${email.to.join(" ")}`.toLowerCase();
    const at = parseDate(email.sentDate);
    if (at && blob.includes(key)) stamps.push(at);
  }
  for (const meeting of listMeetings()) {
    const blob = `${meeting.relatedTo ?? ""} ${meeting.title}`.toLowerCase();
    const at = parseDate(meeting.startDateTime);
    if (at && blob.includes(key)) stamps.push(at);
  }
  if (!stamps.length) return created;
  return stamps.reduce((latest, at) => (at > latest ? at : latest), stamps[0]!);
}

export function loadLeads(now = new Date()): CrmLead[] {
  return filterVisibleOwners(
    listLeadColumns().flatMap((col) =>
      col.cards.map((card) => {
        const created = parseDate(card.createdDate);
        const stage = card.pipelineStage || col.title;
        const lost = stage === "Closed Lost" || col.leadStatus === "Unqualified";
        const converted =
          card.isConverted === true ||
          stage === "Closed Won" ||
          Boolean(card.convertedDealId);
        return {
          id: card.id,
          name: card.name,
          company: card.company,
          email: card.email,
          owner: card.owner,
          team: teamForOwner(card.owner),
          source: coerceLeadSource(card.source),
          status: col.leadStatus,
          stage,
          loanType: loanFromText(card.productInterest, ...(card.tags ?? [])),
          createdAt: created,
          createdRaw: card.createdDate,
          value: parseMoney(card.estimatedValue ?? "0"),
          converted,
          convertedAt: parseDate(card.convertedAt),
          lastTouch: lastTouchFor(card.name, created),
          lostReason: lost
            ? (card.tags?.[0] || (col.leadStatus === "Unqualified" ? "Unqualified" : "Closed Lost"))
            : "—",
          campaign: campaignNameFor(card.source, card.tags),
          ageDays: created ? daysBetween(created, now) : 0,
        };
      }),
    ),
  );
}

export function loadDeals(now = new Date()): CrmDeal[] {
  return filterVisibleOwners(
    Object.entries(listDealPipelines()).flatMap(([, stages]) =>
      stages.flatMap((stage) =>
        stage.deals.map((deal) => {
          const closeAt = parseDate(deal.closeDate);
          const won = stage.title === "Closed Won";
          const lost = stage.title === "Closed Lost";
          return {
            id: deal.id,
            name: deal.name,
            account: deal.account,
            contact: deal.contact ?? "—",
            owner: deal.owner,
            team: teamForOwner(deal.owner),
            stage: stage.title,
            status: won ? "Won" : lost ? "Lost" : "Open",
            loanType: loanFromText(deal.name, ...(deal.tags ?? [])),
            value: parseMoney(deal.value),
            probability: deal.probability,
            weighted: Math.round(parseMoney(deal.value) * (deal.probability / 100)),
            closeAt,
            closeRaw: deal.closeDate,
            won,
            lost,
            lostReason: lost ? deal.tags?.[0] || "Unspecified" : "—",
            ageDays: closeAt ? daysBetween(closeAt, now) : 0,
          };
        }),
      ),
    ),
  );
}

export function loadActivities(): CrmActivity[] {
  const tasks = listAllTasks().map((task) => ({
    id: `task-${task.taskId}`,
    kind: "Task" as const,
    title: task.title,
    owner: task.assignedTo,
    team: teamForOwner(task.assignedTo),
    status: task.status,
    related: formatRelatedTo(task.relatedTo) || "—",
    at: parseDate(task.dueDate),
    rawDate: task.dueDate,
    extra: task.taskType,
    overdue: task.overdue,
  }));
  const calls = listCalls().map((call) => ({
    id: `call-${call.id}`,
    kind: "Call" as const,
    title: call.subject,
    owner: call.assignedTo,
    team: teamForOwner(call.assignedTo),
    status: call.status,
    related: call.relatedTo || call.contact || "—",
    at: parseDate(call.date),
    rawDate: call.date,
    extra: call.callType,
  }));
  const emails = listEmails().map((email) => ({
    id: `email-${email.id}`,
    kind: "Email" as const,
    title: email.subject,
    owner: ownerFromEmail(email.from),
    team: teamForOwner(ownerFromEmail(email.from)),
    status: email.status,
    related: email.relatedTo || email.to[0] || "—",
    at: parseDate(email.sentDate),
    rawDate: email.sentDate ?? "",
    extra: email.importance ?? "Normal",
  }));
  const meetings = listMeetings().map((meeting) => ({
    id: `meet-${meeting.id}`,
    kind: "Meeting" as const,
    title: meeting.title,
    owner: meeting.organizer,
    team: teamForOwner(meeting.organizer),
    status: meeting.status,
    related: meeting.relatedTo || meeting.attendees[0]?.name || "—",
    at: parseDate(meeting.startDateTime),
    rawDate: meeting.startDateTime,
    extra: meeting.type,
  }));
  const followUps = listReminders().map((row) => ({
    id: `fu-${row.id}`,
    kind: "Follow-up" as const,
    title: row.title,
    owner: row.owner,
    team: teamForOwner(row.owner),
    status: row.status,
    related: row.relatedTo || "—",
    at: parseDate(row.dateTime),
    rawDate: row.dateTime,
    extra: row.type,
  }));
  return filterVisibleOwners([...tasks, ...calls, ...emails, ...meetings, ...followUps]);
}

export function loadDocuments() {
  return filterVisibleOwners(
    listDocumentRequests().map((req) => ({
      id: req.id,
      title: req.title,
      owner: req.requestedBy,
      team: teamForOwner(req.requestedBy),
      status: req.status,
      type: req.documentType,
      related: req.relatedTo || req.requestedFrom,
      requestedRaw: req.requestedDate,
      requestedAt: parseDate(req.requestedDate),
      dueRaw: req.dueDate,
      dueAt: parseDate(req.dueDate),
      receivedAt: parseDate(req.receivedDate),
      progress: req.progress,
      awaiting: req.items?.filter((line) => line.status === "Awaiting").length ?? 0,
      received: req.items?.filter((line) => line.status !== "Awaiting").length ?? 0,
    })),
  );
}

export function loadContacts() {
  return filterVisibleOwners(
    listContactGroups().flatMap((group) =>
      group.contacts.map((contact) => ({
        ...contact,
        status: group.title,
        team: teamForOwner(contact.owner),
        createdAt: parseDate(contact.createdDate),
      })),
    ),
  );
}

export function loadCompanies() {
  return filterVisibleOwners(
    listCompanyGroups().flatMap((group) =>
      group.companies.map((company) => ({
        ...company,
        status: group.title,
        team: teamForOwner(company.owner),
      })),
    ),
  );
}

export function loadEstimates() {
  return filterVisibleOwners(listEstimates().map((row) => ({ ...row, team: teamForOwner(row.owner) })));
}

export function loadInvoices() {
  return filterVisibleOwners(listInvoices().map((row) => ({ ...row, team: teamForOwner(row.owner) })));
}

export function loadPayments() {
  return filterVisibleOwners(
    listPayments().map((row) => ({
      ...row,
      owner: row.recordedBy,
      team: teamForOwner(row.recordedBy),
    })),
  );
}

export function loadProducts() {
  return listProducts();
}

export function allContacts() {
  return listAllContacts();
}

export function applyCommonFilters<
  T extends {
    owner?: string;
    team?: string;
    status?: string;
    source?: string;
    loanType?: string;
    stage?: string;
    campaign?: string;
  },
>(rows: T[], filters: LibraryFilters) {
  return rows.filter((row) => {
    if (filters.owner !== "All" && row.owner !== filters.owner) return false;
    if (filters.team !== "All teams" && row.team !== filters.team) return false;
    if (filters.status !== "All" && row.status !== filters.status) return false;
    if (filters.source !== "All" && row.source !== filters.source) return false;
    if (filters.loanType !== "All Loan Types" && row.loanType !== filters.loanType) return false;
    if (filters.loanPurpose !== "All" && row.loanType !== filters.loanPurpose) return false;
    if (filters.stage !== "All" && row.stage !== filters.stage) return false;
    if (filters.campaign !== "All" && row.campaign !== filters.campaign) return false;
    return true;
  });
}

export function qualifiedLead(lead: CrmLead) {
  return !["New", "Unqualified"].includes(lead.status) || lead.converted || lead.stage !== "New Lead";
}

export function appointmentLead(lead: CrmLead) {
  return (
    lead.stage === "Appointment Booked" ||
    lead.stage === "Appointment Missed" ||
    lead.status === "Qualified" ||
    lead.converted
  );
}

export function openLead(lead: CrmLead) {
  return lead.stage !== "Closed Won" && lead.stage !== "Closed Lost" && lead.status !== "Converted";
}
