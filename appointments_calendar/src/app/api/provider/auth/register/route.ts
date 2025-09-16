// Provider registration API route with professional security
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { registrationLimiter, rateLimit, createRateLimitResponse } from '@/lib/rate-limiting-upstash';
import { validateRequestBody, providerRegistrationSchema, createValidationErrorResponse } from '@/lib/validation';
import { addSecurityHeaders, addRateLimitHeaders } from '@/lib/security-headers';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = await rateLimit(request, registrationLimiter);
    
    if (!rateLimitResult) {
      return createRateLimitResponse(new Date(Date.now() + 15 * 60 * 1000));
    }

    // Validate request body with Zod schema
    const validation = await validateRequestBody(request, providerRegistrationSchema);
    
    if (!validation.success) {
      const response = createValidationErrorResponse(validation.errors);
      return addSecurityHeaders(new NextResponse(response.body, response));
    }

    const validatedData = validation.data;

    // Create provider with validated data
    const provider = await ProviderAuthService.createProvider({
      ...validatedData,
      phone: validatedData.phone || '', // Provide default empty string for phone if not provided
    });

    // Create success response
    const response = NextResponse.json({
      message: 'Provider account created successfully',
      provider,
    });

    // Add security and rate limit headers
    const secureResponse = addSecurityHeaders(response);
    return addRateLimitHeaders(
      secureResponse, 
      rateLimitResult.limit, 
      rateLimitResult.remaining, 
      rateLimitResult.reset
    );

  } catch (error) {
    console.error('Provider registration error:', error);
    
    const errorResponse = NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: error instanceof Error && error.message.includes('already exists') ? 409 : 500 }
    );

    return addSecurityHeaders(errorResponse);
  }
}
