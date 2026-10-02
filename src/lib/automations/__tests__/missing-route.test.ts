import { describe, expect, it } from "vitest";

import { crmErrorMessage } from "@/lib/crm/request";

import { isMissingRouteError } from "../api";

/**
 * The run log and Test Workflow fall back when the CRM server predates them.
 * That hinges on the old server's error surviving crmErrorMessage, so these
 * are the exact bodies an older Nest build answers with.
 */
describe("recognising a CRM server without the run-log routes", () => {
  const asError = (body: unknown) => new Error(crmErrorMessage(body, "CRM request failed"));

  it("spots Nest's 404 for an unknown route, stack trace and all", () => {
    const body = {
      statusCode: 404,
      message: "Cannot GET /v1/automations/28f3474d-cbab-43c6-a642-5f62b26c48d9/triggers/trg-1/runs?page=1&limit=20",
      error:
        "NotFoundException: Cannot GET /v1/automations/28f3474d/triggers/trg-1/runs at callback (/app/node_modules/@nestjs/core/router/routes-resolver.js:77:19)",
    };
    expect(isMissingRouteError(asError(body))).toBe(true);
    expect(isMissingRouteError(asError({ ...body, message: body.message.replace("GET", "POST") }))).toBe(true);
  });

  it("does not mistake an ordinary not-found for a missing route", () => {
    expect(isMissingRouteError(asError({ statusCode: 404, message: "Automation was not found." }))).toBe(false);
  });

  it("keeps the uuid message an older server gives /automation-runs/log", () => {
    const message = crmErrorMessage(
      {
        statusCode: 400,
        message: "Validation failed (uuid is expected)",
        error: "BadRequestException: Validation failed (uuid is expected) at ParseUUIDPipe.transform (/app/x.js:1:1)",
      },
      "CRM request failed",
    );
    expect(message).toMatch(/uuid is expected/i);
  });
});
