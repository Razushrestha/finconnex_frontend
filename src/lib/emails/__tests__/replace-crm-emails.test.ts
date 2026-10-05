import { beforeEach, describe, expect, it } from "vitest";
import { listEmails, replaceCrmEmails, saveEmails } from "@/lib/emails/store";
import type { Email } from "@/lib/emails/types";

function mail(partial: Partial<Email>): Email {
  return {
    id: "local-1",
    subject: "Your loan documents",
    body: "<p>Hi Ada</p><p>Signature <img src='data:image/png;base64,AA'></p>",
    from: "agent@finconnex.com",
    to: ["ada@example.com"],
    status: "Draft",
    outbound: true,
    ...partial,
  };
}

// A send the CRM completed used to leave a local-only "Draft" copy behind.
describe("replaceCrmEmails", () => {
  beforeEach(() => saveEmails([]));

  it("drops a local draft left behind by an email the CRM sent", () => {
    saveEmails([mail({})]);
    replaceCrmEmails([
      mail({ id: "8d0e3d8e-0c55-4d4f-9a0e-1b2c3d4e5f60", status: "Sent", body: "<p>Hi Ada</p>" }),
    ]);
    expect(listEmails().map((e) => e.status)).toEqual(["Sent"]);
  });

  it("keeps a real draft to someone else or with another subject", () => {
    saveEmails([
      mail({ id: "local-2", to: ["bob@example.com"] }),
      mail({ id: "local-3", subject: "Follow-up" }),
    ]);
    replaceCrmEmails([
      mail({ id: "8d0e3d8e-0c55-4d4f-9a0e-1b2c3d4e5f60", status: "Sent", body: "x" }),
    ]);
    expect(listEmails().map((e) => e.id).sort()).toEqual([
      "8d0e3d8e-0c55-4d4f-9a0e-1b2c3d4e5f60",
      "local-2",
      "local-3",
    ]);
  });
});
