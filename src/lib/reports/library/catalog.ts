import type {
  ReportCategory,
  ReportCategoryId,
  ReportColumn,
  ReportDef,
  ReportFilterId,
} from "@/lib/reports/library/types";

const OWNER_TEAM: ReportFilterId[] = ["dateRange", "owner", "team"];
const LEAD_FILTERS: ReportFilterId[] = [
  "dateRange",
  "owner",
  "team",
  "status",
  "source",
  "loanType",
  "stage",
  "campaign",
];
const DEAL_FILTERS: ReportFilterId[] = [
  "dateRange",
  "owner",
  "team",
  "status",
  "loanType",
  "stage",
];
const PIPE_FILTERS: ReportFilterId[] = [
  "dateRange",
  "owner",
  "team",
  "loanType",
  "stage",
];
const ACT_FILTERS: ReportFilterId[] = ["dateRange", "owner", "team", "status"];
const DOC_FILTERS: ReportFilterId[] = ["dateRange", "owner", "team", "status"];
const MKT_FILTERS: ReportFilterId[] = ["dateRange", "owner", "team", "source", "campaign"];
const FIN_FILTERS: ReportFilterId[] = ["dateRange", "owner", "team", "status"];
const CRM_FILTERS: ReportFilterId[] = ["dateRange", "owner", "team", "status", "source"];

function col(id: string, label: string, kind?: ReportColumn["kind"], align?: ReportColumn["align"]): ReportColumn {
  return { id, label, kind, align: align ?? (kind === "money" || kind === "number" || kind === "percent" ? "right" : "left") };
}

function def(
  category: ReportCategoryId,
  id: string,
  name: string,
  purpose: string,
  filters: ReportFilterId[],
  columns: ReportColumn[],
  extra: Partial<ReportDef> = {},
): ReportDef {
  return { id, category, name, purpose, filters, columns, ...extra };
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  { id: "leads", name: "Leads", description: "Volume, quality, conversion and ageing of inbound demand.", icon: "users" },
  { id: "deals", name: "Deals", description: "Won, lost and open deal performance across the book.", icon: "handshake" },
  { id: "pipeline", name: "Pipeline & Forecast", description: "Future settlements, weighted revenue and movement.", icon: "kanban" },
  { id: "activity", name: "Activity & Productivity", description: "Calls, tasks, meetings and follow-up discipline.", icon: "activity" },
  { id: "documents", name: "Documents", description: "Requested packs, turnaround and deals waiting on files.", icon: "file" },
  { id: "marketing", name: "Marketing", description: "Campaign contribution to leads, deals and settlements.", icon: "megaphone" },
  { id: "finance", name: "Finance", description: "Estimates, invoices, collections and recognised revenue.", icon: "wallet" },
  { id: "team", name: "Team Performance", description: "Compare owners on volume, conversion and output.", icon: "trophy" },
  { id: "contacts", name: "Contacts & Companies", description: "Relationship coverage, engagement and duplicates.", icon: "building" },
  { id: "executive", name: "Executive", description: "Management scorecards for growth, revenue and targets.", icon: "crown" },
];

const LEAD_COLS = [
  col("name", "Lead"),
  col("company", "Company"),
  col("owner", "Owner"),
  col("source", "Source"),
  col("status", "Status", "badge"),
  col("stage", "Stage", "badge"),
  col("value", "Value", "money"),
  col("created", "Created", "date"),
];

