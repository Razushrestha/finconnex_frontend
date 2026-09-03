import { redirect } from "next/navigation";

interface CreateLeadPageProps {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    stage?: string;
  }>;
}

export default async function CreateLeadPage({
  searchParams,
}: CreateLeadPageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams({ create: "1" });
  const stage = params.stage?.trim();
  if (stage) qs.set("stage", stage);
  redirect(`/sales/leads?${qs.toString()}`);
}
