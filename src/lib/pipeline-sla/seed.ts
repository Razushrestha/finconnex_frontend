import type { PipelineSlaConfig } from "@/lib/pipeline-sla/types";

/** Defaults matching the current lead pipeline. */
export const DEFAULT_MORTGAGE_PIPELINE_SLA: PipelineSlaConfig = {
  pipelineId: "mortgage",
  pipelineName: "Mortgage Pipeline",
  showBadgesOnCards: false,
  stageSlas: [
    { stage: "New Lead", duration: { amount: 30, unit: "minutes" } },
    { stage: "Appointment Booked", duration: { amount: 2, unit: "days" } },
    { stage: "Appointment Missed", duration: { amount: 1, unit: "days" } },
    { stage: "In Conversation", duration: { amount: 7, unit: "days" } },
    { stage: "Hold", duration: { amount: 7, unit: "days" } },
    { stage: "No Answer", duration: { amount: 2, unit: "days" } },
    { stage: "Waiting on Docs", duration: { amount: 14, unit: "days" } },
    { stage: "Document Received", duration: { amount: 2, unit: "days" } },
    { stage: "Findings", duration: { amount: 5, unit: "days" } },
    { stage: "Research & Servicing", duration: { amount: 14, unit: "days" } },
    { stage: "Servicing Completed", duration: { amount: 3, unit: "days" } },
    { stage: "Loan Proposal Presented", duration: { amount: 7, unit: "days" } },
    { stage: "Future Potential Clients", duration: { amount: 30, unit: "days" } },
    { stage: "Closed Won", duration: null },
    { stage: "Closed Lost", duration: null },
  ],
  milestones: [
    {
      id: "ms-appt",
      startStage: "New Lead",
      targetStage: "Appointment Booked",
      duration: { amount: 1, unit: "days" },
    },
    {
      id: "ms-convo",
      startStage: "New Lead",
      targetStage: "In Conversation",
      duration: { amount: 5, unit: "days" },
    },
    {
      id: "ms-docs",
      startStage: "New Lead",
      targetStage: "Waiting on Docs",
      duration: { amount: 12, unit: "days" },
    },
    {
      id: "ms-servicing",
      startStage: "New Lead",
      targetStage: "Research & Servicing",
      duration: { amount: 10, unit: "days" },
    },
    {
      id: "ms-won",
      startStage: "New Lead",
      targetStage: "Closed Won",
      duration: { amount: 60, unit: "days" },
    },
  ],
};
