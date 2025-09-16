// Periodic calendar sync cron job
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CalendarSyncService } from '@/lib/calendar-sync';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Starting periodic calendar sync job...');
    
    // Get all active connections that need syncing
    const now = new Date();
    const connections = await prisma.calendarConnection.findMany({
      where: {
        isActive: true,
        syncEvents: true, // Only sync connections that have syncEvents enabled
        // Only sync if we haven't synced recently based on syncFrequency
        OR: [
          { lastSyncAt: null }, // Never synced
          {
            lastSyncAt: {
              lt: new Date(now.getTime() - 5 * 60 * 1000) // At least 5 minutes ago (minimum frequency)
            }
          }
        ]
      },
      include: {
        provider: {
          select: { id: true }
        }
      }
    });

    console.log(`📋 Found ${connections.length} connections to check for sync`);

    let syncedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const connection of connections) {
      try {
        // Check if this connection is due for sync based on its syncFrequency
        const minutesSinceLastSync = connection.lastSyncAt 
          ? (now.getTime() - connection.lastSyncAt.getTime()) / (1000 * 60)
          : Infinity;

        const syncFrequencyMinutes = connection.syncFrequency || 15; // Default 15 minutes

        if (minutesSinceLastSync < syncFrequencyMinutes) {
          console.log(`⏰ Connection ${connection.id} not due for sync yet (${Math.round(minutesSinceLastSync)}/${syncFrequencyMinutes} min)`);
          continue;
        }

        console.log(`🔄 Syncing ${connection.platform} calendar for connection ${connection.id}`);
        
        // Sync based on platform
        let result;
        const syncConnection = {
          id: connection.id,
          providerId: connection.providerId,
          platform: connection.platform,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken || undefined,
          calendarId: connection.calendarId,
          tokenExpiry: connection.tokenExpiry,
        };

        switch (connection.platform) {
          case 'GOOGLE':
            result = await CalendarSyncService.syncGoogleCalendar(syncConnection);
            break;
          case 'OUTLOOK':
            result = await CalendarSyncService.syncOutlookCalendar(syncConnection);
            break;
          case 'TEAMS':
            result = await CalendarSyncService.syncTeamsCalendar(syncConnection);
            break;
          case 'APPLE':
            result = await CalendarSyncService.syncAppleCalendar(syncConnection);
            break;
          default:
            console.warn(`❌ Unsupported platform: ${connection.platform}`);
            continue;
        }

        if (result?.success) {
          syncedCount++;
          console.log(`✅ Successfully synced ${connection.platform} calendar ${connection.id}`);
        } else {
          errorCount++;
          console.log(`❌ Failed to sync ${connection.platform} calendar ${connection.id}: ${result?.error}`);
        }

        results.push({
          connectionId: connection.id,
          platform: connection.platform,
          success: result?.success || false,
          error: result?.error,
          eventsProcessed: ('eventsProcessed' in (result || {})) 
            ? (result as { eventsProcessed: number }).eventsProcessed 
            : ('eventsCount' in (result || {}))
            ? (result as { eventsCount: number }).eventsCount 
            : 0
        });

      } catch (error) {
        errorCount++;
        console.error(`💥 Error syncing connection ${connection.id}:`, error);
        results.push({
          connectionId: connection.id,
          platform: connection.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`🏁 Cron sync completed: ${syncedCount} synced, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: `Periodic sync completed`,
      stats: {
        totalChecked: connections.length,
        synced: syncedCount,
        errors: errorCount
      },
      results
    });

  } catch (error) {
    console.error('💥 Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Cron job failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}