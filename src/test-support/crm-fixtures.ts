/**
 * Deterministic CRM fixtures for tests.
 *
 * The dashboard/analytics aggregators read from the local CRM stores. Those
 * stores used to fall back to hardcoded demo records, so tests could assert
 * "totals > 0" without setting anything up. The demo records are gone, so
 * tests that exercise aggregation now seed their own data through the same
 * public store APIs the app uses.
 *
 * Test-only: nothing in `src/app` or `src/components` imports this.
 */
import { createDeal, saveDealPipelines } from "@/lib/deals/store";
import { DEAL_PIPELINE_STAGES } from "@/lib/deals/types";
import { createLead, listLeadColumns, saveLeadColumns } from "@/lib/leads/store";
import { createCrmUser, listCrmUsers } from "@/lib/settings/users-store";
import { LEAD_COLUMNS } from "@/lib/leads/types";

const OWNER_A = "Test Owner A";
const OWNER_B = "Test Owner B";

/** Owners used by the fixtures, for tests that filter by owner. */
export const FIXTURE_OWNERS = { a: OWNER_A, b: OWNER_B };

/**
 * Seeds the member directory that `listAssignableOwnersLocal()` reads, so
 * team/owner aggregations have real members to rank. Without it they see an
 * empty roster and every per-member total is zero.
 *
 * Uses the users store rather than workspace-members: the latter writes to
 * sessionStorage, which is a no-op under the node test environment.
 */
function seedMembers() {
  const existing = new Set(listCrmUsers().map((u) => u.name));
  for (const name of [OWNER_A, OWNER_B]) {
    if (existing.has(name)) continue;
    createCrmUser({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.test`,
      role: "Manager",
      team: "Sales",
      status: "Active",
    });
  }
}

function resetStores() {
  seedMembers();
  saveLeadColumns(LEAD_COLUMNS.map((c) => ({ ...c, cards: [], leadCount: 0 })));
  const pipelines = Object.fromEntries(
    Object.entries(DEAL_PIPELINE_STAGES).map(([pipe, stages]) => [
      pipe,
      stages.map((s) => ({ ...s, deals: [] })),
    ]),
  ) as unknown as typeof DEAL_PIPELINE_STAGES;
  saveDealPipelines(pipelines);
}

/**
 * Seeds a small spread of leads and deals across stages, owners, sources and
 * loan types, so aggregate assertions (totals, funnels, per-owner filtering)
 * have something to measure.
 */
export function seedCrmFixtures(now = new Date()) {
  resetStores();

  const leads: Array<[string, string, string, string, string]> = [
    ["Ava", "Nolan", "New", "Website", OWNER_A],
    ["Ben", "Oakley", "Contacted", "Referral", OWNER_A],
    ["Cara", "Pike", "Qualified", "Website", OWNER_B],
    ["Dan", "Quinn", "Contacted", "Phone", OWNER_B],
    ["Eve", "Ryder", "New", "Referral", OWNER_A],
    ["Finn", "Sable", "Qualified", "Website", OWNER_A],
    ["Gia", "Turner", "Qualified", "Referral", OWNER_B],
  ];
  const SETTLED_STAGE = "Settled";
  leads.forEach(([firstName, lastName, status, source, owner], i) => {
    createLead({
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.test`,
      status: status as never,
      // Last two land in the Settled stage so settlement KPIs are non-zero.
      pipelineStage: i >= leads.length - 2 ? SETTLED_STAGE : undefined,
      source,
      owner,
      estimatedValue: "$450,000",
      custom: { loanPurpose: owner === OWNER_A ? "Purchase" : "Refinance" },
    });
  });

  const deals: Array<[string, string, string, string, number]> = [
    ["Alpha Facility", "Alpha Pty Ltd", "Qualification", OWNER_A, 40],
    ["Beta Refinance", "Beta Holdings", "Proposal", OWNER_A, 60],
    ["Gamma Purchase", "Gamma Group", "Negotiation", OWNER_B, 75],
    ["Delta Settlement", "Delta Co", "Closed Won", OWNER_B, 100],
    ["Epsilon Lapsed", "Epsilon Ltd", "Closed Lost", OWNER_A, 0],
  ];
  for (const [dealName, account, stage, owner, probability] of deals) {
    createDeal({
      dealName,
      account,
      stage,
      dealValue: "$500,000",
      currency: "AUD",
      probability,
      owner,
      closeDate: "Aug 15, 2026",
    });
  }

  // Aggregators filter by date window, and tests pin "now" to a fixed day.
  // `createLead` stamps the real current date, so restamp to the reference.
  const stamp = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}/${now.getFullYear()}`;
  saveLeadColumns(
    listLeadColumns().map((col) => ({
      ...col,
      cards: col.cards.map((card) => ({ ...card, createdDate: stamp })),
    })),
  );
}
