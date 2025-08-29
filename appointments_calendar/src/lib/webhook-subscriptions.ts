// Service to manage webhook subscriptions for calendar platforms
import { PrismaClient, CalendarConnection } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export class WebhookSubscriptionService {
  /**
   * Subscribe to calendar change notifications for a connection
   */
  static async subscribeToCalendar(connection: CalendarConnection): Promise<string | null> {
    try {
      if (connection.platform === 'OUTLOOK' || connection.platform === 'TEAMS') {
        return await this.subscribeMicrosoftCalendar(connection);
      } else if (connection.platform === 'GOOGLE') {
        return await this.subscribeGoogleCalendar(connection);
      } else if (connection.platform === 'APPLE') {
        // Apple doesn't support webhooks for CalDAV
        console.log('Apple CalDAV does not support webhooks - using polling instead');
        return null;
      }
    } catch (error) {
      console.error(`Failed to subscribe to ${connection.platform} webhooks:`, error);
      return null;
    }
    
    return null;
  }

  /**
   * Unsubscribe from calendar change notifications
   */
  static async unsubscribeFromCalendar(connection: CalendarConnection): Promise<boolean> {
    try {
      if (!connection.subscriptionId) {
        return true; // Nothing to unsubscribe from
      }

      if (connection.platform === 'OUTLOOK' || connection.platform === 'TEAMS') {
        return await this.unsubscribeMicrosoftCalendar(connection);
      } else if (connection.platform === 'GOOGLE') {
        return await this.unsubscribeGoogleCalendar(connection);
      }

      return true;
    } catch (error) {
      console.error(`Failed to unsubscribe from ${connection.platform} webhooks:`, error);
      return false;
    }
  }

  /**
   * Subscribe to Microsoft Graph notifications
   */
  private static async subscribeMicrosoftCalendar(connection: CalendarConnection): Promise<string | null> {
    const webhookUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/calendar?platform=outlook`;
    
    const subscription = {
      changeType: 'created,updated,deleted',
      notificationUrl: webhookUrl,
      resource: `/me/calendars/${connection.calendarId}/events`,
      expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      clientState: `provider_${connection.providerId}`,
    };

    try {
      const response = await axios.post(
        'https://graph.microsoft.com/v1.0/subscriptions',
        subscription,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const subscriptionId = response.data.id;
      const expiresAt = new Date(response.data.expirationDateTime);

      // Update the connection with subscription details
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          subscriptionId: subscriptionId,
          webhookUrl: webhookUrl,
          subscriptionExpiresAt: expiresAt,
        },
      });

      console.log(`Created Microsoft Graph subscription ${subscriptionId} for calendar ${connection.id}`);
      return subscriptionId;
    } catch (error) {
      console.error('Failed to create Microsoft Graph subscription:', error);
      throw error;
    }
  }

  /**
   * Subscribe to Google Calendar push notifications
   */
  private static async subscribeGoogleCalendar(connection: CalendarConnection): Promise<string | null> {
    const webhookUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/calendar?platform=google`;
    const channelId = `calendar_${connection.id}_${Date.now()}`;
    
    const watchRequest = {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: process.env.GOOGLE_WEBHOOK_TOKEN || 'default_token',
      expiration: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days (max for Google)
    };

    try {
      const response = await axios.post(
        `https://www.googleapis.com/calendar/v3/calendars/${connection.calendarId}/events/watch`,
        watchRequest,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const expiresAt = new Date(parseInt(response.data.expiration));

      // Update the connection with subscription details
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          subscriptionId: channelId,
          webhookUrl: webhookUrl,
          subscriptionExpiresAt: expiresAt,
        },
      });

      console.log(`Created Google Calendar watch ${channelId} for calendar ${connection.id}`);
      return channelId;
    } catch (error) {
      console.error('Failed to create Google Calendar watch:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from Microsoft Graph notifications
   */
  private static async unsubscribeMicrosoftCalendar(connection: CalendarConnection): Promise<boolean> {
    if (!connection.subscriptionId) return true;

    try {
      await axios.delete(
        `https://graph.microsoft.com/v1.0/subscriptions/${connection.subscriptionId}`,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
          },
        }
      );

      // Clear subscription details
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          subscriptionId: null,
          webhookUrl: null,
          subscriptionExpiresAt: null,
        },
      });

      console.log(`Deleted Microsoft Graph subscription ${connection.subscriptionId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete Microsoft Graph subscription:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from Google Calendar notifications
   */
  private static async unsubscribeGoogleCalendar(connection: CalendarConnection): Promise<boolean> {
    if (!connection.subscriptionId) return true;

    try {
      const stopRequest = {
        id: connection.subscriptionId,
        resourceId: connection.calendarId, // This should be the resource ID from the original watch response
      };

      await axios.post(
        'https://www.googleapis.com/calendar/v3/channels/stop',
        stopRequest,
        {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Clear subscription details
      await prisma.calendarConnection.update({
        where: { id: connection.id },
        data: {
          subscriptionId: null,
          webhookUrl: null,
          subscriptionExpiresAt: null,
        },
      });

      console.log(`Stopped Google Calendar watch ${connection.subscriptionId}`);
      return true;
    } catch (error) {
      console.error('Failed to stop Google Calendar watch:', error);
      return false;
    }
  }

  /**
   * Refresh webhook subscriptions that are about to expire
   */
  static async refreshExpiringSubscriptions(): Promise<void> {
    const expiringConnections = await prisma.calendarConnection.findMany({
      where: {
        isActive: true,
        subscriptionId: { not: null },
        subscriptionExpiresAt: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires within 24 hours
        },
      },
    });

    for (const connection of expiringConnections) {
      console.log(`Refreshing webhook subscription for calendar ${connection.id}`);
      
      // Unsubscribe from old subscription
      await this.unsubscribeFromCalendar(connection);
      
      // Create new subscription
      await this.subscribeToCalendar(connection);
    }
  }

  /**
   * Set up webhooks for all active calendar connections
   */
  static async setupAllWebhooks(providerId: string): Promise<void> {
    const connections = await prisma.calendarConnection.findMany({
      where: {
        providerId: providerId,
        isActive: true,
        subscriptionId: null, // Only set up webhooks for connections without existing subscriptions
      },
    });

    for (const connection of connections) {
      await this.subscribeToCalendar(connection);
    }
  }
}
