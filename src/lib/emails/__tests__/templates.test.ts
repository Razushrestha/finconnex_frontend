import { describe, expect, it } from "vitest";
import { htmlToPlainText } from "@/lib/emails/ai-compose";
import {
  EMAIL_TEMPLATES,
  filledTemplateSubject,
  renderEmailTemplateHtml,
} from "@/lib/emails/templates";

describe("email templates", () => {
  it("renders Introduction as a single nice-to-meet-you email", () => {
    const item = EMAIL_TEMPLATES.find((row) => row.id === "intro")!;
    const html = renderEmailTemplateHtml(item, "Ada Lovelace");
    const text = htmlToPlainText(html);
    expect(filledTemplateSubject(item)).toMatch(/nice to meet you/i);
    expect(text.match(/Hi Ada/gi)?.length).toBe(1);
    expect(text.toLowerCase()).toContain("nice to meet you");
    expect(text.toLowerCase()).toContain("finconnex");
    expect(text.toLowerCase()).not.toContain("lorem ipsum");
    expect(text.toLowerCase()).not.toContain("here is what we need");
    expect((text.match(/kind regards/gi) ?? []).length).toBe(1);
  });
});
