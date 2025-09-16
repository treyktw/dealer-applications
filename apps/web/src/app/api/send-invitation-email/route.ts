// 1. Create this file: app/api/send-invitation-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { InvitationEmail } from '@/emails/InvitationEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  console.log('📧 Email API route called');
  
  try {
    // Log headers for debugging
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    // Verify the request is coming from our Convex backend
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.INTERNAL_API_SECRET;
    
    console.log('Auth header present:', !!authHeader);
    console.log('Expected token configured:', !!expectedToken);
    
    if (!expectedToken) {
      console.error('❌ INTERNAL_API_SECRET not configured in Next.js');
      return NextResponse.json(
        { error: 'Internal API secret not configured' },
        { status: 500 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('❌ Authorization failed:', { authHeader, expected: `Bearer ${expectedToken}` });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('📨 Request body received:', Object.keys(body));
    
    const {
      email,
      inviteLink,
      inviterName,
      dealershipName,
      role,
      companyLogo,
    } = body;

    // Validate required fields
    if (!email || !inviteLink || !inviterName || !dealershipName || !role) {
      console.error('❌ Missing required fields:', { email: !!email, inviteLink: !!inviteLink, inviterName: !!inviterName, dealershipName: !!dealershipName, role: !!role });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('✅ Sending invitation email to:', email);
    console.log('🔗 Invite link:', inviteLink);

    // Check if RESEND_API_KEY is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Send email using React Email component
    const { data, error } = await resend.emails.send({
      from: 'DealerHub Pro <noreply@universalautobrokers.net>',
      to: email,
      subject: `🚗 Join ${dealershipName} on DealerHub Pro`,
      react: InvitationEmail({
        inviteLink,
        inviterName,
        dealershipName,
        role,
        companyLogo,
      }),
      // Add text fallback
      text: `
        You're invited to join ${dealershipName}!
        
        ${inviterName} has invited you to join ${dealershipName} as a ${role}.
        
        Click here to accept your invitation: ${inviteLink}
        
        This invitation expires in 7 days.
        
        If you can't click the link, copy and paste it into your browser.
        
        © ${new Date().getFullYear()} DealerHub Pro. All rights reserved.
      `,
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    console.log('✅ Email sent successfully:', data);
    
    return NextResponse.json({
      success: true,
      emailId: data?.id,
      message: 'Invitation email sent successfully',
    });

  } catch (error) {
    console.error('💥 Email API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add GET method for testing
export async function GET() {
  return NextResponse.json({
    message: 'Email API is working',
    timestamp: new Date().toISOString(),
  });
}