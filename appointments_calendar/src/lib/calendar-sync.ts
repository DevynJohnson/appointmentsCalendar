// Enhanced calendar synchronization service for multiple platforms
import { PrismaClient, CalendarPlatform } from '@prisma/client';
import axios from 'axios';
import { LocationService } from './location';
import { CalendarConnectionService } from './calendar-connections';

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

    return results;
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
    let accessToken = connection.accessToken;

    // Check if token needs refresh
    if (connection.tokenExpiry && connection.tokenExpiry < new Date()) {
      try {
        accessToken = await CalendarConnectionService.refreshAccessToken(connection.id);
      } catch {
        throw new Error('Failed to refresh Outlook access token');
      }
    }

    try {
      // Fetch events from Microsoft Graph API
      const response = await axios.get(
        'https://graph.microsoft.com/v1.0/me/events',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            $select: 'id,subject,body,start,end,location,isAllDay',
            $filter: `start/dateTime ge '${new Date().toISOString()}'`,
            $orderby: 'start/dateTime',
            $top: 100,
          },
        }
      );

      const events = response.data.value;
      
      // Process and store events
      let processedCount = 0;
      for (const event of events) {
        await this.processOutlookEvent(connection.providerId, event, connection.calendarId, connection.id);
        processedCount++;
      }

      // Update last sync time
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() }
      });

      return { success: true, eventsProcessed: processedCount };
    } catch (error) {
      console.error('Outlook calendar sync failed:', error);
      throw error;
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
    let accessToken = connection.accessToken;

    // Check if token needs refresh
    if (connection.tokenExpiry && connection.tokenExpiry < new Date()) {
      try {
        accessToken = await CalendarConnectionService.refreshAccessToken(connection.id);
      } catch {
        throw new Error('Failed to refresh Google access token');
      }
    }

    try {
      // Fetch events from Google Calendar API
      const response = await axios.get(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            timeMin: new Date().toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
          },
        }
      );

      const events = response.data.items || [];
      
      // Process and store events
      let processedCount = 0;
      for (const event of events) {
        await this.processGoogleEvent(connection.providerId, event, connection.calendarId, connection.id);
        processedCount++;
      }

      // Update last sync time
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() }
      });

      return { success: true, eventsProcessed: processedCount };
    } catch (error) {
      console.error('Google calendar sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync Microsoft Teams calendar
   */
  static async syncTeamsCalendar(connection: {
    id: string;
    providerId: string;
    calendarId: string;
    accessToken: string;
    tokenExpiry: Date | null;
    platform: CalendarPlatform;
  }) {
    let accessToken = connection.accessToken;

    // Check if token needs refresh
    if (connection.tokenExpiry && connection.tokenExpiry < new Date()) {
      try {
        accessToken = await CalendarConnectionService.refreshAccessToken(connection.id);
      } catch {
        throw new Error('Failed to refresh Teams access token');
      }
    }

    try {
      // Fetch calendar events from Microsoft Graph API (same as Outlook)
      const eventsResponse = await axios.get(
        'https://graph.microsoft.com/v1.0/me/events',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            $select: 'id,subject,body,start,end,location,isAllDay,isOnlineMeeting,onlineMeetingUrl',
            $filter: `start/dateTime ge '${new Date().toISOString()}'`,
            $orderby: 'start/dateTime',
            $top: 100,
          },
        }
      );

      const events = eventsResponse.data.value || [];

      // Process calendar events (Teams meetings will be included in calendar events with isOnlineMeeting=true)
      let processedCount = 0;
      for (const event of events) {
        await this.processTeamsEvent(connection.providerId, event, connection.calendarId, connection.id);
        processedCount++;
      }

      // Update last sync time
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() }
      });

      return { success: true, eventsProcessed: processedCount };
    } catch (error) {
      console.error('Teams calendar sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync Apple iCloud calendar
   */
  static async syncAppleCalendar(connection: {
    id: string;
    providerId: string;
    calendarId: string;
    accessToken: string;
    tokenExpiry: Date | null;
    platform: CalendarPlatform;
  }) {
    try {
      // Decode the stored credentials
      console.log('🍎 Apple sync - checking stored credentials, token length:', connection.accessToken?.length);
      console.log('🔐 Stored accessToken:', connection.accessToken?.substring(0, 20) + '...');
      
      const credentials = Buffer.from(connection.accessToken, 'base64').toString('utf-8');
      console.log('🔓 Decoded credentials string:', credentials);
      
      const [appleId, appPassword] = credentials.split(':');
      console.log('🆔 Parsed Apple ID:', appleId);
      console.log('🔑 App password length:', appPassword?.length);

      if (!appleId || !appPassword) {
        throw new Error('Apple ID and App-specific password are required. Please update your credentials in the settings.');
      }

      console.log(`🍎 Attempting CalDAV connection for Apple ID: ${appleId}`);

      // Apple CalDAV requires a specific URL format and discovery process
      // First, try the well-known CalDAV discovery endpoint
      const calDavDiscoveryUrl = `https://caldav.icloud.com/.well-known/caldav`;
      const principalUrl = `https://caldav.icloud.com/${appleId}/principal/`;
      
      console.log(`🔗 CalDAV Discovery URL: ${calDavDiscoveryUrl}`);
      console.log(`🔗 Principal URL: ${principalUrl}`);

      // Try a basic OPTIONS request first to test authentication
      console.log(`🧪 Testing authentication with OPTIONS request...`);
      const optionsResponse = await axios({
        method: 'OPTIONS',
        url: 'https://caldav.icloud.com/',
        auth: {
          username: appleId,
          password: appPassword,
        },
        timeout: 15000
      });

      console.log(`✅ OPTIONS response status: ${optionsResponse.status}`);
      console.log(`📋 OPTIONS response headers:`, optionsResponse.headers);

      // Now let's try the CalDAV discovery process
      // First, get the current user principal
      console.log(`🔍 Discovering current user principal...`);
      
      const principalDiscoveryResponse = await axios({
        method: 'PROPFIND',
        url: 'https://caldav.icloud.com/',
        auth: {
          username: appleId,
          password: appPassword,
        },
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Depth': '0',
        },
        data: `<?xml version="1.0" encoding="utf-8" ?>
               <propfind xmlns="DAV:">
                 <prop>
                   <current-user-principal/>
                 </prop>
               </propfind>`,
        timeout: 15000
      });

      console.log(`✅ Principal discovery status: ${principalDiscoveryResponse.status}`);
      console.log(`📋 Principal discovery response:`, principalDiscoveryResponse.data);

      // Parse the principal URL from the response
      const responseText = principalDiscoveryResponse.data;
      const principalMatch = responseText.match(/<href[^>]*>([^<]+)<\/href>/);
      const discoveredPrincipal = principalMatch ? principalMatch[1] : null;
      
      if (!discoveredPrincipal) {
        throw new Error('Could not discover principal URL from Apple CalDAV server');
      }
      
      const actualPrincipalUrl = `https://caldav.icloud.com${discoveredPrincipal}`;
      console.log(`🎯 Discovered principal URL: ${actualPrincipalUrl}`);

      // Now try the PROPFIND request to the DISCOVERED principal URL
      console.log(`🔍 Attempting PROPFIND to discovered principal URL...`);
      
      const response = await axios({
        method: 'PROPFIND',
        url: actualPrincipalUrl,
        auth: {
          username: appleId,
          password: appPassword,
        },
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Depth': '0',
        },
        data: `<?xml version="1.0" encoding="utf-8" ?>
               <propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
                 <prop>
                   <C:calendar-home-set/>
                 </prop>
               </propfind>`,
        timeout: 15000
      });

      console.log(`✅ CalDAV response status: ${response.status}`);
      console.log(`📋 CalDAV response headers:`, response.headers);

      // Update last sync time (actual event parsing would require a CalDAV library)
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date() }
      });

      // For now, return success with 0 events
      // In production, you'd parse the CalDAV response and extract events
      return { 
        success: true, 
        eventsProcessed: 0,
        note: 'Apple Calendar sync requires CalDAV parsing - consider using a CalDAV library'
      };
    } catch (error: unknown) {
      console.error('Apple calendar sync failed:', error);
      
      // Provide more specific error messages based on the HTTP status code
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 403) {
          throw new Error('Apple calendar authentication failed (403 Forbidden). Please check: 1) Your app-specific password is correct and not expired, 2) Two-factor authentication is enabled on your Apple ID, 3) CalDAV access is enabled in your iCloud settings.');
        } else if (axiosError.response?.status === 401) {
          throw new Error('Apple calendar authentication failed (401 Unauthorized). Please verify your Apple ID and app-specific password.');
        } else if (axiosError.response?.status === 404) {
          throw new Error('Apple calendar request failed (404 Not Found). Please check your Apple ID format and ensure CalDAV is enabled.');
        }
      }
      
      if (error && typeof error === 'object' && 'code' in error) {
        const networkError = error as { code?: string };
        if (networkError.code === 'ENOTFOUND' || networkError.code === 'ECONNREFUSED') {
          throw new Error('Unable to connect to Apple CalDAV server. Please check your internet connection.');
        }
      }
      
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Apple calendar authentication failed. Please verify your Apple ID and app-specific password.');
      } else if (error instanceof Error && error.message.includes('400')) {
        throw new Error('Apple calendar request failed. Please check your Apple ID format and ensure CalDAV is enabled.');
      } else {
        throw new Error('Apple calendar sync failed. Please check your credentials and try again.');
      }
    }
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
    const startTime = new Date(event.start.dateTime || event.start.date || '');
    const endTime = new Date(event.end.dateTime || event.end.date || '');
    
    // Format location from calendar event
    const locationText = event.location?.displayName || '';
    const locationInfo = LocationService.parseLocation(locationText);

    await prisma.calendarEvent.upsert({
      where: {
        externalEventId_platform_calendarId: {
          externalEventId: event.id,
          platform: CalendarPlatform.OUTLOOK,
          calendarId,
        },
      },
      update: {
        title: event.subject || 'Untitled Event',
        description: event.body?.content || '',
        startTime,
        endTime,
        isAllDay: event.isAllDay || false,
        location: locationInfo.displayLocation,
        lastSyncAt: new Date(),
      },
      create: {
        providerId,
        connectionId,
        externalEventId: event.id,
        platform: CalendarPlatform.OUTLOOK,
        calendarId,
        title: event.subject || 'Untitled Event',
        description: event.body?.content || '',
        startTime,
        endTime,
        isAllDay: event.isAllDay || false,
        location: locationInfo.displayLocation,
        allowBookings: true, // Provider can disable later if needed
        maxBookings: 1,
      },
    });
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
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
      location?: string;
    },
    calendarId: string,
    connectionId: string
  ) {
    const startTime = new Date(event.start.dateTime || event.start.date || '');
    const endTime = new Date(event.end.dateTime || event.end.date || '');
    
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
        isAllDay: !event.start.dateTime, // If no dateTime, it's all-day
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
        isAllDay: !event.start.dateTime,
        location: locationInfo.displayLocation,
        allowBookings: true,
        maxBookings: 1,
      },
    });
  }

  /**
   * Process Teams calendar event
   */
  private static async processTeamsEvent(
    providerId: string,
    event: {
      id: string;
      subject?: string;
      body?: { content?: string };
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
      location?: { displayName?: string };
      isAllDay?: boolean;
      isOnlineMeeting?: boolean;
      onlineMeetingUrl?: string;
    },
    calendarId: string,
    connectionId: string
  ) {
    const startTime = new Date(event.start.dateTime || event.start.date || '');
    const endTime = new Date(event.end.dateTime || event.end.date || '');
    
    // Format location - for Teams, include online meeting info
    let locationText = event.location?.displayName || '';
    if (event.isOnlineMeeting && event.onlineMeetingUrl) {
      locationText = locationText 
        ? `${locationText} (Teams Meeting: ${event.onlineMeetingUrl})`
        : `Teams Meeting: ${event.onlineMeetingUrl}`;
    }
    
    const locationInfo = LocationService.parseLocation(locationText);

    await prisma.calendarEvent.upsert({
      where: {
        externalEventId_platform_calendarId: {
          externalEventId: event.id,
          platform: CalendarPlatform.TEAMS,
          calendarId,
        },
      },
      update: {
        title: event.subject || 'Untitled Event',
        description: event.body?.content || '',
        startTime,
        endTime,
        isAllDay: event.isAllDay || false,
        location: locationInfo.displayLocation,
        lastSyncAt: new Date(),
      },
      create: {
        providerId,
        connectionId,
        externalEventId: event.id,
        platform: CalendarPlatform.TEAMS,
        calendarId,
        title: event.subject || 'Untitled Event',
        description: event.body?.content || '',
        startTime,
        endTime,
        isAllDay: event.isAllDay || false,
        location: locationInfo.displayLocation,
        allowBookings: true,
        maxBookings: 1,
      },
    });
  }

  /**
   * Process Teams meeting
   */
  private static async processTeamsMeeting(
    providerId: string,
    meeting: {
      id: string;
      subject?: string;
      startDateTime?: string;
      endDateTime?: string;
      joinWebUrl?: string;
    },
    calendarId: string,
    connectionId: string
  ) {
    if (!meeting.startDateTime || !meeting.endDateTime) {
      return; // Skip meetings without proper time data
    }

    const startTime = new Date(meeting.startDateTime);
    const endTime = new Date(meeting.endDateTime);
    
    // Teams meetings are always online
    const locationText = `Teams Meeting: ${meeting.joinWebUrl || 'Online'}`;
    const locationInfo = LocationService.parseLocation(locationText);

    await prisma.calendarEvent.upsert({
      where: {
        externalEventId_platform_calendarId: {
          externalEventId: meeting.id,
          platform: CalendarPlatform.TEAMS,
          calendarId: `${calendarId}-meeting`,
        },
      },
      update: {
        title: meeting.subject || 'Teams Meeting',
        description: `Teams Meeting - ${meeting.joinWebUrl || ''}`,
        startTime,
        endTime,
        isAllDay: false,
        location: locationInfo.displayLocation,
        lastSyncAt: new Date(),
      },
      create: {
        providerId,
        connectionId,
        externalEventId: meeting.id,
        platform: CalendarPlatform.TEAMS,
        calendarId: `${calendarId}-meeting`,
        title: meeting.subject || 'Teams Meeting',
        description: `Teams Meeting - ${meeting.joinWebUrl || ''}`,
        startTime,
        endTime,
        isAllDay: false,
        location: locationInfo.displayLocation,
        allowBookings: true,
        maxBookings: 1,
      },
    });
  }
}
