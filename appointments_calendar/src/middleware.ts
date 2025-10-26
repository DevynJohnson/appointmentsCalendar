// Lightweight middleware for token maintenance
// Runs maintenance on a small percentage of requests to spread the load

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only run maintenance on 1% of requests to avoid performance impact
  const shouldRunMaintenance = Math.random() < 0.01;
  
  if (shouldRunMaintenance && request.nextUrl.pathname.startsWith('/api/')) {
    // Add header to trigger background maintenance
    const response = NextResponse.next();
    response.headers.set('x-trigger-maintenance', 'true');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only run on API routes to avoid affecting static assets
    '/api/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};