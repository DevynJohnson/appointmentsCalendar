// Enhanced security middleware with CSP, CSRF protection, WAF, and rate limiting
// Combines security headers with lightweight token maintenance

import type { NextRequest } from 'next/server';
import { securityMiddleware } from './lib/security-headers';
import { wafMiddleware } from './middleware/waf';

export function middleware(request: NextRequest) {
  // Apply WAF protection first
  const wafResponse = wafMiddleware(request);
  
  // If WAF blocks the request, return immediately
  if (wafResponse.status !== 200) {
    return wafResponse;
  }
  
  // Apply security headers to all requests
  const response = securityMiddleware(request);
  
  // Only run maintenance on 1% of API requests to avoid performance impact
  const shouldRunMaintenance = Math.random() < 0.01;
  
  if (shouldRunMaintenance && request.nextUrl.pathname.startsWith('/api/')) {
    // Add header to trigger background maintenance
    response.headers.set('x-trigger-maintenance', 'true');
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};