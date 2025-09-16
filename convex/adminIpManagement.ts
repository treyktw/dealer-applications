import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all allowed IPs (ordered by createdAt desc)
export const getAllowedIPs = query(async ({ db }) => {
  // Convex doesn't support ordering yet, so sort in JS
  const ips = await db.query("allowedIPs").collect();
  return ips.sort((a, b) => b.createdAt - a.createdAt);
});

// Add a new allowed IP
export const addAllowedIP = mutation({
  args: {
    ip: v.string(),
    description: v.optional(v.string()),
    userId: v.optional(v.string()), // Pass the userId from the client/auth context
  },
  handler: async ({ db }, { ip, description }) => {
    // Basic IP validation (IPv4/IPv6)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([\\da-f]{1,4}:){7}[\\da-f]{1,4}$/i;
    if (!ip || (!ipv4Regex.test(ip) && !ipv6Regex.test(ip))) {
      throw new Error("Invalid IP address format");
    }

    // Check for duplicates
    const existing = await db
      .query("allowedIPs")
      .filter((q) => q.eq(q.field("ip"), ip))
      .first();
    if (existing) throw new Error("IP address already exists");

    // Insert new IP
    await db.insert("allowedIPs", {
      ip,
      description: description ?? "Added manually",
      isActive: true,
      createdAt: Date.now(),
      // Optionally store userId if you want to track who added it
    });
    return { success: true };
  },
});

// Delete an allowed IP
export const deleteAllowedIP = mutation({
  args: { ip: v.string() },
  handler: async ({ db }, { ip }) => {
    const existing = await db
      .query("allowedIPs")
      .filter((q) => q.eq(q.field("ip"), ip))
      .first();
    if (!existing) throw new Error("IP not found");
    await db.delete(existing._id);
    return { success: true };
  },
});
