import { NextRequest, NextResponse } from 'next/server';
import { withProviderContext, withUserContext } from '@/lib/db-rls';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testProviderId = searchParams.get('providerId');
    const testUserId = searchParams.get('userId');

    if (!testProviderId && !testUserId) {
      return NextResponse.json({
        error: 'Provide either providerId or userId parameter'
      }, { status: 400 });
    }

    const results: Record<string, unknown> = {};

    if (testProviderId) {
      // Test provider context - should only see their own data
      results.providerTest = await withProviderContext(testProviderId, async () => {
        const [connections, events, bookings] = await Promise.all([
          prisma.calendarConnection.count(),
          prisma.calendarEvent.count(),
          prisma.booking.count()
        ]);
        return { connections, events, bookings };
      });

      // Test without context - should see everything (admin view)
      results.adminTest = {
        totalConnections: await prisma.calendarConnection.count(),
        totalEvents: await prisma.calendarEvent.count(),
        totalBookings: await prisma.booking.count()
      };
    }

    if (testUserId) {
      // Test user context - should only see their own bookings
      results.userTest = await withUserContext(testUserId, async () => {
        return {
          userBookings: await prisma.booking.count()
        };
      });
    }

    return NextResponse.json({
      message: 'RLS Test Results',
      testProviderId,
      testUserId,
      results,
      interpretation: {
        providerTest: 'Should show only data for this provider',
        adminTest: 'Should show all data (no RLS context)',
        userTest: 'Should show only bookings for this user'
      }
    });

  } catch (error) {
    console.error('RLS test error:', error);
    return NextResponse.json({
      error: 'RLS test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}