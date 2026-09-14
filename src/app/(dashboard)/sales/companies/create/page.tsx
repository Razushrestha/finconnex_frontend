import { redirect } from "next/navigation";

interface CreateCompanyPageProps {
  searchParams: Promise<{ layoutid?: string; redirect?: string }>;
}

export default async function CreateCompanyPage({
  searchParams,
}: CreateCompanyPageProps) {
  void (await searchParams);
  redirect("/sales/companies?create=1");
}
