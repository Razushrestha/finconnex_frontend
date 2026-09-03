"use client";

import React from "react";
import { FileText, Clock, AlertTriangle, DollarSign } from "lucide-react";

export default function MetricsCards() {
  const metrics = [
    {
      title: "Active Agreements",
      value: "18",
      change: "+12% from last month",
      isPositive: true,
      icon: <FileText className="w-5 h-5 text-emerald-500" />,
      bgIcon: "bg-emerald-500/10",
      borderColor: "hover:border-emerald-500/40",
    },
    {
      title: "Pending Review",
      value: "3",
      change: "Requires attention",
      isPositive: false,
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      bgIcon: "bg-amber-500/10",
      borderColor: "hover:border-amber-500/40",
    },
    {
      title: "Expiring Soon",
      value: "2",
      change: "Within 30 days",
      isPositive: false,
      icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
      bgIcon: "bg-orange-500/10",
      borderColor: "hover:border-orange-500/40",
    },
    {
      title: "Total Monthly Value",
      value: "$76,400",
      change: "+8.4% YoY",
      isPositive: true,
      icon: <DollarSign className="w-5 h-5 text-violet-500" />,
      bgIcon: "bg-violet-500/10",
      borderColor: "hover:border-violet-500/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((item, index) => (
        <div
          key={index}
          className={`bg-card border border-border rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${item.borderColor} group cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {item.title}
            </span>
            <div
              className={`w-9 h-9 rounded-xl ${item.bgIcon} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
            >
              {item.icon}
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <h4 className="text-2xl font-bold tracking-tight text-foreground">
              {item.value}
            </h4>
            <span
              className={`text-[11px] font-semibold ${
                item.isPositive ? "text-emerald-500" : "text-muted-foreground"
              }`}
            >
              {item.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
