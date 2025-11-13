/**
 * Authentication Email Helpers
 * Handles sending emails for verification, password reset, and welcome messages
 */

import { sendEmail, EMAIL_CONFIG } from "../resend/client";

/**
 * Email verification template
 */
export async function sendVerificationEmail(params: {
  email: string;
  name: string;
  verificationToken: string;
}): Promise<void> {
  const verificationUrl = `${process.env.FRONTEND_URL || "https://app.universalautobrokers.net"}/verify-email?token=${params.verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0aadd1 0%, #9333ea 100%); padding: 40px 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Verify Your Email</h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 32px;">
            <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Hi <strong>${params.name}</strong>,
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Thanks for signing up for DealerApps! To complete your registration and start using your account, please verify your email address.
            </p>

            <!-- Verification Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationUrl}"
                 style="display: inline-block; background-color: #0aadd1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(10, 173, 209, 0.2);">
                Verify Email Address
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              Or copy and paste this URL into your browser:<br>
              <a href="${verificationUrl}" style="color: #0aadd1; word-break: break-all;">${verificationUrl}</a>
            </p>

            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                This verification link will expire in 24 hours. If you didn't create an account with DealerApps, you can safely ignore this email.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
              © ${new Date().getFullYear()} DealerApps. All rights reserved.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Universal Auto Brokers<br>
              Support: ${EMAIL_CONFIG.b2b.replyTo}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${params.name},

Thanks for signing up for DealerApps! To complete your registration and start using your account, please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours. If you didn't create an account with DealerApps, you can safely ignore this email.

Best regards,
The DealerApps Team

© ${new Date().getFullYear()} DealerApps - Universal Auto Brokers
Support: ${EMAIL_CONFIG.b2b.replyTo}
  `.trim();

  await sendEmail({
    from: `${EMAIL_CONFIG.b2b.fromName} <${EMAIL_CONFIG.b2b.fromEmail}>`,
    to: params.email,
    subject: "Verify your email address - DealerApps",
    html,
    text,
    replyTo: EMAIL_CONFIG.b2b.replyTo,
    tags: [
      { name: "type", value: "auth_verification" },
      { name: "environment", value: process.env.NODE_ENV || "development" },
    ],
  });
}

/**
 * Password reset email template
 */
