"use client";

import { useParams } from "next/navigation";
import { EditContactForm } from "@/components/sales/contacts/EditContactForm";

export default function EditContactPage() {
  const { id } = useParams<{ id: string }>();
  return <EditContactForm contactId={id} />;
}
