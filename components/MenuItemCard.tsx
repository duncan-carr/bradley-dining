"use client";

import { useState } from "react";
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
  isFavorite?: boolean;
  onToggleFavorite?: (sku: string) => void;
  visibleDietaryLabels?: Set<string>;
}

const DIETARY_STYLES: Record<string, string> = {
  Vegan: "bg-dietary-vegan-bg text-dietary-vegan-text",
  Vegetarian: "bg-dietary-vegetarian-bg text-dietary-vegetarian-text",
  "Gluten Free": "bg-dietary-gluten-free-bg text-dietary-gluten-free-text",
};

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

function NutritionRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  if (!value || value === "0") return null;
  const display = parseFloat(value);
  if (isNaN(display)) return null;
  return (
    <div className="flex items-center justify-between border-b border-border-light py-1.5 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground tabular-nums">{Math.round(display)}{unit}</span>
    </div>
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

function DietaryBadges({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label}
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold ${DIETARY_STYLES[label] ?? "bg-nutrition-bg text-nutrition-text"}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function ExpandedDetails({ item }: { item: ParsedMenuItem }) {
  return (
    <div className="mt-2 border-t border-border-light pt-2">
      {item.hasDetailedNutrition && (
        <div className="mb-2">
          <p className="mb-1 text-[0.6875rem] font-bold tracking-wide text-muted uppercase">
            Nutrition Facts
            {item.servingCombined && (
              <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground">
                &middot; Serving {item.servingCombined}
              </span>
            )}
          </p>
          <div className="rounded-lg bg-surface-warm px-3 py-1">
            <NutritionRow label="Sodium" value={item.sodium} unit="mg" />
            <NutritionRow label="Saturated Fat" value={item.saturatedFat} unit="g" />
            <NutritionRow label="Trans Fat" value={item.transFat} unit="g" />
            <NutritionRow label="Cholesterol" value={item.cholesterol} unit="mg" />
            <NutritionRow label="Dietary Fiber" value={item.dietaryFiber} unit="g" />
            <NutritionRow label="Sugars" value={item.sugars} unit="g" />
          </div>
        </div>
      )}

      {item.ingredients && (
        <div>
          <p className="mb-1 text-[0.6875rem] font-bold tracking-wide text-muted uppercase">
            Ingredients
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {item.ingredients}
          </p>
        </div>
      )}
    </div>
  );
}

export default function MenuItemCard({
  item,
  upvotes,
  downvotes,
  localVote,
  onVote,
  animDelay = 0,
  showAllergens = true,
  isFavorite = false,
  onToggleFavorite,
  visibleDietaryLabels,
}: MenuItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = item.hasDetailedNutrition || !!item.ingredients;

  return (
    <div
      className="group relative rounded-xl border border-border-light bg-background p-3 transition-all duration-200 hover:border-border hover:shadow-sm sm:p-3.5"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1.5">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(item.sku)}
                className={`mt-0.5 shrink-0 transition-all active:scale-90 ${
                  isFavorite
                    ? "text-favorite"
                    : "text-muted/40 hover:text-favorite/60"
                }`}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <svg
                  className={`h-4 w-4 ${isFavorite ? "animate-pop" : ""}`}
                  fill={isFavorite ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={isFavorite ? 0 : 2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            )}
            <h3 className="text-sm font-semibold leading-tight text-foreground sm:text-[0.9375rem]">
              {item.marketingName}
            </h3>
          </div>
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

        {item.dietaryLabels.length > 0 && (() => {
          const labels = visibleDietaryLabels
            ? item.dietaryLabels.filter((l) => visibleDietaryLabels.has(l))
            : item.dietaryLabels;
          return labels.length > 0 ? <DietaryBadges labels={labels} /> : null;
        })()}

        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <NutritionPill label="Cal" value={item.calories} />
          <NutritionPill label="Protein" value={item.protein} unit="g" />
          <NutritionPill label="Fat" value={item.totalFat} unit="g" />
          <NutritionPill label="Carbs" value={item.totalCarbs} unit="g" />

          {canExpand && (
            <button
              onClick={() => setExpanded((o) => !o)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:bg-surface-warm hover:text-foreground"
            >
              {expanded ? "Less" : "More"}
              <svg
                className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {showAllergens && <AllergenBadges item={item} />}

        {expanded && <ExpandedDetails item={item} />}
      </div>
    </div>
  );
}
