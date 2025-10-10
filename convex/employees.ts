// convex/employees.ts - Updated with React Email Integration
import { mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

// Create a new employee invitation
export const createInvitation = mutation({
  args: {
    email: v.string(),
    role: v.string(),
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Use identity.subject consistently
    const inviter = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!inviter || inviter.role !== "ADMIN") {
      throw new ConvexError("Not authorized to create invitations");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new ConvexError("User already exists");
    }

    // Check for existing invitation and handle gracefully
    const existingInvitation = await ctx.db
      .query("invitations")
      .filter((q) => 
        q.and(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    let invitationId: Id<"invitations">;
    let isUpdate = false;

    if (existingInvitation) {
      // Update existing invitation instead of throwing error
      await ctx.db.patch(existingInvitation._id, {
        role: args.role,
        dealershipId: args.dealershipId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // Extend expiry
        invitedBy: inviter._id,
        updatedAt: Date.now(),
      });
      invitationId = existingInvitation._id;
      isUpdate = true;
    } else {
      // Generate a unique token for the invitation
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // Create new invitation
      invitationId = await ctx.db.insert("invitations", {
        email: args.email,
        role: args.role,
        dealershipId: args.dealershipId,
        status: "pending",
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        invitedBy: inviter._id,
        token,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Get dealership info
    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) {
      throw new ConvexError("Dealership not found");
    }

    // Get the invitation to get the token
    const invitation = await ctx.db.get(invitationId);
    if (!invitation) {
      throw new ConvexError("Failed to create invitation");
    }

    // Send invitation email via action
    try {
      // Use fallback URL if env var is not set and ensure proper protocol
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Ensure baseUrl has protocol
      const normalizedBaseUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
      
      const inviteLink = `${normalizedBaseUrl}/invitation/${invitation.token}`;
      
      console.log("Generated invite link:", inviteLink); // Debug log
      
      // Call the email sending action with React Email template
      await ctx.scheduler.runAfter(0, internal.employees.sendInvitationEmailAction, {
        email: args.email,
        inviteLink,
        inviterName: inviter.name,
        dealershipName: dealership.name,
        role: args.role,
        companyLogo: dealership.logo || undefined,
      });

      return { 
        invitationId, 
        success: true, 
        message: isUpdate ? "Invitation updated and resent" : "Invitation sent successfully" 
      };
    } catch (emailError) {
      console.error("Failed to schedule email:", emailError);
      // Don't fail the entire operation if email fails
      return { 
        invitationId, 
        success: true, 
        message: "Invitation created but email failed to send. Please contact support." 
      };
    }
  },
});

// Email sending action using React Email via rendering API
export const sendInvitationEmailAction = internalAction({
  args: {
    email: v.string(),
    inviteLink: v.string(),
    inviterName: v.string(),
    dealershipName: v.string(),
    role: v.string(),
    companyLogo: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured in Convex");
      throw new Error("Email service not configured");
    }

    try {
      console.log('📧 Starting email sending process for:', args.email);

      // Step 1: Render the email template using Next.js API (only in development)
      let emailHtml: string;
      let emailText: string;

      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      if (isDevelopment) {
        // Try to render using Next.js API (development only)
        try {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const normalizedBaseUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
          const apiSecret = process.env.INTERNAL_API_SECRET;

          if (apiSecret) {
            console.log('🎨 Attempting to render email via Next.js API...');
            
            const renderResponse = await fetch(`${normalizedBaseUrl}/api/render-invitation-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiSecret}`,
              },
              body: JSON.stringify({
                inviteLink: args.inviteLink,
                inviterName: args.inviterName,
                dealershipName: args.dealershipName,
                role: args.role,
                companyLogo: args.companyLogo,
              }),
            });

            if (renderResponse.ok) {
              const renderResult = await renderResponse.json();
              emailHtml = renderResult.html;
              emailText = renderResult.text;
              console.log('✅ Email template rendered via Next.js API');
            } else {
              throw new Error('Failed to render via API');
            }
          } else {
            throw new Error('No API secret configured');
          }
        } catch (renderError) {
          console.log('⚠️ Fallback to simple HTML template:', renderError);
          // Fallback to simple template
          ({ html: emailHtml, text: emailText } = generateSimpleEmailTemplate(args));
        }
      } else {
        // Production: use simple template (or implement a different rendering strategy)
        console.log('🏭 Production mode: using simple email template');
        ({ html: emailHtml, text: emailText } = generateSimpleEmailTemplate(args));
      }

      // Step 2: Send email via Resend
      console.log('📤 Sending email via Resend...');
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DealerHub Pro <noreply@universalautobrokers.net>",
          to: args.email,
          subject: `🚗 Join ${args.dealershipName} on DealerHub Pro`,
          html: emailHtml,
          text: emailText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("❌ Resend API error:", response.status, errorData);
        throw new Error(`Email service error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log("✅ Email sent successfully:", result);
      
      return { 
        success: true, 
        emailId: result.id,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error("❌ Error sending invitation email:", error);
      throw error;
    }
  },
});

// Simple email template fallback
function generateSimpleEmailTemplate(args: {
  inviteLink: string;
  inviterName: string;
  dealershipName: string;
  role: string;
  companyLogo?: string;
}): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Join ${args.dealershipName} on DealerHub Pro</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        ${args.companyLogo ? `<img src="${args.companyLogo}" alt="Company Logo" style="max-width: 200px; margin-bottom: 20px;">` : ''}
        <h1 style="color: #333; margin: 0;">🚗 You're Invited!</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border-radius: 10px; border: 1px solid #ddd; margin-bottom: 30px;">
        <h2 style="color: #333; margin-top: 0;">Join ${args.dealershipName}</h2>
        <p><strong>${args.inviterName}</strong> has invited you to join <strong>${args.dealershipName}</strong> as a <strong>${args.role}</strong>.</p>
        <p>Get started with our comprehensive dealer management platform and streamline your operations from day one.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${args.inviteLink}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Accept Invitation →
          </a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">What you'll get access to:</h3>
          <ul>
            <li>📊 Sales Analytics Dashboard</li>
            <li>🚗 Inventory Management</li>
            <li>👥 Customer Relationship Tools</li>
            <li>💰 Financial Reporting</li>
          </ul>
        </div>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 14px;">
        <p>This invitation expires in <strong>7 days</strong>.</p>
        <p>Can't see the button? <a href="${args.inviteLink}">Click here to accept your invitation</a></p>
        <p>© ${new Date().getFullYear()} DealerHub Pro. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
You're invited to join ${args.dealershipName}!

${args.inviterName} has invited you to join ${args.dealershipName} as a ${args.role}.

Click here to accept your invitation: ${args.inviteLink}

What you'll get access to:
• Sales Analytics Dashboard
• Inventory Management  
• Customer Relationship Tools
• Financial Reporting

This invitation expires in 7 days.

If you can't click the link, copy and paste it into your browser.

© ${new Date().getFullYear()} DealerHub Pro. All rights reserved.
  `.trim();

  return { html, text };
}

// Verify invitation token
export const verifyInvitation = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();

    if (!invitation) {
      throw new ConvexError("Invalid invitation token");
    }

    // Check if invitation has expired
    if (invitation.expiresAt < Date.now()) {
      throw new ConvexError("Invitation has expired");
    }

    // Allow access for pending and accepted invitations
    if (invitation.status !== "pending" && invitation.status !== "accepted") {
      throw new ConvexError(`Invitation is ${invitation.status}`);
    }

    // Get dealership info
    const dealership = await ctx.db.get(invitation.dealershipId);

    return {
      email: invitation.email,
      role: invitation.role,
      dealershipId: invitation.dealershipId,
      dealershipName: dealership?.name || "Unknown Dealership",
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    };
  },
});

export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    clerkId: v.optional(v.string()), // Accept clerkId explicitly
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // Use explicit clerkId if provided, otherwise use identity
    const userClerkId = args.clerkId || identity?.subject;
    
    if (!userClerkId) {
      throw new ConvexError("Not authenticated - no user ID available");
    }

    const invitation = await ctx.db
      .query("invitations")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();

    if (!invitation) {
      throw new ConvexError("Invalid invitation token");
    }

    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, {
        status: "expired",
        updatedAt: Date.now(),
      });
      throw new ConvexError("Invitation has expired");
    }

    // Check if invitation is already accepted
    if (invitation.status === "accepted") {
      // Check if user already exists for this invitation
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", userClerkId))
        .first();
      
      if (existingUser) {
        throw new ConvexError("Invitation has already been accepted and user account exists");
      }
      
      // If no user exists but invitation is accepted, allow re-acceptance
      console.log("Re-accepting invitation for user creation");
    } else if (invitation.status !== "pending") {
      throw new ConvexError(`Invitation is ${invitation.status}`);
    }

    // Check if user already exists (prevent duplicates)
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userClerkId))
      .first();

    if (existingUser) {
      // User already exists, just update their dealership and role if needed
      if (!existingUser.dealershipId || existingUser.dealershipId !== invitation.dealershipId) {
        await ctx.db.patch(existingUser._id, {
          dealershipId: invitation.dealershipId,
          role: invitation.role, // Update to invited role
          updatedAt: Date.now(),
        });
      }

      // Check if employee record exists
      const existingEmployee = await ctx.db
        .query("employees")
        .withIndex("by_user", (q) => q.eq("userId", existingUser._id.toString()))
        .first();

      let employeeId = existingEmployee?._id;

      if (!existingEmployee) {
        // Create employee record if it doesn't exist
        employeeId = await ctx.db.insert("employees", {
          userId: existingUser._id.toString(), // Convert to string to match schema
          dealershipId: invitation.dealershipId.toString(), // Convert to string to match schema
          jobTitle: invitation.role,
          department: "General",
          startDate: Date.now(),
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        console.log("Created employee record for existing user:", employeeId);
      }
      
      // Update invitation status
      await ctx.db.patch(invitation._id, {
        status: "accepted",
        updatedAt: Date.now(),
      });
      
      return { 
        userId: existingUser._id, 
        employeeId, 
        message: "Welcome back! Account updated with invitation." 
      };
    }

    console.log("Creating new user with invitation data:", {
      clerkId: userClerkId,
      email: invitation.email,
      role: invitation.role,
      dealershipId: invitation.dealershipId,
    });

    // Create user with the INVITED role and dealership
    const userId = await ctx.db.insert("users", {
      email: invitation.email,
      name: args.name,
      role: invitation.role, // Use the role from invitation, NOT default ADMIN
      permissions: getDefaultPermissions(invitation.role),
      dealershipId: invitation.dealershipId, // Set dealership from invitation
      isActive: true,
      clerkId: userClerkId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      needsOnboarding: true,
      lastLogin: Date.now(),
      subscriptionStatus: "inactive", // Will be updated by subscription system
    });

    console.log("Created user successfully:", userId);

    // Create employee record for invited users
    const employeeId = await ctx.db.insert("employees", {
      userId: userId.toString(), // Convert to string to match schema
      dealershipId: invitation.dealershipId.toString(), // Convert to string to match schema
      jobTitle: invitation.role, // Use role as default job title
      department: "General", // Default department, can be updated later
      startDate: Date.now(),
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("Created employee record successfully:", employeeId);

    // Update invitation status
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      updatedAt: Date.now(),
    });

    console.log("Invitation marked as accepted");

    return { userId, employeeId, message: "Account and employee record created successfully!" };
  },
});

