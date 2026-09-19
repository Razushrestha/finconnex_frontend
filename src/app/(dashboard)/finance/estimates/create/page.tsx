import { redirect } from "next/navigation";

export default async function CreateEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{
    layoutid?: string;
    redirect?: string;
    relatedKind?: string;
    relatedName?: string;
    relatedId?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams({ create: "1" });
  if (sp.relatedKind) qs.set("relatedKind", sp.relatedKind);
  if (sp.relatedName) qs.set("relatedName", sp.relatedName);
  if (sp.relatedId) qs.set("relatedId", sp.relatedId);
  if (sp.to) qs.set("to", sp.to);
  redirect(`/finance/estimates?${qs.toString()}`);
}
