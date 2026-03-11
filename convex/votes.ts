import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getVotes = query({
  args: {
    skus: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Record<string, { upvotes: number; downvotes: number }> = {};
    for (const sku of args.skus) {
      const doc = await ctx.db
        .query("votes")
        .withIndex("by_sku", (q) => q.eq("sku", sku))
        .unique();
      if (doc) {
        results[sku] = { upvotes: doc.upvotes, downvotes: doc.downvotes };
      }
    }
    return results;
  },
});

export const vote = mutation({
  args: {
    sku: v.string(),
    voteType: v.union(v.literal("up"), v.literal("down")),
    action: v.union(v.literal("add"), v.literal("remove")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .unique();

    const delta = args.action === "add" ? 1 : -1;

    if (existing) {
      const update: { upvotes?: number; downvotes?: number } = {};
      if (args.voteType === "up") {
        update.upvotes = Math.max(0, existing.upvotes + delta);
      } else {
        update.downvotes = Math.max(0, existing.downvotes + delta);
      }
      await ctx.db.patch(existing._id, update);
    } else if (args.action === "add") {
      await ctx.db.insert("votes", {
        sku: args.sku,
        upvotes: args.voteType === "up" ? 1 : 0,
        downvotes: args.voteType === "down" ? 1 : 0,
      });
    }
  },
});
