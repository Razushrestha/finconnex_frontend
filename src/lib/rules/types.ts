/** SRS §28 Cross-Module Rules — shared result types */

export type RuleOk = { ok: true };
export type RuleFail = { ok: false; code: string; message: string };
export type RuleResult = RuleOk | RuleFail;

export function ok(): RuleOk {
  return { ok: true };
}

export function fail(code: string, message: string): RuleFail {
  return { ok: false, code, message };
}

export type RulesActor = {
  id?: string;
  name: string;
  role?: string;
};

export const SYSTEM_FIELDS = [
  "id",
  "leadId",
  "contactId",
  "dealId",
  "ticketId",
  "resourceId",
  "entryId",
  "invoiceId",
  "estimateId",
  "quotationId",
  "paymentId",
  "portalId",
  "reportId",
  "campaignId",
  "createdAt",
  "createdDate",
  "createdBy",
  "modifiedAt",
  "isConverted",
  "convertedAt",
  "convertedContactId",
  "convertedDealId",
  "convertedCompanyId",
] as const;

export type SystemField = (typeof SYSTEM_FIELDS)[number];
