/**
 * Session 16 — Pipeline Stage + Milestone SLA contracts (mortgage PDF).
 */

export type SlaDurationUnit = "minutes" | "hours" | "days";

export type SlaDuration = {
  amount: number;
  unit: SlaDurationUnit;
};

/** Mortgage pipeline stages from the SLA infographic. */
export const MORTGAGE_PIPELINE_STAGES = [
  "New Lead",
  "Appointment Booked",
  "In Conversation",
  "Waiting on Documents",
  "Documents Received",
  "Processing",
  "Settled",
  "Lost",
] as const;

export type MortgagePipelineStage = (typeof MORTGAGE_PIPELINE_STAGES)[number];

export type StageSlaRow = {
  stage: MortgagePipelineStage;
  /** null = no stage SLA (e.g. Settled / Lost). */
  duration: SlaDuration | null;
};

export type MilestoneSlaRow = {
  id: string;
  startStage: MortgagePipelineStage;
  targetStage: MortgagePipelineStage;
  duration: SlaDuration;
};

export type PipelineSlaConfig = {
  pipelineId: string;
  pipelineName: string;
  stageSlas: StageSlaRow[];
  milestones: MilestoneSlaRow[];
};

/** Visual band on the Lead Card. */
export type SlaBand = "on_track" | "due_today" | "at_risk" | "overdue";

export type SlaClockView = {
  kind: "stage" | "milestone";
  label: string;
  band: SlaBand;
  /** Human remaining / overdue text, e.g. "3 days left", "2 days overdue". */
  detail: string;
  dueAt: Date;
  /** Configured allowance, e.g. "10 Days" (PDF: Milestone: Processing (10 Days)). */
  durationLabel?: string;
  targetStage?: MortgagePipelineStage;
};

export type LeadSlaViewModel = {
  stage: MortgagePipelineStage;
  /** Worst band across stage + milestones (drives badge colour). */
  badgeBand: SlaBand;
  /** Short badge text: On Track | Due Today | Overdue | Milestone Overdue */
  badgeLabel: string;
  stageClock: SlaClockView | null;
  /** Primary milestone clock (nearest incomplete, or worst overdue). */
  milestoneClock: SlaClockView | null;
  milestones: SlaClockView[];
};
