import { describe, expect, it } from "vitest";
import {
  mapCalculatorType,
  normalizeCalculation,
  normalizeCalculations,
  toCreateCalculationBody,
} from "@/lib/calculator/api";
import {
  evaluateCustomExpression,
  formatCalculationShare,
  runCalculator,
  suggestedFxRate,
} from "@/lib/calculator/types";

describe("calculator spec helpers", () => {
  it("maps API calculator kinds", () => {
    expect(mapCalculatorType("COMMISSION")).toBe("Commission");
    expect(mapCalculatorType("loan")).toBe("Loan");
    expect(mapCalculatorType("CURRENCY")).toBe("Currency");
  });

  it("builds a create body that matches backend enums", () => {
    const run = runCalculator("Loan", {
      principal: "500000",
      annualRate: "6.2",
      termYears: "30",
    });
    expect(run.ok).toBe(true);
    if (!run.ok) return;
    expect(toCreateCalculationBody({
      title: "Sample loan",
      type: "Loan",
      currency: "AUD",
      inputs: { principal: "500000", annualRate: "6.2", termYears: "30" },
      result: run.result,
      formula: run.result.formula,
      sharedWith: "Sales team",
    })).toMatchObject({
      title: "Sample loan",
      type: "LOAN",
      currency: "AUD",
      formula: run.result.formula,
      sharedWith: "Sales team",
    });
  });

  it("normalizes list envelopes from the CRM serializer", () => {
    const row = {
      id: "11111111-1111-4111-8111-111111111111",
      calcId: "CALC-5001",
      title: "Harbour commission",
      type: "COMMISSION",
      currency: "AUD",
      inputs: { dealAmount: "650000", rate: "0.65" },
      result: {
        primaryLabel: "Commission",
        primaryValue: 4225,
        primaryFormat: "money",
        formula: "Commission = Deal amount × (Rate ÷ 100)",
        lines: [{ label: "Commission", value: 4225, format: "money" }],
      },
      formula: "Commission = Deal amount × (Rate ÷ 100)",
      createdByName: "John Smith",
      createdAt: "2026-07-18T00:15:00.000Z",
    };
    const fromArray = normalizeCalculations([row]);
    const fromTuple = normalizeCalculations([[row], 1]);
    const fromItems = normalizeCalculations({ items: [row], metadata: {} });
    expect(fromArray[0]?.calcId).toBe("CALC-5001");
    expect(fromTuple[0]?.type).toBe("Commission");
    expect(fromItems[0]?.savedBy).toBe("John Smith");
    const single = normalizeCalculation(row, 0);
    expect(single.result.primaryValue).toBe(4225);
    expect(single.currency).toBe("AUD");
  });

  it("evaluates custom formulas with a, b, c", () => {
    const ok = evaluateCustomExpression("(a + b) * c", { a: 10, b: 5, c: 2 });
    expect(ok).toEqual({ ok: true, value: 30 });
    const pct = runCalculator("Custom", {
      a: "50",
      b: "200",
      c: "1",
      expression: "a * b / 100",
    });
    expect(pct.ok).toBe(true);
    if (pct.ok) expect(pct.result.primaryValue).toBe(100);
  });

  it("rejects unsafe custom formulas", () => {
    expect(evaluateCustomExpression("alert(1)", { a: 1, b: 1, c: 1 }).ok).toBe(
      false,
    );
  });

  it("suggests a currency pair rate", () => {
    expect(Number(suggestedFxRate("AUD", "AUD"))).toBe(1);
    expect(Number(suggestedFxRate("AUD", "USD"))).toBeGreaterThan(0);
  });

  it("builds a shareable result summary", () => {
    const run = runCalculator("Commission", {
      dealAmount: "100000",
      rate: "1",
    });
    expect(run.ok).toBe(true);
    if (!run.ok) return;
    const text = formatCalculationShare({
      calcId: "CALC-1",
      title: "Test",
      type: "Commission",
      currency: "AUD",
      inputs: { dealAmount: "100000", rate: "1" },
      result: run.result,
      formula: run.result.formula,
    });
    expect(text).toContain("Commission");
    expect(text).toContain("AUD");
  });
});
