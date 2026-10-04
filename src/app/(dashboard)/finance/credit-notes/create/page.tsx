import { redirect } from "next/navigation";

export default async function CreateCreditNotePage({
  searchParams,
}: {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}) {
  await searchParams;
  redirect("/finance/credit-notes?create=1");
}
