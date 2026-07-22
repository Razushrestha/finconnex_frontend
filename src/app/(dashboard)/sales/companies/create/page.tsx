import { CreateCompanyForm } from "@/components/sales/companies/CreateCompanyForm";

interface CreateCompanyPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateCompanyPage({
  searchParams,
}: CreateCompanyPageProps) {
  const params = await searchParams;
  const layoutId = params.layoutid ?? "standard";
  const redirect = params.redirect === "true";

  return <CreateCompanyForm layoutId={layoutId} redirect={redirect} />;
}
