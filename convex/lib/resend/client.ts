// convex/lib/resend/client.ts
// Resend email service integration

import { Resend } from "resend";

// Initialize Resend client
// Get API key from environment variables
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("⚠️ [RESEND] RESEND_API_KEY not set - email functionality will be disabled");
} else {
  // console.log("✅ [RESEND] Resend client initialized with API key (length:", resendApiKey.length, ")");
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

if (resend) {
  // console.log("✅ [RESEND] Resend client created successfully");
} else {
  console.error("❌ [RESEND] Resend client is null - emails will fail");
}

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
  console.log("📧 [RESEND] sendEmail called:", {
    to: params.to,
    subject: params.subject,
    hasHtml: !!params.html,
    hasText: !!params.text,
    from: params.from,
  });

  if (!resend) {
    console.error("❌ [RESEND] Resend client not initialized - RESEND_API_KEY missing");
    throw new Error("Resend is not configured - RESEND_API_KEY missing");
  }

  if (!resendApiKey) {
    console.error("❌ [RESEND] RESEND_API_KEY environment variable not set");
    throw new Error("Resend is not configured - RESEND_API_KEY missing");
  }

  try {
    // Resend requires either html or text
    if (!params.html && !params.text) {
      console.error("❌ [RESEND] Email must have either html or text content");
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

    console.log("📤 [RESEND] Sending email via Resend API...", {
      from: emailOptions.from,
      to: emailOptions.to,
      subject: emailOptions.subject,
      hasHtml: !!emailOptions.html,
      hasText: !!emailOptions.text,
    });

    // Use fetch directly instead of SDK to ensure proper error handling
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailOptions),
    });

    console.log("📋 [RESEND] HTTP Response status:", response.status, response.statusText);

    const responseText = await response.text();
    console.log("📋 [RESEND] Raw response body:", responseText);

    if (!response.ok) {
      let errorMessage = `Resend API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error?.message || errorMessage;
        console.error("❌ [RESEND] Resend API error details:", errorData);
      } catch {
        console.error("❌ [RESEND] Resend API error (non-JSON):", responseText);
      }
      throw new Error(errorMessage);
    }

    let result: { id?: string; [key: string]: unknown };
    try {
      result = JSON.parse(responseText) as { id?: string; [key: string]: unknown };
    } catch {
      console.error("❌ [RESEND] Failed to parse response as JSON:", responseText);
      throw new Error("Invalid JSON response from Resend API");
    }

    console.log("📋 [RESEND] Parsed response:", {
      hasId: !!result.id,
      id: result.id,
      keys: Object.keys(result),
    });

    // Check if we got a valid response
    if (!result.id) {
      console.error("❌ [RESEND] Invalid response from Resend API - no email ID returned:", result);
      throw new Error("Resend API did not return a valid email ID. Check your API key and domain verification.");
    }

    console.log("✅ [RESEND] Email sent successfully:", {
      id: result.id,
      to: params.to,
      subject: params.subject,
    });

    // Return in SDK-compatible format
    return {
      data: { id: result.id },
      error: null,
    };
  } catch (error) {
    console.error("❌ [RESEND] Failed to send email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      to: params.to,
      subject: params.subject,
    });
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
