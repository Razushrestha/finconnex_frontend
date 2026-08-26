import { describe, expect, it } from "vitest";
import {
  smokeAuditLogMock,
  smokeAuditLogWiring,
} from "@/lib/audit-logs/smoke";

describe("Audit logs CRM API", () => {
  it("wires GET /v1/audit-logs into settings", () => {
    smokeAuditLogWiring();
  });

  it("mock client hits GET /v1/audit-logs and unwraps data", async () => {
    await smokeAuditLogMock();
  });
});
