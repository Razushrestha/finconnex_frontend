import { CreateTimeEntryForm } from "@/components/time-tracking/CreateTimeEntryForm";

export default async function CreateTimeEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  const sp = await searchParams;
  return (
    <CreateTimeEntryForm
      layoutId={sp.layoutid ?? "standard"}
      redirect={sp.redirect !== "false"}
    />
  );
}
