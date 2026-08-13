import React from "react";

export const RecentActivity: React.FC = () => {
  const activities = [
    {
      id: 1,
      type: "payment",
      title: "Payment received for Invoice INV-2023-089",
      subtitle: "Acme Corp • $4,500.00",
      time: "10 mins ago",
      icon: "💳",
      bg: "bg-primary/10 text-primary",
    },
    {
      id: 2,
      type: "quote",
      title: "Quote approved by client",
      subtitle: "TechFlow Solutions...",
      time: "2 hours ago",
      icon: "📄",
      bg: "bg-emerald-500/10 text-emerald-500",
    },
    {
      id: 3,
      type: "alert",
      title: "Invoice overdue by 5 days",
      subtitle: "Global Industries • INV...",
      time: "Yesterday, 9:00 AM",
      icon: "⚠️",
      bg: "bg-destructive/10 text-destructive",
    },
    {
      id: 4,
      type: "quote",
      title: "Quote sent to prospect",
      subtitle: "Nexus Group • QTE-0...",
      time: "Yesterday, 2:30 PM",
      icon: "📤",
      bg: "bg-purple-500/10 text-purple-500",
    },
  ];

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-100 bg-white p-6 text-slate-900 shadow-sm">
      <div>
        <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Updates on quotes, invoices, and payments.
        </p>

        <div className="space-y-4">
          {activities.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0"
            >
              <span
                className={`p-2 rounded-lg text-sm flex items-center justify-center shrink-0 ${item.bg}`}
              >
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-foreground truncate">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {item.subtitle}
                </p>
                <span className="text-[10px] text-muted-foreground/80 mt-0.5 block">
                  {item.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full mt-4 py-3 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
        View Full History →
      </button>
    </div>
  );
};
