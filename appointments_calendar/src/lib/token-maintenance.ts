// Proactive token refresh service to prevent token expiration
import { prisma } from '@/lib/db';
import { refreshConnectionToken } from '@/lib/token-refresh';

export class TokenMaintenanceService {
  /**
   * Refresh tokens that are close to expiring (within 24 hours)
   * This should be called periodically (e.g., via cron job or API route)
   */
  static async refreshExpiringTokens() {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    // Find connections with tokens expiring within 24 hours
    const expiringConnections = await prisma.calendarConnection.findMany({
      where: {
        isActive: true,
        tokenExpiry: {
          lt: tomorrow // Less than 24 hours from now
        },
        refreshToken: {
          not: null // Only try to refresh if we have a refresh token
        }
      },
      select: {
        id: true,
        providerId: true,
        platform: true,
        tokenExpiry: true,
        email: true
      }
    });

    console.log(`🔄 Found ${expiringConnections.length} calendar connections with tokens expiring within 24 hours`);

    const refreshResults = [];

    // Refresh each expiring token
    for (const connection of expiringConnections) {
      try {
        console.log(`🔄 Proactively refreshing ${connection.platform} token for connection ${connection.id}`);
        
        const result = await refreshConnectionToken(connection.id);
        
        if (result.success) {
          console.log(`✅ Successfully refreshed ${connection.platform} token for connection ${connection.id}`);
          refreshResults.push({
            connectionId: connection.id,
            platform: connection.platform,
            success: true,
            message: 'Token refreshed successfully'
          });
        } else {
          console.warn(`⚠️ Failed to refresh ${connection.platform} token for connection ${connection.id}:`, result.error);
          refreshResults.push({
            connectionId: connection.id,
            platform: connection.platform,
            success: false,
            error: result.error
          });
        }
      } catch (error) {
        console.error(`❌ Error refreshing token for connection ${connection.id}:`, error);
        refreshResults.push({
          connectionId: connection.id,
          platform: connection.platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      totalChecked: expiringConnections.length,
      results: refreshResults,
      successCount: refreshResults.filter(r => r.success).length,
      failureCount: refreshResults.filter(r => !r.success).length
    };
  }

  /**
   * Check for and disable connections with expired refresh tokens
   * This helps clean up connections that can no longer be refreshed
   */
  static async cleanupExpiredConnections() {
    const expiredConnections = await prisma.calendarConnection.findMany({
      where: {
        isActive: true,
        OR: [
          {
            // Tokens expired more than 7 days ago (definitely dead)
            tokenExpiry: {
              lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          {
            // No refresh token available
            refreshToken: null,
            tokenExpiry: {
              lt: new Date() // Already expired
            }
          }
        ]
      }
    });

    console.log(`🧹 Found ${expiredConnections.length} expired calendar connections to clean up`);

    // Disable expired connections
    if (expiredConnections.length > 0) {
      await prisma.calendarConnection.updateMany({
        where: {
          id: {
            in: expiredConnections.map(c => c.id)
          }
        },
        data: {
          isActive: false,
          syncEvents: false
        }
      });

      console.log(`🧹 Disabled ${expiredConnections.length} expired calendar connections`);
    }

    return {
      disabledCount: expiredConnections.length,
      connections: expiredConnections.map(c => ({
        id: c.id,
        platform: c.platform,
        providerId: c.providerId
      }))
    };
  }

  /**
   * Get statistics about token health across all connections
   */
  static async getTokenHealthStats() {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const stats = await prisma.calendarConnection.groupBy({
      by: ['platform'],
      where: {
        isActive: true
      },
      _count: {
        id: true
      }
    });

    const expiringIn24h = await prisma.calendarConnection.count({
      where: {
        isActive: true,
        tokenExpiry: {
          lt: in24Hours,
          gte: now
        }
      }
    });

    const expiringIn7d = await prisma.calendarConnection.count({
      where: {
        isActive: true,
        tokenExpiry: {
          lt: in7Days,
          gte: now
        }
      }
    });

    const expired = await prisma.calendarConnection.count({
      where: {
        isActive: true,
        tokenExpiry: {
          lt: now
        }
      }
    });

    return {
      totalActive: stats.reduce((sum, stat) => sum + stat._count.id, 0),
      byPlatform: stats.reduce((acc, stat) => {
        acc[stat.platform] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
      expiringIn24Hours: expiringIn24h,
      expiringIn7Days: expiringIn7d,
      expired: expired,
      healthScore: expired === 0 ? 100 : Math.round((1 - expired / (expired + stats.reduce((sum, stat) => sum + stat._count.id, 0))) * 100)
    };
  }
}