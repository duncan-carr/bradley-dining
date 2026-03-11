"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "bradley-dining-votes";

type VoteState = "up" | "down" | null;
type VotesMap = Record<string, VoteState>;

function loadVotes(): VotesMap {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveVotes(votes: VotesMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function useLocalVotes() {
  const [votes, setVotes] = useState<VotesMap>({});

  useEffect(() => {
    setVotes(loadVotes());
  }, []);

  const getVote = useCallback(
    (sku: string): VoteState => votes[sku] ?? null,
    [votes]
  );

  const setVote = useCallback((sku: string, vote: VoteState) => {
    setVotes((prev) => {
      const next = { ...prev };
      if (vote === null) {
        delete next[sku];
      } else {
        next[sku] = vote;
      }
      saveVotes(next);
      return next;
    });
  }, []);

  return { getVote, setVote };
}
