/**
 * Keyword search across live workspace records.
 * Each source is a real CRM list. Rows that do not contain the keyword are dropped.
 */

import { listCrmCalls } from "@/lib/calls/api";
import { listCrmCampaigns } from "@/lib/campaigns/api";
import { listCrmCompanies } from "@/lib/companies/api";
import { loadCrmContacts } from "@/lib/contacts/api";
import { listCrmDeals } from "@/lib/deals/api";
import { listCrmDocuments } from "@/lib/documents/library/api";
import { listCrmDocumentRequests } from "@/lib/documents/requests/api";
import { listCrmSignatureRequests } from "@/lib/documents/signature/api";
import { listCrmEmails } from "@/lib/emails/api";
import { listCrmEventTypePages } from "@/lib/booking/api";
import { listCrmCreditNotes } from "@/lib/finance/credit-notes/api";
import { listCrmEstimates } from "@/lib/finance/estimates/api";
import { listCrmInvoices } from "@/lib/finance/invoices/api";
import { listCrmProducts } from "@/lib/finance/products/api";
import { listCrmQuotes } from "@/lib/finance/quotations/api";
import { fetchLeadList } from "@/lib/leads/api/client";
import { listCrmMeetings } from "@/lib/meetings/api";
import { listCrmMessages } from "@/lib/messages/api";
import { listCrmNotes } from "@/lib/notes/api";
import { listCrmClientPortals } from "@/lib/portals/api";
import { listCrmReminders } from "@/lib/reminders/api";
import { listCrmReports } from "@/lib/reports/api";
import { listCrmResources } from "@/lib/resources/api";
import {
  hrefForRecordType,
  normalizeRecordSearchHit,
  searchCrmRecords,
  type CrmRecordSearchHit,
  type CrmRecordSearchType,
} from "@/lib/search/api";
import { listCrmTickets } from "@/lib/support/api";
import { listCrmTasks } from "@/lib/tasks/api";
import { listCrmWorkflowRules } from "@/lib/workflow-rules/api";
import { listCrmWorkspaceMembers } from "@/lib/workspace-members/api";

const ALL_TYPES: CrmRecordSearchType[] = [
  "CONTACT",
  "LEAD",
  "COMPANY",
  "DEAL",
  "TASK",
  "CALL",
  "MEETING",
  "NOTE",
];

const PAGE = { page: 1 as const, limit: 100 };

function includesQuery(query: string, parts: Array<string | number | null | undefined>) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const hay = parts
    .filter((part) => part != null && String(part).trim())
    .join(" ")
    .toLowerCase();
  return words.every((word) => hay.includes(word));
}

function isRealId(id: string) {
  return Boolean(id) && !/^(crm-|wm-remote-|hit-)/.test(id);
}

function hit(
  query: string,
  type: string,
  id: string,
  title: string,
  subtitle: string,
  extra: Array<string | number | null | undefined> = [],
  href?: string,
): CrmRecordSearchHit | null {
  const name = title.trim();
  if (!isRealId(id) || !name) return null;
  if (!includesQuery(query, [name, subtitle, type, ...extra])) return null;
  return {
    id,
    type,
    title: name,
    subtitle: subtitle.trim() || undefined,
    href: href || hrefForRecordType(type, id),
  };
}

async function official(query: string): Promise<CrmRecordSearchHit[]> {
  let rows: CrmRecordSearchHit[] = [];
  try {
    rows = await searchCrmRecords({ q: query, limit: 50, types: ALL_TYPES });
  } catch {
    rows = await searchCrmRecords({ q: query, limit: 50 });
  }
  return rows.filter(
    (row) =>
      isRealId(row.id) &&
      includesQuery(query, [row.title, row.subtitle, row.type]),
  );
}

