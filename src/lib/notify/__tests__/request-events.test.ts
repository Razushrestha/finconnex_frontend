import { describe, expect, it } from "vitest";

import { describeRequestEvent, readableErrorMessage } from "@/lib/notify/request-events";

const WS = "a0a1fafc-05b8-450d-8939-8b838b4536ab";
const ID = "6615fff8-a645-4da9-8f27-1796b97f22cf";
const API = "https://finconnex.payperless.app";

const success = (method: string, url: string) => describeRequestEvent(method, url)?.success ?? null;

describe("describeRequestEvent", () => {
  it("names creates, updates and deletes by the record", () => {
    expect(success("POST", `${API}/v1/leads`)).toBe("Lead created");
    expect(success("PATCH", `${API}/v1/contacts/${ID}`)).toBe("Contact updated");
    expect(success("DELETE", `${API}/v1/deals/${ID}`)).toBe("Deal deleted");
    expect(success("POST", `${API}/v1/document-requests`)).toBe("Document request created");
    expect(success("POST", `${API}/v1/credit-notes`)).toBe("Credit note created");
  });

  it("reads through the workspace prefix and the app's CRM proxy", () => {
    expect(success("POST", `${API}/v1/workspaces/${WS}/tasks`)).toBe("Task created");
    expect(success("POST", `/api/auth/crm/workspaces/${WS}/tasks/${ID}/complete`)).toBe("Task completed");
    expect(success("DELETE", `/api/auth/crm/leads/${ID}`)).toBe("Lead deleted");
  });

  it("names actions on a record", () => {
    expect(success("POST", `${API}/v1/leads/${ID}/convert`)).toBe("Lead converted");
    expect(success("POST", `${API}/v1/invoices/${ID}/send`)).toBe("Invoice sent");
    expect(success("POST", `${API}/v1/recycle-bin/LEAD/${ID}/restore`)).toBe("Record restored");
    expect(success("POST", `${API}/v1/leads/bulk-delete`)).toBe("Leads deleted");
    expect(success("POST", `${API}/v1/companies/import`)).toBe("Companies imported");
  });

  it("says sent, added and removed where that reads better", () => {
    expect(success("POST", `${API}/v1/workspaces/${WS}/emails`)).toBe("Email sent");
    expect(success("POST", `${API}/v1/workspaces/${WS}/messages`)).toBe("Message sent");
    expect(success("POST", `${API}/v1/deals/${ID}/contacts`)).toBe("Contact added");
    expect(success("DELETE", `${API}/v1/leads/${ID}/followers/${ID}`)).toBe("Follower removed");
    expect(success("DELETE", `${API}/v1/leads/${ID}/tags`)).toBe("Tag removed");
    expect(success("PUT", `${API}/v1/settings/company-profile`)).toBe("Company profile saved");
    expect(success("PATCH", `${API}/v1/workspaces/${WS}/notification-preferences`)).toBe(
      "Notification preferences saved",
    );
  });

  it("names the app's own send and sign routes", () => {
    expect(success("POST", "/api/auth/mail/deliver")).toBe("Email sent");
    expect(success("POST", "/api/auth/sms")).toBe("SMS sent");
    expect(success("POST", "/api/sign/abc123/sign")).toBe("Document signed");
    expect(success("POST", "/api/auth/workspace/create")).toBe("Workspace created");
  });

  it("stays silent for reads, look-ups and background sync", () => {
    expect(describeRequestEvent("GET", `${API}/v1/leads`)).toBeNull();
    expect(describeRequestEvent("PUT", `${API}/v1/kv/sales%3Aleads%3Aboard`)).toBeNull();
    expect(describeRequestEvent("POST", `${API}/v1/leads/search`)).toBeNull();
    expect(describeRequestEvent("POST", `${API}/v1/automations/${ID}/validate`)).toBeNull();
    expect(describeRequestEvent("POST", `${API}/v1/workspaces/${WS}/notifications/read-all`)).toBeNull();
    expect(describeRequestEvent("PATCH", `${API}/v1/workspaces/${WS}/notifications/${ID}/read`)).toBeNull();
    expect(describeRequestEvent("POST", `${API}/v1/workspaces/${WS}/chat/${ID}/messages`)).toBeNull();
    expect(describeRequestEvent("POST", `${API}/v1/storage/uploads`)).toBeNull();
    expect(describeRequestEvent("POST", `${API}/v1/__no_such_module_tasks_probe__`)).toBeNull();
  });

  it("leaves auth flows to their own screens", () => {
    expect(describeRequestEvent("POST", "/api/auth/login")).toBeNull();
    expect(describeRequestEvent("POST", "/api/auth/signup")).toBeNull();
    expect(describeRequestEvent("POST", "/api/auth/logout")).toBeNull();
    expect(describeRequestEvent("POST", "/api/sign/progress")).toBeNull();
    expect(describeRequestEvent("POST", "/api/ai/email")).toBeNull();
    expect(describeRequestEvent("POST", `${API}/v1/auth/refresh`)).toBeNull();
  });

  it("gives the failure a title and groups repeats by endpoint", () => {
    const first = describeRequestEvent("DELETE", `${API}/v1/leads/${ID}`);
    const second = describeRequestEvent("DELETE", `${API}/v1/leads/a0a1fafc-05b8-450d-8939-8b838b4536ac`);
    expect(first?.failure).toBe("Couldn't delete lead");
    expect(first?.key).toBe(second?.key);
    expect(describeRequestEvent("POST", `${API}/v1/leads`)?.failure).toBe("Couldn't create lead");
  });
});

describe("readableErrorMessage", () => {
  it("turns CRM message keys into a sentence and keeps plain text", () => {
    expect(readableErrorMessage("automation.error.linkedContactNotFound")).toBe("Linked contact not found");
    expect(readableErrorMessage("crm.error.emailTakenByContact")).toBe("Email taken by contact");
    expect(readableErrorMessage("Deal value must be positive.")).toBe("Deal value must be positive.");
  });
});
