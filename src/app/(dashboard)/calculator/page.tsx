import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export const metadata: Metadata = {
  title: "Calculator — FinConnex",
  description: "Loan and product calculators.",
};

export default function CalculatorPage() {
  return (
    <ComingSoonPage
      title="Calculator"
      section="§17"
      description="Loan, serviceability, and product calculators will live here. Navigation is ready; the engine is coming next."
    />
  );
}
