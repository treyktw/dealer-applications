// convex/debug.ts - Add this file to help debug subscription issues

import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { Doc } from "./_generated/dataModel";
// import { api } from "./_generated/api";

// Debug query to get all user and subscription data
export const debugUserSubscription = query({
  args: {
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Not authenticated" };
    }

    const clerkId = args.clerkId || identity.subject;
    
    console.log("=== DEBUG USER SUBSCRIPTION ===");
    console.log("ClerkId:", clerkId);
    console.log("Identity subject:", identity.subject);
    
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
    
    console.log("User found:", user);
    
    if (!user) {
      return {
        error: "User not found",
        clerkId,
        identity: identity.subject,
      };
    }

    // Get dealership
    let dealership = null;
    if (user.dealershipId) {
      dealership = await ctx.db.get(user.dealershipId);
      console.log("Dealership found:", dealership);
    }

    // Get subscription
    let subscription = null;
    if (user.dealershipId) {
      subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
        .first();
      console.log("Subscription found:", subscription);
    }

    // Get all subscriptions for debugging
    const allSubscriptions = await ctx.db.query("subscriptions").collect();
    console.log("All subscriptions:", allSubscriptions.length);

    return {
      user: {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        dealershipId: user.dealershipId,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionId: user.subscriptionId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      dealership,
      subscription,
      debug: {
        totalSubscriptions: allSubscriptions.length,
        userClerkIdMatch: user.clerkId === clerkId,
        identitySubject: identity.subject,
        searchedClerkId: clerkId,
      },
    };
  },
});

// Debug mutation to force fix user subscription status
export const debugFixUserSubscription = mutation({
  args: {
    userId: v.optional(v.id("users")),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let user: Doc<"users">;
    if (args.userId) {
      user = await ctx.db.get(args.userId) as Doc<"users">;
    } else {
      const clerkId = args.clerkId || identity.subject;
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
        .first() as Doc<"users">;
    }

    if (!user) {
      throw new Error("User not found");
    }

    console.log("=== FIXING USER SUBSCRIPTION ===");
    console.log("User:", user._id, user.email);

    if (!user.dealershipId) {
      console.log("User has no dealership - cannot fix subscription");
      return {
        success: false,
        message: "User has no dealership",
        user: user._id,
      };
    }

    // Get the subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
      .first();

    if (!subscription) {
      console.log("No subscription found for dealership - setting user to inactive");
      await ctx.db.patch(user._id, {
        subscriptionStatus: "inactive",
        subscriptionId: undefined,
        updatedAt: Date.now(),
      });
      return {
        success: true,
        message: "No subscription found, user set to inactive",
        oldStatus: user.subscriptionStatus,
        newStatus: "inactive",
      };
    }

    // console.log("Found subscription:", subscription._id, subscription.status);

    // Update user to match subscription
    await ctx.db.patch(user._id, {
      subscriptionStatus: subscription.status,
      subscriptionId: subscription._id,
      updatedAt: Date.now(),
    });

    // Update dealership reference
    await ctx.db.patch(user.dealershipId as Id<"dealerships">, {
      subscriptionId: subscription._id,
      updatedAt: Date.now(),
    });

    console.log("Fixed user subscription status");

    return {
      success: true,
      message: "User subscription status fixed",
      oldStatus: user.subscriptionStatus,
      newStatus: subscription.status,
      subscriptionId: subscription._id,
    };
  },
});

// Debug query to get all Stripe webhook events (you can add this to track webhook processing)
export const debugStripeWebhooks = query({
  args: {},
  handler: async (ctx) => {
    // This would help track webhook processing
    const subscriptions = await ctx.db.query("subscriptions").collect();
    
    return {
      totalSubscriptions: subscriptions.length,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        dealershipId: sub.dealershipId,
        status: sub.status,
        stripeCustomerId: sub.stripeCustomerId,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        plan: sub.plan,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
    };
  },
});

// Debug mutation to create a test subscription
export const debugCreateTestSubscription = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log("=== CREATING TEST SUBSCRIPTION ===");
    
    const subscriptionId = await ctx.db.insert("subscriptions", {
      dealershipId: args.dealershipId,
      status: args.status || "active",
      plan: "basic",
      billingCycle: "monthly",
      currentPeriodStart: Date.now(),
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      cancelAtPeriodEnd: false,
      stripeCustomerId: "test_customer_" + Date.now(),
      stripeSubscriptionId: "test_sub_" + Date.now(),
      features: ["inventory_management", "basic_reporting", "employee_management", "customer_management"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update dealership
    await ctx.db.patch(args.dealershipId, {
      subscriptionId: subscriptionId,
      updatedAt: Date.now(),
    });

    // Update all users in dealership
    const users = await ctx.db
      .query("users")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    for (const user of users) {
      await ctx.db.patch(user._id, {
        subscriptionStatus: args.status || "active",
        subscriptionId: subscriptionId,
        updatedAt: Date.now(),
      });
    }

    console.log("Created test subscription:", subscriptionId);
    
    return {
      success: true,
      subscriptionId,
      updatedUsers: users.length,
    };
  },
});

