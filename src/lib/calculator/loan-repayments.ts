export type LoanCalcType = "pi" | "io";
export type LoanFrequency = "Monthly" | "Fortnightly" | "Weekly";

export type LoanRepaymentResult = {
  periodicPayment: number;
  basePayment: number;
  totalRepayments: number;
  totalInterest: number;
  principalPercentage: number;
  interestPercentage: number;
  yearsSaved: number;
  yearsSavedStr: string;
  interestSaved: number;
  periodicRate: number;
  totalPeriods: number;
  payoffPeriods: number;
  formula: string;
};

export function periodsPerYear(frequency: LoanFrequency): number {
  if (frequency === "Fortnightly") return 26;
  if (frequency === "Weekly") return 52;
  return 12;
}

export function parseLoanCalcType(value: string): LoanCalcType {
  return /interest\s*only/i.test(value) ? "io" : "pi";
}

function pmt(principal: number, periodicRate: number, periods: number) {
  if (periods <= 0) return 0;
  if (periodicRate === 0) return principal / periods;
  const compound = Math.pow(1 + periodicRate, periods);
  return (principal * (periodicRate * compound)) / (compound - 1);
}

function formatYearsSaved(years: number): string {
  if (years <= 0.0005) return "0 yrs";
  return `${years.toFixed(1)} yrs`;
}

/** Walk the loan until it is paid off (or the original term is reached). */
export function amortizeUntilPaid(input: {
  principal: number;
  periodicRate: number;
  payment: number;
  maxPeriods: number;
}): { periods: number; totalInterest: number; totalPaid: number } {
  const { principal, periodicRate: r, payment, maxPeriods } = input;
  if (principal <= 0 || maxPeriods <= 0) {
    return { periods: 0, totalInterest: 0, totalPaid: 0 };
  }

  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;
  let periods = 0;
  const eps = 0.005;

  while (balance > eps && periods < maxPeriods) {
    const interest = r === 0 ? 0 : balance * r;
    const maxDue = balance + interest;
    if (payment <= interest + eps && payment < maxDue) {
      return {
        periods: maxPeriods,
        totalInterest: interest * maxPeriods,
        totalPaid: payment * maxPeriods,
      };
    }
    const due = Math.min(payment, maxDue);
    balance = Math.max(0, balance - (due - interest));
    totalInterest += interest;
    totalPaid += due;
    periods += 1;
  }

  return { periods, totalInterest, totalPaid };
}

export function calculateLoanRepayment(input: {
  principal: number;
  annualRatePercent: number;
  termYears: number;
  frequency: LoanFrequency;
  extraPayment?: number;
  calcType: LoanCalcType | string;
}): LoanRepaymentResult {
  const P = input.principal;
  const extra = Math.max(0, input.extraPayment || 0);
  const kind =
    typeof input.calcType === "string" &&
    input.calcType !== "pi" &&
    input.calcType !== "io"
      ? parseLoanCalcType(input.calcType)
      : (input.calcType as LoanCalcType);
  const perYear = periodsPerYear(input.frequency);
  const r = input.annualRatePercent / 100 / perYear;
  const n = Math.round(input.termYears * perYear);

  if (kind === "io") {
    const basePayment = r === 0 ? 0 : P * r;
    const periodicPayment = basePayment + extra;
    const totalInterest = P * (input.annualRatePercent / 100) * input.termYears;
    const extraPaid = extra * n;
    const totalRepayments = totalInterest + extraPaid;
    const denom = totalRepayments || 1;
    return {
      periodicPayment,
      basePayment,
      totalRepayments,
      totalInterest,
      principalPercentage: (extraPaid / denom) * 100,
      interestPercentage: (totalInterest / denom) * 100,
      yearsSaved: 0,
      yearsSavedStr: "0 yrs",
      interestSaved: 0,
      periodicRate: r,
      totalPeriods: n,
      payoffPeriods: n,
      formula:
        "Interest-only payment = P × r; r = annual ÷ periods; extra is added on top and does not amortize principal",
    };
  }

  const basePayment = pmt(P, r, n);
  const scheduled = amortizeUntilPaid({
    principal: P,
    periodicRate: r,
    payment: basePayment,
    maxPeriods: n,
  });
  const accelerated = amortizeUntilPaid({
    principal: P,
    periodicRate: r,
    payment: basePayment + extra,
    maxPeriods: n,
  });
  const yearsSaved = Math.max(
    0,
    (scheduled.periods - accelerated.periods) / perYear,
  );
  const interestSaved = Math.max(
    0,
    scheduled.totalInterest - accelerated.totalInterest,
  );
  const totalRepayments = accelerated.totalPaid;
  const totalInterest = accelerated.totalInterest;
  const denom = totalRepayments || 1;

  return {
    periodicPayment: basePayment + extra,
    basePayment,
    totalRepayments,
    totalInterest,
    principalPercentage: (P / denom) * 100,
    interestPercentage: (totalInterest / denom) * 100,
    yearsSaved,
    yearsSavedStr: formatYearsSaved(yearsSaved),
    interestSaved,
    periodicRate: r,
    totalPeriods: n,
    payoffPeriods: accelerated.periods,
    formula:
      "Payment = P × (r(1+r)^n) ÷ ((1+r)^n - 1); extra repayments shorten the amortization schedule",
  };
}
