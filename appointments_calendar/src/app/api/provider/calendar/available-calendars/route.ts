import { NextRequest, NextResponse } from 'next/server';
import { CalendarConnectionService } from '@/lib/calendar-connections';
import { CalendarPlatform } from '@prisma/client';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // Get provider ID from token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { providerId: string };
      // Token is valid, decoded contains provider info
      console.log('Provider authenticated:', decoded.providerId);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const platform = url.searchParams.get('platform') as CalendarPlatform;
    const accessToken = url.searchParams.get('accessToken');
    const email = url.searchParams.get('email');
    const appPassword = url.searchParams.get('appPassword');

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    if (!accessToken && platform !== CalendarPlatform.APPLE) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
    }

    // Fetch available calendars
    const calendars = await CalendarConnectionService.getAvailableCalendars(
      platform,
      accessToken || '',
      email || undefined,
      appPassword || undefined
    );

    return NextResponse.json({
      success: true,
      calendars,
    });

  } catch (error) {
    console.error('Failed to fetch available calendars:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch available calendars',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
