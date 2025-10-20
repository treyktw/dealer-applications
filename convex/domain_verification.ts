import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { requireAdmin } from "./guards";
import { api } from "./_generated/api";

/**
 * Generate a cryptographically secure random string
 * Uses Web Crypto API available in Convex runtime
 */
function generateSecureRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate verification token
export const createDomainVerification = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    domain: v.string(), // e.g., "example-dealer.com"
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    
    // Validate domain format
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    if (!domainRegex.test(args.domain)) {
      throw new Error("Invalid domain format");
    }
    
    // Check if domain already exists
    const existing = await ctx.db
      .query("verifiedDomains")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();
    
    if (existing && existing.status === "verified") {
      throw new Error("Domain already verified");
    }
    
    // Generate random token (32 hex characters = 16 bytes)
    const verificationToken = generateSecureRandomString(16);
    
    // Create or update verification record
    if (existing) {
      await ctx.db.patch(existing._id, {
        verificationToken,
        status: "pending",
        verificationAttempts: 0,
        updatedAt: Date.now(),
      });
      
      return {
        domainId: existing._id,
        verificationToken,
      };
    }
    
    const domainId = await ctx.db.insert("verifiedDomains", {
      dealershipId: args.dealershipId,
      domain: args.domain,
      verificationType: "http_file",
      verificationToken,
      status: "pending",
      verificationAttempts: 0,
      createdBy: user._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return {
      domainId,
      verificationToken,
      downloadUrl: `/api/domain-verify/download?token=${verificationToken}`,
    };
  },
});

// Verify domain (fetch and validate)
export const verifyDomain = action({
  args: {
    domainId: v.id("verifiedDomains"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> => {
    // Get domain record
    const domain = await ctx.runQuery(api.domain_verification.getDomainById, {
      domainId: args.domainId,
    });
    
    if (!domain) {
      throw new Error("Domain not found");
    }
    
    if (domain.verificationAttempts >= 5) {
      throw new Error("Too many verification attempts. Please generate a new token.");
    }
    
    try {
      // Fetch verification file
      const verifyUrl = `https://${domain.domain}/.well-known/uab-verify.txt`;
      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'UAB-Dealer-Verifier/1.0',
        },
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        await ctx.runMutation(api.domain_verification.updateVerificationAttempt, {
          domainId: args.domainId,
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
        
        return {
          success: false,
          error: `Could not fetch verification file. HTTP ${response.status}`,
        };
      }
      
      const fileContent = await response.text();
      const expectedToken = domain.verificationToken.trim();
      const actualToken = fileContent.trim();
      
      if (actualToken === expectedToken) {
        // Success!
        await ctx.runMutation(api.domain_verification.markDomainVerified, {
          domainId: args.domainId,
        });
        
        return {
          success: true,
          message: "Domain verified successfully!",
        };
      } else {
        await ctx.runMutation(api.domain_verification.updateVerificationAttempt, {
          domainId: args.domainId,
          success: false,
          error: "Token mismatch",
        });
        
        return {
          success: false,
          error: "Verification token does not match. Please check the file content.",
        };
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await ctx.runMutation(api.domain_verification.updateVerificationAttempt, {
        domainId: args.domainId,
        success: false,
        error: errorMessage,
      });
      
      return {
        success: false,
        error: `Failed to verify domain: ${errorMessage}`,
      };
    }
  },
});

// Helper mutations
export const updateVerificationAttempt = mutation({
  args: {
    domainId: v.id("verifiedDomains"),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (!domain) return;
    
    await ctx.db.patch(args.domainId, {
      verificationAttempts: (domain.verificationAttempts || 0) + 1,
      lastCheckedAt: Date.now(),
      status: args.success ? "verified" : "failed",
      updatedAt: Date.now(),
    });
  },
});

export const markDomainVerified = mutation({
  args: {
    domainId: v.id("verifiedDomains"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.domainId, {
      status: "verified",
      verifiedAt: Date.now(),
      lastCheckedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get domain by ID
export const getDomainById = query({
  args: {
    domainId: v.id("verifiedDomains"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.domainId);
  },
});

// List domains for dealership
export const listDomainsForDealership = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    return await ctx.db
      .query("verifiedDomains")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();
  },
});

// Check if a domain is verified for a dealership (public query for CORS)
export const isDomainVerified = query({
  args: {
    domain: v.string(),
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const domain = await ctx.db
      .query("verifiedDomains")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();
    
    if (!domain) {
      return { verified: false };
    }
    
    // Check if domain belongs to dealership and is verified
    const isVerified = domain.dealershipId === args.dealershipId && domain.status === "verified";
    
    return {
      verified: isVerified,
      domainId: isVerified ? domain._id : undefined,
    };
  },
});