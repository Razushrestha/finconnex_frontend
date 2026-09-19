import { redirect } from "next/navigation";

export default function CreditNotesRemovedPage() {
  redirect("/finance/invoices");
}
