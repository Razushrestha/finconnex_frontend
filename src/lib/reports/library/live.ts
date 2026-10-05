import { listCrmCalls } from "@/lib/calls/api";
import { replaceCrmCalls } from "@/lib/calls/store";
import { listCrmEmailCampaigns, listCrmSmsCampaigns, listCrmWhatsAppCampaigns } from "@/lib/campaigns/api";
import { listCrmCompanies } from "@/lib/companies/api";
import { replaceCrmCompanies } from "@/lib/companies/store";
import { loadCrmContacts } from "@/lib/contacts/api";
import { replaceCrmContactsOnBoard } from "@/lib/contacts/store";
import { loadCrmDealsBoard } from "@/lib/deals/api";
import { replaceCrmDealPipelines } from "@/lib/deals/store";
import { listCrmDocumentRequests } from "@/lib/documents/requests/api";
import { replaceDocumentRequests } from "@/lib/documents/requests/types";
import { listCrmEmails } from "@/lib/emails/api";
import { replaceCrmEmails } from "@/lib/emails/store";
import { listCrmEstimates } from "@/lib/finance/estimates/api";
import { replaceCrmEstimates } from "@/lib/finance/estimates/types";
import { listCrmInvoices } from "@/lib/finance/invoices/api";
import { replaceCrmInvoices } from "@/lib/finance/invoices/types";
import { listCrmPayments } from "@/lib/finance/payments/api";
import { replaceCrmPayments } from "@/lib/finance/payments/types";
import { listCrmProducts } from "@/lib/finance/products/api";
import { replaceCrmProducts } from "@/lib/finance/products/types";
import { refreshCrmLeadsBoard } from "@/lib/leads/api/client";
import { replaceCrmEmailCampaigns } from "@/lib/marketing/email/types";
import { replaceCrmSmsCampaigns } from "@/lib/marketing/sms/types";
import { replaceCrmWhatsAppCampaigns } from "@/lib/marketing/whatsapp/types";
import { listCrmMeetings } from "@/lib/meetings/api";
import { replaceCrmMeetings } from "@/lib/meetings/store";
import {
  createCrmReport,
  createCrmReportSchedule,
  isCrmReportId,
  persistRemoteReport,
  toCreateReportBody,
} from "@/lib/reports/api";
import { scheduleLibraryReport } from "@/lib/reports/library/prefs";
import type { ReportCategoryId } from "@/lib/reports/library/types";
import { listReports, type ReportSchedule, type ReportType } from "@/lib/reports/types";
import { listCrmReminders } from "@/lib/reminders/api";
import { replaceCrmReminders } from "@/lib/reminders/store";
import { listCrmTasks } from "@/lib/tasks/api";
import { replaceCrmTasks } from "@/lib/tasks/store";

export const CATEGORY_REPORT_TYPE: Record<ReportCategoryId, ReportType> = {
  leads: "Lead",
  deals: "Deal",
  pipeline: "Pipeline",
  activity: "Activity",
  documents: "Custom",
  marketing: "Custom",
  finance: "Revenue",
  team: "Custom",
  contacts: "Custom",
  executive: "Conversion",
};

export const CATEGORY_DATA_SOURCE: Record<ReportCategoryId, string> = {
  leads: "leads",
  deals: "deals",
  pipeline: "deals",
  activity: "activities",
  documents: "documents",
  marketing: "campaigns",
  finance: "invoices",
  team: "deals",
  contacts: "contacts",
  executive: "deals",
};

type SourceKey =
  | "leads"
  | "deals"
  | "calls"
  | "tasks"
  | "meetings"
  | "emails"
  | "reminders"
  | "documents"
  | "campaigns"
  | "invoices"
  | "payments"
  | "estimates"
  | "products"
  | "contacts"
  | "companies";

const CATEGORY_SOURCES: Record<ReportCategoryId, SourceKey[]> = {
  leads: ["leads"],
  deals: ["deals"],
  pipeline: ["deals"],
  activity: ["calls", "tasks", "meetings", "emails", "reminders"],
  documents: ["documents"],
  marketing: ["campaigns", "leads", "deals"],
  finance: ["invoices", "payments", "estimates", "products"],
  team: ["leads", "deals", "calls", "tasks"],
  contacts: ["contacts", "companies"],
  executive: ["leads", "deals", "invoices", "payments"],
};

