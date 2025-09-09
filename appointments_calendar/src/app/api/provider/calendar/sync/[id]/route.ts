// API endpoint to sync individual calendar connection
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ProviderAuthService } from '@/lib/provider-auth';
import { CalendarSyncService } from '@/lib/calendar-sync';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔥 POST SYNC ENDPOINT HIT - Route is working!');
  console.log('📊 Request details:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
  });
  
  try {
    console.log('⏳ Awaiting params...');
    const { id } = await params; // Await params before using
    console.log('✅ Connection ID extracted:', id);
    
    console.log('🔐 Checking authorization...');
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('🎫 Token extracted:', token ? 'Present' : 'Missing');
    
    const provider = await ProviderAuthService.verifyToken(token || '');
    console.log('👤 Provider verification result:', provider ? `Success (${provider.email})` : 'Failed');
    
    if (!provider) {
      console.log('❌ Unauthorized - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Looking up calendar connection...');
    console.log('🔎 Search criteria:', {
      id: id,
      providerId: provider.id,
      isActive: true
    });
    
    // First try to find an active connection
    let connection = await prisma.calendarConnection.findFirst({
      where: {
        id: id,
        providerId: provider.id,
        isActive: true,
      },
    });

    console.log('📅 Active connection lookup result:', connection ? `Found ${connection.platform} connection` : 'Not found');
    
    // If no active connection found, check for inactive connection
    if (!connection) {
      console.log('🔍 Checking for inactive connection...');
      connection = await prisma.calendarConnection.findFirst({
        where: {
          id: id,
          providerId: provider.id,
        },
      });
      
      if (connection) {
        console.log('📋 Found inactive connection:', {
          id: connection.id,
          platform: connection.platform,
          isActive: connection.isActive,
          providerId: connection.providerId
        });
        
        // Reactivate the connection for sync
        console.log('🔄 Reactivating connection for sync...');
        connection = await prisma.calendarConnection.update({
          where: { id: connection.id },
          data: { isActive: true },
        });
        console.log('✅ Connection reactivated');
      } else {
        console.log('❌ No connection found at all');
      }
    }

    if (!connection) {
      console.log('❌ Connection not found - returning 404');
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Add some debugging info
    console.log(`🔄 Syncing ${connection.platform} calendar for provider ${provider.id}`);
    console.log('📋 Connection data:', {
      id: connection.id,
      platform: connection.platform,
      calendarId: connection.calendarId,
      hasAccessToken: !!connection.accessToken,
      tokenExpiry: connection.tokenExpiry
    });

    // Create sync connection object
    const syncConnection = {
      id: connection.id,
      providerId: connection.providerId,
      platform: connection.platform,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      calendarId: connection.calendarId,
      tokenExpiry: connection.tokenExpiry,
    };

    console.log('🚀 Starting sync process...');
    let result;
    try {
      switch (connection.platform) {
        case 'OUTLOOK':
          console.log('📧 Syncing Outlook calendar...');
          result = await CalendarSyncService.syncOutlookCalendar(syncConnection);
          break;
        case 'GOOGLE':
          console.log('🌐 Syncing Google calendar...');
          result = await CalendarSyncService.syncGoogleCalendar(syncConnection);
          break;
        case 'TEAMS':
          console.log('👥 Syncing Teams calendar...');
          result = await CalendarSyncService.syncTeamsCalendar(syncConnection);
          break;
        case 'APPLE':
          console.log('🍎 Syncing Apple calendar...');
          result = await CalendarSyncService.syncAppleCalendar(syncConnection);
          break;
        default:
          console.log('❌ Unsupported platform:', connection.platform);
          return NextResponse.json({ error: `Unsupported platform: ${connection.platform}` }, { status: 400 });
      }
    } catch (syncError) {
      console.error(`💥 Sync error for ${connection.platform}:`, syncError);
      return NextResponse.json({ 
        error: 'Sync failed', 
        details: syncError instanceof Error ? syncError.message : 'Unknown sync error',
        platform: connection.platform
      }, { status: 500 });
    }

    console.log('✅ Sync completed successfully');
    
    // Update last sync time
    await prisma.calendarConnection.update({
      where: { id: id },
      data: { lastSyncAt: new Date() },
    });

    console.log('📝 Updated last sync time');

    return NextResponse.json({
      success: true, 
      message: `${connection.platform} calendar synced successfully`,
      result,
      platform: connection.platform,
      connectionId: id
    });

  } catch (error) {
    console.error('💥 Unexpected error in sync endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add GET endpoint for testing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🧪 GET SYNC ENDPOINT HIT - Testing route');
  
  const { id } = await params; // Await params before using
  
  return NextResponse.json({ 
    message: 'Sync endpoint is working',
    connectionId: id,
    method: 'GET',
    timestamp: new Date().toISOString()
  });
}
