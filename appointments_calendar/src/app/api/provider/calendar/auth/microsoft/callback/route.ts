// Microsoft Calendar OAuth callback
import { NextRequest, NextResponse } from 'next/server';
import { CalendarConnectionService } from '@/lib/calendar-connections';
import { CalendarPlatform } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=oauth_failed', request.url)
      );
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=missing_code', request.url)
      );
    }

    // Extract provider ID and platform from state parameter
    let providerId: string;
    let platform: 'outlook' | 'teams' = 'outlook'; // Default to outlook
    try {
      if (state) {
        const stateData = JSON.parse(decodeURIComponent(state));
        providerId = stateData.providerId;
        platform = stateData.platform || 'outlook'; // Get platform from state
      } else {
        throw new Error('Missing state parameter');
      }
    } catch {
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=invalid_state', request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
          scope: 'https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access',
        }),
      }
    );
    
    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=token_exchange_failed', request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user's profile and calendar info
    const profileResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me',
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!profileResponse.ok) {
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=profile_access_failed', request.url)
      );
    }

    const profile = await profileResponse.json();

    // Get calendar info
    const calendarResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/calendar',
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      }
    );

    const calendarInfo = await calendarResponse.json();

    const userEmail = profile.mail || profile.userPrincipalName;

    if (!userEmail) {
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=no_email_found', request.url)
      );
    }

    // Save calendar connection
    await CalendarConnectionService.createConnection({
      providerId,
      platform: platform === 'teams' ? CalendarPlatform.TEAMS : CalendarPlatform.OUTLOOK,
      email: userEmail,
      calendarId: calendarInfo.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expires_in 
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
    });

    // Redirect back to calendar connect page with success
    const successParam = platform === 'teams' ? 'teams_connected' : 'microsoft_connected';
    return NextResponse.redirect(
      new URL(`/provider/calendar/connect?success=${successParam}`, request.url)
    );

  } catch {
    return NextResponse.redirect(
      new URL('/provider/calendar/connect?error=callback_failed', request.url)
    );
  }
}
