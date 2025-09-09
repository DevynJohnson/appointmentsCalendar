// Enhanced calendar synchronization service for multiple platforms
import { PrismaClient, CalendarPlatform } from '@prisma/client';
import axios from 'axios';
import { LocationService } from './location';
import { CalendarConnectionService } from './calendar-connections';
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
        
        if (connection.platform === CalendarPlatform.OUTLOOK) {
          result = await this.syncOutlookCalendar(connection);
        } else if (connection.platform === CalendarPlatform.GOOGLE) {
          result = await this.syncGoogleCalendar(connection);
        } else if (connection.platform === CalendarPlatform.TEAMS) {
          result = await this.syncTeamsCalendar(connection);
        } else if (connection.platform === CalendarPlatform.APPLE) {
          result = await this.syncAppleCalendar(connection);
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
    tokenExpiry: Date | null;
    platform: CalendarPlatform;
  }) {
    try {
      // Check if token needs refresh
      if (connection.tokenExpiry && new Date() > connection.tokenExpiry) {
        // Token refresh logic would go here
        throw new Error('Access token expired. Please reconnect your Outlook calendar.');
      }

      // Fetch events from Microsoft Graph API
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/me/calendars/${connection.calendarId}/events`,
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
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
    tokenExpiry: Date | null;
    platform: CalendarPlatform;
  }) {
    try {
      console.log('🌐 Starting Google calendar sync:', {
        connectionId: connection.id,
        calendarId: connection.calendarId,
        tokenExpiry: connection.tokenExpiry
      });

      // Check if token needs refresh
      if (connection.tokenExpiry && new Date() > connection.tokenExpiry) {
        console.log('⚠️ Google token expired, attempting refresh...');
        // Token refresh logic would go here
        throw new Error('Access token expired. Please reconnect your Google calendar.');
      }

      // Fetch events from Google Calendar API
      console.log('📡 Fetching events from Google Calendar API...');
      const response = await axios.get(
        `https://www.googleapis.com/calendar/v3/calendars/${connection.calendarId}/events`,
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
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
    tokenExpiry: Date | null;
    platform: CalendarPlatform;
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
    tokenExpiry: Date | null;
    platform: CalendarPlatform;
  }) {
    return AppleCalendarService.syncCalendarEvents(connection);
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
    calendarId: string,
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