// Get all invitations for a dealership
export const getDealershipInvitations = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .order("desc")
      .collect();

    return invitations;
  },
});

// Revoke an invitation (supports both invitations and userInvitations tables)
export const revokeInvitation = mutation({
  args: {
    invitationId: v.string(), // Use string to handle both types
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const revoker = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!revoker || revoker.role !== "ADMIN") {
      throw new ConvexError("Not authorized to revoke invitations");
    }

    // Try to find in invitations table first
    const invitation = await ctx.db
      .query("invitations")
      .filter((q) => q.eq(q.field("_id"), args.invitationId))
      .first();

    if (invitation) {
      // Handle new invitations table
      if (invitation.status !== "pending") {
        throw new ConvexError("Invitation is no longer valid");
      }

      await ctx.db.patch(invitation._id, {
        status: "revoked",
        updatedAt: Date.now(),
      });

      return { success: true };
    }

    // Try to find in userInvitations table (legacy)
    const userInvitation = await ctx.db
      .query("invitations")
      .filter((q) => q.eq(q.field("_id"), args.invitationId))
      .first();

    if (userInvitation) {
      // Handle legacy userInvitations table
      if (userInvitation.status === "accepted") {
        throw new ConvexError("Invitation has already been accepted");
      }

      // For userInvitations, we just delete it
      await ctx.db.delete(userInvitation._id);
      return { success: true };
    }

    throw new ConvexError("Invitation not found");
  },
});

