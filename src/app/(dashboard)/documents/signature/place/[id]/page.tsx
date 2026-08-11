import { PlaceFieldsClient } from "@/components/documents/signature/PlaceFieldsClient";

export default async function PlaceSignatureFieldsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlaceFieldsClient id={id} />;
}
