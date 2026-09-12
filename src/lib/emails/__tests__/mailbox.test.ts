import { describe, expect, it } from "vitest";
import {
  emailMatchesFolder,
  isSuccessfullySentStatus,
  isUnsentStatus,
  type MailboxFlags,
} from "@/lib/emails/mailbox";
import type { Email } from "@/lib/emails/types";

function mail(partial: Partial<Email>): Email {
  return {
    id: "e1",
    subject: "Hello",
    body: "Hi",
    from: "lead@example.com",
    to: ["agent@finconnex.com"],
    status: "Delivered",
    ...partial,
  };
}

const flags: MailboxFlags = {};

describe("mailbox folders", () => {
  it("puts unsent and failed mail in Drafts, not Inbox or Sent", () => {
    const draft = mail({ status: "Draft", from: "agent@finconnex.com" });
    const failed = mail({ status: "Failed", from: "agent@finconnex.com" });
    expect(isUnsentStatus("Draft")).toBe(true);
    expect(emailMatchesFolder(draft, "drafts", flags)).toBe(true);
    expect(emailMatchesFolder(failed, "drafts", flags)).toBe(true);
    expect(emailMatchesFolder(draft, "inbox", flags)).toBe(false);
    expect(emailMatchesFolder(failed, "sent", flags)).toBe(false);
  });

  it("keeps successfully sent outbound mail in Sent", () => {
    const sent = mail({
      status: "Sent",
      from: "agent@finconnex.com",
      to: ["lead@example.com"],
    });
    expect(isSuccessfullySentStatus("Sent")).toBe(true);
    expect(emailMatchesFolder(sent, "sent", flags)).toBe(true);
    expect(emailMatchesFolder(sent, "inbox", flags)).toBe(false);
    expect(emailMatchesFolder(sent, "drafts", flags)).toBe(false);
  });

  it("shows reported spam only in Spam", () => {
    const row = mail({ status: "Delivered" });
    const spam: MailboxFlags = { spam: true };
    expect(emailMatchesFolder(row, "spam", spam)).toBe(true);
    expect(emailMatchesFolder(row, "inbox", spam)).toBe(false);
  });
});
