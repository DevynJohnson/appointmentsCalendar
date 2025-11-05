// Provider dashboard statistics
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { withProviderContext } from '@/lib/db-rls';


export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const provider = await ProviderAuthService.verifyToken(token);

    console.log(`🔍 Fetching dashboard stats for provider: ${provider.id} (${provider.email})`);

    // Use explicit filtering for all database operations to ensure data isolation
    const stats = await withProviderContext(provider.id, async (tx) => {
      // Get calendar connections stats - explicitly filter by provider
      const [totalConnections, activeConnections] = await Promise.all([
        tx.calendarConnection.count({
          where: { providerId: provider.id }
        }),
        tx.calendarConnection.count({
          where: { 
            providerId: provider.id,
            isActive: true 
          },
        }),
      ]);

      // Get upcoming events count (next 30 days) - explicitly filter by provider
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const upcomingEvents = await tx.calendarEvent.count({
        where: {
          providerId: provider.id, // Explicit filtering for security
          startTime: {
            gte: new Date(),
            lte: thirtyDaysFromNow,
          },
        },
      });

      // Get booking stats - explicitly filter by provider
      const [totalBookings, pendingBookings] = await Promise.all([
        tx.booking.count({
          where: { providerId: provider.id }
        }),
        tx.booking.count({
          where: { 
            providerId: provider.id,
            status: 'PENDING' 
          },
        }),
      ]);

      return {
        totalConnections,
        activeConnections,
        upcomingEvents,
        totalBookings,
        pendingBookings,
      };
    });

    console.log(`📊 Dashboard stats for provider ${provider.id}:`, stats);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard statistics' },
      { status: 500 }
    );
  }
}
