// app/api/render-invitation-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { InvitationEmail } from '@/emails/InvitationEmail';

export async function POST(request: NextRequest) {
  try {
    // Verify the request is coming from our Convex backend
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.INTERNAL_API_SECRET;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      inviteLink,
      inviterName,
      dealershipName,
      role,
      companyLogo,
    } = await request.json();

    // Validate required fields
    if (!inviteLink || !inviterName || !dealershipName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🎨 Rendering email template for:', dealershipName);

    // Render the React Email component to HTML
    const emailHtml = render(InvitationEmail({
      inviteLink,
      inviterName,
      dealershipName,
      role,
      companyLogo,
    }));

    // Also generate text version
    const emailText = `
You're invited to join ${dealershipName}!

${inviterName} has invited you to join ${dealershipName} as a ${role}.

Click here to accept your invitation: ${inviteLink}

This invitation expires in 7 days.

If you can't click the link, copy and paste it into your browser.

© ${new Date().getFullYear()} DealerHub Pro. All rights reserved.
    `.trim();

    console.log('✅ Email template rendered successfully');
    
    return NextResponse.json({
      success: true,
      html: emailHtml,
      text: emailText,
    });

  } catch (error) {
    console.error('💥 Email rendering error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to render email template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add GET method for testing
export async function GET() {
  return NextResponse.json({
    message: 'Email rendering API is working',
    timestamp: new Date().toISOString(),
  });
}