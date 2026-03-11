"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ALL_ALLERGENS } from "@/hooks/useAllergenPreferences";
import { DIETARY_LABELS } from "@/hooks/useDietaryPreferences";
import type { Station } from "@/lib/types";

/* ── Toggle switch ── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-bradley-red" : "bg-surface-warm"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/* ── Sortable station row ── */

function SortableStationRow({
  id,
  name,
  itemCount,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  id: string;
  name: string;
  itemCount: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border bg-background px-2 py-1.5 sm:px-3 sm:py-2 ${
        isDragging ? "border-bradley-red/40 shadow-md" : "border-border-light"
      }`}
    >
      {/* Drag handle */}
      <button
        className="flex shrink-0 cursor-grab touch-none items-center justify-center text-muted transition-colors hover:text-muted-foreground active:cursor-grabbing"
        aria-label={`Drag to reorder ${name}`}
        {...attributes}
        {...listeners}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Station name + count */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="inline-block h-4 w-0.5 shrink-0 rounded-full bg-bradley-red" />
        <span className="truncate text-sm font-medium text-foreground">{name}</span>
        <span className="shrink-0 rounded-full bg-bradley-red-light px-2 py-0.5 text-[0.625rem] font-bold text-bradley-red tabular-nums leading-none">
          {itemCount}
        </span>
      </div>

      {/* Up/down arrows for mobile / accessibility */}
      <div className="flex shrink-0 items-center">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-20 disabled:pointer-events-none"
          aria-label="Move up"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-20 disabled:pointer-events-none"
          aria-label="Move down"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Main settings panel ── */

const DIETARY_CHIP_STYLES: Record<string, { active: string; inactive: string }> = {
  Vegan: {
    active: "bg-dietary-vegan-text text-white shadow-sm dark:bg-dietary-vegan-text dark:text-black",
    inactive: "bg-dietary-vegan-bg text-dietary-vegan-text hover:opacity-80",
  },
  Vegetarian: {
    active: "bg-dietary-vegetarian-text text-white shadow-sm dark:bg-dietary-vegetarian-text dark:text-black",
    inactive: "bg-dietary-vegetarian-bg text-dietary-vegetarian-text hover:opacity-80",
  },
  "Gluten Free": {
    active: "bg-dietary-gluten-free-text text-white shadow-sm dark:bg-dietary-gluten-free-text dark:text-black",
    inactive: "bg-dietary-gluten-free-bg text-dietary-gluten-free-text hover:opacity-80",
  },
};

interface SettingsPanelProps {
  // Allergen props
  hiddenAllergens: Set<string>;
  hideUnknown: boolean;
  showOnItems: boolean;
  onToggleAllergen: (name: string) => void;
  onToggleHideUnknown: (value: boolean) => void;
  onToggleShowOnItems: (value: boolean) => void;
  onClearAllAllergens: () => void;
  activeFilterCount: number;
  // Dietary props
  visibleDietaryLabels: Set<string>;
  requiredDietaryLabels: Set<string>;
  favoritesOnly: boolean;
  onToggleDietaryVisible: (label: string) => void;
  onToggleDietaryRequired: (label: string) => void;
  onToggleFavoritesOnly: (value: boolean) => void;
  onClearDietaryFilters: () => void;
  dietaryFilterCount: number;
  hasFavorites: boolean;
  // Station order props
  orderedStationIds: string[];
  stationById: Map<string, Station>;
  stationItemCounts: Map<string, number>;
  onReorder: (newOrder: string[]) => void;
  onMoveStation: (stationId: string, direction: -1 | 1) => void;
  onResetOrder: () => void;
  hasCustomOrder: boolean;
}

export default function SettingsPanel({
  hiddenAllergens,
  hideUnknown,
  showOnItems,
  onToggleAllergen,
  onToggleHideUnknown,
  onToggleShowOnItems,
  onClearAllAllergens,
  activeFilterCount,
  visibleDietaryLabels,
  requiredDietaryLabels,
  favoritesOnly,
  onToggleDietaryVisible,
  onToggleDietaryRequired,
  onToggleFavoritesOnly,
  onClearDietaryFilters,
  dietaryFilterCount,
  hasFavorites,
  orderedStationIds,
  stationById,
  stationItemCounts,
  onReorder,
  onMoveStation,
  onResetOrder,
  hasCustomOrder,
}: SettingsPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = orderedStationIds.indexOf(String(active.id));
        const newIndex = orderedStationIds.indexOf(String(over.id));
        if (oldIndex !== -1 && newIndex !== -1) {
          onReorder(arrayMove(orderedStationIds, oldIndex, newIndex));
        }
      }
    },
    [orderedStationIds, onReorder]
  );

  const visibleStations = orderedStationIds.filter((id) => stationById.has(id));

  return (
    <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
      {/* ── Allergen Filters ── */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Hide items containing
          </h3>
          <button
            onClick={onClearAllAllergens}
            className={`rounded-md px-2 py-1 text-[0.6875rem] font-semibold transition-colors ${
              activeFilterCount > 0
                ? "text-muted-foreground hover:bg-surface-warm hover:text-foreground"
                : "pointer-events-none text-transparent"
            }`}
            aria-hidden={activeFilterCount === 0}
            tabIndex={activeFilterCount === 0 ? -1 : 0}
          >
            Clear all
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
          {ALL_ALLERGENS.map((allergen) => {
            const active = hiddenAllergens.has(allergen);
            return (
              <button
                key={allergen}
                onClick={() => onToggleAllergen(allergen)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 sm:text-[0.8125rem] ${
                  active
                    ? "bg-bradley-red text-white shadow-sm"
                    : "bg-surface-warm text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {allergen}
                {active && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-border-light pt-3">
          <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-0.5">
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">
              Hide items with unknown allergen info
            </span>
            <ToggleSwitch checked={hideUnknown} onChange={onToggleHideUnknown} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-0.5">
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">
              Show allergens on menu items
            </span>
            <ToggleSwitch checked={showOnItems} onChange={onToggleShowOnItems} />
          </div>
        </div>
      </div>

      {/* ── Dietary Preferences ── */}
      <div className="mt-3 border-t border-border-light pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Show only
          </h3>
          <button
            onClick={onClearDietaryFilters}
            className={`rounded-md px-2 py-1 text-[0.6875rem] font-semibold transition-colors ${
              dietaryFilterCount > 0
                ? "text-muted-foreground hover:bg-surface-warm hover:text-foreground"
                : "pointer-events-none text-transparent"
            }`}
            aria-hidden={dietaryFilterCount === 0}
            tabIndex={dietaryFilterCount === 0 ? -1 : 0}
          >
            Clear
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
          {DIETARY_LABELS.map((label) => {
            const active = requiredDietaryLabels.has(label);
            const styles = DIETARY_CHIP_STYLES[label];
            return (
              <button
                key={label}
                onClick={() => onToggleDietaryRequired(label)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 sm:text-[0.8125rem] ${
                  active ? styles.active : styles.inactive
                }`}
              >
                {label}
                {active && (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}
          <button
            onClick={() => onToggleFavoritesOnly(!favoritesOnly)}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 sm:text-[0.8125rem] ${
              favoritesOnly
                ? "bg-favorite text-white shadow-sm"
                : hasFavorites
                  ? "bg-favorite-bg text-favorite hover:opacity-80"
                  : "bg-surface-warm text-muted opacity-50 pointer-events-none"
            }`}
            disabled={!hasFavorites && !favoritesOnly}
          >
            <svg className="h-3 w-3" fill={favoritesOnly ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            Favorites
            {favoritesOnly && (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-border-light pt-3">
          {DIETARY_LABELS.map((label) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-lg px-1 py-0.5">
              <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                Show {label} labels on items
              </span>
              <ToggleSwitch checked={visibleDietaryLabels.has(label)} onChange={() => onToggleDietaryVisible(label)} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Station Order ── */}
      {visibleStations.length > 0 && (
        <div className="mt-3 border-t border-border-light pt-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Station order
            </h3>
            <button
              onClick={onResetOrder}
              className={`rounded-md px-2 py-1 text-[0.6875rem] font-semibold transition-colors ${
                hasCustomOrder
                  ? "text-muted-foreground hover:bg-surface-warm hover:text-foreground"
                  : "pointer-events-none text-transparent"
              }`}
              aria-hidden={!hasCustomOrder}
              tabIndex={hasCustomOrder ? 0 : -1}
            >
              Reset
            </button>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={visibleStations}
                strategy={verticalListSortingStrategy}
              >
                {visibleStations.map((id, index) => {
                  const station = stationById.get(id);
                  if (!station) return null;
                  return (
                    <SortableStationRow
                      key={id}
                      id={id}
                      name={station.name}
                      itemCount={stationItemCounts.get(id) ?? 0}
                      canMoveUp={index > 0}
                      canMoveDown={index < visibleStations.length - 1}
                      onMoveUp={() => onMoveStation(id, -1)}
                      onMoveDown={() => onMoveStation(id, 1)}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}
    </div>
  );
}
