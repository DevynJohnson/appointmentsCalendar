// API endpoint to set up webhook subscriptions for calendar connections
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WebhookSubscriptionService } from '@/lib/webhook-subscriptions';
import { ProviderAuthService } from '@/lib/provider-auth';


export async function POST(request: NextRequest) {
  try {
    // Verify provider authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const provider = await ProviderAuthService.verifyToken(token || '');
    
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Find the calendar connection
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        providerId: provider.id,
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Calendar connection not found' }, { status: 404 });
    }

    // Set up webhook subscription
    const subscriptionId = await WebhookSubscriptionService.subscribeToCalendar(connection);

    if (subscriptionId) {
      return NextResponse.json({ 
        success: true, 
        subscriptionId,
        message: 'Webhook subscription created successfully'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Platform does not support webhooks - using periodic sync instead'
      });
    }

  } catch (error) {
    console.error('Error setting up webhook subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify provider authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const provider = await ProviderAuthService.verifyToken(token || '');
    
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Find the calendar connection
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        providerId: provider.id,
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Calendar connection not found' }, { status: 404 });
    }

    // Remove webhook subscription
    const success = await WebhookSubscriptionService.unsubscribeFromCalendar(connection);

    return NextResponse.json({ 
      success,
      message: success ? 'Webhook subscription removed successfully' : 'Failed to remove webhook subscription'
    });

  } catch (error) {
    console.error('Error removing webhook subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Set up webhooks for all provider's calendars
export async function PUT(request: NextRequest) {
  try {
    // Verify provider authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    const provider = await ProviderAuthService.verifyToken(token || '');
    
    if (!provider) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Set up webhooks for all active connections
    await WebhookSubscriptionService.setupAllWebhooks(provider.id);

    return NextResponse.json({ 
      success: true,
      message: 'Webhook subscriptions set up for all calendars'
    });

  } catch (error) {
    console.error('Error setting up all webhook subscriptions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
