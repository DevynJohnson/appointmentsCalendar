// Token refresh utilities for OAuth connections
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  success: boolean;
  error?: string;
}

/**
 * Refresh Microsoft/Outlook OAuth tokens
 */
export async function refreshMicrosoftToken(
  refreshToken: string
): Promise<TokenRefreshResult> {
  try {
    const response = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          scope: 'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Microsoft token refresh failed:', errorData);
      
      return {
        accessToken: '',
        success: false,
        expiresIn: 0,
        error: errorData.error_description || 'Token refresh failed'
      };
    }

    const tokens = await response.json();
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken, // Use new refresh token if provided
      expiresIn: tokens.expires_in || 3600,
      success: true
    };
    
  } catch (error) {
    console.error('Error refreshing Microsoft token:', error);
    return {
      accessToken: '',
      success: false,
      expiresIn: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Refresh Google OAuth tokens
 */
export async function refreshGoogleToken(
  refreshToken: string
): Promise<TokenRefreshResult> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google token refresh failed:', errorData);
      
      return {
        accessToken: '',
        success: false,
        expiresIn: 0,
        error: errorData.error_description || 'Token refresh failed'
      };
    }

    const tokens = await response.json();
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken, // Google may not return new refresh token
      expiresIn: tokens.expires_in || 3600,
      success: true
    };
    
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return {
      accessToken: '',
      success: false,
      expiresIn: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Refresh token for a calendar connection and update the database
 */
export async function refreshConnectionToken(connectionId: string): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> {
  try {
    // Get the connection details
    const connection = await prisma.calendarConnection.findUnique({
      where: { id: connectionId },
      select: {
        id: true,
        platform: true,
        refreshToken: true,
        tokenExpiry: true
      }
    });

    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    if (!connection.refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }

    let refreshResult: TokenRefreshResult;

    // Refresh based on platform
    switch (connection.platform) {
      case 'OUTLOOK':
      case 'TEAMS':
        refreshResult = await refreshMicrosoftToken(connection.refreshToken);
        break;
      case 'GOOGLE':
        refreshResult = await refreshGoogleToken(connection.refreshToken);
        break;
      default:
        return { success: false, error: `Token refresh not supported for platform: ${connection.platform}` };
    }

    if (!refreshResult.success) {
      return { success: false, error: refreshResult.error };
    }

    // Update the connection in the database
    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken,
        tokenExpiry: new Date(Date.now() + refreshResult.expiresIn * 1000),
        lastSyncAt: new Date(), // Update last sync to prevent immediate re-sync
      }
    });

    console.log(`✅ Successfully refreshed token for connection ${connectionId}`);
    
    return { 
      success: true, 
      accessToken: refreshResult.accessToken 
    };

  } catch (error) {
    console.error(`❌ Error refreshing token for connection ${connectionId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if a token needs refresh (expires within 5 minutes)
 */
export function shouldRefreshToken(tokenExpiry: Date | null): boolean {
  if (!tokenExpiry) return false;
  
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return tokenExpiry <= fiveMinutesFromNow;
}

/**
 * Automatic token refresh with retry logic
 */
export async function ensureValidToken(connection: {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  platform: string;
}): Promise<string> {
  // Check if token needs refresh
  if (!shouldRefreshToken(connection.tokenExpiry)) {
    return connection.accessToken;
  }

  console.log(`🔄 Token expiring soon for connection ${connection.id}, refreshing...`);
  
  // Attempt to refresh
  const refreshResult = await refreshConnectionToken(connection.id);
  
  if (refreshResult.success && refreshResult.accessToken) {
    return refreshResult.accessToken;
  }
  
  // If refresh failed, throw error with helpful message
  throw new Error(
    `Token refresh failed for ${connection.platform} calendar connection. ` +
    `Please re-authenticate your calendar connection. Error: ${refreshResult.error}`
  );
}