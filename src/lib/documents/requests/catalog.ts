export interface RequestDocItem {
  id: string;
  title: string;
  description: string;
}

export interface RequestDocCategory {
  id: string;
  label: string;
  separated?: boolean;
  items: RequestDocItem[];
}

export const REQUEST_DOC_TEMPLATES = [
  "Home loan — purchase",
  "Home loan — refinance",
  "Asset finance",
  "PAYG only",
] as const;

export const REQUEST_DOC_CATEGORIES: RequestDocCategory[] = [
  {
    id: "identification",
    label: "Identification",
    items: [
      {
        id: "id-licence",
        title: "Driver licence",
        description: "Front and back of current driver licence",
      },
      {
        id: "id-passport",
        title: "Passport",
        description: "Current passport bio page",
      },
      {
        id: "id-medicare",
        title: "Medicare card",
        description: "Front and back of current Medicare card",
      },
      {
        id: "id-birth",
        title: "Birth certificate",
        description: "Full birth certificate",
      },
      {
        id: "id-name-change",
        title: "Marriage or change of name certificate",
        description: "If the name on ID differs from other documents",
      },
    ],
  },
  {
    id: "payg",
    label: "PAYG income",
    items: [
      {
        id: "payg-payslips",
        title: "Payslips",
        description:
          "Two most recent payslips that show before & after tax salary and frequency of salary.",
      },
      {
        id: "payg-salary-credits",
        title: "Account statements showing salary credits",
        description: "Bank statements showing regular salary deposits.",
      },
      {
        id: "payg-ato-income",
        title: "ATO income statement",
        description: "Most recent ATO income statement.",
      },
      {
        id: "payg-itr",
        title: "Individual Tax Returns",
        description: "Individual Tax Return from the most recent financial year.",
      },
      {
        id: "payg-summaries",
        title: "PAYG summaries",
        description: "PAYG payment summary for the last financial year.",
      },
      {
        id: "payg-noa",
        title: "Notice of Assessment (NOA)",
        description: "ATO Notice of Assessment for the most recent year.",
      },
      {
        id: "payg-contract",
        title: "Employment contract",
        description: "Current employment contract or letter of offer.",
      },
      {
        id: "payg-rtw",
        title: "Return to work letter",
        description:
          "If recently returned from leave, a letter confirming return to work, hours, and income.",
      },
    ],
  },
  {
    id: "self-employed",
    label: "Self-employed income",
    items: [
      {
        id: "se-itr",
        title: "Individual Tax Returns",
        description: "Individual Tax Return from the most recent financial year.",
      },
      {
        id: "se-noa",
        title: "ATO Notice of Assessment (NOA)",
        description: "Most recent ATO Notice of Assessment.",
      },
      {
        id: "se-entity-returns",
        title: "Partnership/company/trust tax returns",
        description: "Latest tax return for the relevant entity.",
      },
      {
        id: "se-financials",
        title: "Financial statements",
        description: "Profit & loss and balance sheet for the last 2 years.",
      },
      {
        id: "se-bas",
        title: "Business Activity Statements",
        description: "BAS for the last 4 quarters.",
      },
      {
        id: "se-abn",
        title: "Company registration",
        description:
          "ABN/ACN registration details (abr.business.gov.au or ASIC extract).",
      },
    ],
  },
  {
    id: "liabilities",
    label: "Existing liabilities",
    items: [
      {
        id: "liab-home",
        title: "Home loan statements",
        description:
          "For each home loan account, provide most recent monthly account statements covering 3 months.",
      },
      {
        id: "liab-cc",
        title: "Credit card statements",
        description: "Most recent 3 months of credit card statements.",
      },
      {
        id: "liab-personal",
        title: "Personal loan statement",
        description: "Latest personal loan statement showing balance and repayments.",
      },
      {
        id: "liab-car",
        title: "Car loan statement",
        description: "Latest car loan statement showing balance and repayments.",
      },
      {
        id: "liab-bnpl",
        title: "Buy Now Pay Later statement",
        description: "Current BNPL account statement or limit confirmation.",
      },
      {
        id: "liab-help",
        title: "Student HELP balance statement",
        description: "ATO HELP/HECS balance statement.",
      },
    ],
  },
  {
    id: "rental",
    label: "Rental income",
    items: [
      {
        id: "rent-statement",
        title: "Rental income statement",
        description:
          "Most recent rental statement issued by the real estate management company.",
      },
      {
        id: "rent-tenancy",
        title: "Tenancy agreement",
        description:
          "Current signed and dated tenancy agreement issued by the real estate management company.",
      },
      {
        id: "rent-tax",
        title: "Tax return",
        description: "Tax Return from the most recent financial year.",
      },
      {
        id: "rent-credits",
        title: "Account statement showing rental credits",
        description:
          "Must show rental credits over the most recent three month period.",
      },
      {
        id: "rent-appraisal",
        title: "Rental appraisal",
        description:
          "Letter signed and dated by a licensed real estate agent stating expected rental income.",
      },
    ],
  },
  {
    id: "property",
    label: "Property",
    items: [
      {
        id: "prop-discharge",
        title: "Mortgage Discharge form",
        description:
          "Signed copy of your current lender's Mortgage Discharge / Discharge authority form.",
      },
      {
        id: "prop-contract",
        title: "Contract of sale",
        description:
          "Full copy of signed purchase contract or contract of sale including title details and annexures.",
      },
      {
        id: "prop-rates",
        title: "Rates notice",
        description:
          "Evidence of property ownership via the most recent council rates notice.",
      },
      {
        id: "prop-funds",
        title: "Funds to complete purchase",
        description:
          "Statements for any accounts that hold funds that are being used to purchase the property.",
      },
      {
        id: "prop-savings",
        title: "Evidence of genuine savings",
        description:
          "Statements for accounts that evidence genuine savings over a three month period.",
      },
      {
        id: "prop-insurance",
        title: "Home Insurance Certificate of Currency",
        description:
          "Most recent Certificate of Currency from your home insurance provider.",
      },
      {
        id: "prop-deposit",
        title: "Deposit receipt",
        description:
          "Deposit receipt showing the amount paid to the real estate agent.",
      },
      {
        id: "prop-gift",
        title: "Gift letter",
        description:
          "A signed letter from an immediate family member, including the full names of the donor and recipient, relationship to the applicant, amount of the gift and confirmation of the amount that is non-repayable.",
      },
    ],
  },
  {
    id: "asset",
    label: "Asset",
    items: [
      {
        id: "asset-contract",
        title: "Contract of sale",
        description: "Full copy of signed purchase contract or contract of sale.",
      },
      {
        id: "asset-funds",
        title: "Funds to complete purchase",
        description:
          "Statements for any accounts that hold funds that are being used to purchase the asset.",
      },
      {
        id: "asset-deposit",
        title: "Deposit receipt",
        description:
          "Deposit receipt showing the amount paid to purchase the asset.",
      },
      {
        id: "asset-valuation",
        title: "Asset valuation",
        description: "Valuation prepared by an appropriate third party.",
      },
    ],
  },
  {
    id: "construction",
    label: "Construction",
    items: [
      {
        id: "con-drawings",
        title: "Construction drawings",
        description:
          "Construction drawings, working drawings and engineering drawings.",
      },
      {
        id: "con-permit",
        title: "Building permit",
        description: "Most recent council endorsed building permit.",
      },
      {
        id: "con-contract",
        title: "Building contract",
        description:
          "The fixed price building contract or cost-plus contract (if applicable).",
      },
      {
        id: "con-insurance",
        title: "Builder's public liability insurance",
        description: "Builder's public liability insurance policy.",
      },
      {
        id: "con-council",
        title: "Council approval plans",
        description: "Council endorsed/stamped plans.",
      },
      {
        id: "con-presales",
        title: "Pre-sales",
        description:
          "Contract of sale for pre-sales, 10% deposit receipt for pre-sales and marketing plan.",
      },
      {
        id: "con-planning",
        title: "Planning permit",
        description: "Most recent planning permit.",
      },
    ],
  },
  {
    id: "other",
    label: "Other",
    items: [
      {
        id: "other-trust",
        title: "Trust deed",
        description:
          "Fully executed trust deed if the borrowing entity is a trustee or a trust.",
      },
      {
        id: "other-ato-portal",
        title: "ATO Portal Statements",
        description:
          "Most recent ITA & ICA Statement of the borrowers, guarantors and/or shareholders.",
      },
      {
        id: "other-living",
        title: "Living expenses",
        description: "3 months transaction statements showing your living expenses.",
      },
      {
        id: "other-lawyer",
        title: "Lawyer/conveyancer details",
        description:
          "A document detailing your lawyer/conveyancer's details, including full name, contact number, email address, company name and company address.",
      },
      {
        id: "other-name-change",
        title: "Statutory declaration for change of name",
        description: "Statutory declaration confirming your change of name.",
      },
      {
        id: "other-itr-noa",
        title: "Individual tax returns and ATO Notice of Assessment (NOA)",
        description:
          "Two most recent individual tax returns with two corresponding Notice of Assessments (NOA).",
      },
      {
        id: "other-share",
        title: "Shareholding certificate",
        description: "Shareholding certificate in the borrower's name.",
      },
      {
        id: "other-dividend-notice",
        title: "Dividend statement or notice",
        description: "Dividend statement or notice in the borrowers name.",
      },
      {
        id: "other-dividend-credits",
        title: "Account statements showing dividend credits",
        description:
          "Bank account statements or account transaction listing showing dividend credits over the most recent six month period.",
      },
      {
        id: "other-interest-credits",
        title: "Account statements showing interest income credits",
        description:
          "Bank account statements or account transaction listing showing interest income credits over the most recent 6 month period.",
      },
      {
        id: "other-super-statement",
        title: "Superannuation statement",
        description: "Most recent superannuation member statement.",
      },
      {
        id: "other-super-letter",
        title: "Letter or email advice from superannuation provider",
        description:
          "Letter or email from the superannuation provider confirming income and account details.",
      },
      {
        id: "other-super-credits",
        title: "Account statements showing superannuation credits",
        description:
          "Bank account statements showing superannuation credits over the most recent six month period.",
      },
      {
        id: "other-annuity-letter",
        title: "Letter or email advice from annuity provider",
        description:
          "Letter or email from the annuity provider confirming income and payment details.",
      },
      {
        id: "other-annuity-credits",
        title: "Account statement showing annuity credits",
        description:
          "Bank account statements showing annuity credits over the most recent six month period.",
      },
      {
        id: "other-pension-letter",
        title: "Letter or email advice from private pension provider",
        description:
          "Letter or email from the private pension provider confirming income and payment details.",
      },
      {
        id: "other-pension-credits",
        title: "Account statement showing private pension credits",
        description:
          "Bank account statements showing private pension credits over the most recent six month period.",
      },
      {
        id: "other-child-support-letter",
        title: "Government letter showing child support income",
        description:
          "Government letter showing dates, names, amounts, frequency of payment and dependents.",
      },
      {
        id: "other-child-support-credits",
        title: "Account statement showing child support income credits",
        description:
          "Bank account statements or account transaction listing showing child support credits over the most recent six month period.",
      },
      {
        id: "other-visa",
        title: "VISA Status",
        description: "Provide current VISA letter or VEVO check.",
      },
    ],
  },
  {
    id: "external",
    label: "External statement retrieval",
    separated: true,
    items: [
      {
        id: "ext-bankfeeds",
        title: "Open banking / bank feeds",
        description: "Consent to retrieve statements via an accredited provider.",
      },
    ],
  },
];
