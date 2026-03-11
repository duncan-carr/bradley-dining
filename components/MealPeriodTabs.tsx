"use client";

import type { MealPeriod } from "@/lib/types";

interface MealPeriodTabsProps {
  periods: MealPeriod[];
  selected: number | null;
  onSelect: (id: number) => void;
}

export default function MealPeriodTabs({ periods, selected, onSelect }: MealPeriodTabsProps) {
  const sorted = [...periods].sort((a, b) => a.position - b.position);

  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-surface-warm p-1.5 scrollbar-hide">
        {sorted.map((tab) => {
          const isActive = selected === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={`relative shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:px-5 ${
                isActive
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-bradley-red" />
              )}
              {tab.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
