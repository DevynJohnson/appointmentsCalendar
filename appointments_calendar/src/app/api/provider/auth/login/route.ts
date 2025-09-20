// Provider login API route with professional security
import { NextRequest, NextResponse } from 'next/server';
import { ProviderAuthService } from '@/lib/provider-auth';
import { loginLimiter, rateLimit, createRateLimitResponse } from '@/lib/rate-limiting-upstash';
import { validateRequestBody, providerLoginSchema, createValidationErrorResponse } from '@/lib/validation';
import { addSecurityHeaders, addRateLimitHeaders } from '@/lib/security-headers';
import { CalendarSyncService } from '@/lib/calendar-sync';
import { prisma } from '@/lib/db';

// Background function to sync provider calendars after login
async function triggerProviderCalendarSync(providerId: string): Promise<void> {
  console.log(`🔄 Triggering calendar sync for provider ${providerId} after login...`);
  
  const connections = await prisma.calendarConnection.findMany({
    where: {
      providerId: providerId,
      isActive: true,
      syncEvents: true,
    }
  });

  if (connections.length === 0) {
    console.log(`📋 No calendar connections found for provider ${providerId}`);
    return;
  }

  // Sync each connection
  const syncPromises = connections.map(async (connection) => {
    const syncConnection = {
      id: connection.id,
      providerId: connection.providerId,
      platform: connection.platform,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken || undefined,
      calendarId: connection.calendarId,
      tokenExpiry: connection.tokenExpiry,
    };

    switch (connection.platform) {
      case 'GOOGLE':
        return CalendarSyncService.syncGoogleCalendar(syncConnection);
      case 'OUTLOOK':
        return CalendarSyncService.syncOutlookCalendar(syncConnection);
      case 'TEAMS':
        return CalendarSyncService.syncTeamsCalendar(syncConnection);
      case 'APPLE':
        return CalendarSyncService.syncAppleCalendar(syncConnection);
      default:
        console.warn(`Unsupported platform: ${connection.platform}`);
        return { success: false, error: 'Unsupported platform' };
    }
  });

  const syncResults = await Promise.allSettled(syncPromises);
  const successfulSyncs = syncResults.filter(result => 
    result.status === 'fulfilled' && result.value?.success
  ).length;

  console.log(`✅ Login sync completed: ${successfulSyncs}/${connections.length} calendars synced for provider ${providerId}`);
}

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

    // If login successful, trigger calendar sync in the background
    if (result.provider?.id && result.token) {
      // Fire and forget - don't wait for sync to complete
      triggerProviderCalendarSync(result.provider.id).catch((error: unknown) => {
        console.warn(`Background calendar sync failed for provider ${result.provider.id}:`, error);
      });
    }

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