// Helper function to get default permissions based on role
function getDefaultPermissions(role: string): string[] {
  const basePermissions = ["view_dashboard", "view_profile"];
  
  switch (role) {
    case "ADMIN":
      return [
        ...basePermissions,
        "manage_users",
        "manage_roles",
        "manage_invitations",
        "manage_settings",
        "view_reports",
        "manage_inventory",
        "manage_deals",
        "manage_documents",
      ];
    case "MANAGER":
      return [
        ...basePermissions,
        "view_reports",
        "manage_inventory",
        "manage_deals",
        "manage_documents",
      ];
    case "EMPLOYEE":
      return [
        ...basePermissions,
        "view_inventory",
        "view_deals",
        "view_documents",
      ];
    default:
      return basePermissions;
  }
}

// Additional employee queries to add to employees.ts

// Get current user's employee record
export const getCurrentUserEmployee = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Get employee record
    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", user._id.toString()))
      .first();

    if (!employee) {
      return null;
    }

    // Get dealership info
    const dealership = await ctx.db.get(employee.dealershipId as Id<"dealerships">);

    return {
      ...employee,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
      dealership: dealership ? {
        _id: dealership._id,
        name: dealership.name,
        logo: dealership.logo,
      } : null,
    };
  },
});

// Get all employees for a dealership (admin only)
export const getDealershipEmployees = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Check if user is admin
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Not authorized to view employees");
    }

    // Get all employees for the dealership
    const employees = await ctx.db
      .query("employees")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId.toString()))
      .collect();

    // Get user info for each employee
    const employeesWithUsers = await Promise.all(
      employees.map(async (employee) => {
        const user = await ctx.db.get(employee.userId as Id<"users">);
        return {
          ...employee,
          user: user ? {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
          } : null,
        };
      })
    );

    return employeesWithUsers.filter(emp => emp.user !== null);
  },
});

