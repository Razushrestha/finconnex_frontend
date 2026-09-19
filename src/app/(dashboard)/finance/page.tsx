import { redirect } from "next/navigation";

/** Finance hub removed — land on estimates. */
export default function FinancePage() {
  redirect("/finance/estimates");
}
