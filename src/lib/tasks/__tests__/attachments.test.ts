import { describe, expect, it } from "vitest";
import { mapTaskAttachments, normalizeTask } from "@/lib/tasks/api";

const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("task attachments", () => {
  it("maps CRM attachment keys and download URLs", () => {
    const files = mapTaskAttachments([
      {
        id: "att-1",
        key: "workspaces/ws/uploads/1718700000000-a1b2c3d4-proposal.pdf",
        url: "https://cdn.example.com/proposal.pdf",
      },
    ]);
    expect(files).toEqual([
      {
        id: "att-1",
        name: "proposal.pdf",
        url: "https://cdn.example.com/proposal.pdf",
        key: "workspaces/ws/uploads/1718700000000-a1b2c3d4-proposal.pdf",
        sizeLabel: undefined,
      },
    ]);
  });

  it("normalizes attachments onto the task card", () => {
    const task = normalizeTask(
      {
        id: ID,
        subject: "Test demo",
        status: "NOT_STARTED",
        priority: "MEDIUM",
        attachments: [
          {
            id: "att-1",
            key: "workspaces/ws/uploads/brief.docx",
            url: "https://cdn.example.com/brief.docx",
          },
        ],
      },
      0,
    );
    expect(task.attachments).toHaveLength(1);
    expect(task.attachments?.[0]?.name).toBe("brief.docx");
    expect(task.attachmentsCount).toBe(1);
  });
});
