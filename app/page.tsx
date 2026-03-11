"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocationData, useRecipesData, useAllDayStationIds } from "@/hooks/useDiningData";
import { useLocalVotes } from "@/hooks/useLocalVotes";
import { useStationOrder } from "@/hooks/useStationOrder";
import { parseMenuItem } from "@/lib/types";
import type { Station, ParsedMenuItem } from "@/lib/types";
import { getAutoMealSelection, filterMealPeriods } from "@/lib/mealSchedule";
import { localToday } from "@/lib/date";
import { useAllergenPreferences } from "@/hooks/useAllergenPreferences";
import DatePicker from "@/components/DatePicker";
import MealPeriodTabs from "@/components/MealPeriodTabs";
import StationSection from "@/components/StationSection";
import SettingsPanel from "@/components/SettingsPanel";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const userOverrodeMeal = useRef(false);
  const allergenPrefs = useAllergenPreferences();

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
      const auto = getAutoMealSelection(visiblePeriods);
      if (auto) {
        setDate(auto.date);
        setMealPeriod(auto.mealId);
      }
    }
  }, [location, date, visiblePeriods]);

  // Fallback: default to first period for non-today dates or when auto-selection doesn't apply.
  // Skips when auto-selection should handle it (today + location loaded) to avoid a race
  // where both effects fire in the same cycle and this one overwrites the auto-selection.
  useEffect(() => {
    if (mealPeriod !== null || visiblePeriods.length === 0) return;
    if (location && date === localToday() && !userOverrodeMeal.current) return;
    const sorted = [...visiblePeriods].sort((a, b) => a.position - b.position);
    setMealPeriod(sorted[0].id);
  }, [mealPeriod, visiblePeriods, location, date]);

  const handleDateChange = (newDate: string) => {
    userOverrodeMeal.current = false;
    if (newDate === localToday()) {
      const auto = getAutoMealSelection(visiblePeriods);
      if (auto) {
        setDate(auto.date);
        setMealPeriod(auto.mealId);
      } else {
        setDate(newDate);
      }
    } else {
      setDate(newDate);
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

  const filteredStationItemMap = useMemo(() => {
    if (allergenPrefs.activeFilterCount === 0) return stationItemMap;
    const filtered = new Map<string, ParsedMenuItem[]>();
    for (const [stationId, items] of stationItemMap) {
      filtered.set(
        stationId,
        items.filter((item) => {
          if (allergenPrefs.hideUnknown && item.allergenStatus === "unknown") return false;
          if (allergenPrefs.hiddenAllergens.size > 0 && item.allergens.some((a) => allergenPrefs.hiddenAllergens.has(a))) return false;
          return true;
        })
      );
    }
    return filtered;
  }, [stationItemMap, allergenPrefs.hiddenAllergens, allergenPrefs.hideUnknown, allergenPrefs.activeFilterCount]);

  const filteredItemCount = useMemo(() => {
    let count = 0;
    for (const items of filteredStationItemMap.values()) count += items.length;
    return count;
  }, [filteredStationItemMap]);

  const stationItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [id, items] of filteredStationItemMap) {
      counts.set(id, items.length);
    }
    return counts;
  }, [filteredStationItemMap]);

  // Station reordering
  const stationById = useMemo(() => new Map(stations.map((s) => [s.id.toString(), s])), [stations]);
  const defaultMealStationIds = useMemo(() => {
    const list = shouldSeparateAllDay
      ? stations.filter((s) => !allDayStationIds.has(s.id.toString()))
      : stations;
    return list.map((s) => s.id.toString());
  }, [stations, shouldSeparateAllDay, allDayStationIds]);

  const { applyOrder, moveStation, reorderTo, resetOrder, hasCustomOrder } = useStationOrder(defaultMealStationIds);

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

  const handleReorder = useCallback(
    (newOrder: string[]) => {
      reorderTo(newOrder);
      setOrderedMealStationIds(newOrder);
    },
    [reorderTo]
  );

  const handleResetOrder = useCallback(() => {
    resetOrder();
    setOrderedMealStationIds(defaultMealStationIds);
  }, [resetOrder, defaultMealStationIds]);

  const allDayStationList = useMemo(
    () => (shouldSeparateAllDay ? stations.filter((s) => allDayStationIds.has(s.id.toString())) : []),
    [stations, shouldSeparateAllDay, allDayStationIds]
  );

  const loading = locationLoading || recipesLoading;
  const error = locationError || recipesError;

  const totalItems = parsedItems.length;

  const today = localToday();
  const isToday = date === today;

  const autoSelection = useMemo(() => getAutoMealSelection(visiblePeriods), [visiblePeriods]);
  const isAutoTomorrow = autoSelection !== null && autoSelection.date !== today && date === autoSelection.date;

  const viewingDateLabel = (() => {
    const d = new Date(date + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  })();

  const settingsBadgeCount = allergenPrefs.activeFilterCount;

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

        {/* Date context banner */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: isToday ? "0fr" : "1fr" }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border bg-bradley-red/5">
              <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2 sm:px-5">
                {isAutoTomorrow ? (
                  <p className="text-xs font-medium text-muted-foreground">
                    Dining is closed for tonight &mdash; showing <span className="font-semibold text-foreground">tomorrow&apos;s menu</span>
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground">
                      Viewing <span className="font-semibold text-foreground">{viewingDateLabel}</span>
                    </p>
                    <button
                      onClick={() => handleDateChange(today)}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-bradley-red px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-bradley-red/90 active:scale-95"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                      </svg>
                      Back to Today
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 sm:px-5 sm:py-6">
        {/* Meal period tabs + toolbar */}
        {location && (
          <div className="mb-5 animate-fade-in sm:mb-8">
            <MealPeriodTabs
              periods={visiblePeriods}
              selected={mealPeriod}
              onSelect={handleMealSelect}
            />
            {!loading && totalItems > 0 && (
              <>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSettingsOpen((o) => !o)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                      settingsOpen || settingsBadgeCount > 0
                        ? "bg-bradley-red text-white shadow-sm"
                        : "text-muted-foreground hover:bg-surface-warm hover:text-foreground"
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                    {settingsBadgeCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/25 px-1 text-[0.625rem] font-bold leading-none">
                        {settingsBadgeCount}
                      </span>
                    )}
                  </button>
                  <p className="text-sm text-muted-foreground">
                    {allergenPrefs.activeFilterCount > 0
                      ? `${filteredItemCount} of ${totalItems} items`
                      : `${totalItems} ${totalItems === 1 ? "item" : "items"} on the menu`}
                  </p>
                </div>

                {/* Settings panel */}
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                  style={{ gridTemplateRows: settingsOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="pt-3">
                      <SettingsPanel
                        hiddenAllergens={allergenPrefs.hiddenAllergens}
                        hideUnknown={allergenPrefs.hideUnknown}
                        showOnItems={allergenPrefs.showOnItems}
                        onToggleAllergen={allergenPrefs.toggleAllergen}
                        onToggleHideUnknown={allergenPrefs.setHideUnknown}
                        onToggleShowOnItems={allergenPrefs.setShowOnItems}
                        onClearAllAllergens={allergenPrefs.clearAll}
                        activeFilterCount={allergenPrefs.activeFilterCount}
                        orderedStationIds={orderedMealStationIds}
                        stationById={stationById}
                        stationItemCounts={stationItemCounts}
                        onReorder={handleReorder}
                        onMoveStation={handleMove}
                        onResetOrder={handleResetOrder}
                        hasCustomOrder={hasCustomOrder}
                      />
                    </div>
                  </div>
                </div>
              </>
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
              const items = filteredStationItemMap.get(id) ?? [];
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
                  showAllergens={allergenPrefs.showOnItems}
                />
              );
            })}

            {allDayStationList.length > 0 && allDayStationList.some((s) => (filteredStationItemMap.get(s.id.toString()) ?? []).length > 0) && (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Available All Day
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {allDayStationList.map((station, i) => {
                  const items = filteredStationItemMap.get(station.id.toString()) ?? [];
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
                      showAllergens={allergenPrefs.showOnItems}
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
