import { describe, expect, it } from "vitest";
import {
  ccOptions,
  normalizeEmailRouting,
  replyToOptions,
  resolveEmailRouting,
  routingFor,
  sendFromOptions,
  superAdminLabel,
  updateEmailConfig,
  type EmailNotifyConfig,
} from "@/lib/booking/email-config";

const labels = (options: Array<{ label: string }>) => options.map((o) => o.label);

describe("Email Configurations options", () => {
  it("offers the Send from choices, with the super admin's address in the label", () => {
    expect(labels(sendFromOptions("contact@nepatronix.org"))).toEqual([
      "Default FinConnex email address",
      "Super admin's email address (contact@nepatronix.org)",
      "Allocated staff member's email address",
    ]);
  });

  it("drops the parentheses while the super admin's address is unknown", () => {
    expect(superAdminLabel("")).toBe("Super admin's email address");
    expect(superAdminLabel("  ")).toBe("Super admin's email address");
  });

  it("lets To User reply to the customer, and To Customer not", () => {
    expect(labels(replyToOptions("user", "a@b.co"))).toEqual([
      "Super admin's email address (a@b.co)",
      "Allocated staff member's email address",
      "Customer's Email address",
      "Select Reply To",
    ]);
    expect(labels(replyToOptions("customer", "a@b.co"))).toEqual([
      "Super admin's email address (a@b.co)",
      "Allocated staff member's email address",
      "Select Reply To",
    ]);
  });

  it("ends Reply To and Cc with an empty 'Select …' row that clears the choice", () => {
    const reply = replyToOptions("user");
    const cc = ccOptions();
    expect(reply.at(-1)).toEqual({ value: "", label: "Select Reply To", placeholder: true });
    expect(cc.at(-1)).toEqual({ value: "", label: "Select Copy (Cc)", placeholder: true });
    expect(labels(cc)).toEqual([
      "Super admin's email address",
      "Allocated staff member's email address",
      "Select Copy (Cc)",
    ]);
  });

  it("never lists a value twice", () => {
    for (const list of [
      sendFromOptions(),
      replyToOptions("user"),
      replyToOptions("customer"),
      ccOptions(),
    ]) {
      const values = list.map((o) => o.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

describe("saved routing", () => {
  it("defaults to the default sender with no Reply To or Cc", () => {
    expect(routingFor(undefined, "user")).toEqual({
      sendFrom: "default",
      replyTo: "",
      cc: "",
    });
    expect(routingFor(undefined, "customer")).toEqual({
      sendFrom: "default",
      replyTo: "",
      cc: "",
    });
  });

  it("reads older saves that stored a raw address", () => {
    const config: EmailNotifyConfig = {
      sendFrom: "Admin@Finconnex.com",
      replyTo: "sam@finconnex.com",
      cc: "someone-else@x.com",
    };
    expect(
      routingFor(config, "customer", {
        superAdminEmail: "admin@finconnex.com",
        staffEmail: "sam@finconnex.com",
      }),
    ).toEqual({ sendFrom: "super_admin", replyTo: "staff", cc: "" });
  });

  it("ignores values the audience cannot use", () => {
    // 'customer' is only a Reply To for the To User tab.
    expect(
      normalizeEmailRouting({ sendFrom: "customer", replyTo: "customer", cc: "customer" }, "customer"),
    ).toEqual({ sendFrom: "default", replyTo: "", cc: "" });
    expect(
      normalizeEmailRouting({ sendFrom: "x", replyTo: "customer", cc: "staff" }, "user"),
    ).toEqual({ sendFrom: "default", replyTo: "customer", cc: "staff" });
  });

  it("keeps To Customer and To User separate", () => {
    const first = updateEmailConfig(undefined, "user", { replyTo: "customer", cc: "staff" }, "a@b.co");
    expect(routingFor(first, "user")).toEqual({
      sendFrom: "default",
      replyTo: "customer",
      cc: "staff",
    });
    expect(routingFor(first, "customer")).toEqual({
      sendFrom: "default",
      replyTo: "",
      cc: "",
    });

    const second = updateEmailConfig(first, "customer", { cc: "super_admin" }, "a@b.co");
    expect(routingFor(second, "customer").cc).toBe("super_admin");
    // The To User choices survive a To Customer edit.
    expect(routingFor(second, "user")).toEqual({
      sendFrom: "default",
      replyTo: "customer",
      cc: "staff",
    });
  });

  it("does not let an edit pick a value the audience cannot use", () => {
    const next = updateEmailConfig(undefined, "customer", { replyTo: "customer" }, "");
    expect(routingFor(next, "customer").replyTo).toBe("");
  });

  it("remembers the signed-in admin's address, and keeps it when nobody is signed in", () => {
    const first = updateEmailConfig(undefined, "user", { cc: "super_admin" }, " admin@finconnex.com ");
    expect(first.superAdminEmail).toBe("admin@finconnex.com");
    const later = updateEmailConfig(first, "user", { cc: "staff" }, "");
    expect(later.superAdminEmail).toBe("admin@finconnex.com");
    expect(updateEmailConfig(undefined, "user", { cc: "staff" }, "").superAdminEmail).toBeUndefined();
  });

  it("keeps the To Customer fields at the top level of the saved object", () => {
    const next = updateEmailConfig(undefined, "customer", { replyTo: "staff" }, "");
    expect(next).toMatchObject({ sendFrom: "default", replyTo: "staff", cc: "" });
    expect(next.user).toEqual({ sendFrom: "default", replyTo: "", cc: "" });
  });
});

describe("resolving addresses for a message", () => {
  const config: EmailNotifyConfig = {
    sendFrom: "default",
    replyTo: "staff",
    cc: "super_admin",
    user: { sendFrom: "staff", replyTo: "customer", cc: "staff" },
    superAdminEmail: "admin@finconnex.com",
  };
  const people = {
    staffEmail: "sam@finconnex.com",
    customerEmail: "ada@example.com",
  };

  it("adds nothing when nothing is configured", () => {
    expect(
      resolveEmailRouting(undefined, "user", { ...people, to: "sam@finconnex.com" }),
    ).toEqual({ cc: [] });
    expect(
      resolveEmailRouting(
        { sendFrom: "default", replyTo: "", cc: "" },
        "customer",
        { ...people, to: "ada@example.com" },
      ),
    ).toEqual({ cc: [] });
  });

  it("resolves the To Customer set", () => {
    expect(
      resolveEmailRouting(config, "customer", { ...people, to: "ada@example.com" }),
    ).toEqual({ replyTo: "sam@finconnex.com", cc: ["admin@finconnex.com"] });
  });

  it("lets the team reply straight to the customer on the To User set", () => {
    expect(
      resolveEmailRouting(config, "user", { ...people, to: "admin@finconnex.com" }),
    ).toEqual({ replyTo: "ada@example.com", cc: ["sam@finconnex.com"] });
  });

  it("does not copy or reply to the person the message is going to", () => {
    // The staff member is the recipient: no point copying themselves.
    expect(
      resolveEmailRouting(config, "user", { ...people, to: "Sam@Finconnex.com" }),
    ).toEqual({ replyTo: "ada@example.com", cc: [] });
    expect(
      resolveEmailRouting(
        { ...config, replyTo: "staff" },
        "customer",
        { ...people, staffEmail: "ada@example.com", to: "ada@example.com" },
      ),
    ).toEqual({ cc: ["admin@finconnex.com"] });
  });

  it("skips a party whose address is unknown or not an address", () => {
    expect(
      resolveEmailRouting(config, "user", { to: "x@y.co", staffEmail: "Sam Staff", customerEmail: "" }),
    ).toEqual({ cc: [] });
    expect(
      resolveEmailRouting({ ...config, superAdminEmail: undefined }, "customer", {
        ...people,
        to: "ada@example.com",
      }),
    ).toEqual({ replyTo: "sam@finconnex.com", cc: [] });
  });

  it("uses the signed-in admin's address over the remembered one", () => {
    expect(
      resolveEmailRouting(config, "customer", {
        ...people,
        superAdminEmail: "new-admin@finconnex.com",
        to: "ada@example.com",
      }).cc,
    ).toEqual(["new-admin@finconnex.com"]);
  });
});
