import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currentTime: new Date().toISOString(),
    currentTimeLocal: new Date().toLocaleString(),
    currentTimeChicago: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }),
    timezoneOffset: new Date().getTimezoneOffset(),
    testDate: {
      created: new Date(2025, 10, 10, 8, 0, 0, 0).toISOString(), // Nov 10, 8 AM
      description: "Test date: Nov 10, 2025 8:00 AM in server timezone"
    }
  });
}