import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  votes: defineTable({
    sku: v.string(),
    upvotes: v.number(),
    downvotes: v.number(),
  }).index("by_sku", ["sku"]),
});
