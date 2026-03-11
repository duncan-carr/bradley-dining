"use client";

import type { ParsedMenuItem } from "@/lib/types";
import VoteButtons from "./VoteButtons";

interface MenuItemCardProps {
  item: ParsedMenuItem;
  upvotes: number;
  downvotes: number;
  localVote: "up" | "down" | null;
  onVote: (sku: string, vote: "up" | "down" | null) => void;
  animDelay?: number;
}

function NutritionPill({ label, value, unit }: { label: string; value: string; unit?: string }) {
  if (!value || value === "0") return null;
  const display = parseFloat(value);
  if (isNaN(display)) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-nutrition-bg px-2 py-0.5 text-xs text-nutrition-text">
      <span className="font-semibold">{label}</span>
      <span>{Math.round(display)}{unit}</span>
    </span>
  );
}

export default function MenuItemCard({ item, upvotes, downvotes, localVote, onVote, animDelay = 0 }: MenuItemCardProps) {
  return (
    <div
      className="group relative rounded-xl border border-border-light bg-background p-3 transition-all duration-200 hover:border-border hover:shadow-sm sm:p-3.5"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight text-foreground sm:text-[0.9375rem]">
            {item.marketingName}
          </h3>
          <VoteButtons
            sku={item.sku}
            upvotes={upvotes}
            downvotes={downvotes}
            localVote={localVote}
            onVote={onVote}
          />
        </div>

        {item.marketingDescription && (
          <p className="line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-sm">
            {item.marketingDescription}
          </p>
        )}

        <div className="mt-0.5 flex flex-wrap gap-1">
          <NutritionPill label="Cal" value={item.calories} />
          <NutritionPill label="Protein" value={item.protein} unit="g" />
          <NutritionPill label="Fat" value={item.totalFat} unit="g" />
          <NutritionPill label="Carbs" value={item.totalCarbs} unit="g" />
        </div>
      </div>
    </div>
  );
}
