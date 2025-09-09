import { NextRequest, NextResponse } from 'next/server';
import { CalendarConnectionService } from '@/lib/calendar-connections';
import jwt from 'jsonwebtoken';

export async function PUT(request: NextRequest) {
  try {
    // Get provider ID from token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { providerId: string };
      console.log('Provider authenticated:', decoded.providerId);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, settings } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    // Update calendar settings
    const updatedConnection = await CalendarConnectionService.updateCalendarSettings(
      connectionId,
      settings
    );

    return NextResponse.json({
      success: true,
      connection: updatedConnection,
    });

  } catch (error) {
    console.error('Failed to update calendar settings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update calendar settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
