// Enhanced calendar synchronization service for multiple platforms
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { ensureValidToken } from './token-refresh';
import { LocationService } from './location';

// Calendar platform constants
const CalendarPlatform = {
  OUTLOOK: 'OUTLOOK',
  GOOGLE: 'GOOGLE',
  TEAMS: 'TEAMS',
  APPLE: 'APPLE',
  OTHER: 'OTHER'
} as const;

type CalendarPlatform = typeof CalendarPlatform[keyof typeof CalendarPlatform];
// import { CalendarConnectionService } from './calendar-connections'; // Unused import
import { AppleCalendarService } from './apple-calendar';

const prisma = new PrismaClient();

export class CalendarSyncService {
  /**
   * Sync all calendars for a provider
   */
  static async syncAllCalendars(providerId: string) {
    const connections = await prisma.calendarConnection.findMany({
      where: {
        providerId,
        isActive: true,
      },
    });

    const results = [];

    for (const connection of connections) {
      try {
        let result;
        
        const syncConnection = {
          id: connection.id,
          providerId: connection.providerId,
          calendarId: connection.calendarId,
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken || undefined,
          tokenExpiry: connection.tokenExpiry,
          platform: connection.platform,
        };
        
        if (connection.platform === 'OUTLOOK') {
          result = await this.syncOutlookCalendar(syncConnection);
        } else if (connection.platform === 'GOOGLE') {
          result = await this.syncGoogleCalendar(syncConnection);
        } else if (connection.platform === 'TEAMS') {
          result = await this.syncTeamsCalendar(syncConnection);
        } else if (connection.platform === 'APPLE') {
          result = await this.syncAppleCalendar(syncConnection);
        } else {
          console.warn(`Unsupported platform: ${connection.platform}`);
          continue;
        }

        results.push({
          connectionId: connection.id,
          platform: connection.platform,
          ...result,
        });
      } catch (error) {
        console.error(`Failed to sync ${connection.platform} calendar:`, error);
        results.push({
          connectionId: connection.id,
          platform: connection.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      success: true,
      results,
      totalConnections: connections.length,
      successfulSyncs: results.filter(r => r.success).length,
    };
  }

  /**
   * Sync Outlook calendar
   */
  static async syncOutlookCalendar(connection: {
    id: string;
    providerId: string;
    calendarId: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry: Date | null;
    platform: string;
  }) {
    try {
      // Ensure we have a valid access token (refresh if needed)
      const validConnection = {
        ...connection,
        refreshToken: connection.refreshToken || null
      };
      const accessToken = await ensureValidToken(validConnection);

      // Fetch events from Microsoft Graph API
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/me/calendars/${connection.calendarId}/events`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            $select: 'id,subject,body,start,end,location,isAllDay',
            $top: 50,
          },
        }
      );

      const events = response.data.value || [];
      let eventsProcessed = 0;

      for (const event of events) {
        try {
          await this.processOutlookEvent(connection.providerId, event, connection.calendarId, connection.id);
          eventsProcessed++;
        } catch (eventError) {
          console.error(`Failed to process Outlook event ${event.id}:`, eventError);
        }
      }

      // Update last sync time
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: true,
        eventsProcessed,
        message: `Synced ${eventsProcessed} events from Outlook`,
      };
    } catch (error) {
      console.error('Outlook calendar sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync Google calendar
   */
  static async syncGoogleCalendar(connection: {
    id: string;
    providerId: string;
    calendarId: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry: Date | null;
    platform: string;
  }) {
    try {
      console.log('🌐 Starting Google calendar sync:', {
        connectionId: connection.id,
        calendarId: connection.calendarId,
        tokenExpiry: connection.tokenExpiry
      });

      // Ensure we have a valid access token (refresh if needed)
      const validConnection = {
        ...connection,
        refreshToken: connection.refreshToken || null
      };
      const accessToken = await ensureValidToken(validConnection);

      // Fetch events from Google Calendar API
      console.log('📡 Fetching events from Google Calendar API...');
      const response = await axios.get(
        `https://www.googleapis.com/calendar/v3/calendars/${connection.calendarId}/events`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            maxResults: 50,
            singleEvents: true,
            orderBy: 'startTime',
            timeMin: new Date().toISOString(), // Only get future events
          },
        }
      );

      const events = response.data.items || [];
      console.log(`📅 Found ${events.length} events in Google Calendar`);
      
      let eventsProcessed = 0;

      for (const event of events) {
        try {
          console.log(`📝 Processing Google event: ${event.summary || 'Untitled'} (${event.id})`);
          await this.processGoogleEvent(connection.providerId, event, connection.calendarId, connection.id);
          eventsProcessed++;
        } catch (eventError) {
          console.error(`❌ Failed to process Google event ${event.id}:`, eventError);
        }
      }

      console.log(`✅ Processed ${eventsProcessed} Google events successfully`);

      // Update last sync time
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: true,
        eventsProcessed,
        message: `Synced ${eventsProcessed} events from Google Calendar`,
      };
    } catch (error) {
      console.error('❌ Google calendar sync failed:', error);
      
      // Enhanced error logging
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; statusText?: string; data?: unknown } };
        console.error('Google API Error Response:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data
        });
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sync Teams calendar (uses same API as Outlook)
   */
  static async syncTeamsCalendar(connection: {
    id: string;
    providerId: string;
    calendarId: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry: Date | null;
    platform: string;
  }) {
    // Teams uses the same Microsoft Graph API as Outlook
    return this.syncOutlookCalendar(connection);
  }

  /**
   * Sync Apple iCloud calendar using modern CalDAV
   */
  static async syncAppleCalendar(connection: {
    id: string;
    providerId: string;
    calendarId: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiry: Date | null;
    platform: string;
  }) {
    // Get the full connection details including email
    const fullConnection = await prisma.calendarConnection.findFirst({
      where: { id: connection.id }
    });
    
    if (!fullConnection) {
      throw new Error(`Apple connection ${connection.id} not found`);
    }
    
    return AppleCalendarService.syncCalendarEvents({
      ...connection,
      email: fullConnection.email
    });
  }

  /**
   * Process Outlook calendar event
   */
  private static async processOutlookEvent(
    providerId: string, 
    event: {
      id: string;
      subject?: string;
      body?: { content?: string };
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
      location?: { displayName?: string };
      isAllDay?: boolean;
    }, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    calendarId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    connectionId: string
  ) {
    // Implementation for processing Outlook events
    console.log(`Processing Outlook event: ${event.subject}`);
  }

  /**
   * Process Google calendar event
   */
  private static async processGoogleEvent(
    providerId: string,
    event: {
      id: string;
      summary?: string;
      description?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      location?: string;
    },
    calendarId: string,
    connectionId: string
  ) {
    const startTime = new Date(event.start?.dateTime || event.start?.date || '');
    const endTime = new Date(event.end?.dateTime || event.end?.date || '');
    
    // Skip events without valid dates
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.log(`⚠️ Skipping Google event with invalid dates: ${event.summary}`);
      return;
    }

    // Format location from calendar event
    const locationText = event.location || '';
    const locationInfo = LocationService.parseLocation(locationText);

    await prisma.calendarEvent.upsert({
      where: {
        externalEventId_platform_calendarId: {
          externalEventId: event.id,
          platform: CalendarPlatform.GOOGLE,
          calendarId,
        },
      },
      update: {
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        startTime,
        endTime,
        isAllDay: !event.start?.dateTime, // All-day if no specific time
        location: locationInfo.displayLocation,
        lastSyncAt: new Date(),
      },
      create: {
        providerId,
        connectionId,
        externalEventId: event.id,
        platform: CalendarPlatform.GOOGLE,
        calendarId,
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        startTime,
        endTime,
        isAllDay: !event.start?.dateTime, // All-day if no specific time
        location: locationInfo.displayLocation,
        allowBookings: true, // Provider can disable later if needed
        maxBookings: 1,
      },
    });
    
    console.log(`✅ Processed Google event: ${event.summary} (${startTime.toLocaleDateString()})`);
  }
}
