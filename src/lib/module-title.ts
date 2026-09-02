/** Longest matching href wins so `/sales/leads/detail/1` → Leads, not Dashboard. */
const MODULE_TITLES: { href: string; label: string }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/work-queue", label: "Work Queue" },
  { href: "/sales/leads", label: "Leads" },
  { href: "/sales/contacts", label: "Contacts" },
  { href: "/sales/companies", label: "Companies" },
  { href: "/sales/deals", label: "Deals" },
  { href: "/sales/forecasting", label: "Forecasting" },
  { href: "/activities/tasks", label: "Tasks" },
  { href: "/activities/calls", label: "Calls" },
  { href: "/activities/emails", label: "Emails" },
  { href: "/activities/meetings", label: "Meetings" },
  { href: "/activities/notes", label: "Notes" },
  { href: "/activities/attachments", label: "Attachments" },
  { href: "/activities/reminders", label: "Reminders" },
  { href: "/activities/team-chat", label: "Team Chat" },
  { href: "/activities/calendar", label: "Calendar" },
  { href: "/marketing/inbox", label: "Messages" },
  { href: "/booking/consultations", label: "Consultations" },
  { href: "/booking/schedules", label: "Schedules" },
  { href: "/booking/consultants", label: "Consultants" },
  { href: "/booking", label: "Booking" },
  { href: "/documents/library", label: "Library" },
  { href: "/documents/requests/all", label: "All Requests" },
  { href: "/documents/requests", label: "Document Requests" },
  { href: "/signature/documents", label: "Documents" },
  { href: "/signature/templates", label: "Templates" },
  { href: "/signature", label: "E-Signature" },
  { href: "/marketing/email", label: "Email Campaigns" },
  { href: "/marketing/sms", label: "SMS Campaigns" },
  { href: "/marketing/whatsapp", label: "WhatsApp Campaigns" },
  { href: "/marketing/forms", label: "Forms" },
  { href: "/marketing/linktree", label: "Broker pages" },
  { href: "/finance/estimates", label: "Estimates" },
  { href: "/finance/quotations", label: "Quotations" },
  { href: "/finance/invoices", label: "Invoices" },
  { href: "/finance/payments", label: "Payments" },
  { href: "/finance/products", label: "Items / Services" },
  { href: "/finance", label: "Sales Ops" },
  { href: "/support", label: "Support" },
  { href: "/portals", label: "Client Portal" },
  { href: "/reports", label: "Reports" },
  { href: "/analytics", label: "Analytics" },
  { href: "/resources", label: "Resources" },
  { href: "/calculator", label: "Calculator" },
  { href: "/time-tracking", label: "Time Tracking" },
  { href: "/journeys", label: "Journeys" },
  { href: "/rules", label: "Rules" },
  { href: "/users", label: "Users" },
  { href: "/settings/my-preferences", label: "My Preferences" },
  { href: "/settings", label: "Settings" },
  { href: "/notifications", label: "Notifications" },
];

function titleFromSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getModuleTitle(pathname: string): string {
  const path = pathname.split("?")[0] || "/";
  if (path === "/") return "Dashboard";

  const match = MODULE_TITLES.filter(
    (item) =>
      item.href !== "/" &&
      (path === item.href || path.startsWith(`${item.href}/`)),
  ).sort((a, b) => b.href.length - a.href.length)[0];

  if (match) return match.label;

  const segment = path.split("/").filter(Boolean).pop() ?? "";
  return titleFromSegment(segment) || "Dashboard";
}
