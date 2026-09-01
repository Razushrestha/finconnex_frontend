export type LivingExpenseItem = {
  key: string;
  label: string;
  hem: boolean;
};

export type LivingExpenseGroup = {
  id: string;
  label: string;
  color: string;
  items: LivingExpenseItem[];
};

/** Client portal expense groups. CRM splits the same items into HEM / non-HEM. */
export const LIVING_EXPENSE_GROUPS: LivingExpenseGroup[] = [
  {
    id: "everyday",
    label: "Everyday expenses",
    color: "#3b82f6",
    items: [
      { key: "exp.groceries", label: "Groceries", hem: true },
      { key: "exp.clothing", label: "Clothing and personal care", hem: true },
      {
        key: "exp.phone",
        label: "Telephone, internet, pay TV & media streaming subscriptions",
        hem: true,
      },
      { key: "exp.transport", label: "Transport", hem: true },
      {
        key: "exp.recreation",
        label: "Recreation and entertainment",
        hem: true,
      },
      { key: "exp.pets", label: "Pet care", hem: true },
    ],
  },
  {
    id: "residence",
    label: "Primary residence",
    color: "#6366f1",
    items: [
      { key: "exp.runningCosts", label: "Running costs", hem: true },
      { key: "exp.landTax", label: "Land tax", hem: false },
      { key: "exp.rentBoard", label: "Rent and board", hem: false },
    ],
  },
  {
    id: "insurance",
    label: "Insurance and medical",
    color: "#16a34a",
    items: [
      { key: "exp.healthcare", label: "Healthcare (services and items)", hem: true },
      { key: "exp.basicInsurance", label: "General basic insurances", hem: true },
      { key: "exp.healthInsurance", label: "Health insurance", hem: false },
      {
        key: "exp.lifeInsurance",
        label: "Life, sickness and personal accident insurance",
        hem: false,
      },
    ],
  },
  {
    id: "dependants",
    label: "Dependants and education",
    color: "#f59e0b",
    items: [
      { key: "exp.childcare", label: "Childcare expenses", hem: true },
      {
        key: "exp.publicEducation",
        label: "Public or government primary and secondary education",
        hem: true,
      },
      {
        key: "exp.higherEducation",
        label: "Higher education and professional memberships",
        hem: true,
      },
      {
        key: "exp.privateSchool",
        label: "Private schooling and tuition",
        hem: false,
      },
      {
        key: "exp.childSupport",
        label: "Child and spousal support payments",
        hem: false,
      },
    ],
  },
  {
    id: "investment",
    label: "Investment and holiday home",
    color: "#ec4899",
    items: [
      {
        key: "exp.investmentProperty",
        label: "Total investment property running costs",
        hem: false,
      },
      {
        key: "exp.holidayHome",
        label: "Total holiday home running costs",
        hem: false,
      },
    ],
  },
];

export const OTHER_LIVING_EXPENSE = {
  key: "exp.other",
  label: "Other expenses",
  hem: false,
  color: "#eab308",
} as const;

export const ALL_LIVING_EXPENSE_ITEMS: LivingExpenseItem[] = [
  ...LIVING_EXPENSE_GROUPS.flatMap((group) => group.items),
  {
    key: OTHER_LIVING_EXPENSE.key,
    label: OTHER_LIVING_EXPENSE.label,
    hem: OTHER_LIVING_EXPENSE.hem,
  },
];

export function hemLivingExpenses() {
  return ALL_LIVING_EXPENSE_ITEMS.filter((item) => item.hem);
}

export function nonHemLivingExpenses() {
  return ALL_LIVING_EXPENSE_ITEMS.filter((item) => !item.hem);
}
