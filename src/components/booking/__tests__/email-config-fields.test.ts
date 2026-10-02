import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmailConfigFields } from "@/components/booking/EmailConfigFields";
import { ListboxSelect } from "@/components/booking/LimitsControls";
import type { EmailAudience, EmailRouting } from "@/lib/booking/email-config";

function render(
  audience: EmailAudience,
  value: Partial<EmailRouting> = {},
  superAdminEmail = "contact@nepatronix.org",
) {
  return renderToStaticMarkup(
    createElement(EmailConfigFields, {
      audience,
      value: { sendFrom: "default", replyTo: "", cc: "", ...value },
      superAdminEmail,
      onChange: () => {},
    }),
  );
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The <button role="combobox"> for one field, as markup. */
function trigger(html: string, label: string) {
  const match = html.match(
    new RegExp(
      `<button[^>]*role="combobox"[^>]*aria-label="${escapeRegExp(label)}"[^>]*>[\\s\\S]*?</button>`,
    ),
  );
  expect(match, `a "${label}" dropdown`).toBeTruthy();
  return match![0];
}

/**
 * Whether `className` is one of the element's classes. A plain substring check
 * would also match `focus:border-[#475569]`, which every closed trigger has.
 */
function hasClass(markup: string, className: string) {
  return [...markup.matchAll(/class="([^"]*)"/g)].some((m) =>
    m[1].split(/\s+/).includes(className),
  );
}

describe("EmailConfigFields", () => {
  it("shows the three dropdowns under an Email Configurations heading", () => {
    const html = render("user");
    expect(html).toContain("Email Configurations");
    for (const label of ["Send from", "Reply To", "Copy (Cc)"]) trigger(html, label);
    // The visible captions follow the reference product.
    expect(html).toContain(">Send from<");
    expect(html).toContain(">Reply To<");
    expect(html).toContain(">Copy(Cc)<");
  });

  it("uses custom dropdowns, not native selects", () => {
    const html = render("user");
    expect(html).not.toContain("<select");
    expect(html.match(/role="combobox"/g)).toHaveLength(3);
  });

  it("shows the chosen option's label in each dropdown", () => {
    const html = render("user", {
      sendFrom: "staff",
      replyTo: "customer",
      cc: "super_admin",
    });
    expect(trigger(html, "Send from")).toContain("Allocated staff member&#x27;s email address");
    expect(trigger(html, "Reply To")).toContain("Customer&#x27;s Email address");
    expect(trigger(html, "Copy (Cc)")).toContain(
      "Super admin&#x27;s email address (contact@nepatronix.org)",
    );
  });

  it("shows the default sender when nothing else is chosen", () => {
    expect(trigger(render("user"), "Send from")).toContain("Default FinConnex email address");
  });

  it("shows the empty 'Select …' prompts muted, not as a chosen value", () => {
    const html = render("user");
    const reply = trigger(html, "Reply To");
    const cc = trigger(html, "Copy (Cc)");
    expect(reply).toContain("Select Reply To");
    expect(cc).toContain("Select Copy (Cc)");
    for (const field of [reply, cc]) {
      expect(hasClass(field, "text-slate-400")).toBe(true);
      // The dark 'a value was picked' outline is only for real choices.
      expect(hasClass(field, "border-[#475569]")).toBe(false);
    }
  });

  it("outlines a real choice, even though the prompt row is last in the list", () => {
    const html = render("user", { replyTo: "staff", cc: "staff" });
    expect(hasClass(trigger(html, "Reply To"), "border-[#475569]")).toBe(true);
    expect(hasClass(trigger(html, "Reply To"), "text-slate-400")).toBe(false);
  });

  it("shows the whole label on hover when it is cut off", () => {
    const html = render("user", { cc: "super_admin" });
    expect(trigger(html, "Copy (Cc)")).toContain(
      'title="Super admin&#x27;s email address (contact@nepatronix.org)"',
    );
  });

  it("explains what is applied", () => {
    expect(render("customer")).toContain("Reply To and Cc are added to every email");
  });
});

describe("ListboxSelect placeholder rows", () => {
  const options = [
    { value: "a", label: "Alpha" },
    { value: "b", label: "Beta" },
    { value: "", label: "Pick one", placeholder: true },
  ];
  const html = (value: string) =>
    renderToStaticMarkup(
      createElement(ListboxSelect, { label: "Test", value, options, onChange: () => {} }),
    );

  it("treats the placeholder like an unset field", () => {
    expect(html("")).toContain("Pick one");
    expect(hasClass(html(""), "border-[#475569]")).toBe(false);
    expect(hasClass(html(""), "text-slate-400")).toBe(true);
  });

  it("leaves ordinary options exactly as before", () => {
    expect(hasClass(html("b"), "border-[#475569]")).toBe(true);
    expect(hasClass(html("a"), "border-[#475569]")).toBe(false);
    expect(hasClass(html("a"), "text-slate-400")).toBe(false);
  });
});
