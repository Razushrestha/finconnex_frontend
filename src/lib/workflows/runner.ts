/**
 * Phase E5 — Workflow / journey step runner (demo).
 */

import {
  readPersistedJson,
  writePersistedJson,
} from "@/lib/persistence/registry";
import type { JourneyStep, LifecycleJourney } from "@/lib/journeys/types";
import { sendEmailDemoLive, sendSmsDemoLive } from "@/lib/comms/send-gateway";
import { createTask } from "@/lib/tasks/store";
import { loadSettingsValues } from "@/lib/settings/settings-store";
import { ACTIVITY_OWNERS } from "@/lib/activities/shared";

const RUNS_KEY = "workflows:runs:v1";
const LOGS_KEY = "workflows:logs:v1";

export type WorkflowLogLevel = "info" | "success" | "warn" | "error";

export type WorkflowLogEntry = {
  id: string;
  runId: string;
  journeyId: string;
  journeyName: string;
  stepId?: string;
  stepType?: string;
  at: string;
  level: WorkflowLogLevel;
  message: string;
};

export type WorkflowRun = {
  id: string;
  journeyId: string;
  journeyName: string;
  status: "Running" | "Completed" | "Failed" | "Paused";
  startedAt: string;
  finishedAt?: string;
  stepsOk: number;
  stepsFailed: number;
};

function listRuns(): WorkflowRun[] {
  return readPersistedJson(RUNS_KEY, []);
}

function listLogs(): WorkflowLogEntry[] {
  return readPersistedJson(LOGS_KEY, []);
}

function saveRuns(runs: WorkflowRun[]) {
  writePersistedJson(RUNS_KEY, runs.slice(0, 40));
}

function saveLogs(logs: WorkflowLogEntry[]) {
  writePersistedJson(LOGS_KEY, logs.slice(0, 200));
}

export function listWorkflowRuns() {
  return listRuns();
}

export function listWorkflowLogs(runId?: string) {
  const logs = listLogs();
  return runId ? logs.filter((l) => l.runId === runId) : logs;
}

export function isWorkflowQueuePaused() {
  try {
    const values = loadSettingsValues("system/queue-monitor");
    return values.workflowQueuePaused === true;
  } catch {
    return false;
  }
}

function pushLog(
  entry: Omit<WorkflowLogEntry, "id" | "at"> & { at?: string },
) {
  const logs = listLogs();
  logs.unshift({
    id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: entry.at ?? new Date().toLocaleString("en-AU"),
    ...entry,
  });
  saveLogs(logs);
}

async function executeStep(
  run: WorkflowRun,
  step: JourneyStep,
): Promise<boolean> {
  const base = {
    runId: run.id,
    journeyId: run.journeyId,
    journeyName: run.journeyName,
    stepId: step.id,
    stepType: step.type,
  };

  try {
    switch (step.type) {
      case "Wait":
        pushLog({ ...base, level: "info", message: `Wait: ${step.detail || step.label}` });
        await new Promise((r) => setTimeout(r, 80));
        break;
      case "Send Email": {
        const result = await sendEmailDemoLive({
          email: "demo@finconnex.example",
          subject: `[Journey] ${step.label}`,
          body: step.detail || step.label,
        });
        if (!result.ok) {
          pushLog({ ...base, level: "error", message: result.message });
          return false;
        }
        pushLog({
          ...base,
          level: "success",
          message: `Email sent (${result.mode})`,
        });
        break;
      }
      case "Send SMS": {
        const result = await sendSmsDemoLive({
          phone: "+61000000000",
          body: step.detail || step.label,
        });
        if (!result.ok) {
          pushLog({ ...base, level: "error", message: result.message });
          return false;
        }
        pushLog({
          ...base,
          level: "success",
          message: `SMS sent (${result.mode})`,
        });
        break;
      }
      case "Send WhatsApp":
        pushLog({
          ...base,
          level: "info",
          message: `WhatsApp mock: ${step.detail || step.label}`,
        });
        break;
      case "Create Task": {
        const due = new Date();
        due.setDate(due.getDate() + 1);
        createTask({
          title: step.label || "Journey task",
          taskType: "Follow-up",
          priority: "Medium",
          status: "Not Started",
          dueDate: due.toLocaleDateString("en-AU"),
          assignedTo: ACTIVITY_OWNERS[0],
          description: step.detail,
          createdBy: "Workflow runner",
        });
        pushLog({ ...base, level: "success", message: "Task created" });
        break;
      }
      case "Update Field":
        pushLog({
          ...base,
          level: "info",
          message: `Update field mock: ${step.detail || step.label}`,
        });
        break;
      case "Branch Condition":
        pushLog({
          ...base,
          level: "info",
          message: `Branch true: ${step.detail || step.label}`,
        });
        break;
      default:
        pushLog({ ...base, level: "warn", message: `Unknown step ${step.type}` });
    }
    return true;
  } catch (e) {
    pushLog({
      ...base,
      level: "error",
      message: e instanceof Error ? e.message : "Step failed",
    });
    return false;
  }
}

/** Run all journey steps sequentially; writes run + logs. */
export async function runJourneyWorkflow(
  journey: LifecycleJourney,
): Promise<{ run: WorkflowRun; logs: WorkflowLogEntry[] }> {
  if (isWorkflowQueuePaused()) {
    const paused: WorkflowRun = {
      id: `wr-${Date.now()}`,
      journeyId: journey.id,
      journeyName: journey.name,
      status: "Paused",
      startedAt: new Date().toLocaleString("en-AU"),
      finishedAt: new Date().toLocaleString("en-AU"),
      stepsOk: 0,
      stepsFailed: 0,
    };
    const runs = listRuns();
    runs.unshift(paused);
    saveRuns(runs);
    pushLog({
      runId: paused.id,
      journeyId: journey.id,
      journeyName: journey.name,
      level: "warn",
      message: "Queue paused (Settings → System → Queue monitor)",
    });
    return { run: paused, logs: listWorkflowLogs(paused.id) };
  }

  const run: WorkflowRun = {
    id: `wr-${Date.now()}`,
    journeyId: journey.id,
    journeyName: journey.name,
    status: "Running",
    startedAt: new Date().toLocaleString("en-AU"),
    stepsOk: 0,
    stepsFailed: 0,
  };
  const runs = listRuns();
  runs.unshift(run);
  saveRuns(runs);

  pushLog({
    runId: run.id,
    journeyId: journey.id,
    journeyName: journey.name,
    level: "info",
    message: `Started test run · ${journey.steps.length} step(s)`,
  });

  for (const step of journey.steps) {
    const ok = await executeStep(run, step);
    if (ok) run.stepsOk += 1;
    else run.stepsFailed += 1;
  }

  run.status = run.stepsFailed > 0 ? "Failed" : "Completed";
  run.finishedAt = new Date().toLocaleString("en-AU");
  const nextRuns = listRuns().map((r) => (r.id === run.id ? run : r));
  saveRuns(nextRuns);

  pushLog({
    runId: run.id,
    journeyId: journey.id,
    journeyName: journey.name,
    level: run.status === "Completed" ? "success" : "warn",
    message: `Finished · ${run.stepsOk} ok · ${run.stepsFailed} failed`,
  });

  return { run, logs: listWorkflowLogs(run.id) };
}
