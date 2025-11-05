// Get provider calendar connections
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

    console.log(`🔍 Fetching calendar connections for provider: ${provider.id} (${provider.email})`);

    // Explicitly filter by provider ID to ensure data isolation
    const connections = await withProviderContext(provider.id, async (tx) => {
      return await tx.calendarConnection.findMany({
        where: { providerId: provider.id }, // Explicit filtering for security
        orderBy: { createdAt: 'desc' },
      });
    });

    console.log(`📊 Found ${connections.length} calendar connections for provider ${provider.id}`);

    return NextResponse.json(connections);
  } catch (error) {
    console.error('Failed to get calendar connections:', error);
    return NextResponse.json(
      { error: 'Failed to get calendar connections' },
      { status: 500 }
    );
  }
}
