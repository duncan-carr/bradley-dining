"use client";

import type { ParsedMenuItem } from "@/lib/types";
import MenuItemCard from "./MenuItemCard";

interface StationSectionProps {
  name: string;
  items: ParsedMenuItem[];
  voteCounts: Record<string, { upvotes: number; downvotes: number }>;
  getLocalVote: (sku: string) => "up" | "down" | null;
  onVote: (sku: string, vote: "up" | "down" | null) => void;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  showAllergens?: boolean;
}

export default function StationSection({
  name,
  items,
  voteCounts,
  getLocalVote,
  onVote,
  index,
  expanded,
  onToggle,
  showAllergens = true,
}: StationSectionProps) {
  if (items.length === 0) return null;

  return (
    <section
      className="animate-fade-slide-up overflow-hidden rounded-2xl border border-border bg-surface transition-colors duration-200"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        onClick={onToggle}
        className="group flex min-w-0 w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-surface-hover sm:px-5 sm:py-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-block h-5 w-1 shrink-0 rounded-full bg-bradley-red" />
          <h2 className="truncate font-serif text-base text-foreground sm:text-lg">{name}</h2>
          <span className="shrink-0 rounded-full bg-bradley-red-light px-2.5 py-0.5 text-xs font-bold text-bradley-red tabular-nums">
            {items.length}
          </span>
        </div>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-muted transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="accordion-content" data-open={expanded}>
        <div>
          <div className="flex flex-col gap-2 px-3 pb-3 sm:gap-2.5 sm:px-5 sm:pb-5">
            {items.map((item, i) => {
              const counts = voteCounts[item.sku] ?? { upvotes: 0, downvotes: 0 };
              return (
                <MenuItemCard
                  key={item.sku}
                  item={item}
                  upvotes={counts.upvotes}
                  downvotes={counts.downvotes}
                  localVote={getLocalVote(item.sku)}
                  onVote={onVote}
                  animDelay={i * 30}
                  showAllergens={showAllergens}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
