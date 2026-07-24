import type { PipelineSlaConfig } from "@/lib/pipeline-sla/types";

/** Defaults matching the mortgage SLA infographic. */
export const DEFAULT_MORTGAGE_PIPELINE_SLA: PipelineSlaConfig = {
  pipelineId: "mortgage",
  pipelineName: "Mortgage Pipeline",
  stageSlas: [
    { stage: "New Lead", duration: { amount: 30, unit: "minutes" } },
    { stage: "Appointment Booked", duration: { amount: 2, unit: "days" } },
    { stage: "In Conversation", duration: { amount: 7, unit: "days" } },
    { stage: "Waiting on Documents", duration: { amount: 14, unit: "days" } },
    { stage: "Documents Received", duration: { amount: 2, unit: "days" } },
    { stage: "Processing", duration: { amount: 21, unit: "days" } },
    { stage: "Settled", duration: null },
    { stage: "Lost", duration: null },
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
      targetStage: "Waiting on Documents",
      duration: { amount: 12, unit: "days" },
    },
    {
      id: "ms-processing",
      startStage: "New Lead",
      targetStage: "Processing",
      duration: { amount: 10, unit: "days" },
    },
    {
      id: "ms-settled",
      startStage: "New Lead",
      targetStage: "Settled",
      duration: { amount: 60, unit: "days" },
    },
  ],
};
