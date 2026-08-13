import React from "react";
import { MetricCardConfig } from "./types";

interface EntityCardsProps {
  cards: MetricCardConfig[];
}

export const EntityCards: React.FC<EntityCardsProps> = ({ cards }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card, index) => {
        const isDestructive = card.subtextVariant === "destructive";
        const isSuccess = card.subtextVariant === "success";

        return (
          <div
            key={index}
            className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 text-slate-900 shadow-sm"
          >
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
              {card.title}
            </span>
            <div className="my-2">
              <h2 className="text-2xl font-bold text-foreground">
                {card.value}
              </h2>
              <p
                className={`text-xs font-medium mt-1 ${
                  isDestructive
                    ? "text-destructive"
                    : isSuccess
                      ? "text-emerald-500"
                      : "text-primary"
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
