// Provider dashboard statistics
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { prisma } from '@/lib/db';


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

    // Get calendar connections stats
    const [totalConnections, activeConnections] = await Promise.all([
      prisma.calendarConnection.count({
        where: { providerId: provider.id },
      }),
      prisma.calendarConnection.count({
        where: { 
          providerId: provider.id,
          isActive: true,
        },
      }),
    ]);

    // Get upcoming events count (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingEvents = await prisma.calendarEvent.count({
      where: {
        providerId: provider.id,
        startTime: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
    });

    // Get booking stats
    const [totalBookings, pendingBookings] = await Promise.all([
      prisma.booking.count({
        where: { providerId: provider.id },
      }),
      prisma.booking.count({
        where: { 
          providerId: provider.id,
          status: 'PENDING',
        },
      }),
    ]);

    const stats = {
      totalConnections,
      activeConnections,
      upcomingEvents,
      totalBookings,
      pendingBookings,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to get dashboard statistics' },
      { status: 500 }
    );
  }
}
