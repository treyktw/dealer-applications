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
    // Resend requires either html or text
    if (!params.html && !params.text) {
      throw new Error("Email must have either html or text content");
    }

    const emailOptions: {
      from: string;
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      replyTo?: string;
      tags?: { name: string; value: string }[];
    } = {
      from: params.from,
      to: params.to,
      subject: params.subject,
    };

    if (params.html) {
      emailOptions.html = params.html;
    }
    if (params.text) {
      emailOptions.text = params.text;
    }
    if (params.replyTo) {
      emailOptions.replyTo = params.replyTo;
    }
    if (params.tags) {
      emailOptions.tags = params.tags;
    }

    // Type assertion: We've validated that at least html or text exists
    const result = await resend.emails.send(emailOptions as Parameters<typeof resend.emails.send>[0]);

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
    // Resend batch requires html or text, so ensure at least one is present
    const validEmails = emails.map((email) => {
      if (!email.html && !email.text) {
        throw new Error(`Email to ${email.to} must have either html or text content`);
      }

      const emailOptions: {
        from: string;
        to: string;
        subject: string;
        html?: string;
        text?: string;
        replyTo?: string;
        tags?: { name: string; value: string }[];
      } = {
        from: email.from,
        to: email.to,
        subject: email.subject,
      };

      if (email.html) {
        emailOptions.html = email.html;
      }
      if (email.text) {
        emailOptions.text = email.text;
      }
      if (email.replyTo) {
        emailOptions.replyTo = email.replyTo;
      }
      if (email.tags) {
        emailOptions.tags = email.tags;
      }

      return emailOptions;
    });

    // Type assertion: We've validated that at least html or text exists for each email
    const result = await resend.batch.send(validEmails as Parameters<typeof resend.batch.send>[0]);
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
    fromEmail: process.env.PLATFORM_EMAIL || "noreply@universalautobrokers.net",
    fromName: "DealerApps Platform",
    replyTo: process.env.SUPPORT_EMAIL || "support@universalautobrokers.net",
  },

  // B2C (Dealers to Clients) - dealers will provide their own
  b2c: {
    defaultFromEmail: "noreply@", // Will be prefixed with dealership domain
    replyToSuffix: "@", // Will use dealership contact email
  },

  // System emails
  system: {
    fromEmail: process.env.SYSTEM_EMAIL || "system@universalautobrokers.net",
    fromName: "DealerApps System",
  },
};
