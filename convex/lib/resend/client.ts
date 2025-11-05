// convex/lib/resend/client.ts
// Resend email service integration

import { Resend } from "resend";

// Initialize Resend client
// Get API key from environment variables
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("RESEND_API_KEY not set - email functionality will be disabled");
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Email sending helper with error handling
export async function sendEmail(params: {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}) {
  if (!resend) {
    throw new Error("Resend is not configured - RESEND_API_KEY missing");
  }

  try {
    const result = await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo,
      tags: params.tags,
    });

    return result;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}

// Batch email sending
export async function sendBatchEmails(
  emails: Array<{
    from: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
    tags?: { name: string; value: string }[];
  }>
) {
  if (!resend) {
    throw new Error("Resend is not configured - RESEND_API_KEY missing");
  }

  try {
    const result = await resend.batch.send(emails);
    return result;
  } catch (error) {
    console.error("Failed to send batch emails:", error);
    throw error;
  }
}

// Template variable replacement
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(regex, value || "");
  }
  return result;
}

// Default email configurations
export const EMAIL_CONFIG = {
  // B2B (Platform to Dealers)
  b2b: {
    fromEmail: process.env.PLATFORM_EMAIL || "noreply@dealerapps.com",
    fromName: "DealerApps Platform",
    replyTo: process.env.SUPPORT_EMAIL || "support@dealerapps.com",
  },

  // B2C (Dealers to Clients) - dealers will provide their own
  b2c: {
    defaultFromEmail: "noreply@", // Will be prefixed with dealership domain
    replyToSuffix: "@", // Will use dealership contact email
  },

  // System emails
  system: {
    fromEmail: process.env.SYSTEM_EMAIL || "system@dealerapps.com",
    fromName: "DealerApps System",
  },
};
