import { CreateResourceForm } from "@/components/resources/CreateResourceForm";

export default async function CreateResourcePage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateResourceForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
