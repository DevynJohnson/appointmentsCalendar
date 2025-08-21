// Google Calendar OAuth callback
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

    // Extract provider ID from state parameter
    let providerId: string;
    try {
      if (state) {
        const stateData = JSON.parse(decodeURIComponent(state));
        providerId = stateData.providerId;
      } else {
        throw new Error('Missing state parameter');
      }
    } catch (err) {
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=invalid_state', request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=token_exchange_failed', request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user's calendar info
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!calendarResponse.ok) {
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=calendar_access_failed', request.url)
      );
    }

    const calendarInfo = await calendarResponse.json();

    // Get user profile for email
    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      }
    );

    const profile = await profileResponse.json();

    // Try to get email from profile, fallback to calendar ID (which is the email)
    let userEmail = profile.email;
    
    if (!userEmail && calendarInfo.id) {
      userEmail = calendarInfo.id;
    }
    
    if (!userEmail) {
      return NextResponse.redirect(
        new URL('/provider/calendar/connect?error=no_email_access', request.url)
      );
    }
    

    // Save calendar connection
    await CalendarConnectionService.createConnection({
      providerId,
      platform: CalendarPlatform.GOOGLE,
      email: userEmail,
      calendarId: calendarInfo.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expires_in 
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
    });
    

    // Redirect back to calendar connect page with success
    return NextResponse.redirect(
      new URL('/provider/calendar/connect?success=google_connected', request.url)
    );

  } catch (error) {
    
    return NextResponse.redirect(
      new URL('/provider/calendar/connect?error=callback_failed', request.url)
    );
  }
}
