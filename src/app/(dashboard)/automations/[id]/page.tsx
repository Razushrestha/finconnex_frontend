import { WorkflowBuilder } from "@/components/automations/builder/WorkflowBuilder";

export default async function AutomationBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkflowBuilder id={id} />;
}
