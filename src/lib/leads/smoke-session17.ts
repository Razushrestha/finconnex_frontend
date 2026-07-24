/**
 * Session 17 / Phase 17 smoke: Mortgage pipeline Kanban.
 * Run: npx tsx src/lib/leads/smoke-session17.ts
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildLeadCardViewModelFromCard } from "@/lib/leads/card-view-model";
import {
  getPhase17Manifest,
  PHASE_17_DELIVERED,
  PHASE_17_STAGING_CHECKLIST,
} from "@/lib/leads/phase-17";
import {
  createLead,
  deleteLead,
  listLeadColumns,
} from "@/lib/leads/store";
import {
  installSmokePolyfill,
  runAsCli,
  smokeFail,
} from "@/lib/leads/smoke-polyfill";
import {
  applyPipelineStageMove,
  assertPipelineStageChange,
  isMortgagePipelineStage,
  normalizeMortgageBoard,
  pipelineStageToLeadStatus,
} from "@/lib/pipeline-sla/board";
import { MORTGAGE_PIPELINE_STAGES } from "@/lib/pipeline-sla/types";

const fail: (msg: string) => never = smokeFail;

function repoRoot() {
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, "package.json"))) return cwd;
  return path.resolve(__dirname, "../../..");
}

function assertDoc(rel: string, needles: string[]) {
  const full = path.join(repoRoot(), rel);
  if (!existsSync(full)) fail(`missing doc ${rel}`);
  const body = readFileSync(full, "utf8");
  for (const n of needles) {
    if (!body.includes(n)) fail(`doc ${rel} missing "${n}"`);
  }
}

export function runSmokeSession17() {
  installSmokePolyfill();
  console.log("Phase 17 / Session 17 smoke…");

  const m = getPhase17Manifest();
  if (m.id !== "lead-card-phase-17") fail("bad phase id");
  if (m.status !== "mortgage_kanban_shipped") fail("bad status");
  if (PHASE_17_DELIVERED.length < 7) fail("delivered short");
  if (PHASE_17_STAGING_CHECKLIST.length < 5) fail("checklist short");

  console.log("\n1) Board columns = mortgage stages (PDF order)…");
  const cols = listLeadColumns();
  if (cols.length !== MORTGAGE_PIPELINE_STAGES.length) {
    fail(`expected ${MORTGAGE_PIPELINE_STAGES.length} columns, got ${cols.length}`);
  }
  for (let i = 0; i < MORTGAGE_PIPELINE_STAGES.length; i++) {
    const stage = MORTGAGE_PIPELINE_STAGES[i]!;
    const col = cols[i]!;
    if (col.title !== stage) {
      fail(`column ${i} expected ${stage}, got ${col.title}`);
    }
    if (!isMortgagePipelineStage(col.title)) fail(`bad title ${col.title}`);
    if (col.leadStatus !== pipelineStageToLeadStatus(stage)) {
      fail(`leadStatus mismatch for ${stage}`);
    }
    for (const card of col.cards) {
      if (card.pipelineStage !== stage) {
        fail(`${card.name} pipelineStage ${card.pipelineStage} ≠ column ${stage}`);
      }
    }
  }
  const total = cols.reduce((n, c) => n + c.cards.length, 0);
  if (total < 13) fail(`expected ≥13 leads, got ${total}`);
  console.log("   OK —", cols.map((c) => `${c.title}:${c.cards.length}`).join(" · "));

  console.log("\n2) normalizeMortgageBoard restores missing stages…");
  const sparse = normalizeMortgageBoard([
    {
      id: "x",
      title: "In Conversation",
      leadStatus: "New",
      dotColorClass: "bg-red-500",
      leadCount: 1,
      totalAmount: "$1",
      cards: [
        {
          id: "probe",
          name: "Probe Lead",
          initials: "PL",
          company: "",
          email: "probe@example.com",
          phone: "",
          owner: "John Smith",
          createdDate: "23/07/2026",
          source: "Website",
          accentColorClass: "bg-red-500",
          avatarBgClass: "bg-amber-50 text-amber-600",
        },
      ],
    },
  ]);
  if (sparse.length !== 8) fail("normalize must yield 8 stages");
  if (sparse[0]!.title !== "New Lead") fail("normalize order broken");
  const conv = sparse.find((c) => c.title === "In Conversation")!;
  if (conv.leadStatus !== "Contacted") fail("normalize must fix leadStatus");
  if (conv.cards[0]!.pipelineStage !== "In Conversation") {
    fail("normalize must sync card.pipelineStage");
  }
  if (sparse.find((c) => c.title === "Processing")!.cards.length !== 0) {
    fail("empty stages must still exist");
  }

  console.log("\n3) Stage gates + New Lead restarts pipeline…");
  const settledGate = assertPipelineStageChange("Settled", "Processing");
  if (settledGate.ok) fail("Settled must be final");
  const okMove = assertPipelineStageChange(
    "In Conversation",
    "Waiting on Documents",
  );
  if (!okMove.ok) fail(okMove.message);

  const moved = applyPipelineStageMove(
    {
      id: "m1",
      name: "Move Test",
      initials: "MT",
      company: "",
      email: "move@example.com",
      phone: "",
      owner: "John Smith",
      createdDate: "01/07/2026",
      source: "Website",
      pipelineStage: "In Conversation",
      stageEnteredAt: "10/07/2026 09:00 AM",
      pipelineStartedAt: "01/07/2026 09:00 AM",
      accentColorClass: "bg-amber-400",
      avatarBgClass: "bg-amber-50 text-amber-600",
    },
    "New Lead",
    new Date("2026-07-23T12:00:00"),
  );
  if (moved.pipelineStage !== "New Lead") fail("move stage wrong");
  if (moved.pipelineStartedAt !== moved.stageEnteredAt) {
    fail("New Lead must restart pipelineStartedAt");
  }
  if (!moved.stageEnteredAt?.includes("23/07/2026")) {
    fail("stageEnteredAt should refresh on move");
  }
  const forward = applyPipelineStageMove(
    moved,
    "Appointment Booked",
    new Date("2026-07-23T13:00:00"),
  );
  if (forward.pipelineStartedAt !== moved.pipelineStartedAt) {
    fail("forward move must keep pipelineStartedAt");
  }

  console.log("\n4) Seeds sit on real stages + SLA still works…");
  const now = new Date("2026-07-23T12:00:00");
  const jamieCol = cols.find((c) =>
    c.cards.some((card) => card.name === "Jamie Cole"),
  );
  if (!jamieCol || jamieCol.title !== "New Lead") {
    fail("Jamie Cole should seed New Lead (PDF Day-1 stage)");
  }
  const jamie = jamieCol.cards.find((c) => c.name === "Jamie Cole")!;
  const jVm = buildLeadCardViewModelFromCard(jamie, jamieCol.leadStatus, {
    now,
  });
  if (jVm.sla?.stage !== "New Lead") fail("Jamie sla.stage wrong");
  // Stage: 15 mins into 30-min SLA → On Track. Milestone (Appt in 1 day) due tomorrow → At Risk badge.
  if (jVm.sla?.stageClock?.band !== "on_track") {
    fail(`Jamie stage clock expected on_track, got ${jVm.sla?.stageClock?.band}`);
  }
  if (!jVm.sla?.stageClock?.detail.includes("15")) {
    fail(`Jamie stage detail expected ~15 mins left, got ${jVm.sla?.stageClock?.detail}`);
  }
  if (jVm.sla?.badgeLabel !== "At Risk") {
    fail(
      `Jamie badge expected At Risk (1-day appt milestone), got ${jVm.sla?.badgeLabel}`,
    );
  }

  const williamCol = cols.find((c) =>
    c.cards.some((card) => card.name === "William Anderson"),
  );
  if (!williamCol || williamCol.title !== "In Conversation") {
    fail("William should be in In Conversation column");
  }
  const william = williamCol.cards.find((c) => c.name === "William Anderson")!;
  if (william.pipelineStage !== "In Conversation") {
    fail("William pipelineStage should match column");
  }
  const wVm = buildLeadCardViewModelFromCard(william, williamCol.leadStatus, {
    now,
  });
  if (wVm.sla?.badgeLabel !== "On Track") {
    fail(`William SLA expected On Track, got ${wVm.sla?.badgeLabel}`);
  }
  if (wVm.sla?.stage !== "In Conversation") fail("William sla.stage wrong");

  const chloeCol = cols.find((c) =>
    c.cards.some((card) => card.name === "Chloe Ramirez"),
  );
  if (!chloeCol || chloeCol.title !== "Waiting on Documents") {
    fail("Chloe should be in Waiting on Documents");
  }
  const lostCol = cols.find((c) => c.title === "Lost");
  if (!lostCol || lostCol.cards.length < 1) fail("Lost column empty");
  const lostVm = buildLeadCardViewModelFromCard(
    lostCol.cards[0]!,
    lostCol.leadStatus,
    { now },
  );
  if (lostVm.sla?.badgeLabel !== "No SLA") {
    fail("Lost lead should have No SLA");
  }

  console.log("\n5) createLead respects pipelineStage…");
  const created = createLead({
    firstName: "Smoke",
    lastName: "Seventeen",
    email: "smoke.session17@example.com",
    status: "New",
    pipelineStage: "Appointment Booked",
    owner: "John Smith",
  });
  if (created.pipelineStage !== "Appointment Booked") {
    fail(`createLead stage expected Appointment Booked, got ${created.pipelineStage}`);
  }
  const apptCol = listLeadColumns().find((c) => c.title === "Appointment Booked");
  if (!apptCol?.cards.some((c) => c.id === created.id)) {
    fail("created lead missing from Appointment Booked column");
  }
  deleteLead(created.id);

  console.log("\n6) UI + docs…");
  const boardBody = readFileSync(
    path.join(repoRoot(), "src/components/sales/leads/LeadKanbanBoard.tsx"),
    "utf8",
  );
  if (!boardBody.includes("assertPipelineStageChange")) {
    fail("Kanban missing assertPipelineStageChange");
  }
  if (!boardBody.includes("applyPipelineStageMove")) {
    fail("Kanban drag must use applyPipelineStageMove");
  }
  if (!boardBody.includes("/sales/leads/create?stage=")) {
    fail("Kanban Plus must deep-link create with stage");
  }
  const formBody = readFileSync(
    path.join(repoRoot(), "src/components/sales/leads/CreateLeadForm.tsx"),
    "utf8",
  );
  if (!formBody.includes("LEAD_PIPELINE_STAGES")) {
    fail("Create form must use LEAD_PIPELINE_STAGES");
  }
  if (!formBody.includes("pipelineStage")) {
    fail("Create form must submit pipelineStage");
  }
  const storeBody = readFileSync(
    path.join(repoRoot(), "src/lib/leads/store.ts"),
    "utf8",
  );
  if (!storeBody.includes("sales:leads:board:v6")) {
    fail("store key must be board:v6");
  }
  if (!storeBody.includes("normalizeMortgageBoard")) {
    fail("store must normalize via normalizeMortgageBoard");
  }
  assertDoc("docs/lead-card/phase-17-mortgage-kanban.md", [
    "mortgage",
    "Settled",
    "Option B",
    "board:v6",
    "pipelineStartedAt",
  ]);
  assertDoc("docs/lead-card/README.md", ["phase-17-mortgage-kanban"]);

  console.log("\n✅ Session 17 smoke passed");
}

runAsCli(runSmokeSession17);
