"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { LocationData, RecipesData } from "@/lib/types";
import { localToday } from "@/lib/date";

/**
 * Fetches the set of station IDs that belong to the "All Day" meal period.
 * This lets us push always-available stations to the bottom of meal-specific views.
 */
export function useAllDayStationIds(mealPeriods: { id: number; name: string }[] | undefined) {
  const [allDayStationIds, setAllDayStationIds] = useState<Set<string>>(new Set());

  const allDayPeriodId = useMemo(
    () => mealPeriods?.find((p) => p.name === "All Day")?.id ?? null,
    [mealPeriods]
  );

  useEffect(() => {
    if (allDayPeriodId === null) return;
    let cancelled = false;

    async function fetchAllDayStations() {
      try {
        const today = localToday();
        const params = new URLSearchParams({
          type: "recipes",
          date: today,
          mealPeriod: allDayPeriodId!.toString(),
        });
        const res = await fetch(`/api/dining?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        const stationSkuMap = json.data?.getLocationRecipes?.locationRecipesMap?.stationSkuMap ?? [];
        if (!cancelled) {
          setAllDayStationIds(new Set(stationSkuMap.map((s: { id: number }) => String(s.id))));
        }
      } catch {
        // non-critical — fall back to default ordering
      }
    }

    fetchAllDayStations();
    return () => { cancelled = true; };
  }, [allDayPeriodId]);

  return allDayStationIds;
}

export function useLocationData() {
  const [data, setData] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchLocation() {
      try {
        const res = await fetch("/api/dining?type=location");
        if (!res.ok) throw new Error(`Failed to fetch location: ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json.data?.getLocation ?? null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setLoading(false);
        }
      }
    }
    fetchLocation();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

export function useRecipesData(date: string, mealPeriod: number | null) {
  const [data, setData] = useState<RecipesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type: "recipes", date });
      if (mealPeriod !== null) {
        params.set("mealPeriod", mealPeriod.toString());
      }
      const res = await fetch(`/api/dining?${params.toString()}`);
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = await res.json();
      if (json.error || json.errors) {
        setData(null);
        return;
      }
      setData(json.data?.getLocationRecipes ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, mealPeriod]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  return { data, loading, error, refetch: fetchRecipes };
}
