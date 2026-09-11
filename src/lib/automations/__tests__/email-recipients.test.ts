import { describe, expect, it } from "vitest";

import {
  emailRecipientProblems,
  isEmailAddress,
  isTriggerEmailToken,
  MAX_EMAIL_RECIPIENTS,
  parseRecipients,
  readEmailRecipients,
  recipientCount,
  serializeRecipients,
  supportsTriggerEmail,
  writeEmailRecipients,
} from "@/lib/automations/email-recipients";
import { visibleActionConfigKeys } from "@/lib/automations/field-meta";
import { AUTOMATION_ACTION_KEYS } from "@/lib/automations/types";

describe("email recipients", () => {
  it("treats a missing toEmail as the triggering record's address", () => {
    expect(readEmailRecipients({ subject: "Hi" })).toEqual({
      toEmail: undefined,
      cc: [],
      bcc: [],
    });
    // The builder advertised {{email}} long before anything resolved it, so
    // a step saved with the token opens on the default rather than showing it.
    expect(readEmailRecipients({ toEmail: "{{email}}" }).toEmail).toBeUndefined();
    expect(readEmailRecipients({ toEmail: " {{Trigger.Email}} " }).toEmail).toBeUndefined();
    expect(isTriggerEmailToken("{{email}}")).toBe(true);
    expect(isTriggerEmailToken("ada@example.com")).toBe(false);
  });

  it("parses and re-serializes a comma-separated line, deduped", () => {
    expect(parseRecipients(" a@x.com , b@x.com ,, A@X.com ")).toEqual([
      "a@x.com",
      "b@x.com",
    ]);
    expect(parseRecipients(undefined)).toEqual([]);
    expect(serializeRecipients(["a@x.com", "b@x.com"])).toBe("a@x.com,b@x.com");
    expect(serializeRecipients([])).toBeUndefined();
  });

  it("drops empty keys rather than writing blanks the API rejects", () => {
    // An empty string would fail @IsEmail() where the key being absent is
    // exactly how "send to the trigger record" is expressed.
    const config = writeEmailRecipients(
      { subject: "Hi", toEmail: "old@x.com", cc: "a@x.com" },
      { toEmail: undefined, cc: [], bcc: [] },
    );
    expect(config).toEqual({ subject: "Hi" });
    expect("toEmail" in config).toBe(false);
  });

  it("keeps an empty To as a half-finished specific address", () => {
    // Folding "" into undefined would flip the choice back to the trigger
    // record's address the moment the box is cleared, mid-edit.
    const config = writeEmailRecipients({ subject: "Hi" }, { toEmail: "", cc: [], bcc: [] });
    expect(config.toEmail).toBe("");
    expect(readEmailRecipients(config).toEmail).toBe("");
    expect(emailRecipientProblems({ toEmail: "", cc: [], bcc: [] }, "LEAD")).toEqual([
      "Enter a valid To address.",
    ]);
  });

  it("round-trips a full set of recipients", () => {
    const recipients = {
      toEmail: "to@x.com",
      cc: ["one@x.com", "two@x.com"],
      bcc: ["three@x.com"],
    };
    const config = writeEmailRecipients({ subject: "Hi" }, recipients);
    expect(config).toEqual({
      subject: "Hi",
      toEmail: "to@x.com",
      cc: "one@x.com,two@x.com",
      bcc: "three@x.com",
    });
    expect(readEmailRecipients(config)).toEqual(recipients);
  });

  it("counts mailboxes the way the backend dedupes them", () => {
    // normalizeRecipients builds one case-insensitive set across to/cc/bcc.
    expect(
      recipientCount({ toEmail: "a@x.com", cc: ["A@x.com"], bcc: ["b@x.com"] }),
    ).toBe(2);
    // An unresolved trigger address still becomes one mailbox.
    expect(recipientCount({ toEmail: undefined, cc: [], bcc: [] })).toBe(1);
  });

  it("accepts a trigger address only where the record has one", () => {
    expect(supportsTriggerEmail("LEAD")).toBe(true);
    expect(supportsTriggerEmail("CONTACT")).toBe(true);
    // A company or deal carries no email column of its own.
    expect(supportsTriggerEmail("COMPANY")).toBe(false);

    expect(emailRecipientProblems({ cc: [], bcc: [] }, "LEAD")).toEqual([]);
    expect(
      emailRecipientProblems({ cc: [], bcc: [] }, "COMPANY", "organization"),
    ).toHaveLength(1);
    expect(
      emailRecipientProblems({ toEmail: "ops@x.com", cc: [], bcc: [] }, "COMPANY"),
    ).toEqual([]);
  });

  it("rejects a half-typed address and an over-full recipient list", () => {
    expect(isEmailAddress("ada@example.com")).toBe(true);
    expect(isEmailAddress("ada@example")).toBe(false);
    expect(isEmailAddress("ada @example.com")).toBe(false);
    expect(isEmailAddress("")).toBe(false);

    expect(
      emailRecipientProblems({ toEmail: "not-an-address", cc: [], bcc: [] }, "LEAD"),
    ).toEqual(["Enter a valid To address."]);
    expect(
      emailRecipientProblems({ toEmail: "a@x.com", cc: ["nope"], bcc: [] }, "LEAD"),
    ).toEqual(['"nope" is not a valid email address.']);

    const many = Array.from(
      { length: MAX_EMAIL_RECIPIENTS },
      (_, i) => `person-${i}@x.com`,
    );
    expect(
      emailRecipientProblems({ toEmail: "a@x.com", cc: many, bcc: [] }, "LEAD"),
    ).toContain(`One email reaches at most ${MAX_EMAIL_RECIPIENTS} recipients.`);
  });
});

describe("send email step fields", () => {
  const ALLOWED = AUTOMATION_ACTION_KEYS.SEND_EMAIL.allowed;

  it("hides the plumbing the executor fills in by itself", () => {
    const visible = visibleActionConfigKeys("SEND_EMAIL", ALLOWED, {});
    // The relation keys default to the triggering record, and replyToId is an
    // existing email's uuid — neither is a question to put to a workflow author.
    expect(visible).not.toContain("replyToId");
    expect(visible).not.toContain("relatedType");
    expect(visible).not.toContain("leadId");
    expect(visible).not.toContain("contactId");
    expect(visible).not.toContain("companyId");
    expect(visible).not.toContain("dealId");
    // What is left is the email itself.
    expect(visible).toEqual(["subject", "body", "toEmail", "cc", "bcc", "templateId", "scheduledAt"]);
  });

  it("still shows a hidden key that already has a value, so nothing is stranded", () => {
    const visible = visibleActionConfigKeys("SEND_EMAIL", ALLOWED, {
      dealId: "11111111-1111-4111-8111-111111111111",
    });
    expect(visible).toContain("dealId");
    expect(visible).not.toContain("leadId");
  });

  it("leaves every other action's fields alone", () => {
    const allowed = AUTOMATION_ACTION_KEYS.CREATE_TASK.allowed;
    expect(visibleActionConfigKeys("CREATE_TASK", allowed, {})).toEqual([...allowed]);
  });
});
