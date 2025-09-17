// Quick token validation endpoint
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type ConnectionWithProvider = {
  id: string;
  platform: string;
  email: string;
  tokenExpiry: Date | null;
  isActive: boolean;
  lastSyncAt: Date | null;
  provider: {
    name: string;
    email: string;
  };
};

export async function GET() {
  try {
    const connections: ConnectionWithProvider[] = await prisma.calendarConnection.findMany({
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

    const results = connections.map((conn: ConnectionWithProvider) => ({
      id: conn.id,
      platform: conn.platform,
      email: conn.email,
      providerName: conn.provider.name,
      providerEmail: conn.provider.email,
      tokenExpiry: conn.tokenExpiry,
      lastSyncAt: conn.lastSyncAt,
      status: conn.tokenExpiry && conn.tokenExpiry < new Date() ? 'expired' :
              conn.lastSyncAt && conn.lastSyncAt < new Date(Date.now() - 24 * 60 * 60 * 1000) ? 'stale' :
              'healthy' as 'expired' | 'stale' | 'healthy'
    }));

    return NextResponse.json({
      totalConnections: connections.length,
      activeConnections: connections.filter((c) => c.isActive).length,
      expiredTokens: results.filter((r) => r.status === 'expired').length,
      connections: results
    });
  } catch {
    return NextResponse.json({ error: 'Failed to check connections' }, { status: 500 });
  }
}
