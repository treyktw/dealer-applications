// lib/email-service.ts - Server-side email rendering
import { Resend } from 'resend';
import { InvitationEmail } from '@/emails/InvitationEmail';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail({
  email,
  inviteLink,
  inviterName,
  dealershipName,
  role,
  companyLogo,
}: {
  email: string;
  inviteLink: string;
  inviterName: string;
  dealershipName: string;
  role: string;
  companyLogo?: string;
}) {
  try {
    // Render React Email component to HTML
    const emailHTML = render(InvitationEmail({
      inviteLink,
      inviterName,
      dealershipName,
      role,
      companyLogo,
    }));

    const { data, error } = await resend.emails.send({
      from: 'DealerHub Pro <noreply@universalautobrokers.net>',
      to: email,
      subject: `🚗 Join ${dealershipName} on DealerHub Pro`,
      html: await emailHTML,
    });

    if (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
}
