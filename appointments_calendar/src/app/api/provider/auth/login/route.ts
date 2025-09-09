// Provider login API route with professional security
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { loginLimiter, rateLimit, createRateLimitResponse } from '@/lib/rate-limiting-upstash';
import { validateRequestBody, providerLoginSchema, createValidationErrorResponse } from '@/lib/validation';
import { addSecurityHeaders, addRateLimitHeaders } from '@/lib/security-headers';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = await rateLimit(request, loginLimiter);
    
    if (!rateLimitResult) {
      return createRateLimitResponse(new Date(Date.now() + 15 * 60 * 1000));
    }

    // Validate request body with Zod schema
    const validation = await validateRequestBody(request, providerLoginSchema);
    
    if (!validation.success) {
      const response = createValidationErrorResponse(validation.errors);
      return addSecurityHeaders(new NextResponse(response.body, response));
    }

    const { email, password } = validation.data;

    // Authenticate provider
    const result = await ProviderAuthService.authenticateProvider(email, password);

    // Create success response
    const response = NextResponse.json(result);

    // Add security and rate limit headers
    const secureResponse = addSecurityHeaders(response);
    return addRateLimitHeaders(
      secureResponse, 
      rateLimitResult.limit, 
      rateLimitResult.remaining, 
      rateLimitResult.reset
    );

  } catch (error) {
    console.error('Provider login error:', error);
    
    const errorResponse = NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 401 }
    );

    return addSecurityHeaders(errorResponse);
  }
}
