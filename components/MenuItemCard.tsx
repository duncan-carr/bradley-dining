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
  showAllergens?: boolean;
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

function AllergenBadges({ item }: { item: ParsedMenuItem }) {
  if (item.allergenStatus === "known") {
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {item.allergens.map((allergen) => (
          <span
            key={allergen}
            className="inline-flex items-center gap-1 rounded-md bg-allergen-bg px-1.5 py-0.5 text-[0.6875rem] font-medium text-allergen-text"
          >
            <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            {allergen}
          </span>
        ))}
      </div>
    );
  }

  if (item.allergenStatus === "unknown") {
    return (
      <div className="mt-1">
        <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted">
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          Allergen info unavailable
        </span>
      </div>
    );
  }

  return null;
}

export default function MenuItemCard({ item, upvotes, downvotes, localVote, onVote, animDelay = 0, showAllergens = true }: MenuItemCardProps) {
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

        {showAllergens && <AllergenBadges item={item} />}
      </div>
    </div>
  );
}