async function settle(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run();
    return true;
  } catch {
    return false;
  }
}

async function pull(key: SourceKey): Promise<boolean> {
  switch (key) {
    case "leads":
      return refreshCrmLeadsBoard();
    case "deals":
      return settle(async () => {
        replaceCrmDealPipelines(await loadCrmDealsBoard());
      });
    case "calls":
      return settle(async () => {
        replaceCrmCalls(await listCrmCalls({ page: 1, limit: 100 }));
      });
    case "tasks":
      return settle(async () => {
        replaceCrmTasks(await listCrmTasks({ page: 1, limit: 100 }));
      });
    case "meetings":
      return settle(async () => {
        replaceCrmMeetings(await listCrmMeetings({ page: 1, limit: 100 }));
      });
    case "emails":
      return settle(async () => {
        replaceCrmEmails(await listCrmEmails({ page: 1, limit: 100 }));
      });
    case "reminders":
      return settle(async () => {
        replaceCrmReminders(await listCrmReminders({ page: 1, limit: 100 }));
      });
    case "documents":
      return settle(async () => {
        replaceDocumentRequests(await listCrmDocumentRequests({ page: 1, limit: 100 }));
      });
    case "campaigns":
      return settle(async () => {
        const [email, sms, whatsapp] = await Promise.all([
          listCrmEmailCampaigns(),
          listCrmSmsCampaigns(),
          listCrmWhatsAppCampaigns(),
        ]);
        replaceCrmEmailCampaigns(email);
        replaceCrmSmsCampaigns(sms);
        replaceCrmWhatsAppCampaigns(whatsapp);
      });
    case "invoices":
      return settle(async () => {
        replaceCrmInvoices(await listCrmInvoices({ limit: 100 }));
      });
    case "payments":
      return settle(async () => {
        replaceCrmPayments(await listCrmPayments({ limit: 100 }));
      });
    case "estimates":
      return settle(async () => {
        replaceCrmEstimates(await listCrmEstimates({ limit: 100 }));
      });
    case "products":
      return settle(async () => {
        replaceCrmProducts(await listCrmProducts({ limit: 100 }));
      });
    case "contacts":
      return settle(async () => {
        const remote = await loadCrmContacts();
        if (remote.length) replaceCrmContactsOnBoard(remote);
      });
    case "companies":
      return settle(async () => {
        replaceCrmCompanies(await listCrmCompanies({ limit: 100 }));
      });
    default:
      return false;
  }
}

export async function hydrateReportSources(category: ReportCategoryId): Promise<boolean> {
  const keys = CATEGORY_SOURCES[category];
  const results = await Promise.all(keys.map((key) => pull(key)));
  return results.some(Boolean);
}

export async function publishLibrarySchedule(input: {
  id: string;
  name: string;
  category: ReportCategoryId;
  groupBy?: string;
  cadence: Exclude<ReportSchedule, "None">;
}): Promise<"api" | "local"> {
  scheduleLibraryReport(input.id, input.cadence);
  try {
    const type = CATEGORY_REPORT_TYPE[input.category];
    const dataSource = CATEGORY_DATA_SOURCE[input.category];
    const existing = listReports().find(
      (row) => row.name === input.name && isCrmReportId(row.id),
    );
    let reportId = existing?.id;
    if (!reportId) {
      const created = persistRemoteReport(
        await createCrmReport(
          toCreateReportBody({
            name: input.name,
            type,
            dataSource,
            dateRange: "Last 30 days",
            groupBy: input.groupBy,
            schedule: input.cadence,
            status: "Scheduled",
          }),
        ),
      );
      reportId = created?.id;
    }
    if (!reportId || !isCrmReportId(reportId)) return "local";
    await createCrmReportSchedule(reportId, input.cadence);
    return "api";
  } catch {
    return "local";
  }
}
