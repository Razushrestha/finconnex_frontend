import { CreatePortalForm } from "@/components/portals/CreatePortalForm";

export default async function CreatePortalPage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreatePortalForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
