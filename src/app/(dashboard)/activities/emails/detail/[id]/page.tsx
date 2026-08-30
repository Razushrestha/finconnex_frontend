import { EmailDetailClient } from "@/components/activities/emails/detail/EmailDetailClient";

export default async function EmailDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmailDetailClient id={id} />;
}
