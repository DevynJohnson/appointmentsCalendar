/**
 * Security headers using Next.js middleware
 * Based on Helmet.js best practices but adapted for Next.js
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generate a cryptographically secure nonce for CSP (Edge Runtime compatible)
 */
export function generateNonce(): string {
  // Use crypto.getRandomValues for Edge Runtime compatibility
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/[+/]/g, '').substring(0, 16);
}

/**
 * Generate CSRF token (Edge Runtime compatible)
 */
export function generateCSRFToken(): string {
  // Use crypto.getRandomValues for Edge Runtime compatibility
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  return token === sessionToken;
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection in browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent DNS prefetching
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  
  // Disable Adobe Flash and PDF files from loading
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Enhanced Content Security Policy with nonce support
  const cspDirectives = [
    "default-src 'self'",
    // Script sources - more restrictive with nonce
    nonce 
      ? `script-src 'self' 'nonce-${nonce}' https://www.google.com https://accounts.google.com https://apis.google.com https://www.gstatic.com https://ssl.gstatic.com`
      : "script-src 'self' 'unsafe-inline' https://www.google.com https://accounts.google.com https://apis.google.com https://www.gstatic.com https://ssl.gstatic.com",
    // Style sources
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.google.com https://accounts.google.com",
    // Font sources
    "font-src 'self' https://fonts.gstatic.com data:",
    // Image sources - allow calendar provider images
    "img-src 'self' data: https: blob: https://*.googleapis.com https://*.google.com https://*.microsoft.com https://*.office.com",
    // Connect sources - API endpoints for calendar integrations
    "connect-src 'self' https://api.graph.microsoft.com https://graph.microsoft.com https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://calendar.google.com https://outlook.office365.com https://outlook.office.com wss:",
    // Media sources
    "media-src 'self'",
    // Object sources - completely blocked
    "object-src 'none'",
    // Base URI restriction
    "base-uri 'self'",
    // Form action restriction
    "form-action 'self'",
    // Frame ancestors - prevent embedding
    "frame-ancestors 'none'",
    // Frame sources - allow calendar widgets
    "frame-src 'self' https://accounts.google.com https://calendar.google.com https://outlook.office365.com https://outlook.office.com",
    // Worker sources
    "worker-src 'self' blob:",
    // Manifest sources
    "manifest-src 'self'",
    // Upgrade insecure requests in production
    ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : [])
  ];
  
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
  
  // Additional security headers
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()');
  
  // Expect-CT header for certificate transparency
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Expect-CT', 'enforce, max-age=86400');
  }
  
  // Remove server fingerprinting
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');
  
  return response;
}

/**
 * CORS configuration for API routes
 */
export function addCORSHeaders(response: NextResponse, origin?: string): NextResponse {
  // Allow specific origins in production, localhost in development
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
    : ['http://localhost:3000', 'https://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

/**
 * Security middleware for Next.js
 */
export function securityMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  const origin = request.headers.get('origin');
  
  // Generate nonce for CSP
  const nonce = generateNonce();
  
  // Add nonce to response headers for use in HTML
  response.headers.set('x-nonce', nonce);
  
  // Add security headers with nonce
  const secureResponse = addSecurityHeaders(response, nonce);
  
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    addCORSHeaders(secureResponse, origin || undefined);
    
    // Add CSRF protection for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfToken = request.headers.get('x-csrf-token');
      const sessionToken = request.cookies.get('csrf-token')?.value;
      
      if (request.nextUrl.pathname !== '/api/auth/login' && !validateCSRFToken(csrfToken || '', sessionToken || '')) {
        return new NextResponse('CSRF token validation failed', { status: 403 });
      }
    }
  }
  
  return secureResponse;
}

/**
 * Rate limiting response headers
 */
export function addRateLimitHeaders(
  response: NextResponse, 
  limit: number, 
  remaining: number, 
  reset: Date
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toISOString());
  
  return response;
}
