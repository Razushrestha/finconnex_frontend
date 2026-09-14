import { redirect } from "next/navigation";

interface CreateDealPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateDealPage({
  searchParams,
}: CreateDealPageProps) {
  void (await searchParams);
  redirect("/sales/deals?create=1");
}
