// Development/Testing endpoint for manual sync testing
import { NextResponse } from 'next/server';
import { CalendarSyncService } from '@/lib/calendar-sync';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    console.log('🧪 Testing calendar sync functionality...');

    // Get all providers with active calendar connections for testing
    const providers = await prisma.provider.findMany({
      where: {
        isActive: true,
        calendarConnections: {
          some: {
            isActive: true,
            syncEvents: true,
          }
        }
      },
      select: {
        id: true,
        name: true,
        calendarConnections: {
          where: {
            isActive: true,
            syncEvents: true,
          },
          select: {
            id: true,
            platform: true,
          }
        }
      },
      take: 3, // Limit to 3 providers for testing
    });

    if (providers.length === 0) {
      return NextResponse.json({
        message: 'No active providers with calendar connections found for testing',
        success: true,
        results: []
      });
    }

    const testResults = [];

    // Test fast booking sync for each provider
    for (const provider of providers) {
      const dateRange = {
        start: new Date(),
        end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks
      };

      console.log(`🔄 Testing fast sync for provider ${provider.name} (${provider.calendarConnections.length} connections)`);

      try {
        const syncResult = await CalendarSyncService.syncForBookingLookup(provider.id, dateRange);
        testResults.push({
          providerId: provider.id,
          providerName: provider.name,
          connections: provider.calendarConnections.length,
          ...syncResult
        });
      } catch (error) {
        testResults.push({
          providerId: provider.id,
          providerName: provider.name,
          connections: provider.calendarConnections.length,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulTests = testResults.filter(r => r.success).length;

    return NextResponse.json({
      message: `Test sync completed: ${successfulTests}/${testResults.length} providers synced successfully`,
      success: true,
      results: testResults,
      summary: {
        totalProviders: testResults.length,
        successful: successfulTests,
        failed: testResults.length - successfulTests
      }
    });

  } catch (error) {
    console.error('Test sync error:', error);
    return NextResponse.json(
      { 
        error: 'Test sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Also support POST
export async function POST() {
  return GET();
}