import { db } from '@/db';
import { users, notificationSettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type NotificationType = 'new_lead' | 'lead_updates' | 'inventory' | 'task_reminders' | 'system_updates';

interface NotificationData {
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Send a notification to a user based on their notification preferences
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  notification: NotificationData
) {
  try {
    // Get user's notification preferences
    const settings = await db.query.notificationSettings.findFirst({
      where: and(
        eq(notificationSettings.userId, userId),
        eq(notificationSettings.type, type)
      ),
    });

    // If no settings found, use default (both email and in-app enabled)
    const emailEnabled = settings?.emailEnabled ?? true;
    const inAppEnabled = settings?.inAppEnabled ?? true;

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const promises: Promise<unknown>[] = [];

    // Send email notification if enabled
    if (emailEnabled) {
      promises.push(sendEmailNotification(user.email, notification));
    }

    // Send in-app notification if enabled
    if (inAppEnabled) {
      promises.push(saveInAppNotification(userId, notification));
    }

    await Promise.all(promises);

    return {
      success: true,
      emailSent: emailEnabled,
      inAppSent: inAppEnabled,
    };
  } catch (error) {
    console.error('[SEND_NOTIFICATION_ERROR]', error);
    throw error;
  }
}

/**
 * Send an email notification
 * This is a placeholder function - implement your email sending logic here
 */
async function sendEmailNotification(email: string, notification: NotificationData) {
  // TODO: Implement email sending logic
  // This could use a service like SendGrid, AWS SES, etc.
  console.log('Sending email to:', email, notification);
}

/**
 * Save an in-app notification
 * This is a placeholder function - implement your in-app notification storage logic here
 */
async function saveInAppNotification(userId: string, notification: NotificationData) {
  // TODO: Implement in-app notification storage
  // This could save to a notifications table in the database
  console.log('Saving in-app notification for user:', userId, notification);
}

/**
 * Example usage:
 * 
 * await sendNotification('user_123', 'new_lead', {
 *   title: 'New Lead Assigned',
 *   message: 'A new lead has been assigned to you',
 *   data: {
 *     leadId: 'lead_456',
 *     leadName: 'John Doe'
 *   }
 * });
 */ 