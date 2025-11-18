// OAuth callback handler for calendar authentication
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/lib/db';
import { CalendarConnectionService } from '@/lib/calendar-connections';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('📞 OAuth callback received:', { code: !!code, state, error });

    if (error) {
      console.error('❌ OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/provider/dashboard?error=${encodeURIComponent('OAuth authorization failed')}`, request.url)
      );
    }

    if (!code || !state) {
      console.error('❌ Missing code or state parameters');
      return NextResponse.redirect(
        new URL(`/provider/dashboard?error=${encodeURIComponent('Invalid OAuth callback')}`, request.url)
      );
    }

    let stateData;
    try {
      stateData = JSON.parse(decodeURIComponent(state));
      console.log('📋 State data:', stateData);
    } catch {
      console.error('❌ Invalid state parameter');
      return NextResponse.redirect(
        new URL(`/provider/dashboard?error=${encodeURIComponent('Invalid state parameter')}`, request.url)
      );
    }

    const { platform, connectionId, reauth, providerId } = stateData;

    // Check if this is a re-authentication or new connection flow
    const isReauth = reauth && connectionId;
    const isNewConnection = providerId && !reauth;

    if (!platform || (!isReauth && !isNewConnection)) {
      console.error('❌ Missing required state data');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zone-meet.com';
      return NextResponse.redirect(
        new URL(`/provider/dashboard?error=${encodeURIComponent('Invalid callback state')}`, baseUrl)
      );
    }

    // Exchange code for tokens
    console.log(`🔄 Exchanging code for ${platform} tokens...`);
    let tokenResponse;

    try {
      switch (platform) {
        case 'GOOGLE':
        case 'google':
          tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
          });
          break;

        case 'OUTLOOK':
        case 'outlook':
          const OutlookRedirectUri = process.env.OUTLOOK_REDIRECT_URI!;
          console.log('🔗 Token exchange redirect_uri:', OutlookRedirectUri);
          console.log('🆔 Using client_id:', process.env.MICROSOFT_CLIENT_ID);
          
          tokenResponse = await axios.post(
            'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            new URLSearchParams({
              client_id: process.env.MICROSOFT_CLIENT_ID!,
              client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
              code,
              grant_type: 'authorization_code',
              redirect_uri: OutlookRedirectUri,
            }),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
          );
          break;

        case 'TEAMS':
        case 'teams':
          const TeamsRedirectUri = process.env.TEAMS_REDIRECT_URI!;
          console.log('🔗 Token exchange redirect_uri:', TeamsRedirectUri);
          console.log('🆔 Using client_id:', process.env.MICROSOFT_CLIENT_ID);
          
          tokenResponse = await axios.post(
            'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            new URLSearchParams({
              client_id: process.env.MICROSOFT_CLIENT_ID!,
              client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
              code,
              grant_type: 'authorization_code',
              redirect_uri: TeamsRedirectUri,
            }),
            {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
          );
          break;

        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      console.log('✅ Tokens received successfully');

      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + (expires_in || 3600));

      if (isReauth) {
        // Update existing connection with new tokens
        await prisma.calendarConnection.update({
          where: { id: connectionId },
          data: {
            accessToken: access_token,
            refreshToken: refresh_token || undefined, // Keep existing if no new one
            tokenExpiry: expiryDate,
            isActive: true, // Reactivate the connection
            updatedAt: new Date(),
          },
        });

        console.log('✅ Connection updated with new tokens');

        // Redirect back to the calendar management page
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zone-meet.com';
        return NextResponse.redirect(
          new URL(`/provider/calendar/manage/${connectionId}?success=${encodeURIComponent('Calendar re-authenticated successfully!')}`, baseUrl)
        );
      } else {
        // New connection - use CalendarConnectionService
        if (platform === 'GOOGLE' || platform === 'google') {
          await CalendarConnectionService.connectGoogleCalendar(providerId, code);
        } else if (platform === 'outlook' || platform === 'OUTLOOK') {
          await CalendarConnectionService.connectOutlookCalendar(providerId, code);
        } else if (platform === 'teams' || platform === 'TEAMS') {
          await CalendarConnectionService.connectTeamsCalendar(providerId, code);
        }

        console.log('✅ New connection created successfully');

        // Redirect to calendar connect page with success
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zone-meet.com';
        return NextResponse.redirect(
          new URL(`/provider/calendar/connect?success=calendar_connected`, baseUrl)
        );
      }

    } catch (tokenError: unknown) {
      console.error('❌ Token exchange failed:', tokenError);
      
      // Log detailed error information
      if (tokenError && typeof tokenError === 'object' && 'response' in tokenError) {
        const axiosError = tokenError as { response?: { status?: number; data?: unknown; headers?: unknown }; config?: { url?: string; method?: string; data?: unknown } };
        if (axiosError.response) {
          console.error('📋 Error response status:', axiosError.response.status);
          console.error('📋 Error response data:', axiosError.response.data);
          console.error('📋 Error response headers:', axiosError.response.headers);
        }
        if (axiosError.config) {
          console.error('📋 Request config:', {
            url: axiosError.config.url,
            method: axiosError.config.method,
            data: axiosError.config.data
          });
        }
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zone-meet.com';
      if (isReauth) {
        return NextResponse.redirect(
          new URL(`/provider/calendar/manage/${connectionId}?error=${encodeURIComponent('Failed to refresh calendar authentication')}`, baseUrl)
        );
      } else {
        return NextResponse.redirect(
          new URL(`/provider/calendar/connect?error=${encodeURIComponent('Failed to connect calendar')}`, baseUrl)
        );
      }
    }

  } catch (error) {
    console.error('❌ Callback handler error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zone-meet.com';
    return NextResponse.redirect(
      new URL(`/provider/dashboard?error=${encodeURIComponent('OAuth callback failed')}`, baseUrl)
    );
  }
}
