import { CreateLinktreeForm } from "@/components/marketing/linktree/CreateLinktreeForm";

export default async function CreateLinktreePage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateLinktreeForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
