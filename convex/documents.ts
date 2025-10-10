import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
// import { Id } from "./_generated/dataModel";

export const generateDocuments = mutation({
  args: {
    clientId: v.id("clients"),
    vehicleId: v.id("vehicles"),
    saleDate: v.string(),
    saleAmount: v.number(),
    salesTax: v.number(),
    docFee: v.number(),
    tradeInValue: v.number(),
    downPayment: v.number(),
    totalAmount: v.number(),
    financedAmount: v.number(),
    documents: v.array(v.string()),
    dealershipId: v.id("dealerships"),
    clientEmail: v.string(),
    clientPhone: v.string(),
    vin: v.string(),
    stockNumber: v.string(),
    status: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dealsId: v.string(),
    // dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log("🔍 Identity debug:", {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email
    });

    // Get user's dealership ID - FIXED: Use identity.subject instead of tokenIdentifier
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    console.log("👤 User lookup result:", {
      userFound: !!user,
      userId: user?._id,
      dealershipId: user?.dealershipId
    });

    if (!user) {
      // More detailed error message for debugging
      throw new Error(`User not found for clerkId: ${identity.subject}. Check if user is properly created in database.`);
    }

    if (!user.dealershipId) {
      throw new Error(`User ${user._id} not associated with a dealership`);
    }

    // Verify the user has access to this dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Access denied: User not authorized for this dealership");
    }

    console.log("📄 Creating deal:", {
      clientId: args.clientId,
      vehicleId: args.vehicleId,
      dealershipId: args.dealershipId
    });

    // Create a new deal - let Convex generate the ID automatically
    const dealId = await ctx.db.insert("deals", {
      // id: args.dealsId,
      // firstName: args.firstName,
      // lastName: args.lastName,
      // dealId: args.dealId,
      type: "SALE",
      generated: true,
      vin: args.vin,
      stockNumber: args.stockNumber,
      clientId: args.clientId,
      vehicleId: args.vehicleId,
      dealershipId: user.dealershipId,
      status: args.status,
      saleDate: Date.now(),
      saleAmount: args.saleAmount,
      salesTax: args.salesTax,
      docFee: args.docFee,
      tradeInValue: args.tradeInValue,
      downPayment: args.downPayment,
      totalAmount: args.totalAmount,
      financedAmount: args.financedAmount,
      clientEmail: args.clientEmail,
      clientPhone: args.clientPhone,
      generatedAt: Date.now(),
      clientSignedAt: undefined,
      dealerSignedAt: undefined,
      notarizedAt: undefined,
      documentUrl: "",
      clientSigned: false,
      dealerSigned: false,
      notarized: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("✅ Deal created:", dealId);

    // Create documents for the deal
    const documentIds = await Promise.all(
      args.documents.map(async (docType) => {
        const docId = await ctx.db.insert("documents", {
          dealId,
          type: docType,
          clientSigned: false,
          dealerSigned: false,
          notarized: false,
          documentUrl: "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        console.log(`📄 Document created: ${docType} -> ${docId}`);
        return docId;
      })
    );

    console.log("✅ All documents created:", documentIds);

    return {
      dealId,
      documentIds,
      message: `Deal created successfully with ${documentIds.length} documents`,
    };
  },
});

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user to verify dealership access
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    // Verify user has access to this client's dealership
    if (client.dealershipId !== user.dealershipId) {
      throw new Error("Access denied: Client belongs to different dealership");
    }

    return client;
  },
});

export const getVehicle = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user to verify dealership access
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Verify user has access to this vehicle's dealership
    if (vehicle.dealershipId !== user.dealershipId) {
      throw new Error("Access denied: Vehicle belongs to different dealership");
    }

    return vehicle;
  },
});

// Helper query to debug user lookup issues
export const debugUserLookup = query({
  args: {},
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Not authenticated" };
    }

    // Try to find user with subject
    const userBySubject = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    // Try to find user with tokenIdentifier (wrong way, but for debugging)
    const userByToken = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .first();

    // Get all users for comparison
    const allUsers = await ctx.db.query("users").collect();

    return {
      identity: {
        subject: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email,
      },
      userBySubject: userBySubject ? {
        id: userBySubject._id,
        clerkId: userBySubject.clerkId,
        dealershipId: userBySubject.dealershipId
      } : null,
      userByToken: userByToken ? {
        id: userByToken._id,
        clerkId: userByToken.clerkId,
        dealershipId: userByToken.dealershipId
      } : null,
      allUserClerkIds: allUsers.map(u => u.clerkId),
      recommendation: userBySubject ? "✅ User found with subject" : "❌ User not found - check user creation"
    };
  },
});