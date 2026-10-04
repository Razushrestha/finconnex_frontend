import { describe, expect, it } from "vitest";
import {
  addInviteGuestEmails,
  inviteGuestEmailsFromAnswers,
  inviteGuestsField,
  parseInviteGuestEmails,
} from "@/lib/booking/invite-guests";

describe("inviteGuestsField", () => {
  it("keeps the default Invite Guest field when the page never hid it", () => {
    expect(inviteGuestsField([])).toEqual({
      id: "guests",
      label: "Invite Guest(s)",
      required: false,
    });
  });

  it("uses the saved label when the field is visible", () => {
    expect(
      inviteGuestsField([
        { id: "guests", label: "Invite Guest(s)", required: false },
      ]),
    ).toMatchObject({ id: "guests", required: false });
  });

  it("hides the field when the eye is off", () => {
    expect(
      inviteGuestsField([
        { id: "guests", label: "Invite Guest(s)", hidden: true },
      ]),
    ).toBeNull();
  });
});

describe("invite guest emails", () => {
  it("accepts a list of emails and stops at 10", () => {
    const ten = Array.from({ length: 10 }, (_, i) => `a${i}@mail.test`);
    expect(parseInviteGuestEmails(ten.join(", "))).toEqual(ten);
    expect(
      addInviteGuestEmails(ten, "more@mail.test").error,
    ).toMatch(/10 guests/i);
  });

  it("rejects a bad address and skips duplicates", () => {
    expect(addInviteGuestEmails([], "not-an-email").error).toMatch(/valid email/i);
    expect(addInviteGuestEmails(["ada@mail.test"], "Ada@mail.test").emails).toEqual([
      "ada@mail.test",
    ]);
  });

  it("reads Invite Guest answers and skips the booker's own address", () => {
    expect(
      inviteGuestEmailsFromAnswers(
        { guests: "razushrestha9335@gmail.com, ada@example.com" },
        [{ id: "guests", label: "Invite Guest(s)" }],
        ["ada@example.com"],
      ),
    ).toEqual(["razushrestha9335@gmail.com"]);
  });
});