export const LIBRARY_REPORTS: ReportDef[] = [
  def("leads", "lead-register", "Lead Register", "Complete list of all leads and their current status.", LEAD_FILTERS, LEAD_COLS, {
    groupBy: [{ id: "owner", label: "Owner" }, { id: "source", label: "Source" }, { id: "stage", label: "Stage" }],
  }),
  def("leads", "lead-source-performance", "Lead Source Performance", "Show which sources generate the most leads and conversions.", LEAD_FILTERS, [
    col("source", "Source"), col("leads", "Leads", "number"), col("qualified", "Qualified Leads", "number"),
    col("appointments", "Appointments", "number"), col("deals", "Deals Created", "number"),
    col("conversion", "Conversion Rate", "percent"), col("pipeline", "Pipeline Value", "money"),
    col("avgDeal", "Avg. Deal Value", "money"),
  ], { chart: { type: "pie", x: "source", y: "leads", title: "Leads by Source" }, groupBy: [{ id: "source", label: "Source" }, { id: "owner", label: "Owner" }] }),
  def("leads", "lead-conversion-funnel", "Lead Conversion Funnel", "Show progression from New Lead → Qualified → Appointment → Deal.", LEAD_FILTERS, [
    col("stage", "Stage"), col("leads", "Leads", "number"), col("value", "Value", "money"), col("conversion", "Step conversion", "percent"),
  ], { chart: { type: "funnel", x: "stage", y: "leads", title: "Lead funnel" } }),
  def("leads", "lead-owner-performance", "Lead Owner Performance", "Compare lead volume, qualification and conversion by team member.", OWNER_TEAM, [
    col("owner", "Owner"), col("leads", "Leads", "number"), col("qualified", "Qualified", "number"),
    col("converted", "Converted", "number"), col("conversion", "Conversion", "percent"), col("value", "Pipeline Value", "money"),
  ], { chart: { type: "bar", x: "owner", y: "leads", title: "Leads by owner" } }),
  def("leads", "lead-response-performance", "Lead Response Performance", "Measure how quickly leads are contacted after being created.", OWNER_TEAM, [
    col("name", "Lead"), col("owner", "Owner"), col("source", "Source"),
    col("created", "Created", "date"), col("firstTouch", "First contact", "date"), col("hours", "Response hours", "number"),
  ]),
  def("leads", "lead-ageing", "Lead Ageing", "Show how long open leads have remained unresolved.", LEAD_FILTERS, [
    col("name", "Lead"), col("owner", "Owner"), col("stage", "Stage", "badge"),
    col("created", "Created", "date"), col("age", "Days open", "number"), col("value", "Value", "money"),
  ]),
  def("leads", "lead-quality", "Lead Quality Report", "Compare qualified, unqualified and disqualified leads.", LEAD_FILTERS, [
    col("quality", "Quality"), col("leads", "Leads", "number"), col("share", "Share", "percent"), col("value", "Value", "money"),
  ], { chart: { type: "pie", x: "quality", y: "leads", title: "Lead quality mix" } }),
  def("leads", "lost-lead-analysis", "Lost Lead Analysis", "Identify why leads are being lost.", LEAD_FILTERS, [
    col("name", "Lead"), col("owner", "Owner"), col("source", "Source"),
    col("reason", "Lost reason"), col("created", "Created", "date"), col("value", "Lead value", "money"),
  ], { groupBy: [{ id: "reason", label: "Lost reason" }, { id: "source", label: "Source" }, { id: "owner", label: "Owner" }] }),
  def("leads", "inactive-lead", "Inactive Lead Report", "Identify leads with no recent activity or follow-up.", LEAD_FILTERS, [
    col("name", "Lead"), col("owner", "Owner"), col("stage", "Stage", "badge"),
    col("lastTouch", "Last activity", "date"), col("idle", "Days inactive", "number"), col("value", "Value", "money"),
  ]),
  def("leads", "lead-trend", "Lead Trend Report", "Show lead volume and conversion trends over time.", OWNER_TEAM, [
    col("period", "Period"), col("leads", "Leads", "number"), col("converted", "Converted", "number"),
    col("conversion", "Conversion", "percent"), col("value", "Value", "money"),
  ], { chart: { type: "line", x: "period", y: "leads", title: "Lead volume over time" } }),

  def("deals", "deal-register", "Deal Register", "Complete list of deals with stage, owner and value.", DEAL_FILTERS, [
    col("name", "Deal"), col("account", "Account"), col("owner", "Owner"),
    col("stage", "Stage", "badge"), col("value", "Value", "money"), col("close", "Expected close", "date"),
  ]),
  def("deals", "deal-pipeline-by-stage", "Deal Pipeline by Stage", "How much deal value sits in each stage right now.", DEAL_FILTERS, [
    col("stage", "Stage"), col("deals", "Deals", "number"), col("value", "Value", "money"), col("weighted", "Weighted", "money"),
  ], { chart: { type: "bar", x: "stage", y: "value", title: "Value by stage" } }),
  def("deals", "deal-owner-performance", "Deal Owner Performance", "Compare deal volume, win rate and value by owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("open", "Open", "number"), col("won", "Won", "number"),
    col("lost", "Lost", "number"), col("winRate", "Win rate", "percent"), col("value", "Won value", "money"),
  ]),
  def("deals", "won-deal-analysis", "Won Deal Analysis", "Which won deals settled, at what value, and who owned them.", DEAL_FILTERS, [
    col("name", "Deal"), col("owner", "Owner"), col("account", "Account"),
    col("value", "Value", "money"), col("close", "Closed", "date"), col("loanType", "Loan type"),
  ]),
  def("deals", "lost-deal-analysis", "Lost Deal Analysis", "Which deals were lost and what value left the book.", DEAL_FILTERS, [
    col("name", "Deal"), col("owner", "Owner"), col("reason", "Reason"),
    col("value", "Value", "money"), col("close", "Lost date", "date"), col("stage", "Last stage"),
  ]),
  def("deals", "lost-deal-reasons", "Lost Deal Reasons", "Show the reasons deals are being lost.", DEAL_FILTERS, [
    col("reason", "Reason"), col("deals", "Deals", "number"), col("value", "Value lost", "money"), col("share", "Share", "percent"),
  ], { chart: { type: "pie", x: "reason", y: "deals", title: "Lost reasons" } }),
  def("deals", "deal-ageing", "Deal Ageing", "How long open deals have sat without closing.", DEAL_FILTERS, [
    col("name", "Deal"), col("owner", "Owner"), col("stage", "Stage", "badge"),
    col("close", "Expected close", "date"), col("age", "Days past close", "number"), col("value", "Value", "money"),
  ]),
  def("deals", "stalled-deal", "Stalled Deal Report", "Open deals with little movement or an overdue close date.", DEAL_FILTERS, [
    col("name", "Deal"), col("owner", "Owner"), col("stage", "Stage", "badge"),
    col("close", "Expected close", "date"), col("age", "Days stalled", "number"), col("value", "Value", "money"),
  ]),
  def("deals", "deal-conversion", "Deal Conversion Report", "Win rate from open pipeline through to won deals.", OWNER_TEAM, [
    col("owner", "Owner"), col("considered", "Considered", "number"), col("won", "Won", "number"),
    col("conversion", "Conversion", "percent"), col("value", "Won value", "money"),
  ]),
  def("deals", "deal-value-volume-trend", "Deal Value & Volume Trend", "How deal volume and value are moving over time.", OWNER_TEAM, [
    col("period", "Period"), col("created", "Deals", "number"), col("won", "Won", "number"), col("value", "Won value", "money"),
  ], { chart: { type: "line", x: "period", y: "value", title: "Won value trend" } }),

  def("pipeline", "current-pipeline", "Current Pipeline", "Open deals that represent future settlements.", PIPE_FILTERS, [
    col("name", "Deal"), col("owner", "Owner"), col("stage", "Stage", "badge"),
    col("value", "Value", "money"), col("weighted", "Weighted", "money"), col("close", "Expected close", "date"),
  ]),
  def("pipeline", "pipeline-by-stage", "Pipeline by Stage", "Open pipeline value grouped by stage.", PIPE_FILTERS, [
    col("stage", "Stage"), col("deals", "Deals", "number"), col("value", "Value", "money"), col("weighted", "Weighted", "money"),
  ], { chart: { type: "bar", x: "stage", y: "weighted", title: "Weighted pipeline" } }),
  def("pipeline", "pipeline-by-owner", "Pipeline by Owner", "Who holds the open pipeline and how much is weighted.", OWNER_TEAM, [
    col("owner", "Owner"), col("deals", "Deals", "number"), col("value", "Value", "money"), col("weighted", "Weighted", "money"),
  ]),
  def("pipeline", "pipeline-by-loan-type", "Pipeline by Loan Type", "Open pipeline split by purchase, refinance and investment.", PIPE_FILTERS, [
    col("loanType", "Loan type"), col("deals", "Deals", "number"), col("value", "Value", "money"), col("weighted", "Weighted", "money"),
  ], { chart: { type: "pie", x: "loanType", y: "value", title: "Pipeline mix" } }),
  def("pipeline", "expected-settlement", "Expected Settlement Report", "Deals expected to settle in the selected window.", PIPE_FILTERS, [
    col("name", "Deal"), col("owner", "Owner"), col("close", "Expected settlement", "date"),
    col("probability", "Probability", "percent"), col("value", "Value", "money"),
  ]),
  def("pipeline", "expected-revenue", "Expected Revenue Report", "Weighted revenue expected from the open pipeline.", PIPE_FILTERS, [
    col("owner", "Owner"), col("deals", "Deals", "number"), col("value", "Gross", "money"), col("weighted", "Expected revenue", "money"),
  ]),
  def("pipeline", "sales-forecast", "Sales Forecast", "Forward-looking settlement forecast by period.", OWNER_TEAM, [
    col("period", "Period"), col("deals", "Deals", "number"), col("value", "Gross", "money"), col("weighted", "Forecast", "money"),
  ], { chart: { type: "bar", x: "period", y: "weighted", title: "Forecast by period" } }),
  def("pipeline", "forecast-vs-target", "Forecast vs Target", "Compare expected settlements against the implied period target.", OWNER_TEAM, [
    col("owner", "Owner"), col("forecast", "Forecast", "money"), col("target", "Target", "money"),
    col("gap", "Gap", "money"), col("progress", "Progress", "percent"),
  ]),
  def("pipeline", "pipeline-movement", "Pipeline Movement", "How records have progressed into later stages.", PIPE_FILTERS, [
    col("stage", "Stage"), col("leads", "Leads", "number"), col("deals", "Deals", "number"), col("value", "Value", "money"),
  ]),
  def("pipeline", "pipeline-ageing", "Pipeline Ageing", "Open opportunities that have aged past a healthy dwell time.", PIPE_FILTERS, [
    col("name", "Record"), col("owner", "Owner"), col("stage", "Stage", "badge"),
    col("age", "Days in pipeline", "number"), col("value", "Value", "money"),
  ]),

  def("activity", "activity-register", "Activity Register", "Every task, call, email, meeting and follow-up in scope.", ACT_FILTERS, [
    col("kind", "Type", "badge"), col("title", "Activity"), col("owner", "Owner"),
    col("related", "Related to"), col("status", "Status", "badge"), col("when", "When", "date"),
  ]),
  def("activity", "task-completion", "Task Completion Report", "How many tasks were completed versus left open.", OWNER_TEAM, [
    col("owner", "Owner"), col("total", "Tasks", "number"), col("completed", "Completed", "number"),
    col("open", "Open", "number"), col("rate", "Completion", "percent"),
  ]),
  def("activity", "overdue-task", "Overdue Task Report", "Tasks that missed their due date and still need action.", ACT_FILTERS, [
    col("title", "Task"), col("owner", "Owner"), col("related", "Related to"),
    col("when", "Due", "date"), col("extra", "Type"), col("status", "Status", "badge"),
  ]),
  def("activity", "call-activity", "Call Activity Report", "Outbound and inbound call volume by owner.", ACT_FILTERS, [
    col("title", "Call"), col("owner", "Owner"), col("related", "Related to"),
    col("extra", "Direction"), col("status", "Status", "badge"), col("when", "When", "date"),
  ]),
  def("activity", "email-activity", "Email Activity Report", "Email outreach sent and drafted against CRM records.", ACT_FILTERS, [
    col("title", "Subject"), col("owner", "Owner"), col("related", "Related to"),
    col("status", "Status", "badge"), col("when", "Sent", "date"),
  ]),
  def("activity", "appointment-activity", "Appointment Activity Report", "Meetings held, scheduled and missed.", ACT_FILTERS, [
    col("title", "Meeting"), col("owner", "Owner"), col("related", "Related to"),
    col("extra", "Type"), col("status", "Status", "badge"), col("when", "When", "date"),
  ]),
  def("activity", "follow-up-performance", "Follow-up Performance", "Whether reminders were actioned on time.", OWNER_TEAM, [
    col("owner", "Owner"), col("total", "Follow-ups", "number"), col("open", "Still open", "number"),
    col("done", "Actioned", "number"), col("rate", "Actioned", "percent"),
  ]),
  def("activity", "activity-by-team-member", "Activity by Team Member", "Total activity mix for each owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("tasks", "Tasks", "number"), col("calls", "Calls", "number"),
    col("emails", "Emails", "number"), col("meetings", "Meetings", "number"), col("total", "Total", "number"),
  ], { chart: { type: "bar", x: "owner", y: "total", title: "Activity volume" } }),
  def("activity", "activity-vs-volume", "Activity vs Lead/Deal Volume", "Whether activity levels match the book of work.", OWNER_TEAM, [
    col("owner", "Owner"), col("activities", "Activities", "number"), col("leads", "Leads", "number"),
    col("deals", "Deals", "number"), col("perLead", "Activities / lead", "number"),
  ]),
  def("activity", "team-productivity", "Team Productivity Report", "Completed work versus overdue and open workload.", OWNER_TEAM, [
    col("owner", "Owner"), col("completed", "Completed", "number"), col("overdue", "Overdue", "number"),
    col("meetings", "Meetings", "number"), col("score", "Productivity", "percent"),
  ]),

  def("documents", "document-register", "Document Register", "Every document request and its current pack status.", DOC_FILTERS, [
    col("title", "Request"), col("related", "Requested for"), col("owner", "Owner"),
    col("type", "Type"), col("status", "Status", "badge"), col("due", "Due", "date"),
  ]),
  def("documents", "documents-requested-vs-received", "Documents Requested vs Received", "How much of each pack has come back.", DOC_FILTERS, [
    col("title", "Request"), col("owner", "Owner"), col("awaiting", "Still requested", "number"),
    col("received", "Received", "number"), col("progress", "Completion", "percent"),
  ]),
  def("documents", "pending-documents", "Pending Documents Report", "Packs that are still requested or in progress.", DOC_FILTERS, [
    col("title", "Request"), col("related", "Requested for"), col("owner", "Owner"),
    col("status", "Status", "badge"), col("due", "Due", "date"), col("progress", "Completion", "percent"),
  ]),
  def("documents", "overdue-document", "Overdue Document Report", "Document packs that have passed their due date.", DOC_FILTERS, [
    col("title", "Request"), col("related", "Requested for"), col("owner", "Owner"),
    col("due", "Due", "date"), col("status", "Status", "badge"),
  ]),
  def("documents", "missing-documents-by-deal", "Missing Documents by Deal", "Which related records still have outstanding files.", DOC_FILTERS, [
    col("related", "Deal / record"), col("requests", "Requests", "number"),
    col("awaiting", "Missing items", "number"), col("progress", "Avg completion", "percent"),
  ]),
  def("documents", "document-completion-rate", "Document Completion Rate", "Share of requests that reached received or approved.", OWNER_TEAM, [
    col("owner", "Owner"), col("total", "Requests", "number"), col("complete", "Complete", "number"),
    col("rate", "Completion", "percent"),
  ]),
  def("documents", "document-turnaround", "Document Turnaround Time", "Days from request to receipt.", DOC_FILTERS, [
    col("title", "Request"), col("owner", "Owner"), col("requested", "Requested", "date"),
    col("received", "Received", "date"), col("days", "Turnaround days", "number"),
  ]),
  def("documents", "document-activity-by-member", "Document Activity by Team Member", "Who is requesting and clearing document packs.", OWNER_TEAM, [
    col("owner", "Owner"), col("total", "Requests", "number"), col("pending", "Pending", "number"),
    col("complete", "Complete", "number"),
  ]),
  def("documents", "deals-waiting-on-documents", "Deals Waiting on Documents", "Related records blocked on outstanding files.", DOC_FILTERS, [
    col("related", "Deal / record"), col("title", "Request"), col("owner", "Owner"),
    col("status", "Status", "badge"), col("due", "Due", "date"),
  ]),
  def("documents", "document-status-trend", "Document Status Trend", "How request volume moved through statuses over time.", OWNER_TEAM, [
    col("period", "Period"), col("requested", "Requested", "number"), col("received", "Received", "number"),
    col("approved", "Approved", "number"),
  ], { chart: { type: "line", x: "period", y: "requested", title: "Document volume" } }),

  def("marketing", "campaign-performance", "Campaign Performance", "Sends, engagement and resulting CRM leads by campaign.", MKT_FILTERS, [
    col("name", "Campaign"), col("channel", "Channel", "badge"), col("sent", "Sent", "number"),
    col("engaged", "Engaged", "number"), col("leads", "Leads", "number"), col("deals", "Deals", "number"),
  ], { chart: { type: "bar", x: "name", y: "leads", title: "Leads by campaign" } }),
  def("marketing", "marketing-lead-source", "Lead Source Performance", "Which marketing sources create the most qualified demand.", MKT_FILTERS, [
    col("source", "Source"), col("leads", "Leads", "number"), col("qualified", "Qualified", "number"),
    col("deals", "Deals", "number"), col("conversion", "Conversion", "percent"),
  ]),
  def("marketing", "leads-by-campaign", "Leads by Campaign", "Individual leads attributed to a campaign or source.", MKT_FILTERS, [
    col("name", "Lead"), col("campaign", "Campaign"), col("source", "Source"),
    col("owner", "Owner"), col("stage", "Stage", "badge"), col("value", "Value", "money"),
  ]),
  def("marketing", "campaign-deal-conversion", "Campaign → Deal Conversion", "Which campaigns turn into deals.", MKT_FILTERS, [
    col("campaign", "Campaign"), col("leads", "Leads", "number"), col("deals", "Deals", "number"),
    col("conversion", "Conversion", "percent"), col("value", "Deal value", "money"),
  ]),
  def("marketing", "campaign-settlement-conversion", "Campaign → Settlement Conversion", "Which campaigns produce settled deals.", MKT_FILTERS, [
    col("campaign", "Campaign"), col("leads", "Leads", "number"), col("settled", "Settled", "number"),
    col("conversion", "Settlement rate", "percent"), col("value", "Settled value", "money"),
  ]),
  def("marketing", "campaign-revenue", "Campaign Revenue", "Settled value attributed to each campaign.", MKT_FILTERS, [
    col("campaign", "Campaign"), col("settled", "Settlements", "number"), col("value", "Revenue", "money"),
  ], { chart: { type: "bar", x: "campaign", y: "value", title: "Attributed revenue" } }),
  def("marketing", "cost-per-lead", "Cost per Lead", "Lead outcomes by campaign. Spend is shown only when recorded on the campaign.", MKT_FILTERS, [
    col("campaign", "Campaign"), col("leads", "Leads", "number"), col("sent", "Sends", "number"),
    col("efficiency", "Leads / 100 sends", "number"),
  ]),
  def("marketing", "cost-per-deal", "Cost per Deal", "Deal outcomes by campaign using send volume as the effort proxy.", MKT_FILTERS, [
    col("campaign", "Campaign"), col("deals", "Deals", "number"), col("sent", "Sends", "number"),
    col("efficiency", "Deals / 100 sends", "number"),
  ]),
  def("marketing", "marketing-roi", "Marketing ROI", "Revenue returned per campaign relative to send volume.", MKT_FILTERS, [
    col("campaign", "Campaign"), col("leads", "Leads", "number"), col("value", "Attributed revenue", "money"),
    col("sent", "Sends", "number"), col("yield", "Revenue / 100 sends", "money"),
  ]),
  def("marketing", "campaign-performance-trend", "Campaign Performance Trend", "Campaign-sourced lead volume over time.", OWNER_TEAM, [
    col("period", "Period"), col("leads", "Leads", "number"), col("deals", "Deals", "number"), col("value", "Value", "money"),
  ], { chart: { type: "line", x: "period", y: "leads", title: "Campaign leads" } }),

  def("finance", "estimate-register", "Estimate Register", "Every estimate issued, with status and value.", FIN_FILTERS, [
    col("ref", "Estimate"), col("client", "Client"), col("owner", "Owner"),
    col("status", "Status", "badge"), col("total", "Total", "money"), col("created", "Created", "date"),
  ]),
  def("finance", "estimate-conversion", "Estimate Conversion", "How many estimates convert through to a quotation or acceptance.", OWNER_TEAM, [
    col("owner", "Owner"), col("total", "Estimates", "number"), col("converted", "Converted / accepted", "number"),
    col("rate", "Conversion", "percent"), col("value", "Converted value", "money"),
  ]),
  def("finance", "invoice-register", "Invoice Register", "Every invoice with amount due and collection status.", FIN_FILTERS, [
    col("ref", "Invoice"), col("client", "Client"), col("owner", "Owner"),
    col("status", "Status", "badge"), col("total", "Total", "money"), col("due", "Amount due", "money"),
  ]),
  def("finance", "invoice-ageing", "Invoice Ageing", "Outstanding invoices bucketed by how long they have been unpaid.", FIN_FILTERS, [
    col("ref", "Invoice"), col("client", "Client"), col("bucket", "Ageing"),
    col("due", "Amount due", "money"), col("dueDate", "Due date", "date"),
  ]),
  def("finance", "overdue-invoice", "Overdue Invoice Report", "Invoices past due that still have a balance.", FIN_FILTERS, [
    col("ref", "Invoice"), col("client", "Client"), col("owner", "Owner"),
    col("due", "Amount due", "money"), col("dueDate", "Due date", "date"),
  ]),
  def("finance", "payment-collection", "Payment Collection Report", "Cash collected against invoices in the period.", FIN_FILTERS, [
    col("ref", "Payment"), col("invoice", "Invoice"), col("client", "Client"),
    col("amount", "Amount", "money"), col("method", "Method"), col("when", "Received", "date"),
  ]),
  def("finance", "revenue-by-period", "Revenue by Period", "Recognised invoice value grouped by month.", OWNER_TEAM, [
    col("period", "Period"), col("invoices", "Invoices", "number"), col("revenue", "Revenue", "money"),
    col("collected", "Collected", "money"),
  ], { chart: { type: "bar", x: "period", y: "revenue", title: "Revenue by month" } }),
  def("finance", "revenue-by-team-member", "Revenue by Team Member", "Invoice and collection totals by owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("invoices", "Invoices", "number"), col("revenue", "Revenue", "money"),
    col("collected", "Collected", "money"),
  ]),
  def("finance", "revenue-by-service", "Revenue by Service/Product", "Which products and services appear on invoices.", OWNER_TEAM, [
    col("name", "Item"), col("qty", "Qty", "number"), col("revenue", "Revenue", "money"),
  ]),
  def("finance", "revenue-collection-trend", "Revenue & Collection Trend", "Billed versus collected amounts over time.", OWNER_TEAM, [
    col("period", "Period"), col("revenue", "Billed", "money"), col("collected", "Collected", "money"),
  ], { chart: { type: "line", x: "period", y: "revenue", title: "Billed vs collected" } }),

  def("team", "team-performance-overview", "Team Performance Overview", "A side-by-side view of each owner's commercial output.", OWNER_TEAM, [
    col("owner", "Owner"), col("leads", "Leads", "number"), col("deals", "Deals", "number"),
    col("won", "Won", "number"), col("revenue", "Won value", "money"), col("activities", "Activities", "number"),
  ]),
  def("team", "lead-performance-by-user", "Lead Performance by User", "Lead volume and conversion for each owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("leads", "Leads", "number"), col("qualified", "Qualified", "number"),
    col("converted", "Converted", "number"), col("conversion", "Conversion", "percent"),
  ]),
  def("team", "deal-performance-by-user", "Deal Performance by User", "Open, won and lost deals by owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("open", "Open", "number"), col("won", "Won", "number"),
    col("lost", "Lost", "number"), col("winRate", "Win rate", "percent"),
  ]),
  def("team", "settlement-performance-by-user", "Settlement Performance by User", "Settled deal value by owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("settled", "Settlements", "number"), col("value", "Settled value", "money"),
  ]),
  def("team", "revenue-by-user", "Revenue by User", "Invoice revenue credited to each owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("revenue", "Revenue", "money"), col("collected", "Collected", "money"),
  ]),
  def("team", "conversion-rate-by-user", "Conversion Rate by User", "Lead-to-deal and deal-to-won conversion by owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("leadToDeal", "Lead → deal", "percent"), col("dealToWon", "Deal → won", "percent"),
    col("leadToWon", "Lead → won", "percent"),
  ]),
  def("team", "activity-by-user", "Activity by User", "Work effort recorded against each owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("tasks", "Tasks", "number"), col("calls", "Calls", "number"),
    col("emails", "Emails", "number"), col("meetings", "Meetings", "number"),
  ]),
  def("team", "target-vs-actual", "Target vs Actual", "Actual settlements versus the implied period target.", OWNER_TEAM, [
    col("owner", "Owner"), col("actual", "Actual", "money"), col("target", "Target", "money"),
    col("progress", "Progress", "percent"),
  ]),
  def("team", "productivity-comparison", "Productivity Comparison", "Output per activity for each owner.", OWNER_TEAM, [
    col("owner", "Owner"), col("activities", "Activities", "number"), col("won", "Won deals", "number"),
    col("value", "Won value", "money"), col("perActivity", "Value / activity", "money"),
  ]),
  def("team", "performance-trend-by-user", "Performance Trend by User", "Won value by owner across months.", OWNER_TEAM, [
    col("period", "Period"), col("owner", "Owner"), col("won", "Won", "number"), col("value", "Won value", "money"),
  ]),

  def("contacts", "contact-register", "Contact Register", "Complete list of contacts and ownership.", CRM_FILTERS, [
    col("name", "Contact"), col("company", "Company"), col("owner", "Owner"),
    col("source", "Source"), col("status", "Status", "badge"), col("created", "Created", "date"),
  ]),
  def("contacts", "new-contacts", "New Contacts", "Contacts created in the selected period.", CRM_FILTERS, [
    col("name", "Contact"), col("company", "Company"), col("owner", "Owner"),
    col("source", "Source"), col("created", "Created", "date"),
  ]),
  def("contacts", "contacts-by-owner", "Contacts by Owner", "How the contact book is distributed across the team.", OWNER_TEAM, [
    col("owner", "Owner"), col("contacts", "Contacts", "number"), col("active", "Active", "number"),
  ]),
  def("contacts", "contacts-with-active-deals", "Contacts with Active Deals", "Contacts linked to an open deal.", CRM_FILTERS, [
    col("name", "Contact"), col("company", "Company"), col("owner", "Owner"), col("deals", "Open deals", "number"),
  ]),
  def("contacts", "contacts-with-no-activity", "Contacts with No Activity", "Contacts with no recent call, email or meeting.", CRM_FILTERS, [
    col("name", "Contact"), col("company", "Company"), col("owner", "Owner"), col("created", "Created", "date"),
  ]),
  def("contacts", "contact-engagement", "Contact Engagement", "Activity recorded against each contact.", CRM_FILTERS, [
    col("name", "Contact"), col("owner", "Owner"), col("activities", "Activities", "number"),
    col("deals", "Deals", "number"),
  ]),
  def("contacts", "duplicate-contact", "Duplicate Contact Report", "Contacts that share an email or highly similar name.", OWNER_TEAM, [
    col("name", "Contact"), col("email", "Email"), col("company", "Company"),
    col("owner", "Owner"), col("match", "Matched on"),
  ]),
  def("contacts", "company-register", "Company Register", "Complete list of companies and owners.", ["dateRange", "owner", "team", "status"], [
    col("name", "Company"), col("industry", "Industry"), col("owner", "Owner"),
    col("status", "Status", "badge"), col("city", "City"),
  ]),
  def("contacts", "companies-with-active-deals", "Companies with Active Deals", "Companies that currently have open deals.", ["dateRange", "owner", "team"], [
    col("name", "Company"), col("owner", "Owner"), col("deals", "Open deals", "number"), col("value", "Pipeline", "money"),
  ]),
  def("contacts", "customer-activity-history", "Customer Activity History", "Recent activity against contacts and companies.", ACT_FILTERS, [
    col("kind", "Type", "badge"), col("title", "Activity"), col("related", "Customer"),
    col("owner", "Owner"), col("when", "When", "date"),
  ]),

  def("executive", "executive-business-overview", "Executive Business Overview", "The management snapshot of demand, pipeline and settlements.", OWNER_TEAM, [
    col("metric", "Metric"), col("value", "Value"), col("note", "What it answers"),
  ]),
  def("executive", "sales-pipeline-performance", "Sales & Pipeline Performance", "Open pipeline quality and conversion at a glance.", PIPE_FILTERS, [
    col("stage", "Stage"), col("records", "Records", "number"), col("value", "Value", "money"),
  ], { chart: { type: "bar", x: "stage", y: "value", title: "Pipeline value" } }),
  def("executive", "revenue-performance", "Revenue Performance", "Billed and collected revenue for the period.", OWNER_TEAM, [
    col("period", "Period"), col("revenue", "Billed", "money"), col("collected", "Collected", "money"),
  ]),
  def("executive", "settlement-performance", "Settlement Performance", "Won deal settlements and value.", OWNER_TEAM, [
    col("owner", "Owner"), col("settled", "Settlements", "number"), col("value", "Value", "money"),
  ]),
  def("executive", "lead-to-settlement-funnel", "Lead-to-Settlement Funnel", "The full commercial funnel from new lead to settled deal.", LEAD_FILTERS, [
    col("stage", "Stage"), col("count", "Count", "number"), col("value", "Value", "money"), col("conversion", "Conversion", "percent"),
  ], { chart: { type: "funnel", x: "stage", y: "count", title: "Lead to settlement" } }),
  def("executive", "executive-team-performance", "Team Performance", "Management comparison of owners across the funnel.", OWNER_TEAM, [
    col("owner", "Owner"), col("leads", "Leads", "number"), col("won", "Settlements", "number"),
    col("value", "Settled value", "money"), col("conversion", "Lead → won", "percent"),
  ]),
  def("executive", "executive-target-vs-actual", "Target vs Actual", "Period settlements versus the implied growth target.", OWNER_TEAM, [
    col("metric", "Metric"), col("actual", "Actual", "money"), col("target", "Target", "money"),
    col("progress", "Progress", "percent"),
  ]),
  def("executive", "month-on-month-growth", "Month-on-Month Growth", "Whether lead, deal and revenue volumes are growing.", OWNER_TEAM, [
    col("period", "Period"), col("leads", "Leads", "number"), col("won", "Settlements", "number"),
    col("revenue", "Revenue", "money"), col("leadGrowth", "Lead growth", "percent"),
  ], { chart: { type: "line", x: "period", y: "leads", title: "Lead growth" } }),
  def("executive", "business-trend-analysis", "Business Trend Analysis", "Combined lead, settlement and collection trend.", OWNER_TEAM, [
    col("period", "Period"), col("leads", "Leads", "number"), col("pipeline", "Pipeline", "money"),
    col("settled", "Settled", "money"), col("collected", "Collected", "money"),
  ]),
  def("executive", "business-kpi-scorecard", "Business KPI Scorecard", "The handful of numbers leadership should review first.", OWNER_TEAM, [
    col("kpi", "KPI"), col("value", "Result"), col("health", "Health", "badge"), col("note", "Interpretation"),
  ]),
];

export function categoryById(id: string) {
  return REPORT_CATEGORIES.find((c) => c.id === id) ?? null;
}

export function reportsForCategory(id: ReportCategoryId) {
  return LIBRARY_REPORTS.filter((r) => r.category === id);
}

export function reportById(id: string) {
  return LIBRARY_REPORTS.find((r) => r.id === id) ?? null;
}

export function searchReports(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return LIBRARY_REPORTS;
  return LIBRARY_REPORTS.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q) ||
      r.category.includes(q) ||
      r.id.includes(q),
  );
}
