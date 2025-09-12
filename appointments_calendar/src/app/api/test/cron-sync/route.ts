// Development/Testing endpoint for manual cron job testing
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Create a mock cron request with proper authorization
    const cronRequest = new NextRequest('http://localhost:3000/api/cron/sync-calendars', {
      method: 'GET',
      headers: {
        'authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    // Import and call the cron handler
    const { GET: cronHandler } = await import('../../cron/sync-calendars/route');
    const result = await cronHandler(cronRequest);
    
    return result;
  } catch (error) {
    console.error('Test cron error:', error);
    return NextResponse.json(
      { 
        error: 'Test cron failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Also support POST
export async function POST() {
  return GET();
}