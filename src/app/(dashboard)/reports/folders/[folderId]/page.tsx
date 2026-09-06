import { FolderWorkspace } from "@/components/reports/library/FolderWorkspace";

export default async function ReportFolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>;
}) {
  const { folderId } = await params;
  return <FolderWorkspace folderId={folderId} />;
}
