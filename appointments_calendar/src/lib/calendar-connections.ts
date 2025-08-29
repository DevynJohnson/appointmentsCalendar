// Multi-calendar connection service
import { PrismaClient, CalendarPlatform } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export class CalendarConnectionService {
  /**
   * Connect an Outlook calendar
   */
  static async connectOutlookCalendar(providerId: string, authCode: string) {
    try {
      // Exchange auth code for access token
      const tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: process.env.OUTLOOK_CLIENT_ID!,
          client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: process.env.OUTLOOK_REDIRECT_URI!,
          scope: 'https://graph.microsoft.com/calendars.read',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Get user's email from Microsoft Graph
      const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const userEmail = userResponse.data.mail || userResponse.data.userPrincipalName;

      // Store the connection
      const connection = await prisma.calendarConnection.create({
        data: {
          providerId,
          platform: CalendarPlatform.OUTLOOK,
          email: userEmail,
          calendarId: 'primary',
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiry: new Date(Date.now() + expires_in * 1000),
          isActive: true,
        },
      });

      return connection;
    } catch (error: unknown) {
      console.error('Failed to refresh access token:', error);
      
      // Log more details about the error for debugging
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; statusText?: string; data?: unknown; headers?: unknown } };
        console.error('Token refresh error response:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers
        });
      }
      
      throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Connect a Google calendar
   */
  static async connectGoogleCalendar(providerId: string, authCode: string) {
    try {
      // Exchange auth code for access token
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Get user's email from Google
      const userResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const userEmail = userResponse.data.email;

      // Store the connection
      const connection = await prisma.calendarConnection.create({
        data: {
          providerId,
          platform: CalendarPlatform.GOOGLE,
          email: userEmail,
          calendarId: 'primary',
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiry: new Date(Date.now() + expires_in * 1000),
          isActive: true,
        },
      });

      return connection;
    } catch (error) {
      console.error('Failed to connect Google calendar:', error);
      throw new Error('Failed to connect Google calendar');
    }
  }

  /**
   * Connect a Microsoft Teams calendar
   */
  static async connectTeamsCalendar(providerId: string, authCode: string) {
    try {
      // Teams uses the same OAuth flow as Outlook but accesses Teams-specific endpoints
      const tokenResponse = await axios.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        new URLSearchParams({
          client_id: process.env.TEAMS_CLIENT_ID!,
          client_secret: process.env.TEAMS_CLIENT_SECRET!,
          code: authCode,
          grant_type: 'authorization_code',
          redirect_uri: process.env.TEAMS_REDIRECT_URI!,
          scope: 'https://graph.microsoft.com/calendars.read https://graph.microsoft.com/onlineMeetings.read',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      // Get user's email from Microsoft Graph
      const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const userEmail = userResponse.data.mail || userResponse.data.userPrincipalName;

      // Store the connection
      const connection = await prisma.calendarConnection.create({
        data: {
          providerId,
          platform: CalendarPlatform.TEAMS,
          email: userEmail,
          calendarId: 'primary',
          accessToken: access_token,
          refreshToken: refresh_token,
          tokenExpiry: new Date(Date.now() + expires_in * 1000),
          isActive: true,
        },
      });

      return connection;
    } catch (error) {
      console.error('Failed to connect Teams calendar:', error);
      throw new Error('Failed to connect Teams calendar');
    }
  }

  /**
   * Connect an Apple iCloud calendar (using CalDAV)
   */
  static async connectAppleCalendar(
    providerId: string, 
    appleId: string, 
    appSpecificPassword: string
  ) {
    try {
      // Apple Calendar uses CalDAV, not OAuth
      // We'll store the credentials securely for CalDAV access
      
      // Test the connection first
      const calDavUrl = `https://caldav.icloud.com/${appleId}/calendars/`;
      
      // Basic auth test (you might want to use a CalDAV library in production)
      const testResponse = await axios.get(calDavUrl, {
        auth: {
          username: appleId,
          password: appSpecificPassword,
        },
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
        timeout: 10000,
      });

      if (testResponse.status !== 200) {
        throw new Error('Failed to authenticate with Apple Calendar');
      }

      // Store the connection (Note: In production, encrypt the password)
      const connection = await prisma.calendarConnection.create({
        data: {
          providerId,
          platform: CalendarPlatform.APPLE,
          email: appleId,
          calendarId: 'primary',
          accessToken: Buffer.from(`${appleId}:${appSpecificPassword}`).toString('base64'),
          refreshToken: null, // Apple doesn't use refresh tokens
          tokenExpiry: null, // App-specific passwords don't expire
          isActive: true,
        },
      });

      return connection;
    } catch (error) {
      console.error('Failed to connect Apple calendar:', error);
      throw new Error('Failed to connect Apple calendar. Please check your Apple ID and App-Specific Password.');
    }
  }
  static async getProviderConnections(providerId: string) {
    return await prisma.calendarConnection.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Disconnect a calendar
   */
  static async disconnectCalendar(connectionId: string, providerId: string) {
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        id: connectionId,
        providerId,
      },
    });

    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    // Deactivate the connection
    await prisma.calendarConnection.update({
      where: { id: connectionId },
      data: { isActive: false },
    });

    return { success: true };
  }

  /**
   * Refresh access token for a connection
   */
  static async refreshAccessToken(connectionId: string) {
    const connection = await prisma.calendarConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || !connection.refreshToken) {
      // Apple calendars don't need token refresh
      if (connection?.platform === CalendarPlatform.APPLE) {
        return connection.accessToken;
      }
      throw new Error('Connection not found or no refresh token available');
    }

    try {
      let tokenResponse;

      if (connection.platform === CalendarPlatform.OUTLOOK) {
        tokenResponse = await axios.post(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          new URLSearchParams({
            client_id: process.env.OUTLOOK_CLIENT_ID!,
            client_secret: process.env.OUTLOOK_CLIENT_SECRET!,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token',
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );
      } else if (connection.platform === CalendarPlatform.TEAMS) {
        tokenResponse = await axios.post(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          new URLSearchParams({
            client_id: process.env.TEAMS_CLIENT_ID!,
            client_secret: process.env.TEAMS_CLIENT_SECRET!,
            refresh_token: connection.refreshToken,
            grant_type: 'refresh_token',
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );
      } else if (connection.platform === CalendarPlatform.GOOGLE) {
        tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: connection.refreshToken,
          grant_type: 'refresh_token',
        });
      } else {
        throw new Error('Unsupported calendar platform');
      }

      const { access_token, expires_in, refresh_token } = tokenResponse.data;

      // Update the connection with new tokens
      await prisma.calendarConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token || connection.refreshToken,
          tokenExpiry: new Date(Date.now() + expires_in * 1000),
        },
      });

      return access_token;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      // Deactivate the connection if refresh fails
      await prisma.calendarConnection.update({
        where: { id: connectionId },
        data: { isActive: false },
      });
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Generic method to create a calendar connection
   */
  static async createConnection(connectionData: {
    providerId: string;
    platform: CalendarPlatform;
    email: string;
    calendarId: string;
    accessToken: string;
    refreshToken?: string | null;
    tokenExpiry?: Date | null;
  }) {
    try {
      const connection = await prisma.calendarConnection.create({
        data: {
          providerId: connectionData.providerId,
          platform: connectionData.platform,
          email: connectionData.email,
          calendarId: connectionData.calendarId,
          accessToken: connectionData.accessToken,
          refreshToken: connectionData.refreshToken,
          tokenExpiry: connectionData.tokenExpiry,
          isActive: true,
        },
      });

      return connection;
    } catch (error) {
      console.error('Failed to create calendar connection:', error);
      throw new Error('Failed to create calendar connection');
    }
  }

  /**
   * Get OAuth authorization URLs
   */
  static getAuthUrls() {
    const outlookAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${process.env.OUTLOOK_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.OUTLOOK_REDIRECT_URI!)}&` +
      `scope=${encodeURIComponent('https://graph.microsoft.com/calendars.read')}&` +
      `response_mode=query`;

    const teamsAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${process.env.TEAMS_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.TEAMS_REDIRECT_URI!)}&` +
      `scope=${encodeURIComponent('https://graph.microsoft.com/calendars.read https://graph.microsoft.com/onlineMeetings.read')}&` +
      `response_mode=query`;

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI!)}&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly')}&` +
      `access_type=offline&` +
      `prompt=consent`;

    return {
      outlook: outlookAuthUrl,
      teams: teamsAuthUrl,
      google: googleAuthUrl,
      // Apple uses a different authentication method (App-specific passwords)
      apple: null,
    };
  }
}
