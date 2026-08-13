import { useRouter } from "next/navigation";
import React from "react";

export const QuickActions: React.FC = () => {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 text-slate-900 shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() =>
            router.push(
              `/finance/invoices/create?layoutid=standard&redirect=false`,
            )
          }
          className="flex flex-col items-center justify-center p-4 bg-muted/50 hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded-xl transition-all group"
        >
          <span className="p-3 bg-background text-primary rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform">
            ➕
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-primary">
            New Invoice
          </span>
        </button>

        <button
          onClick={() =>
            router.push(
              `/finance/quotations/create?layoutid=standard&redirect=false`,
            )
          }
          className="flex flex-col items-center justify-center p-4 bg-muted/50 hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded-xl transition-all group"
        >
          <span className="p-3 bg-background text-primary rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform">
            📝
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-primary">
            Create Quote
          </span>
        </button>

        <button
          onClick={() =>
            router.push(
              `/finance/products/create?layoutid=standard&redirect=false`,
            )
          }
          className="flex flex-col items-center justify-center p-4 bg-muted/50 hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded-xl transition-all group"
        >
          <span className="p-3 bg-background text-primary rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform">
            📦
          </span>
          <span className="text-xs font-semibold text-foreground group-hover:text-primary">
            Add Item
          </span>
        </button>
      </div>
    </div>
  );
};
