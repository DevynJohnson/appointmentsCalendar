import { NextRequest, NextResponse } from 'next/server';
import { withUserContext } from '@/lib/db-rls';
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
      results.providerTest = await prisma.$transaction(async (tx) => {
        // Set provider context within the transaction
        await tx.$executeRaw`SELECT set_config('app.current_provider_id', ${testProviderId}, true)`;
        
        // Check if session variable is set correctly
        const sessionCheck = await tx.$queryRaw`SELECT current_setting('app.current_provider_id', false) as provider_id`;
        
        const [connections, events, bookings] = await Promise.all([
          tx.calendarConnection.count(),
          tx.calendarEvent.count(),
          tx.booking.count()
        ]);
        
        return { 
          connections, 
          events, 
          bookings,
          sessionVariable: sessionCheck
        };
      });

      // Test without context - should see everything (admin view) 
      const sessionCheckAdmin = await prisma.$queryRaw`SELECT current_setting('app.current_provider_id', true) as provider_id`;
      results.adminTest = {
        totalConnections: await prisma.calendarConnection.count(),
        totalEvents: await prisma.calendarEvent.count(),
        totalBookings: await prisma.booking.count(),
        sessionVariable: sessionCheckAdmin
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