async function moduleHits(query: string): Promise<Array<{ ok: boolean; hits: CrmRecordSearchHit[] }>> {
  const search = { ...PAGE, search: query };
  return Promise.all([
    load(async () => {
      const rows = await fetchLeadList(search);
      return rows.map((row) =>
        hit(
          query,
          "Lead",
          row.id,
          [row.firstName, row.lastName].filter(Boolean).join(" "),
          row.email,
          [row.phone, row.mobilePhone, row.companyName, row.notes, row.description],
        ),
      );
    }),
    load(async () => {
      const rows = await loadCrmContacts(search);
      return rows.map((row) =>
        hit(
          query,
          "Contact",
          row.contact.id,
          row.contact.name,
          row.contact.email,
          [row.contact.phone, row.contact.mobile, row.contact.company, row.contact.jobTitle],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmCompanies(search);
      return rows.map((row) =>
        hit(
          query,
          "Company",
          row.company.id,
          row.company.name,
          row.company.industry,
          [row.company.phone, row.company.website, row.company.city, row.company.owner],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmDeals(search);
      return rows.map((row) =>
        hit(query, "Deal", row.id, row.name, row.account, [row.contact, row.owner]),
      );
    }),
    load(async () => {
      const rows = await listCrmTasks(search);
      return rows.map((row) =>
        hit(
          query,
          "Task",
          row.taskId,
          row.title,
          row.assignedTo,
          [row.notes, row.description, row.relatedTo?.name],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmCalls(search);
      return rows.map((row) =>
        hit(
          query,
          "Call",
          row.id,
          row.subject,
          row.contact || row.relatedTo || "",
          [row.fromNumber, row.notes, row.purpose, row.assignedTo],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmMeetings(search);
      return rows.map((row) =>
        hit(
          query,
          "Meeting",
          row.id,
          row.title,
          row.organizer,
          [row.location, row.notes, row.agenda, ...row.attendees.map((person) => person.name), ...row.attendees.map((person) => person.email)],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmNotes(search);
      return rows.map((row) => hit(query, "Note", row.id, row.title, row.body));
    }),
    load(async () => {
      const rows = await listCrmEmails(search);
      return rows.map((row) =>
        hit(query, "Email", row.id, row.subject, row.from, [row.to.join(", "), row.body]),
      );
    }),
    load(async () => {
      const rows = await listCrmMessages(search);
      return rows.map((row) =>
        hit(query, "Message", row.id, row.subject, row.from, [row.to, row.body]),
      );
    }),
    load(async () => {
      const rows = await listCrmReminders(search);
      return rows.map((row) =>
        hit(query, "Reminder", row.id, row.title, row.relatedTo || row.owner),
      );
    }),
    load(async () => {
      const rows = await listCrmInvoices(search);
      return rows.map((row) =>
        hit(
          query,
          "Invoice",
          row.id,
          row.title || row.invoiceId,
          row.clientName,
          [row.invoiceId, row.contactName, row.contactEmail, row.notes],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmQuotes(search);
      return rows.map((row) =>
        hit(
          query,
          "Quotation",
          row.id,
          row.title || row.quotationId,
          row.clientName,
          [row.quotationId, row.contactName, row.contactEmail],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmEstimates(search);
      return rows.map((row) =>
        hit(
          query,
          "Estimate",
          row.id,
          row.title || row.estimateId,
          row.clientName,
          [row.estimateId, row.contactName, row.contactEmail],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmProducts(search);
      return rows.map((row) =>
        hit(query, "Product", row.id, row.name, row.sku, [row.description, row.type]),
      );
    }),
    load(async () => {
      const rows = await listCrmCreditNotes(search);
      return rows.map((row) =>
        hit(
          query,
          "Credit note",
          row.id,
          row.title || row.creditNoteId,
          row.clientName,
          [row.creditNoteId, row.invoiceRef, row.reason],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmTickets(search);
      return rows.map((row) =>
        hit(
          query,
          "Ticket",
          row.id,
          row.subject,
          row.requester,
          [row.ticketId, row.description, row.relatedAccount],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmDocuments(search);
      return rows.map((row) =>
        hit(
          query,
          "Document",
          row.id,
          row.fileName,
          row.folder,
          [row.description, row.owner, ...row.tags],
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmDocumentRequests(search);
      return rows.map((row) =>
        hit(
          query,
          "Document request",
          row.id,
          row.title,
          row.requestedFrom,
          [row.requestId, row.documentType],
          "/documents/requests",
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmSignatureRequests(search);
      return rows.map((row) =>
        hit(
          query,
          "Signature",
          row.id,
          row.documentName || row.documentFile,
          row.signer,
          [row.signatureRequestId, row.signerEmail, ...(row.signers ?? []).map((person) => person.name), ...(row.signers ?? []).map((person) => person.email)],
          "/signature/documents",
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmCampaigns(search);
      return rows.map((row, index) => {
        const mapped = normalizeRecordSearchHit(
          { ...row, type: "Campaign" },
          index,
        );
        const channel = String(row.channel ?? "").toUpperCase();
        const href =
          channel === "SMS"
            ? "/marketing/sms"
            : channel === "WHATSAPP"
              ? "/marketing/whatsapp"
              : "/marketing/email";
        return hit(
          query,
          "Campaign",
          mapped.id,
          mapped.title,
          mapped.subtitle || channel,
          [channel],
          href,
        );
      });
    }),
    load(async () => {
      const rows = await listCrmReports({ search: query });
      return rows.map((row) =>
        hit(query, "Report", row.id, row.name, row.type, [row.dataSource], "/reports"),
      );
    }),
    load(async () => {
      const rows = await listCrmClientPortals(search);
      return rows.map((row) =>
        hit(
          query,
          "Portal",
          row.id,
          row.name,
          row.clientName,
          [row.slug, row.primaryContactName, row.primaryContactEmail],
          "/portals",
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmResources(search);
      return rows.map((row) =>
        hit(
          query,
          "Resource",
          row.id,
          row.name,
          row.category,
          [row.description, row.fileOrUrl, ...row.tags],
          "/resources",
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmWorkflowRules(search);
      return rows.map((row) =>
        hit(
          query,
          "Automation",
          row.id,
          row.name,
          row.trigger,
          [row.description, row.actions],
          "/automations",
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmWorkspaceMembers();
      return rows.map((row) =>
        hit(
          query,
          "User",
          row.userId || row.id,
          row.name,
          row.email,
          [row.workspaceRole, row.team],
          "/users",
        ),
      );
    }),
    load(async () => {
      const rows = await listCrmEventTypePages();
      return rows.map((row) =>
        hit(
          query,
          "Booking",
          row.id,
          row.title,
          row.eventType,
          [row.slug, row.owner, row.description],
          `/booking/${row.id}`,
        ),
      );
    }),
  ]);
}

async function load(
  run: () => Promise<Array<CrmRecordSearchHit | null>>,
): Promise<{ ok: boolean; hits: CrmRecordSearchHit[] }> {
  try {
    return {
      ok: true,
      hits: (await run()).filter((row): row is CrmRecordSearchHit => row != null),
    };
  } catch {
    return { ok: false, hits: [] };
  }
}

export async function searchWorkspaceRecords(
  query: string,
): Promise<CrmRecordSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const [indexed, modules] = await Promise.all([
    official(q)
      .then((hits) => ({ ok: true, hits }))
      .catch(() => ({ ok: false, hits: [] as CrmRecordSearchHit[] })),
    moduleHits(q),
  ]);

  if (!indexed.ok && modules.every((bucket) => !bucket.ok)) {
    throw new Error("Sign in with a workspace to search records");
  }

  const seen = new Set<string>();
  const hits: CrmRecordSearchHit[] = [];
  for (const row of [indexed, ...modules].flatMap((bucket) => bucket.hits)) {
    const key = `${row.type.toLowerCase()}|${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(row);
  }
  hits.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
  return hits;
}