// Add this to your convex/debug.ts file - IMMEDIATE FIX function

export const immediateFixCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log("=== IMMEDIATE FIX FOR CURRENT USER ===");
    console.log("ClerkId:", identity.subject);

    // Get the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.dealershipId) {
      throw new Error("User or dealership not found");
    }

    console.log("Found user:", user._id, "with dealership:", user.dealershipId);

    // Get the subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId as Id<"dealerships">))
      .first();

    if (!subscription) {
      throw new Error("No subscription found");
    }

    // console.log("Found subscription:", subscription._id, "with status:", subscription.status);

    // Update user to match subscription status
    const oldUserStatus = user.subscriptionStatus;
    await ctx.db.patch(user._id, {
      subscriptionStatus: subscription.status, // This should be "pending"
      subscriptionId: subscription._id,
      updatedAt: Date.now(),
    });

    console.log(`Fixed user ${user._id} subscription status from ${oldUserStatus} to ${subscription.status}`);

    return {
      success: true,
      message: "User subscription status fixed immediately",
      oldStatus: oldUserStatus,
      newStatus: subscription.status,
      subscriptionId: subscription._id,
      userId: user._id,
    };
  },
});

export const debugUploadIssue = action({
  args: {},
  handler: async (_ctx) => {
    console.log("=== DEBUGGING UPLOAD ISSUE ===");
    
    // Test S3 client configuration
    const { S3Client, ListBucketsCommand, GetBucketCorsCommand } = await import("@aws-sdk/client-s3");
    
    const s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    try {
      // Test 1: Can we connect to S3?
      const buckets = await s3Client.send(new ListBucketsCommand({}));
      console.log("✅ S3 Connection successful");
      console.log("Available buckets:", buckets.Buckets?.map(b => b.Name));

      // Test 2: Find the specific bucket
      const targetBucket = "dealership-js77t2qv8216v89np4vzypdx6d7hp18e";
      const bucketExists = buckets.Buckets?.some(b => b.Name === targetBucket);
      
      if (!bucketExists) {
        console.log("❌ Target bucket not found:", targetBucket);
        return { 
          success: false, 
          error: "Bucket not found",
          availableBuckets: buckets.Buckets?.map(b => b.Name)
        };
      }

      console.log("✅ Target bucket found:", targetBucket);

      // Test 3: Check CORS configuration
      try {
        const corsResponse = await s3Client.send(new GetBucketCorsCommand({
          Bucket: targetBucket
        }));
        console.log("✅ CORS Configuration:", JSON.stringify(corsResponse.CORSRules, null, 2));
      } catch (corsError) {
        console.log("❌ CORS Error:", corsError);
      }

      // Test 4: Generate a test presigned URL
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");

      const testKey = `test-upload-${Date.now()}.jpg`;
      const testContentType = "image/jpeg";

      const uploadUrl = await getSignedUrl(s3Client, new PutObjectCommand({
        Bucket: targetBucket,
        Key: testKey,
        ContentType: testContentType,
        ContentLength: 1024, // 1KB test file
        ServerSideEncryption: 'AES256',
        Metadata: {
          'test': 'true',
          'timestamp': Date.now().toString(),
        },
      }), { 
        expiresIn: 900,
      });

      console.log("✅ Test presigned URL generated successfully");
      console.log("Test upload URL:", uploadUrl);

      return {
        success: true,
        s3Connected: true,
        bucketExists: true,
        testUploadUrl: uploadUrl,
        testKey,
        testContentType,
        instructions: "Try uploading a small test file to this URL with exact Content-Type: " + testContentType
      };

    } catch (error) {
      console.error("❌ S3 Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        env: {
          hasRegion: !!process.env.AWS_REGION,
          hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
          hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION
        }
      };
    }
  }
});

export const testS3Connection = action({
  args: {},
  handler: async (_ctx) => {
    console.log("=== TESTING S3 CONNECTION ===");
    
    try {
      const { S3Client, ListBucketsCommand } = await import("@aws-sdk/client-s3");
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const response = await s3Client.send(new ListBucketsCommand({}));
      
      return {
        success: true,
        bucketCount: response.Buckets?.length || 0,
        buckets: response.Buckets?.map(b => b.Name) || [],
        region: process.env.AWS_REGION
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        region: process.env.AWS_REGION
      };
    }
  }
});