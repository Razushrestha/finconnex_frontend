import { CreateDealForm } from "@/components/sales/deals/CreateDealForm";

interface CreateDealPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateDealPage({
  searchParams,
}: CreateDealPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateDealForm layoutId={layoutId} redirect={redirect} />;
}
