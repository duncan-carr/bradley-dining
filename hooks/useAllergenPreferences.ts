"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "bradley-dining-allergen-prefs";

interface AllergenPrefs {
  hiddenAllergens: string[];
  hideUnknown: boolean;
  showOnItems: boolean;
}

const DEFAULTS: AllergenPrefs = { hiddenAllergens: [], hideUnknown: false, showOnItems: true };

function loadPrefs(): AllergenPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AllergenPrefs>;
      return {
        hiddenAllergens: Array.isArray(parsed.hiddenAllergens) ? parsed.hiddenAllergens : [],
        hideUnknown: !!parsed.hideUnknown,
        showOnItems: parsed.showOnItems !== false,
      };
    }
  } catch {}
  return DEFAULTS;
}

function savePrefs(prefs: AllergenPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export const ALL_ALLERGENS = [
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat",
  "Soy",
  "Sesame",
] as const;

export type AllergenName = (typeof ALL_ALLERGENS)[number];

export function useAllergenPreferences() {
  const [hiddenAllergens, setHiddenAllergens] = useState<Set<string>>(
    () => new Set(loadPrefs().hiddenAllergens)
  );
  const [hideUnknown, setHideUnknownState] = useState(() => loadPrefs().hideUnknown);
  const [showOnItems, setShowOnItemsState] = useState(() => loadPrefs().showOnItems);

  const persist = useCallback((allergens: Set<string>, unknown: boolean, show: boolean) => {
    savePrefs({ hiddenAllergens: [...allergens], hideUnknown: unknown, showOnItems: show });
  }, []);

  const toggleAllergen = useCallback(
    (name: string) => {
      setHiddenAllergens((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        persist(next, hideUnknown, showOnItems);
        return next;
      });
    },
    [persist, hideUnknown, showOnItems]
  );

  const setHideUnknown = useCallback(
    (value: boolean) => {
      setHideUnknownState(value);
      persist(hiddenAllergens, value, showOnItems);
    },
    [persist, hiddenAllergens, showOnItems]
  );

  const setShowOnItems = useCallback(
    (value: boolean) => {
      setShowOnItemsState(value);
      persist(hiddenAllergens, hideUnknown, value);
    },
    [persist, hiddenAllergens, hideUnknown]
  );

  const clearAll = useCallback(() => {
    const empty = new Set<string>();
    setHiddenAllergens(empty);
    setHideUnknownState(false);
    persist(empty, false, showOnItems);
  }, [persist, showOnItems]);

  const activeFilterCount = hiddenAllergens.size + (hideUnknown ? 1 : 0);

  return {
    hiddenAllergens,
    hideUnknown,
    showOnItems,
    toggleAllergen,
    setHideUnknown,
    setShowOnItems,
    clearAll,
    activeFilterCount,
  };
}
