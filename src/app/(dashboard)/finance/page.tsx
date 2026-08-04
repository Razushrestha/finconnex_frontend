import SalesOpsHubClient from "@/components/finance/hub/SalesOpshubClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales Operations: FinConnex",
  description:
    "Standalone estimates, quotations, invoices, payments, and item catalogue.",
};

export default function FinancePage() {
  return <SalesOpsHubClient />;
}
