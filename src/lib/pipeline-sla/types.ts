/**
 * Session 16 — Pipeline Stage + Milestone SLA contracts (mortgage PDF).
 */

export type SlaDurationUnit = "minutes" | "hours" | "days";

export type SlaDuration = {
  amount: number;
  unit: SlaDurationUnit;
};

/** Lead pipeline stages (Kanban, list, filters, and lead detail). */
export const MORTGAGE_PIPELINE_STAGES = [
  "New Lead",
  "Appointment Booked",
  "Appointment Missed",
  "In Conversation",
  "Hold",
  "No Answer",
  "Waiting on Docs",
  "Document Received",
  "Findings",
  "Research & Servicing",
  "Servicing Completed",
  "Loan Proposal Presented",
  "Future Potential Clients",
  "Closed Won",
  "Closed Lost",
] as const;

export type MortgagePipelineStage = (typeof MORTGAGE_PIPELINE_STAGES)[number];

export type StageSlaRow = {
  stage: MortgagePipelineStage;
  /** null = no stage SLA (e.g. Closed Won / Closed Lost). */
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
  /**
   * When false (default), On Track / At Risk / Overdue pills are hidden on
   * Lead cards, lists, and other surfaces. Stage/milestone clocks still compute
   * for Work Queue. Toggle in Settings → Pipelines.
   */
  showBadgesOnCards: boolean;
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
