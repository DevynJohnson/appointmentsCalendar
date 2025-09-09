import type { NextRequest } from 'next/server';
import { securityMiddleware } from '@/lib/security-headers';

export function middleware(request: NextRequest) {
  // Apply security headers to all routes
  return securityMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