// Update employee information
export const updateEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    jobTitle: v.optional(v.string()),
    department: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      throw new ConvexError("Employee not found");
    }

    // Check if user is admin or updating their own record
    const isAdmin = currentUser.role === "ADMIN";
    const isOwnRecord = employee.userId === currentUser._id.toString();

    if (!isAdmin && !isOwnRecord) {
      throw new ConvexError("Not authorized to update this employee");
    }

    // Update employee record
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.jobTitle !== undefined) updateData.jobTitle = args.jobTitle;
    if (args.department !== undefined) updateData.department = args.department;
    if (args.phoneNumber !== undefined) updateData.phoneNumber = args.phoneNumber;
    if (args.address !== undefined) updateData.address = args.address;

    await ctx.db.patch(args.employeeId, updateData);

    return { success: true };
  },
});

export const deleteEmployeeByUserId = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Deleting employee by user ID:", args.userId);

    // Find employee record by user ID
    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!employee) {
      console.log("Employee record not found for user ID:", args.userId);
      return { success: true, message: "Employee record not found" };
    }

    try {
      await ctx.db.delete(employee._id);
      console.log("Employee record deleted successfully:", employee._id);
      return { success: true, message: "Employee record deleted successfully" };
    } catch (error) {
      console.error("Error deleting employee record:", error);
      throw new ConvexError("Failed to delete employee record");
    }
  },
});

// Bulk deactivate employees
export const bulkDeactivateEmployees = mutation({
  args: {
    employeeIds: v.array(v.id("employees")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Not authorized");
    }

    const results = [];

    for (const employeeId of args.employeeIds) {
      try {
        const employee = await ctx.db.get(employeeId);
        
        if (!employee) {
          results.push({ employeeId, success: false, error: "Employee not found" });
          continue;
        }

        // Check if employee belongs to same dealership
        if (employee.dealershipId !== currentUser.dealershipId?.toString()) {
          results.push({ employeeId, success: false, error: "Employee not in same dealership" });
          continue;
        }

        // Deactivate employee
        await ctx.db.patch(employeeId, {
          isActive: false,
          updatedAt: Date.now(),
        });

        // Also deactivate the user record
        const user = await ctx.db.get(employee.userId as Id<"users">);
        if (user) {
          await ctx.db.patch(user._id, {
            isActive: false,
            updatedAt: Date.now(),
          });

          // Update Clerk metadata
          await ctx.scheduler.runAfter(0, internal.clerk.updateUserInClerk, {
            clerkId: user.clerkId,
            publicMetadata: {
              role: user.role,
              dealershipId: user.dealershipId?.toString(),
              isActive: false,
            },
          });
        }

        results.push({ employeeId, success: true });
      } catch (error) {
        results.push({ 
          employeeId, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return { results };
  },
});

// Get employee analytics
export const getEmployeeAnalytics = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Not authorized to view analytics");
    }

    // Get all employees for the dealership
    const employees = await ctx.db
      .query("employees")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId.toString()))
      .collect();

    const activeEmployees = employees.filter(emp => emp.isActive);
    const inactiveEmployees = employees.filter(emp => !emp.isActive);

    // Group by department
    const departmentCounts = employees.reduce((acc: Record<string, number>, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {});

    // Group by role
    const users = await Promise.all(
      employees.map(emp => ctx.db.get(emp.userId as Id<"users">))
    );
    
    const roleCounts = users.reduce((acc: Record<string, number>, user) => {
      if (user) {
        acc[user.role] = (acc[user.role] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      total: employees.length,
      active: activeEmployees.length,
      inactive: inactiveEmployees.length,
      departmentBreakdown: departmentCounts,
      roleBreakdown: roleCounts,
      recentHires: employees
        .filter(emp => emp.startDate > Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        .length,
    };
  },
});