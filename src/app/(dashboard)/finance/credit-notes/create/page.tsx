import { redirect } from "next/navigation";

export default function CreditNotesCreateRemovedPage() {
  redirect("/finance/invoices");
}
