/**
 * SRS §28 Cross-Module Rules
 * Single import surface for integrity, transitions, notifications, audit, soft-delete, RBAC.
 */

export * from "@/lib/rules/types";
export * from "@/lib/rules/storage";
export * from "@/lib/rules/module-store";
export * from "@/lib/rules/integrity";
export * from "@/lib/rules/transitions";
export * from "@/lib/rules/notify";
export * from "@/lib/rules/audit";
export * from "@/lib/rules/soft-delete";
export * from "@/lib/rules/permissions";
export * from "@/lib/rules/actor";
export * from "@/lib/rules/restore";
export * from "@/lib/rules/record";

export const RULES_SECTIONS = [
  {
    id: "28.1",
    title: "Data Integrity",
    points: [
      "Email unique across Leads and Contacts",
      "Deal Name + Account unique",
      "Required fields on create",
      "System fields non-editable",
      "Deletes → Recycle Bin (unlimited retention)",
    ],
  },
  {
    id: "28.2",
    title: "Status / Stage Transitions",
    points: [
      'Lead "Converted" is final',
      'Deal "Closed Won" / "Closed Lost" are final',
      'Ticket "Closed" can be reopened',
      'Campaign "Completed" cannot be restarted',
    ],
  },
  {
    id: "28.3",
    title: "Notifications",
    points: [
      "Owner assignment → notification",
      "Status/Stage change → notification",
      "Deal close → owner + manager",
      "Task due → reminder",
      "Ticket update → requester",
    ],
  },
  {
    id: "28.4",
    title: "Audit Trail",
    points: [
      "Create / edit / delete logged with timestamp + user",
      "Field-level change history on records",
      "Login / logout / failed login logged",
    ],
  },
  {
    id: "28.5",
    title: "Permissions",
    points: [
      "RBAC with hierarchy levels",
      "Module-level permissions",
      "Field-level permissions",
      "Record-level (Owner / Team / Public)",
      "Action-level permissions",
    ],
  },
] as const;
