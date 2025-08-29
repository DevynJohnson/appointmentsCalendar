// Test API endpoint to verify routing
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Calendar sync API is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  return NextResponse.json({ 
    message: 'Calendar sync POST endpoint is working',
    timestamp: new Date().toISOString()
  });
}
