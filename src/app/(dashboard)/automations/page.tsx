import { WorkflowListClient } from "@/components/automations/WorkflowListClient";

export default async function AutomationsPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string | string[] }>;
}) {
  const { folder } = await searchParams;
  const folderId = (Array.isArray(folder) ? folder[0] : folder)?.trim() || null;
  return <WorkflowListClient folderId={folderId} />;
}
