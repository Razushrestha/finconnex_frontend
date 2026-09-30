import type { AnalyticsSectionId } from "@/lib/analytics/library";
import {
  dashboardRangeToAnalyticsPeriod,
  fetchAnalyticsWidgets,
  overlaySectionPage,
  type AnalyticsWidgetResponse,
} from "@/lib/analytics/crm";
import {
  computeSectionPage,
  type SectionPageFilters,
  type SectionPageModel,
} from "@/lib/analytics/section-page";
import { refreshCrmLeadsBoard } from "@/lib/leads/api/client";
import {
  getCrmDealForecast,
  loadCrmDealsBoard,
  tryCrmDeal,
} from "@/lib/deals/api";
import { replaceCrmDealPipelines } from "@/lib/deals/store";
import {
  listCrmEmailCampaigns,
  listCrmSmsCampaigns,
  listCrmWhatsAppCampaigns,
} from "@/lib/campaigns/api";
import { replaceCrmEmailCampaigns } from "@/lib/marketing/email/types";
import { replaceCrmSmsCampaigns } from "@/lib/marketing/sms/types";
import { replaceCrmWhatsAppCampaigns } from "@/lib/marketing/whatsapp/types";
import { listCrmCalls, tryCrm as tryCrmCall } from "@/lib/calls/api";
import { replaceCrmCalls } from "@/lib/calls/store";
import { listCrmEmails, tryCrmEmail } from "@/lib/emails/api";
import { replaceCrmEmails } from "@/lib/emails/store";
import { listCrmMeetings, tryCrmMeeting } from "@/lib/meetings/api";
import { replaceCrmMeetings } from "@/lib/meetings/store";
import { listCrmTasks, tryCrmTask } from "@/lib/tasks/api";
import { replaceCrmTasks } from "@/lib/tasks/store";
import { listCrmDocumentRequests } from "@/lib/documents/requests/api";
import { replaceDocumentRequests } from "@/lib/documents/requests/types";
import { loadCrmContacts } from "@/lib/contacts/api";
import { replaceCrmContactsOnBoard } from "@/lib/contacts/store";
import {
  listCrmWorkspaceMembers,
  tryCrmWorkspaceMembers,
} from "@/lib/workspace-members/api";
import { replaceCrmWorkspaceMembers } from "@/lib/workspace-members/types";

async function quiet(run: () => Promise<unknown>) {
  try {
    await run();
  } catch {
    /* keep local store */
  }
}

export const SECTION_LIVE_APIS: Record<AnalyticsSectionId, string[]> = {
  business: ["GET /v1/leads", "GET /v1/deals", "GET /v1/analytics"],
  leads: ["GET /v1/leads", "GET /v1/leads/kanban", "GET /v1/analytics"],
  deals: ["GET /v1/deals", "GET /v1/deals/forecast", "GET /v1/analytics"],
  marketing: ["GET /v1/campaigns", "GET /v1/analytics"],
  activity: [
    "GET /v1/calls",
    "GET /v1/emails",
    "GET /v1/tasks",
    "GET /v1/meetings",
    "GET /v1/analytics",
  ],
  team: ["GET /v1/workspaces/:id/members", "GET /v1/tasks", "GET /v1/analytics"],
  revenue: ["GET /v1/deals", "GET /v1/leads", "GET /v1/analytics"],
  operations: ["GET /v1/document-requests", "GET /v1/analytics"],
  customers: ["GET /v1/contacts", "GET /v1/analytics"],
  forecast: ["GET /v1/deals/forecast", "GET /v1/deals", "GET /v1/analytics"],
};

async function hydrateStores(sectionId: AnalyticsSectionId) {
  if (sectionId === "leads" || sectionId === "business" || sectionId === "revenue") {
    await quiet(() => refreshCrmLeadsBoard());
  }
  if (
    sectionId === "deals" ||
    sectionId === "business" ||
    sectionId === "revenue" ||
    sectionId === "forecast"
  ) {
    await quiet(async () => {
      const board = await loadCrmDealsBoard();
      replaceCrmDealPipelines(board);
    });
  }
  if (sectionId === "forecast" || sectionId === "deals") {
    await quiet(() => tryCrmDeal(() => getCrmDealForecast()));
  }
  if (sectionId === "marketing") {
    await quiet(async () => {
      const [email, sms, whatsapp] = await Promise.all([
        listCrmEmailCampaigns(),
        listCrmSmsCampaigns(),
        listCrmWhatsAppCampaigns(),
      ]);
      replaceCrmEmailCampaigns(email);
      replaceCrmSmsCampaigns(sms);
      replaceCrmWhatsAppCampaigns(whatsapp);
    });
  }
  if (sectionId === "activity" || sectionId === "team") {
    await quiet(async () => {
      const calls = await tryCrmCall(() => listCrmCalls());
      if (calls?.length) replaceCrmCalls(calls);
    });
    await quiet(async () => {
      const emails = await tryCrmEmail(() => listCrmEmails());
      if (emails?.length) replaceCrmEmails(emails);
    });
    await quiet(async () => {
      const meetings = await tryCrmMeeting(() => listCrmMeetings());
      if (meetings?.length) replaceCrmMeetings(meetings);
    });
    await quiet(async () => {
      const tasks = await tryCrmTask(() => listCrmTasks({ limit: 100 }));
      if (tasks?.length) replaceCrmTasks(tasks);
    });
  }
  if (sectionId === "team") {
    await quiet(async () => {
      const members = await tryCrmWorkspaceMembers(() => listCrmWorkspaceMembers());
      if (members?.length) replaceCrmWorkspaceMembers(members);
    });
  }
  if (sectionId === "operations") {
    await quiet(async () => {
      const rows = await listCrmDocumentRequests({ limit: 100 });
      replaceDocumentRequests(rows);
    });
  }
  if (sectionId === "customers") {
    await quiet(async () => {
      const rows = await loadCrmContacts();
      replaceCrmContactsOnBoard(rows);
    });
  }
}

export async function loadLiveSectionPage(
  sectionId: AnalyticsSectionId,
  filters: SectionPageFilters,
  now = new Date(),
): Promise<{
  data: SectionPageModel;
  widgets: Map<string, AnalyticsWidgetResponse>;
}> {
  await hydrateStores(sectionId);
  const widgets = await fetchAnalyticsWidgets({
    period: dashboardRangeToAnalyticsPeriod(filters.dateRange),
    compare: true,
  });
  const local = computeSectionPage(sectionId, filters, now);
  return {
    data: overlaySectionPage(sectionId, local, widgets),
    widgets,
  };
}
