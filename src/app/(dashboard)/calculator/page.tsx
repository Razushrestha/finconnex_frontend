import type { Metadata } from "next";
import { CalculatorWorkspaceClient } from "@/components/calculator/CalculatorWorkspaceClient";

export const metadata: Metadata = {
  title: "Calculator — FinConnex",
  description: "Built-in calculators for commissions, loans, tax, and more.",
};

export default function CalculatorPage() {
  return <CalculatorWorkspaceClient />;
}
