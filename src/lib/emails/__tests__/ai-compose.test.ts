import { describe, expect, it } from "vitest";
import {
  draftEmailFromPrompt,
  extractEmailCore,
  htmlToPlainText,
  rewriteEmailWithAi,
  subjectsGroundedInDraft,
  suggestSubjects,
} from "@/lib/emails/ai-compose";

describe("write with AI length", () => {
  it("writes three descriptive body paragraphs for every compose tone", () => {
    for (const tone of ["friendly", "professional", "emotional", "loving"] as const) {
      const text = htmlToPlainText(
        draftEmailFromPrompt({
          prompt:
            "write a email to my friend mentioning all the documents is being signed",
          tone,
          recipientName: "Alex",
        }),
      );
      const blocks = text
        .split(/\n\n+/)
        .map((block) => block.trim())
        .filter(Boolean);
      const body = blocks.slice(1, -1);
      expect(body.length).toBeGreaterThanOrEqual(3);
      expect(
        body.every((para) => para.split(/[.!?]+/).filter(Boolean).length >= 2),
      ).toBe(true);
    }
  });
});

describe("change tone", () => {
  it("peels stacked greetings and sign-offs back to the original core", () => {
    const stacked = [
      "Hello there,",
      "",
      "I am writing to provide a clear, considered update and to place the relevant details in one message. The aim is to be accurate, thorough, and straightforward to act on.",
      "",
      "Dear there,",
      "",
      "Please accept this correspondence as a complete update for your records. The points below are set out so the position, the documents, and the requested next step are each easy to identify.",
      "",
      "Lorem ipsum dolor sit amet.",
      "",
      "I should be grateful if you would review the enclosed position and respond with any observations or confirmation at your earliest convenience. I remain available should further particulars be required.",
      "",
      "Yours sincerely,",
      "FinConnex",
      "",
      "Kind regards,",
      "FinConnex",
    ].join("\n");
    expect(extractEmailCore(stacked)).toBe("Lorem ipsum dolor sit amet.");
  });

  it("replaces the previous rewrite instead of appending another envelope", () => {
    const original = "<p>Lorem ipsum dolor sit amet.</p>";
    const formal = rewriteEmailWithAi({ html: original, tone: "formal" });
    const persuasive = rewriteEmailWithAi({ html: formal, tone: "persuasive" });
    const casual = rewriteEmailWithAi({ html: persuasive, tone: "warm" });
    const text = htmlToPlainText(casual);

    expect(text.match(/Hello there/gi)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(text.match(/Dear there/gi)?.length ?? 0).toBe(0);
    expect(text.match(/Yours sincerely/gi)?.length ?? 0).toBe(0);
    expect((text.match(/FinConnex/g) ?? []).length).toBe(1);
    expect((text.match(/Kind regards/gi) ?? []).length).toBe(1);
    expect(text.toLowerCase()).toContain("lorem ipsum dolor sit amet");
    const body = text
      .split(/\n\n+/)
      .map((block) => block.trim())
      .filter(Boolean)
      .slice(1, -1);
    expect(body.length).toBeGreaterThanOrEqual(3);
  });
});

describe("improve subject", () => {
  it("suggests lines about the typed subject, not a sidebar home loan deal", () => {
    const rows = suggestSubjects({
      current: "Check the proposal",
      body: "Please have a look at the attached proposal when you can.",
      dealTitle: "Home Loan Pre-Approval",
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => /proposal/i.test(row.text))).toBe(true);
    expect(
      rows.some((row) => /home loan|pre-approval/i.test(row.text)),
    ).toBe(false);
  });

  it("drops mortgage suggestions when the draft never mentioned them", () => {
    const kept = subjectsGroundedInDraft(
      [
        { text: "Check the proposal" },
        { text: "Your Home Loan Application – What's Next?" },
        { text: "Your Pre-Approval Application Update" },
      ],
      "Check the proposal Please review the attached proposal",
    );
    expect(kept.map((row) => row.text)).toEqual(["Check the proposal"]);
  });
});
