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
import { createCall, saveCallColumns, listCallColumns } from "@/lib/calls/store";
import {
  emptyContactGroups,
  type ContactCardData,
} from "@/lib/contacts/types";
import { saveContactGroups } from "@/lib/contacts/store";
import { createDeal, saveDealPipelines } from "@/lib/deals/store";
import { DEAL_PIPELINE_STAGES } from "@/lib/deals/types";
import { createLead, listLeadColumns, saveLeadColumns } from "@/lib/leads/store";
import { createCrmUser, listCrmUsers } from "@/lib/settings/users-store";
import { LEAD_COLUMNS } from "@/lib/leads/types";
import { setRulesActor } from "@/lib/rules/actor";

const OWNER_A = "Test Owner A";
const OWNER_B = "Test Owner B";

/** Owners used by the fixtures, for tests that filter by owner. */
export const FIXTURE_OWNERS = { a: OWNER_A, b: OWNER_B };

function fixtureUuid(n: number) {
  const hex = n.toString(16).padStart(12, "0");
  return `aaaaaaaa-bbbb-4ccc-8ddd-${hex}`;
}

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
  setRulesActor({ name: OWNER_A, role: "Org Admin", email: "owner.a@example.test" });
  seedMembers();
  saveLeadColumns(LEAD_COLUMNS.map((c) => ({ ...c, cards: [], leadCount: 0 })));
  saveContactGroups(emptyContactGroups());
  saveCallColumns(
    listCallColumns().map((col) => ({ ...col, calls: [] })),
  );
  const pipelines = Object.fromEntries(
    Object.entries(DEAL_PIPELINE_STAGES).map(([pipe, stages]) => [
      pipe,
      stages.map((s) => ({ ...s, deals: [] })),
    ]),
  ) as unknown as typeof DEAL_PIPELINE_STAGES;
  saveDealPipelines(pipelines);
}

function stampDate(now: Date) {
  return `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}/${now.getFullYear()}`;
}

/**
 * Seeds a small spread of leads, contacts, deals and calls across stages,
 * owners, sources and loan types, so aggregate assertions (totals, funnels,
 * per-owner filtering) have something to measure.
 */
export function seedCrmFixtures(now = new Date()) {
  resetStores();
  const stamp = stampDate(now);

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
      // Last two land in Settled (maps to Closed Won) so settlement KPIs work.
      pipelineStage: i >= leads.length - 2 ? SETTLED_STAGE : undefined,
      source,
      owner,
      estimatedValue: "$450,000",
      custom: { loanPurpose: owner === OWNER_A ? "Purchase" : "Refinance" },
    });
  });

  // createLead stamps "now"; restamp created + stage timestamps into the
  // test's pinned window so month/year filters still see the rows.
  saveLeadColumns(
    listLeadColumns().map((col) => ({
      ...col,
      cards: col.cards.map((card) => ({
        ...card,
        createdDate: stamp,
        stageEnteredAt: stamp,
        pipelineStartedAt: stamp,
        ...(col.title === "Closed Won" || card.pipelineStage === "Closed Won"
          ? { isConverted: true, convertedAt: stamp }
          : {}),
      })),
    })),
  );

  const contacts: ContactCardData[] = leads.slice(0, 4).map(([first, last, , source, owner], i) => {
    const name = `${first} ${last}`;
    return {
      id: fixtureUuid(i + 1),
      name,
      firstName: first,
      lastName: last,
      initials: `${first[0]}${last[0]}`.toUpperCase(),
      company: `${last} Holdings`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.test`,
      phone: `+61 400 000 00${i}`,
      owner,
      source: source as never,
      createdDate: stamp,
      accentColorClass: "bg-emerald-500",
      avatarBgClass: "bg-emerald-50 text-emerald-600",
      tags: [source],
    };
  });
  const groups = emptyContactGroups();
  saveContactGroups(
    groups.map((g) =>
      g.title === "Active" ? { ...g, contacts } : g,
    ),
  );

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

  for (const [first, last, , , owner] of leads.slice(0, 3)) {
    createCall(
      {
        subject: `Follow up ${first}`,
        relatedTo: `Lead: ${first} ${last}`,
        callType: "Outbound",
        status: "Completed",
        date: stamp,
        duration: "5 min",
        assignedTo: owner,
      },
      { skipCrm: true },
    );
  }
}
