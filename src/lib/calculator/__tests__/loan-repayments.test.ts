import { describe, expect, it } from "vitest";
import { calculateLoanRepayment } from "@/lib/calculator/loan-repayments";

const QA = {
  principal: 500_000,
  annualRatePercent: 10,
  termYears: 20,
  frequency: "Monthly" as const,
  extraPayment: 250,
};

describe("loan repayment calculator types", () => {
  it("uses the P&I amortization formula for Principal & Interest", () => {
    const pi = calculateLoanRepayment({
      ...QA,
      extraPayment: 0,
      calcType: "Loan (Principal & Interest)",
    });
    expect(pi.periodicPayment).toBeCloseTo(4825.11, 1);
  });

  it("uses interest-only accrual when Calculator type is Interest Only", () => {
    const io = calculateLoanRepayment({
      ...QA,
      calcType: "Interest Only",
    });
    const pi = calculateLoanRepayment({
      ...QA,
      calcType: "Loan (Principal & Interest)",
    });

    expect(io.basePayment).toBeCloseTo(4166.67, 2);
    expect(io.periodicPayment).toBeCloseTo(4416.67, 2);
    expect(io.totalInterest).toBeCloseTo(1_000_000, 0);
    expect(io.totalRepayments).toBeCloseTo(1_060_000, 0);
    expect(io.interestSaved).toBe(0);
    expect(io.yearsSaved).toBe(0);

    expect(io.periodicPayment).not.toBeCloseTo(pi.periodicPayment, 0);
    expect(io.totalInterest).not.toBeCloseTo(pi.totalInterest, 0);
  });
});

describe("term accelerated years saved", () => {
  const commercial = {
    principal: 1_200_000,
    annualRatePercent: 6.85,
    termYears: 20,
    extraPayment: 500,
    calcType: "Loan (Principal & Interest)" as const,
  };
  const refinance = {
    principal: 750_000,
    annualRatePercent: 5.99,
    termYears: 30,
    extraPayment: 300,
    calcType: "Loan (Principal & Interest)" as const,
  };

  it("is derived from the extra-payment schedule, not term × 0.2", () => {
    const monthly = calculateLoanRepayment({
      ...commercial,
      frequency: "Monthly",
    });
    expect(monthly.yearsSaved).toBeGreaterThan(0);
    expect(monthly.yearsSaved).not.toBeCloseTo(20 * 0.2, 5);
    expect(monthly.yearsSaved).not.toBeCloseTo(30 * 0.2, 5);
    expect(monthly.interestSaved).toBeGreaterThan(0);
    expect(monthly.payoffPeriods).toBeLessThan(monthly.totalPeriods);
  });

  it("changes when repayment frequency changes on the same loan", () => {
    const monthly = calculateLoanRepayment({
      ...commercial,
      frequency: "Monthly",
    });
    const weekly = calculateLoanRepayment({
      ...commercial,
      frequency: "Weekly",
    });
    expect(weekly.yearsSaved).not.toBeCloseTo(monthly.yearsSaved, 2);
  });

  it("differs across materially different loans", () => {
    const a = calculateLoanRepayment({ ...commercial, frequency: "Monthly" });
    const b = calculateLoanRepayment({
      ...refinance,
      frequency: "Fortnightly",
    });
    const c = calculateLoanRepayment({ ...refinance, frequency: "Weekly" });
    const values = [a.yearsSaved, b.yearsSaved, c.yearsSaved];
    expect(new Set(values.map((v) => v.toFixed(3))).size).toBe(3);
    expect(values.every((v) => v === 4 || v === 6)).toBe(false);
  });

  it("is identical for identical inputs", () => {
    const first = calculateLoanRepayment({
      ...commercial,
      frequency: "Weekly",
    });
    const second = calculateLoanRepayment({
      ...commercial,
      frequency: "Weekly",
    });
    expect(second.yearsSaved).toBe(first.yearsSaved);
    expect(second.interestSaved).toBe(first.interestSaved);
  });
});
