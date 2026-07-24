import type { Metadata } from "next";
import { SalesOpsHubClient } from "@/components/finance/SalesOpsHubClient";

export const metadata: Metadata = {
  title: "Sales Operations: FinConnex",
  description:
    "Standalone estimates, quotations, invoices, payments, and item catalogue.",
};

export default function FinancePage() {
  return <SalesOpsHubClient />;
}
