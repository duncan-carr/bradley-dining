"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "bradley-dining-dietary-prefs";

export const DIETARY_LABELS = ["Vegan", "Vegetarian", "Gluten Free"] as const;
export type DietaryLabel = (typeof DIETARY_LABELS)[number];

interface DietaryPrefs {
  visibleLabels: string[];
  requiredLabels: string[];
  favoritesOnly: boolean;
}

const DEFAULTS: DietaryPrefs = {
  visibleLabels: [...DIETARY_LABELS],
  requiredLabels: [],
  favoritesOnly: false,
};

function loadPrefs(): DietaryPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DietaryPrefs>;
      return {
        visibleLabels: Array.isArray(parsed.visibleLabels) ? parsed.visibleLabels : [...DIETARY_LABELS],
        requiredLabels: Array.isArray(parsed.requiredLabels) ? parsed.requiredLabels : [],
        favoritesOnly: !!parsed.favoritesOnly,
      };
    }
  } catch {}
  return DEFAULTS;
}

function savePrefs(prefs: DietaryPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function useDietaryPreferences() {
  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(
    () => new Set(loadPrefs().visibleLabels)
  );
  const [requiredLabels, setRequiredLabels] = useState<Set<string>>(
    () => new Set(loadPrefs().requiredLabels)
  );
  const [favoritesOnly, setFavoritesOnlyState] = useState(
    () => loadPrefs().favoritesOnly
  );

  const persist = useCallback((visible: Set<string>, required: Set<string>, favOnly: boolean) => {
    savePrefs({ visibleLabels: [...visible], requiredLabels: [...required], favoritesOnly: favOnly });
  }, []);

  const toggleVisible = useCallback(
    (label: string) => {
      setVisibleLabels((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        persist(next, requiredLabels, favoritesOnly);
        return next;
      });
    },
    [persist, requiredLabels, favoritesOnly]
  );

  const toggleRequired = useCallback(
    (label: string) => {
      setRequiredLabels((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        persist(visibleLabels, next, favoritesOnly);
        return next;
      });
    },
    [persist, visibleLabels, favoritesOnly]
  );

  const setFavoritesOnly = useCallback(
    (value: boolean) => {
      setFavoritesOnlyState(value);
      persist(visibleLabels, requiredLabels, value);
    },
    [persist, visibleLabels, requiredLabels]
  );

  const clearFilters = useCallback(() => {
    const empty = new Set<string>();
    setRequiredLabels(empty);
    setFavoritesOnlyState(false);
    persist(visibleLabels, empty, false);
  }, [persist, visibleLabels]);

  const activeFilterCount = requiredLabels.size + (favoritesOnly ? 1 : 0);

  return {
    visibleLabels,
    requiredLabels,
    favoritesOnly,
    toggleVisible,
    toggleRequired,
    setFavoritesOnly,
    clearFilters,
    activeFilterCount,
  };
}
