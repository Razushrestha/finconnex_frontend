import React from "react";

export interface MetricCardData {
  title: string;
  value: string | number;
  subtext: string;
  icon: string;
  variant?: "default" | "destructive" | "success";
}

export interface TopMetricCardsProps {
  metrics?: {
    totalRevenue: MetricCardData;
    pendingEstimates: MetricCardData;
    overdueInvoices: MetricCardData;
    quoteConversion: MetricCardData;
  };
}

const defaultMetrics = {
  totalRevenue: {
    title: "TOTAL REVENUE (YTD)",
    value: "$2.4M",
    subtext: "↑ +14.5% vs last year",
    icon: "📈",
    variant: "default",
  },
  pendingEstimates: {
    title: "PENDING ESTIMATES",
    value: "42",
    subtext: "Value: $185k",
    icon: "📋",
    variant: "default",
  },
  overdueInvoices: {
    title: "OVERDUE INVOICES",
    value: "12",
    subtext: "Total: $45.2k",
    icon: "⚠️",
    variant: "destructive",
  },
  quoteConversion: {
    title: "QUOTE CONVERSION",
    value: "68%",
    subtext: "↑ +2% this month",
    icon: "🎯",
    variant: "default",
  },
};

export const TopMetricCards: React.FC<TopMetricCardsProps> = ({
  metrics = defaultMetrics,
}) => {
  const cards = [
    metrics.totalRevenue,
    metrics.pendingEstimates,
    metrics.overdueInvoices,
    metrics.quoteConversion,
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const isDestructive = card.variant === "destructive";

        return (
          <div
            key={index}
            className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 text-slate-900 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-muted-foreground tracking-wider">
                {card.title}
              </span>
              <span
                className={`p-2 rounded-lg ${
                  isDestructive
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {card.icon}
              </span>
            </div>
            <div className="my-3">
              <h2
                className={`text-2xl font-bold ${
                  isDestructive ? "text-destructive" : "text-foreground"
                }`}
              >
                {card.value}
              </h2>
              <p
                className={`text-xs font-medium mt-1 ${
                  isDestructive ? "text-destructive/85" : "text-primary"
                }`}
              >
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopMetricCards;
