// app/api/webhooks/clerk/route.ts
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

type ClerkWebhookEvent = {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string;
    [key: string]: unknown;
  };
};

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET environment variable');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: ClerkWebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // Handle the webhook
  try {
    console.log('Clerk webhook received:', evt.type, evt.data.id);

    switch (evt.type) {
      case 'user.created':
        console.log('User created in Clerk:', evt.data.id);
        // User creation is handled by UserSync component
        break;

      case 'user.updated':
        console.log('User updated in Clerk:', evt.data.id);
        // Handle user updates if needed
        await convex.mutation(api.users.updateUser, {
          clerkId: evt.data.id,
          email: evt.data.email_addresses[0]?.email_address || '',
          firstName: evt.data.first_name || undefined,
          lastName: evt.data.last_name || undefined,
          imageUrl: evt.data.image_url || undefined,
        });
        break;

      case 'user.deleted':
        console.log('User deleted in Clerk:', evt.data.id);
        
        // Find and delete user from Convex
        const userToDelete = await convex.query(api.users.getUserByClerkId, {
          clerkId: evt.data.id,
        });

        if (userToDelete) {
          console.log('Deleting user from Convex after Clerk deletion:', userToDelete.id);
          
          // Delete employee record if exists
          await convex.mutation(api.employees.deleteEmployeeByUserId, {
            userId: userToDelete.id,
          });

          // Delete user record
          await convex.mutation(api.users.deleteUserByClerkId, {
            clerkId: evt.data.id,
          });
          
          console.log('User successfully deleted from Convex');
        } else {
          console.log('User not found in Convex for Clerk ID:', evt.data.id);
        }
        break;

      default:
        console.log('Unhandled webhook type:', evt.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Clerk webhook endpoint' });
}