import { describe, expect, it } from "vitest";
import {
  countRecordNavs,
  rowsForRecordNav,
  type LiveRecordQueues,
} from "@/lib/work-queue/record-queues";
import type { QueueRow } from "@/lib/work-queue/live";

function row(partial: Partial<QueueRow> & Pick<QueueRow, "id" | "subject">): QueueRow {
  return {
    dueLabel: "",
    dueColor: "#111827",
    status: "New Lead",
    priority: "Medium",
    related: "",
    sortKey: 0,
    href: "/leads",
    ...partial,
  };
}

const empty: LiveRecordQueues = {
  leads: [],
  contacts: [],
  deals: [],
  sla: [],
};

describe("live work queue record sections", () => {
  const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000);
  const staleCreated = `${eightDaysAgo.getDate().toString().padStart(2, "0")}/${(eightDaysAgo.getMonth() + 1).toString().padStart(2, "0")}/${eightDaysAgo.getFullYear()}`;

  const records: LiveRecordQueues = {
    leads: [
      row({
        id: "early",
        subject: "Early lead",
        status: "New Lead",
        related: "Company: Acme",
        description: "Value $120,000",
        createdTime: staleCreated,
        tag: "Website",
      }),
      row({
        id: "review",
        subject: "In conversation",
        status: "In Conversation",
        related: "Company: North",
        description: "Value $10",
        createdTime: staleCreated,
        tag: "Other",
      }),
      row({
        id: "blank",
        subject: "Missing facts",
        status: "Findings",
        related: "",
        description: "Needs a company",
        createdTime: staleCreated,
      }),
    ],
    contacts: [
      row({
        id: "phone",
        subject: "Phone contact",
        status: "Active",
        tag: "Phone",
        createdTime: staleCreated,
      }),
      row({
        id: "web",
        subject: "Web contact",
        status: "Active",
        tag: "Website",
      }),
    ],
    deals: [
      row({
        id: "late",
        subject: "Old prospect",
        status: "Prospecting",
        createdTime: staleCreated,
      }),
      row({
        id: "open",
        subject: "Still open",
        status: "Prospecting",
        createdTime: "01/01/2099",
      }),
    ],
    sla: [
      row({ id: "mile", subject: "Mile", status: "Milestone Overdue" }),
      row({ id: "today", subject: "Today", status: "Due Today" }),
      row({ id: "risk", subject: "Risk", status: "At Risk" }),
    ],
  };

  it("fills pipeline SLA sections from live lead clocks", () => {
    expect(rowsForRecordNav("sla-milestone-overdue", records, [])?.map((r) => r.id)).toEqual([
      "mile",
    ]);
    expect(rowsForRecordNav("sla-due-today", records, [])?.map((r) => r.id)).toEqual([
      "today",
    ]);
    expect(rowsForRecordNav("sla-at-risk", records, [])?.map((r) => r.id)).toEqual([
      "risk",
    ]);
    expect(rowsForRecordNav("sla-attention", records, [])).toHaveLength(3);
  });

  it("matches the visible lead, contact, and deal rules", () => {
    expect(rowsForRecordNav("stale-leads", records, [])?.map((r) => r.id)).toEqual([
      "early",
      "review",
    ]);
    expect(rowsForRecordNav("stale-leads", records, [])?.[0]?.priority).toBe("High");
    expect(rowsForRecordNav("pending-review", records, [])?.map((r) => r.id)).toEqual([
      "review",
    ]);
    expect(rowsForRecordNav("missing-info", records, [])?.map((r) => r.id)).toEqual([
      "blank",
    ]);
    expect(rowsForRecordNav("pending-tags", records, [])?.map((r) => r.id).sort()).toEqual([
      "blank",
      "review",
    ]);
    expect(rowsForRecordNav("followup", records, [])?.map((r) => r.id)).toEqual(["phone"]);
    expect(rowsForRecordNav("stalled", records, [])?.map((r) => r.id)).toEqual(["late"]);
  });

  it("counts SLA and record sections for the sidebar", () => {
    const counts = countRecordNavs(records, [
      row({
        id: "task",
        subject: "Call back",
        itemType: "TASK",
        status: "Not Started",
        sortKey: 2,
      }),
      row({
        id: "done",
        subject: "Done",
        itemType: "TASK",
        status: "Completed",
        sortKey: 1,
      }),
    ]);
    expect(counts["sla-milestone-overdue"]).toBe(1);
    expect(counts["sla-due-today"]).toBe(1);
    expect(counts["sla-at-risk"]).toBe(1);
    expect(counts["awaiting-action"]).toBe(1);
    expect(counts["my-leads"]).toBe(3);
    expect(countRecordNavs(empty, [])["sla-at-risk"]).toBe(0);
  });
});
