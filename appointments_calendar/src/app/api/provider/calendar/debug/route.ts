// Debug endpoint to check calendar connection status
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface JWTPayload {
  providerId: string;
  email: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get provider ID from JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Get all calendar connections for this provider with detailed info
    const connections = await prisma.calendarConnection.findMany({
      where: {
        providerId: decoded.providerId,
      },
      select: {
        id: true,
        platform: true,
        email: true,
        calendarId: true,
        calendarName: true,
        isActive: true,
        syncEvents: true,
        allowBookings: true,
        isDefaultForBookings: true,
        lastSyncAt: true,
        syncFrequency: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    // Count events for each connection
    const connectionsWithEventCounts = await Promise.all(
      connections.map(async (connection) => {
        const eventCount = await prisma.calendarEvent.count({
          where: {
            connectionId: connection.id,
            providerId: decoded.providerId,
          }
        });

        const recentEvents = await prisma.calendarEvent.count({
          where: {
            connectionId: connection.id,
            providerId: decoded.providerId,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        });

        return {
          ...connection,
          eventCount,
          recentEvents,
          minutesSinceLastSync: connection.lastSyncAt 
            ? Math.round((Date.now() - connection.lastSyncAt.getTime()) / (1000 * 60))
            : null,
        };
      })
    );

    return NextResponse.json({
      providerId: decoded.providerId,
      connections: connectionsWithEventCounts,
      summary: {
        totalConnections: connections.length,
        activeConnections: connections.filter(c => c.isActive).length,
        syncingConnections: connections.filter(c => c.isActive && c.syncEvents).length,
        bookingEnabledConnections: connections.filter(c => c.isActive && c.allowBookings).length,
        defaultConnection: connections.find(c => c.isDefaultForBookings)?.id || null,
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get debug info' },
      { status: 500 }
    );
  }
}