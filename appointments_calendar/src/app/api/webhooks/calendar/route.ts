// Webhook endpoint for calendar platforms to notify us of changes
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CalendarSyncService } from '@/lib/calendar-sync';
import { headers } from 'next/headers';
import crypto from 'crypto';


// Type definitions for webhook payloads
interface MicrosoftNotification {
  subscriptionId: string;
  resource: string;
  changeType: 'created' | 'updated' | 'deleted';
  clientState?: string;
}

interface MicrosoftWebhookPayload {
  value: MicrosoftNotification[];
}

interface GoogleWebhookPayload {
  channelId: string;
  resourceId: string;
  resourceState: string;
  resourceUri: string;
  messageNumber: number;
  eventType: string;
}

interface AppleWebhookPayload {
  // Apple doesn't have native webhook support for CalDAV
  // This is for any custom implementation
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    
    // Get platform from URL or headers
    const platform = request.nextUrl.searchParams.get('platform');
    
    if (!platform) {
      return NextResponse.json({ error: 'Platform not specified' }, { status: 400 });
    }

    // Verify webhook signature based on platform
    const isValid = await verifyWebhookSignature(platform, body, headersList);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);

    // Process webhook based on platform
    switch (platform.toLowerCase()) {
      case 'outlook':
      case 'teams':
        await handleMicrosoftWebhook(payload as MicrosoftWebhookPayload);
        break;
      case 'google':
        await handleGoogleWebhook(payload as GoogleWebhookPayload);
        break;
      case 'apple':
        await handleAppleWebhook(payload as AppleWebhookPayload);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function verifyWebhookSignature(platform: string, body: string, headers: Headers): Promise<boolean> {
  switch (platform.toLowerCase()) {
    case 'outlook':
    case 'teams':
      return verifyMicrosoftSignature(body, headers);
    case 'google':
      return verifyGoogleSignature(body, headers);
    case 'apple':
      return verifyAppleSignature();
    default:
      return false;
  }
}

async function verifyMicrosoftSignature(body: string, headers: Headers): Promise<boolean> {
  const signature = headers.get('x-microsoft-graph-validation-token') || 
                   headers.get('x-microsoft-graph-notification-signature');
  
  if (!signature) return false;

  // For validation token during subscription setup
  if (headers.get('x-microsoft-graph-validation-token')) {
    return true; // Return the validation token in response
  }

  // For actual notifications, verify HMAC signature
  const secret = process.env.MICROSOFT_WEBHOOK_SECRET;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  return signature === expectedSignature;
}

async function verifyGoogleSignature(body: string, headers: Headers): Promise<boolean> {
  // Google uses X-Goog-Channel-Token for verification
  const channelToken = headers.get('x-goog-channel-token');
  const expectedToken = process.env.GOOGLE_WEBHOOK_TOKEN;
  
  return channelToken === expectedToken;
}

async function verifyAppleSignature(): Promise<boolean> {
  // Apple CalDAV doesn't use webhooks, but we can implement push notifications
  // For now, return true as Apple sync will be polling-based
  return true;
}

async function handleMicrosoftWebhook(payload: MicrosoftWebhookPayload) {
  // Microsoft Graph webhook notification format
  const notifications = payload.value || [];

  for (const notification of notifications) {
    const { subscriptionId, resource, changeType } = notification;

    // Find the calendar connection by subscription ID
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        subscriptionId: subscriptionId,
        isActive: true,
      },
    });

    if (!connection) {
      console.warn(`No connection found for subscription ${subscriptionId}`);
      continue;
    }

    console.log(`Processing ${changeType} for resource ${resource}`);

    // Sync the specific calendar that changed
    try {
      const syncConnection = {
        id: connection.id,
        providerId: connection.providerId,
        calendarId: connection.calendarId,
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken || undefined,
        tokenExpiry: connection.tokenExpiry,
        platform: connection.platform,
      };

      if (connection.platform === 'OUTLOOK') {
        await CalendarSyncService.syncOutlookCalendar(syncConnection);
      } else if (connection.platform === 'TEAMS') {
        await CalendarSyncService.syncTeamsCalendar(syncConnection);
      }

      // Update last sync time
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      });

      console.log(`Successfully synced calendar ${connection.id}`);
    } catch (error) {
      console.error(`Failed to sync calendar ${connection.id}:`, error);
    }
  }
}

async function handleGoogleWebhook(payload: GoogleWebhookPayload) {
  // Google Calendar webhook notification format
  const { channelId, resourceId } = payload;

  // Find the calendar connection by channel ID
  const connection = await prisma.calendarConnection.findFirst({
    where: {
      subscriptionId: channelId,
      isActive: true,
      platform: 'GOOGLE',
    },
  });

  if (!connection) {
    console.warn(`No Google connection found for channel ${channelId}`);
    return;
  }

  console.log(`Processing Google Calendar change for resource ${resourceId}`);

  try {
    const syncConnection = {
      id: connection.id,
      providerId: connection.providerId,
      calendarId: connection.calendarId,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      tokenExpiry: connection.tokenExpiry,
      platform: connection.platform,
    };

    await CalendarSyncService.syncGoogleCalendar(syncConnection);

    // Update last sync time
    await prisma.calendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    console.log(`Successfully synced Google calendar ${connection.id}`);
  } catch (error) {
    console.error(`Failed to sync Google calendar ${connection.id}:`, error);
  }
}

async function handleAppleWebhook(payload: AppleWebhookPayload) {
  // Apple doesn't support webhooks natively for CalDAV
  // This would be for any custom push notifications we implement
  console.log('Apple webhook received:', payload);
  
  // For now, we'll stick with periodic sync for Apple calendars
  // Could implement push notifications via APNs if needed
}

// Handle subscription validation for Microsoft Graph
export async function GET(request: NextRequest) {
  const validationToken = request.nextUrl.searchParams.get('validationToken');
  
  if (validationToken) {
    // Microsoft Graph subscription validation
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'No validation token' }, { status: 400 });
}
