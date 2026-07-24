import { describe, it } from "vitest";
import { runSmokeSession1 } from "@/lib/leads/smoke-session1";
import { runSmokeSession2 } from "@/lib/leads/smoke-session2";
import { runSmokeSession3 } from "@/lib/leads/smoke-session3";
import { runSmokeSession4 } from "@/lib/leads/smoke-session4";
import { runSmokeSession5 } from "@/lib/leads/smoke-session5";
import { runSmokeSession6 } from "@/lib/leads/smoke-session6";
import { runSmokeSession7 } from "@/lib/leads/smoke-session7";
import { runSmokeSession8 } from "@/lib/leads/smoke-session8";
import { runSmokeSession9 } from "@/lib/leads/smoke-session9";
import { runSmokeSession10 } from "@/lib/leads/smoke-session10";
import { runSmokeSession11 } from "@/lib/leads/smoke-session11";
import { runSmokeSession12 } from "@/lib/leads/smoke-session12";
import { runSmokeSession13 } from "@/lib/leads/smoke-session13";
import { runSmokeSession14 } from "@/lib/leads/smoke-session14";
import { runSmokeSession15 } from "@/lib/leads/smoke-session15";
import { runSmokeSession16 } from "@/lib/leads/smoke-session16";
import { runSmokeSession17 } from "@/lib/leads/smoke-session17";
import { runSmokeSession18 } from "@/lib/leads/smoke-session18";

describe("Lead Card smokes (CI)", () => {
  it("session 1 — index + UI contracts", () => {
    runSmokeSession1();
  });

  it("session 2 — view-models", () => {
    runSmokeSession2();
  });

  it("session 3 — quick-action extras", async () => {
    await runSmokeSession3();
  });

  it("session 4 — settings", () => {
    runSmokeSession4();
  });

  it("session 5 — seeds + invariants", () => {
    runSmokeSession5();
  });

  it("session 6 — P0 persistence", async () => {
    await runSmokeSession6();
  });

  it("session 7 — P1 polish", async () => {
    await runSmokeSession7();
  });

  it("session 8 — P2 hardening", () => {
    runSmokeSession8();
  });

  it("session 9 — Phase 9 acceptance", () => {
    runSmokeSession9();
  });

  it("session 10 — Phase 10 adapters", async () => {
    await runSmokeSession10();
  });

  it("session 11 — Phase 11 spec polish", () => {
    runSmokeSession11();
  });

  it("session 12 — Phase 12 timeline", () => {
    runSmokeSession12();
  });

  it("session 13 — Phase 13 close-out", () => {
    runSmokeSession13();
  });

  it("session 14 — Phase 14 cutover", async () => {
    await runSmokeSession14();
  });

  it("session 15 — Phase 15 comms + files", async () => {
    await runSmokeSession15();
  });

  it("session 16 — Phase 16 pipeline SLA", () => {
    runSmokeSession16();
  });

  it("session 17 — Phase 17 mortgage Kanban", () => {
    runSmokeSession17();
  });

  it("session 18 — Phase 18 SLA Work Queue", () => {
    runSmokeSession18();
  });
});
