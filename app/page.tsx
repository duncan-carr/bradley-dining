"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocationData, useRecipesData, useAllDayStationIds } from "@/hooks/useDiningData";
import { useLocalVotes } from "@/hooks/useLocalVotes";
import { useStationOrder } from "@/hooks/useStationOrder";
import { parseMenuItem } from "@/lib/types";
import type { Station, ParsedMenuItem } from "@/lib/types";
import { getCurrentMealPeriodId, filterMealPeriods } from "@/lib/mealSchedule";
import { localToday } from "@/lib/date";
import DatePicker from "@/components/DatePicker";
import MealPeriodTabs from "@/components/MealPeriodTabs";
import StationSection from "@/components/StationSection";

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
            <div className="h-5 w-32 rounded-md animate-shimmer" />
            <div className="h-5 w-12 rounded-full animate-shimmer" />
          </div>
          <div className="flex flex-col gap-3 px-4 pb-4 sm:px-6 sm:pb-6">
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                className="h-24 rounded-xl animate-shimmer"
                style={{ animationDelay: `${(i * 3 + j) * 60}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [date, setDate] = useState(localToday);
  const [mealPeriod, setMealPeriod] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const userOverrodeMeal = useRef(false);

  const [collapsedStations, setCollapsedStations] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem("bradley-dining-collapsed");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleStation = useCallback((stationId: string) => {
    setCollapsedStations((prev) => {
      const next = new Set(prev);
      if (next.has(stationId)) next.delete(stationId);
      else next.add(stationId);
      try { localStorage.setItem("bradley-dining-collapsed", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const { data: location, loading: locationLoading, error: locationError } = useLocationData();
  const { data: recipes, loading: recipesLoading, error: recipesError } = useRecipesData(date, mealPeriod);
  const { getVote, setVote } = useLocalVotes();
  const allDayStationIds = useAllDayStationIds(location?.commerceAttributes.meal_periods);

  const visiblePeriods = useMemo(
    () => filterMealPeriods(location?.commerceAttributes.meal_periods ?? []),
    [location]
  );

  useEffect(() => {
    if (!location || userOverrodeMeal.current) return;
    if (date === localToday()) {
      const autoId = getCurrentMealPeriodId(visiblePeriods);
      if (autoId !== null) setMealPeriod(autoId);
    }
  }, [location, date, visiblePeriods]);

  // When viewing a non-today date and no meal is selected yet, default to first
  useEffect(() => {
    if (mealPeriod === null && visiblePeriods.length > 0) {
      const sorted = [...visiblePeriods].sort((a, b) => a.position - b.position);
      setMealPeriod(sorted[0].id);
    }
  }, [mealPeriod, visiblePeriods]);

  const handleDateChange = (newDate: string) => {
    userOverrodeMeal.current = false;
    setDate(newDate);
    if (newDate === localToday()) {
      const autoId = getCurrentMealPeriodId(visiblePeriods);
      if (autoId !== null) setMealPeriod(autoId);
    } else {
      const sorted = [...visiblePeriods].sort((a, b) => a.position - b.position);
      if (sorted.length > 0) setMealPeriod(sorted[0].id);
    }
  };

  const handleMealSelect = (id: number) => {
    userOverrodeMeal.current = true;
    setMealPeriod(id);
  };

  const stations: Station[] = useMemo(() => {
    const PREFERRED_ORDER = [
      "Main Ingredient",
      "The Iron Skillet",
      "Ignite",
      "Pizza Pi",
      "In The Mix",
      "True Balance",
      "Sandwich Lab",
    ];
    const orderMap = new Map(PREFERRED_ORDER.map((name, i) => [name, i]));
    return (location?.commerceAttributes.children ?? []).sort((a, b) => {
      const ai = orderMap.get(a.name) ?? 1000 + a.position;
      const bi = orderMap.get(b.name) ?? 1000 + b.position;
      return ai - bi;
    });
  }, [location]);

  const parsedItems: ParsedMenuItem[] = useMemo(
    () => (recipes?.products?.items ?? []).map(parseMenuItem),
    [recipes]
  );

  const allSkus = useMemo(() => parsedItems.map((i) => i.sku), [parsedItems]);
  const voteCounts = useQuery(api.votes.getVotes, allSkus.length > 0 ? { skus: allSkus } : "skip");

  const allDayPeriodId = useMemo(
    () => location?.commerceAttributes.meal_periods.find((p) => p.name === "All Day")?.id ?? null,
    [location]
  );
  const shouldSeparateAllDay = mealPeriod !== null && mealPeriod !== allDayPeriodId && allDayStationIds.size > 0;

  const stationItemMap = useMemo(() => {
    const map = new Map<string, ParsedMenuItem[]>();
    if (!recipes?.locationRecipesMap?.stationSkuMap) return map;

    const skuToItem = new Map(parsedItems.map((item) => [item.sku, item]));
    const stationSkuMap = recipes.locationRecipesMap.stationSkuMap;

    for (const station of stationSkuMap) {
      const items: ParsedMenuItem[] = [];
      for (const sku of station.skus) {
        const base = sku.replace(/_\d+$/, "");
        const item = skuToItem.get(sku) ?? skuToItem.get(base);
        if (item && !items.some((i) => i.sku === item.sku)) {
          items.push(item);
        }
      }
      items.sort((a, b) => {
        const posA = parseFloat(a.attributes.find((at) => at.name === "position_in_menu")?.value ?? "9999");
        const posB = parseFloat(b.attributes.find((at) => at.name === "position_in_menu")?.value ?? "9999");
        return posA - posB;
      });
      map.set(String(station.id), items);
    }
    return map;
  }, [recipes, parsedItems]);

  // Station reordering
  const stationById = useMemo(() => new Map(stations.map((s) => [s.id.toString(), s])), [stations]);
  const defaultMealStationIds = useMemo(() => {
    const list = shouldSeparateAllDay
      ? stations.filter((s) => !allDayStationIds.has(s.id.toString()))
      : stations;
    return list.map((s) => s.id.toString());
  }, [stations, shouldSeparateAllDay, allDayStationIds]);

  const { applyOrder, moveStation, resetOrder, hasCustomOrder } = useStationOrder(defaultMealStationIds);

  const [orderedMealStationIds, setOrderedMealStationIds] = useState<string[]>([]);

  useEffect(() => {
    setOrderedMealStationIds(applyOrder(defaultMealStationIds));
  }, [applyOrder, defaultMealStationIds]);

  const handleMove = useCallback(
    (stationId: string, direction: -1 | 1) => {
      setOrderedMealStationIds((prev) => moveStation(prev, stationId, direction));
    },
    [moveStation]
  );

  const handleResetOrder = useCallback(() => {
    resetOrder();
    setOrderedMealStationIds(defaultMealStationIds);
    setReordering(false);
  }, [resetOrder, defaultMealStationIds]);

  const allDayStationList = useMemo(
    () => (shouldSeparateAllDay ? stations.filter((s) => allDayStationIds.has(s.id.toString())) : []),
    [stations, shouldSeparateAllDay, allDayStationIds]
  );

  const loading = locationLoading || recipesLoading;
  const error = locationError || recipesError;

  const totalItems = parsedItems.length;

  const isToday = date === localToday();

  const viewingDateLabel = (() => {
    const d = new Date(date + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-5">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <div>
              <h1 className="font-serif text-lg text-foreground leading-tight sm:text-xl">
                {location?.aemAttributes.name ?? "Williams Dining"}
              </h1>
              <p className="text-[0.65rem] font-medium tracking-wide text-muted uppercase sm:text-xs">
                Bradley University
              </p>
            </div>
            <DatePicker
              value={date}
              onChange={handleDateChange}
              maxDate={location?.commerceAttributes.maxMenusDate}
            />
          </div>
        </div>

        {/* "Back to today" banner */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: isToday ? "0fr" : "1fr" }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border bg-bradley-red/5">
              <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2 sm:px-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Viewing <span className="font-semibold text-foreground">{viewingDateLabel}</span>
                </p>
                <button
                  onClick={() => handleDateChange(localToday())}
                  className="flex items-center gap-1.5 rounded-lg bg-bradley-red px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-bradley-red/90 active:scale-95"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  Back to Today
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 sm:px-5 sm:py-6">
        {/* Meal period tabs + item count */}
        {location && (
          <div className="mb-5 animate-fade-in sm:mb-8">
            <MealPeriodTabs
              periods={visiblePeriods}
              selected={mealPeriod}
              onSelect={handleMealSelect}
            />
            {!loading && totalItems > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {totalItems} {totalItems === 1 ? "item" : "items"} on the menu
                </p>
                <div className="flex items-center gap-2">
                  {reordering && hasCustomOrder && (
                    <button
                      onClick={handleResetOrder}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-surface-warm hover:text-foreground"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => setReordering((r) => !r)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                      reordering
                        ? "bg-bradley-red text-white shadow-sm"
                        : "text-muted-foreground hover:bg-surface-warm hover:text-foreground"
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                    </svg>
                    {reordering ? "Done" : "Reorder"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-6 animate-scale-in rounded-2xl border border-downvote/20 bg-downvote-bg p-5">
            <p className="font-semibold text-downvote">Failed to load menu</p>
            <p className="mt-1 text-sm text-downvote/70">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && <LoadingSkeleton />}

        {/* Empty state */}
        {!loading && !error && parsedItems.length === 0 && (
          <div className="animate-fade-in py-16 text-center sm:py-24">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-surface-warm">
              <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-serif text-xl text-foreground">
              No menu available
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              There&apos;s no menu posted for this date yet. Try a different day or meal period.
            </p>
            {date !== localToday() && (
              <button
                onClick={() => handleDateChange(localToday())}
                className="mt-4 rounded-lg bg-bradley-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-bradley-red/90 active:scale-95"
              >
                Go to today
              </button>
            )}
          </div>
        )}

        {/* Menu stations */}
        {!loading && !error && parsedItems.length > 0 && (
          <div className="flex flex-col gap-5">
            {orderedMealStationIds.map((id, index) => {
              const station = stationById.get(id);
              if (!station) return null;
              const items = stationItemMap.get(id) ?? [];
              return (
                <StationSection
                  key={id}
                  name={station.name}
                  items={items}
                  voteCounts={voteCounts ?? {}}
                  getLocalVote={getVote}
                  onVote={setVote}
                  index={index}
                  expanded={!collapsedStations.has(id)}
                  onToggle={() => toggleStation(id)}
                  reordering={reordering}
                  canMoveUp={index > 0}
                  canMoveDown={index < orderedMealStationIds.length - 1}
                  onMoveUp={() => handleMove(id, -1)}
                  onMoveDown={() => handleMove(id, 1)}
                />
              );
            })}

            {allDayStationList.length > 0 && allDayStationList.some((s) => (stationItemMap.get(s.id.toString()) ?? []).length > 0) && (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Available All Day
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {allDayStationList.map((station, i) => {
                  const items = stationItemMap.get(station.id.toString()) ?? [];
                  return (
                    <StationSection
                      key={station.id}
                      name={station.name}
                      items={items}
                      voteCounts={voteCounts ?? {}}
                      getLocalVote={getVote}
                      onVote={setVote}
                      index={orderedMealStationIds.length + i}
                      expanded={!collapsedStations.has(station.id.toString())}
                      onToggle={() => toggleStation(station.id.toString())}
                    />
                  );
                })}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="mt-8 border-t border-border py-6 text-center sm:mt-12 sm:py-8">
        <p className="text-xs text-muted">
          Menu data from Aramark &middot; Vote on your favorites
        </p>
        <p className="mt-2 text-xs text-muted">
          Need to do laundry? Check out{" "}
          <a
            href="https://laundry.duncancarr.com"
            className="font-semibold text-bradley-red underline underline-offset-2 hover:text-bradley-red/80"
          >
            the better laundry tracker
          </a>
        </p>
      </footer>
    </div>
  );
}
