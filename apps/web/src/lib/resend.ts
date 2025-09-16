import { Resend } from 'resend';

// Initialize Resend with the API key
const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: {
    filename: string;
    content: Buffer;
  }[];
}

export async function sendEmail(options: SendEmailOptions) {
  try {
    const emailData: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text?: string;
      replyTo?: string;
      attachments?: {
        filename: string;
        content: Buffer;
      }[];
    } = {
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    // Add optional fields if they exist
    if (options.text) emailData.text = options.text;
    if (options.replyTo) emailData.replyTo = options.replyTo;
    if (options.attachments) emailData.attachments = options.attachments;

    const response = await resend.emails.send(emailData);
    return { success: true, data: response };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export async function verifyDomain(domain: string) {
  try {
    const response = await resend.domains.create({ name: domain });
    return { success: true, data: response };
  } catch (error) {
    console.error('Error verifying domain:', error);
    return { success: false, error };
  }
}

export async function getDomainStatus(domain: string) {
  try {
    const response = await resend.domains.get(domain);
    return { success: true, data: response };
  } catch (error) {
    console.error('Error getting domain status:', error);
    return { success: false, error };
  }
} 