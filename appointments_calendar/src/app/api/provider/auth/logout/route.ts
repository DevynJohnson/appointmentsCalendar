// Provider logout API endpoint - CRITICAL SECURITY FIX
import { NextRequest, NextResponse } from 'next/server';
import { extractAndVerifyJWT } from '@/lib/jwt-utils';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Extract and verify JWT
    const authHeader = request.headers.get('authorization');
    const jwtResult = extractAndVerifyJWT(authHeader);
    
    if (!jwtResult.success) {
      console.warn('Logout attempted with invalid token:', jwtResult.error);
      // Even if token is invalid, still return success for logout
      return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }

    const providerId = jwtResult.payload!.providerId;
    const providerEmail = jwtResult.payload!.email;

    console.log(`🔒 Provider logout: ${providerEmail} (${providerId})`);

    // Optional: Update provider's lastLoginAt to track logout time
    try {
      await prisma.provider.update({
        where: { id: providerId },
        data: { updatedAt: new Date() }
      });
    } catch (dbError) {
      console.warn('Failed to update provider logout time:', dbError);
      // Don't fail logout if DB update fails
    }

    // Clear any server-side sessions/caches if you have them
    // For now, JWT invalidation happens on client side

    // Return success response with cache-clearing headers
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully',
      providerId // Include for client-side verification
    });

    // Add security headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if logout fails server-side, return success
    // Client should clear tokens regardless
    return NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  }
}