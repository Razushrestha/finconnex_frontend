import { WorkflowBuilder } from "@/components/automations/builder/WorkflowBuilder";

export default async function AutomationBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ folder?: string | string[] }>;
}) {
  const [{ id }, { folder }] = await Promise.all([params, searchParams]);
  // Only a new workflow is filed from the URL; an existing one knows its folder.
  const folderId = (Array.isArray(folder) ? folder[0] : folder)?.trim() || null;
  return <WorkflowBuilder id={id} folderId={folderId} />;
}
