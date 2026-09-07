import { redirect } from "next/navigation";

export default async function CompanyIdRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/sales/companies/detail/${encodeURIComponent(id)}`);
}
