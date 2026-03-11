"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface VoteButtonsProps {
  sku: string;
  upvotes: number;
  downvotes: number;
  localVote: "up" | "down" | null;
  onVote: (sku: string, vote: "up" | "down" | null) => void;
}

export default function VoteButtons({ sku, upvotes, downvotes, localVote, onVote }: VoteButtonsProps) {
  const voteMutation = useMutation(api.votes.vote);
  const [animating, setAnimating] = useState<"up" | "down" | null>(null);

  const handleVote = async (type: "up" | "down") => {
    setAnimating(type);
    setTimeout(() => setAnimating(null), 300);

    if (localVote === type) {
      onVote(sku, null);
      await voteMutation({ sku, voteType: type, action: "remove" });
    } else {
      if (localVote !== null) {
        await voteMutation({ sku, voteType: localVote, action: "remove" });
      }
      onVote(sku, type);
      await voteMutation({ sku, voteType: type, action: "add" });
    }
  };

  const score = upvotes - downvotes;

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {/* Upvote */}
      <button
        onClick={() => handleVote("up")}
        className={`vote-btn flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          localVote === "up"
            ? "bg-upvote-bg text-upvote"
            : "text-muted hover:bg-surface-warm hover:text-upvote"
        }`}
        aria-label="Upvote"
      >
        <svg
          className={`h-4 w-4 ${animating === "up" ? "animate-pop" : ""}`}
          fill={localVote === "up" ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={localVote === "up" ? 0 : 2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Score */}
      <span
        className={`min-w-[1.75rem] text-center text-sm font-bold tabular-nums transition-colors ${
          score > 0
            ? "text-upvote"
            : score < 0
              ? "text-downvote"
              : "text-muted"
        } ${animating ? "animate-pop" : ""}`}
      >
        {score}
      </span>

      {/* Downvote */}
      <button
        onClick={() => handleVote("down")}
        className={`vote-btn flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          localVote === "down"
            ? "bg-downvote-bg text-downvote"
            : "text-muted hover:bg-surface-warm hover:text-downvote"
        }`}
        aria-label="Downvote"
      >
        <svg
          className={`h-4 w-4 ${animating === "down" ? "animate-pop" : ""}`}
          fill={localVote === "down" ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={localVote === "down" ? 0 : 2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
