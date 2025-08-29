// Quick token validation endpoint
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const connections = await prisma.calendarConnection.findMany({
      where: { isActive: true },
      select: {
        id: true,
        platform: true,
        email: true,
        tokenExpiry: true,
        isActive: true,
        lastSyncAt: true,
        provider: {
          select: { name: true, email: true }
        }
      }
    });

    const results = connections.map(conn => ({
      platform: conn.platform,
      email: conn.email,
      provider: conn.provider.name,
      isActive: conn.isActive,
      tokenExpired: conn.tokenExpiry ? conn.tokenExpiry < new Date() : false,
      lastSync: conn.lastSyncAt,
      status: conn.tokenExpiry && conn.tokenExpiry < new Date() ? '⚠️ Token Expired' : '✅ Active'
    }));

    return NextResponse.json({
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.isActive).length,
      expiredTokens: results.filter(r => r.tokenExpired).length,
      connections: results
    });
  } catch {
    return NextResponse.json({ error: 'Failed to check connections' }, { status: 500 });
  }
}
