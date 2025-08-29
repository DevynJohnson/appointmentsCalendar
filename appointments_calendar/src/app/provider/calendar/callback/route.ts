// OAuth callback handler for calendar re-authentication
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

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

    const { platform, connectionId, reauth } = stateData;

    if (!platform || !connectionId || !reauth) {
      console.error('❌ Missing required state data');
      return NextResponse.redirect(
        new URL(`/provider/dashboard?error=${encodeURIComponent('Invalid callback state')}`, request.url)
      );
    }

    // Exchange code for tokens
    console.log(`🔄 Exchanging code for ${platform} tokens...`);
    let tokenResponse;
    const baseUrl = new URL(request.url).origin;

    try {
      switch (platform) {
        case 'GOOGLE':
          tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: `${baseUrl}/provider/calendar/callback`,
          });
          break;

        case 'OUTLOOK':
        case 'TEAMS':
          tokenResponse = await axios.post(
            'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            new URLSearchParams({
              client_id: process.env[`${platform}_CLIENT_ID`]!,
              client_secret: process.env[`${platform}_CLIENT_SECRET`]!,
              code,
              grant_type: 'authorization_code',
              redirect_uri: `${baseUrl}/provider/calendar/callback`,
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

      // Update the existing connection with new tokens
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + (expires_in || 3600));

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
      return NextResponse.redirect(
        new URL(`/provider/calendar/manage/${connectionId}?success=${encodeURIComponent('Calendar re-authenticated successfully!')}`, request.url)
      );

    } catch (tokenError) {
      console.error('❌ Token exchange failed:', tokenError);
      return NextResponse.redirect(
        new URL(`/provider/calendar/manage/${connectionId}?error=${encodeURIComponent('Failed to refresh calendar authentication')}`, request.url)
      );
    }

  } catch (error) {
    console.error('❌ Callback handler error:', error);
    return NextResponse.redirect(
      new URL(`/provider/dashboard?error=${encodeURIComponent('OAuth callback failed')}`, request.url)
    );
  }
}
