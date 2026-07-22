import { FormDetailClient } from "@/components/marketing/forms/FormDetailClient";

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FormDetailClient id={id} />;
}