export async function sendPasswordResetEmail(params: {
  email: string;
  name: string;
  resetToken: string;
}): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL || "https://app.universalautobrokers.net"}/reset-password?token=${params.resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0aadd1 0%, #9333ea 100%); padding: 40px 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 32px;">
            <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Hi <strong>${params.name}</strong>,
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We received a request to reset the password for your DealerApps account. Click the button below to create a new password:
            </p>

            <!-- Reset Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block; background-color: #0aadd1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(10, 173, 209, 0.2);">
                Reset Password
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              Or copy and paste this URL into your browser:<br>
              <a href="${resetUrl}" style="color: #0aadd1; word-break: break-all;">${resetUrl}</a>
            </p>

            <div style="margin-top: 32px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
              <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0; font-weight: 600;">
                ⚠️ Security Notice
              </p>
              <p style="color: #78350f; font-size: 13px; line-height: 1.6; margin: 8px 0 0 0;">
                This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
              © ${new Date().getFullYear()} DealerApps. All rights reserved.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Universal Auto Brokers<br>
              Support: ${EMAIL_CONFIG.b2b.replyTo}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${params.name},

We received a request to reset the password for your DealerApps account. Click the link below to create a new password:

${resetUrl}

⚠️ SECURITY NOTICE:
This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.

Best regards,
The DealerApps Team

© ${new Date().getFullYear()} DealerApps - Universal Auto Brokers
Support: ${EMAIL_CONFIG.b2b.replyTo}
  `.trim();

  await sendEmail({
    from: `${EMAIL_CONFIG.b2b.fromName} <${EMAIL_CONFIG.b2b.fromEmail}>`,
    to: params.email,
    subject: "Reset your password - DealerApps",
    html,
    text,
    replyTo: EMAIL_CONFIG.b2b.replyTo,
    tags: [
      { name: "type", value: "auth_password_reset" },
      { name: "environment", value: process.env.NODE_ENV || "development" },
    ],
  });
}

/**
 * Send login verification code email
 */
export async function sendLoginCodeEmail(params: {
  email: string;
  name: string;
  code: string;
}): Promise<void> {
  console.log("📧 [EMAIL] sendLoginCodeEmail called:", {
    email: params.email,
    name: params.name,
    codeLength: params.code.length,
  });
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Login Code</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0aadd1 0%, #9333ea 100%); padding: 40px 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Your Login Code</h1>
          </div>

          <!-- Content -->
          <div style="padding: 40px 32px;">
            <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Hi <strong>${params.name}</strong>,
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Use this code to sign in to your DealerApps account:
            </p>

            <!-- Code Display -->
            <div style="text-align: center; margin: 32px 0;">
              <div style="display: inline-block; background-color: #f3f4f6; border: 2px dashed #0aadd1; border-radius: 12px; padding: 24px 40px;">
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0aadd1; font-family: 'Courier New', monospace;">
                  ${params.code}
                </div>
              </div>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email or contact support if you have concerns about your account security.
            </p>

            <div style="margin-top: 32px; padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
              <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0; font-weight: 600;">
                🔒 Security Notice
              </p>
              <p style="color: #78350f; font-size: 13px; line-height: 1.6; margin: 8px 0 0 0;">
                Never share this code with anyone. DealerApps staff will never ask for your verification code.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
              © ${new Date().getFullYear()} DealerApps. All rights reserved.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Universal Auto Brokers<br>
              Support: ${EMAIL_CONFIG.b2b.replyTo}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${params.name},

Use this code to sign in to your DealerApps account:

${params.code}

This code will expire in 10 minutes. If you didn't request this code, please ignore this email or contact support if you have concerns about your account security.

🔒 SECURITY NOTICE:
Never share this code with anyone. DealerApps staff will never ask for your verification code.

Best regards,
The DealerApps Team

© ${new Date().getFullYear()} DealerApps - Universal Auto Brokers
Support: ${EMAIL_CONFIG.b2b.replyTo}
  `.trim();

  try {
    console.log("📧 [EMAIL] Calling sendEmail with:", {
      from: `${EMAIL_CONFIG.b2b.fromName} <${EMAIL_CONFIG.b2b.fromEmail}>`,
      to: params.email,
      subject: "Your DealerApps login code",
      hasHtml: !!html,
      hasText: !!text,
      replyTo: EMAIL_CONFIG.b2b.replyTo,
    });

    const result = await sendEmail({
      from: `${EMAIL_CONFIG.b2b.fromName} <${EMAIL_CONFIG.b2b.fromEmail}>`,
      to: params.email,
      subject: "Your DealerApps login code",
      html,
      text,
      replyTo: EMAIL_CONFIG.b2b.replyTo,
      tags: [
        { name: "type", value: "auth_login_code" },
        { name: "environment", value: process.env.NODE_ENV || "development" },
      ],
    });

    console.log("✅ [EMAIL] sendLoginCodeEmail completed successfully:", {
      email: params.email,
      resultId: result.data?.id,
    });
  } catch (error) {
    console.error("❌ [EMAIL] sendLoginCodeEmail failed:", {
      email: params.email,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Welcome email after successful registration
 */
export async function sendWelcomeEmail(params: {
  email: string;
  name: string;
  businessName?: string;
}): Promise<void> {
  const loginUrl = `${process.env.FRONTEND_URL || "https://app.universalautobrokers.net"}/login`;
  const businessDisplayName = params.businessName || params.name;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DealerApps</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0aadd1 0%, #9333ea 100%); padding: 50px 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 32px; font-weight: bold;">Welcome to DealerApps! 🎉</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 0; font-size: 16px;">Your dealership management system is ready</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 32px;">
            <p style="color: #111827; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              Hi <strong>${params.name}</strong>,
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Congratulations! Your account for <strong>${businessDisplayName}</strong> has been successfully created. You're all set to streamline your dealership operations with DealerApps.
            </p>

            <!-- Quick Start Guide -->
            <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h2 style="color: #115e59; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">🚀 Quick Start Guide</h2>
              <ol style="color: #0f766e; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Complete your profile</strong> - Add your dealership details and branding</li>
                <li><strong>Invite your team</strong> - Add team members with customized permissions</li>
                <li><strong>Import inventory</strong> - Upload your vehicle listings</li>
                <li><strong>Manage deals</strong> - Start tracking your sales pipeline</li>
                <li><strong>Generate documents</strong> - Create professional sales contracts</li>
              </ol>
            </div>

            <!-- Login Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}"
                 style="display: inline-block; background-color: #0aadd1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(10, 173, 209, 0.2);">
                Go to Dashboard
              </a>
            </div>

            <!-- Features Grid -->
            <div style="margin: 32px 0;">
              <h3 style="color: #111827; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">What you can do with DealerApps:</h3>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px; vertical-align: top; width: 50%;">
                    <div style="font-size: 24px; margin-bottom: 8px;">📋</div>
                    <strong style="color: #111827; font-size: 14px;">Inventory Management</strong>
                    <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Track vehicles, pricing, and availability</p>
                  </td>
                  <td style="padding: 12px; vertical-align: top; width: 50%;">
                    <div style="font-size: 24px; margin-bottom: 8px;">👥</div>
                    <strong style="color: #111827; font-size: 14px;">Customer CRM</strong>
                    <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Manage leads and client relationships</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; vertical-align: top;">
                    <div style="font-size: 24px; margin-bottom: 8px;">📄</div>
                    <strong style="color: #111827; font-size: 14px;">Document Generation</strong>
                    <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Create sales contracts and forms</p>
                  </td>
                  <td style="padding: 12px; vertical-align: top;">
                    <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                    <strong style="color: #111827; font-size: 14px;">Analytics & Reports</strong>
                    <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Track performance and sales metrics</p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Support Info -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong style="color: #111827;">Need help getting started?</strong><br>
                Our support team is here to help you succeed. Contact us at <a href="mailto:${EMAIL_CONFIG.b2b.replyTo}" style="color: #0aadd1; text-decoration: none;">${EMAIL_CONFIG.b2b.replyTo}</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
              © ${new Date().getFullYear()} DealerApps. All rights reserved.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Universal Auto Brokers<br>
              Support: ${EMAIL_CONFIG.b2b.replyTo}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to DealerApps! 🎉

Hi ${params.name},

Congratulations! Your account for ${businessDisplayName} has been successfully created. You're all set to streamline your dealership operations with DealerApps.

🚀 QUICK START GUIDE:
1. Complete your profile - Add your dealership details and branding
2. Invite your team - Add team members with customized permissions
3. Import inventory - Upload your vehicle listings
4. Manage deals - Start tracking your sales pipeline
5. Generate documents - Create professional sales contracts

WHAT YOU CAN DO WITH DEALERAPPS:
📋 Inventory Management - Track vehicles, pricing, and availability
👥 Customer CRM - Manage leads and client relationships
📄 Document Generation - Create sales contracts and forms
📊 Analytics & Reports - Track performance and sales metrics

Get started now: ${loginUrl}

NEED HELP?
Our support team is here to help you succeed.
Contact us at ${EMAIL_CONFIG.b2b.replyTo}

Best regards,
The DealerApps Team

© ${new Date().getFullYear()} DealerApps - Universal Auto Brokers
Support: ${EMAIL_CONFIG.b2b.replyTo}
  `.trim();

  await sendEmail({
    from: `${EMAIL_CONFIG.b2b.fromName} <${EMAIL_CONFIG.b2b.fromEmail}>`,
    to: params.email,
    subject: `Welcome to DealerApps, ${params.name}! 🎉`,
    html,
    text,
    replyTo: EMAIL_CONFIG.b2b.replyTo,
    tags: [
      { name: "type", value: "auth_welcome" },
      { name: "environment", value: process.env.NODE_ENV || "development" },
    ],
  });
}
