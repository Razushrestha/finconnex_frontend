import { describe, expect, it } from "vitest";
import { normalizeCrmCall } from "@/lib/calls/api";
import { normalizeMessage } from "@/lib/messages/api";
import { normalizeReminder } from "@/lib/reminders/api";

describe("activity display names", () => {
  it("fills call contact, owner, related record, and duration", () => {
    const call = normalizeCrmCall(
      {
        id: "call-1",
        subject: "Intro",
        callType: "OUTBOUND",
        status: "COMPLETED",
        duration: 95,
        assignedTo: { id: "u1", firstName: "Ada", lastName: "Khan", email: "ada@example.com" },
        contact: { id: "c1", firstName: "Priya", lastName: "Shah" },
        deal: { id: "d1", name: "Greystone" },
      },
      0,
    );
    expect(call?.assignedTo).toBe("Ada Khan");
    expect(call?.contact).toBe("Priya Shah");
    expect(call?.relatedTo).toBe("Deal: Greystone");
    expect(call?.duration).toBe("1m 35s");
  });

  it("fills reminder owner and related task", () => {
    const reminder = normalizeReminder(
      {
        id: "rem-1",
        title: "Follow up",
        remindAt: "2026-10-05T09:00:00.000Z",
        targetUser: { id: "u1", firstName: "Ada", lastName: "Khan", email: "ada@example.com" },
        task: { id: "t1", subject: "Send proposal" },
      },
      0,
    );
    expect(reminder.owner).toBe("Ada Khan");
    expect(reminder.relatedTo).toBe("Task: Send proposal");
  });

  it("fills message from, to, and related company", () => {
    const message = normalizeMessage(
      {
        id: "msg-1",
        subject: "Hello",
        from: { id: "u1", firstName: "Ada", lastName: "Khan", email: "ada@example.com" },
        toContact: { id: "c1", firstName: "Priya", lastName: "Shah" },
        company: { id: "co-1", name: "Acme" },
      },
      0,
    );
    expect(message.from).toBe("Ada Khan");
    expect(message.to).toBe("Priya Shah");
    expect(message.relatedTo).toBe("Company: Acme");
  });
});
