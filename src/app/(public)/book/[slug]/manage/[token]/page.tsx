import { ManageBookingClient } from "@/components/booking/ManageBookingClient";

interface ManagePageProps {
  params: Promise<{ slug: string; token: string }>;
}

export default async function ManageBookingPage({ params }: ManagePageProps) {
  const { slug, token } = await params;
  return <ManageBookingClient slug={slug} token={token} />;
}
