"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "bradley-dining-station-order";

/**
 * Persists user-customized station ordering in localStorage.
 * Takes the default station ID list and returns a possibly-reordered version,
 * plus move helpers.
 */
export function useStationOrder(defaultIds: string[]) {
  const [savedOrder, setSavedOrder] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedOrder(JSON.parse(raw));
    } catch {
      // ignore corrupt data
    }
  }, []);

  const applyOrder = useCallback(
    (ids: string[]): string[] => {
      if (!savedOrder || savedOrder.length === 0) return ids;
      const idSet = new Set(ids);
      const ordered: string[] = [];
      for (const id of savedOrder) {
        if (idSet.has(id)) {
          ordered.push(id);
          idSet.delete(id);
        }
      }
      // Append any new stations not in saved order
      for (const id of ids) {
        if (idSet.has(id)) ordered.push(id);
      }
      return ordered;
    },
    [savedOrder]
  );

  const persist = useCallback((order: string[]) => {
    setSavedOrder(order);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      // quota exceeded etc
    }
  }, []);

  const moveStation = useCallback(
    (orderedIds: string[], stationId: string, direction: -1 | 1) => {
      const idx = orderedIds.indexOf(stationId);
      if (idx < 0) return orderedIds;
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= orderedIds.length) return orderedIds;
      const next = [...orderedIds];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      persist(next);
      return next;
    },
    [persist]
  );

  const resetOrder = useCallback(() => {
    setSavedOrder(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { applyOrder, moveStation, resetOrder, hasCustomOrder: savedOrder !== null };
}
