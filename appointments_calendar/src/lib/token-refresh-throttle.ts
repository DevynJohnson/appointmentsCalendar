// Token refresh rate limiting and throttling service
import { prisma } from '@/lib/db';

interface RefreshAttempt {
  connectionId: string;
  providerId: string;
  platform: string;
  timestamp: number;
  success: boolean;
}

// In-memory cache for tracking recent refresh attempts
const refreshAttempts = new Map<string, RefreshAttempt[]>();

// Configuration
const REFRESH_LIMITS = {
  // Maximum refresh attempts per connection per time window
  MAX_ATTEMPTS_PER_CONNECTION: 3,
  // Time window in milliseconds (15 minutes)
  TIME_WINDOW: 15 * 60 * 1000,
  // Minimum time between successful refreshes (5 minutes)
  MIN_SUCCESS_INTERVAL: 5 * 60 * 1000,
  // Maximum refresh attempts per provider per time window
  MAX_ATTEMPTS_PER_PROVIDER: 10,
  // Global rate limit - max concurrent refresh operations
  MAX_CONCURRENT_REFRESHES: 5
};

// Track active refresh operations
const activeRefreshes = new Set<string>();

export class TokenRefreshThrottleService {
  /**
   * Check if a connection can be refreshed based on rate limits
   */
  static canRefreshConnection(connectionId: string, providerId: string): {
    allowed: boolean;
    reason?: string;
    retryAfter?: number;
  } {
    const now = Date.now();
    
    // Check global concurrent limit
    if (activeRefreshes.size >= REFRESH_LIMITS.MAX_CONCURRENT_REFRESHES) {
      return {
        allowed: false,
        reason: 'Too many concurrent refresh operations',
        retryAfter: 60000 // 1 minute
      };
    }

    // Get recent attempts for this connection
    const connectionAttempts = this.getRecentAttempts(connectionId, now);
    
    // Check connection-specific rate limit
    if (connectionAttempts.length >= REFRESH_LIMITS.MAX_ATTEMPTS_PER_CONNECTION) {
      const oldestAttempt = Math.min(...connectionAttempts.map(a => a.timestamp));
      const retryAfter = oldestAttempt + REFRESH_LIMITS.TIME_WINDOW - now;
      
      return {
        allowed: false,
        reason: `Connection ${connectionId} has exceeded refresh limit (${REFRESH_LIMITS.MAX_ATTEMPTS_PER_CONNECTION} attempts per ${REFRESH_LIMITS.TIME_WINDOW / 60000} minutes)`,
        retryAfter: Math.max(retryAfter, 0)
      };
    }

    // Check if last successful refresh was too recent
    const lastSuccessfulRefresh = connectionAttempts
      .filter(a => a.success)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    if (lastSuccessfulRefresh && 
        (now - lastSuccessfulRefresh.timestamp) < REFRESH_LIMITS.MIN_SUCCESS_INTERVAL) {
      const retryAfter = lastSuccessfulRefresh.timestamp + REFRESH_LIMITS.MIN_SUCCESS_INTERVAL - now;
      
      return {
        allowed: false,
        reason: `Connection ${connectionId} was successfully refreshed too recently`,
        retryAfter: Math.max(retryAfter, 0)
      };
    }

    // Check provider-wide rate limit
    const providerAttempts = this.getProviderAttempts(providerId, now);
    if (providerAttempts.length >= REFRESH_LIMITS.MAX_ATTEMPTS_PER_PROVIDER) {
      const oldestAttempt = Math.min(...providerAttempts.map(a => a.timestamp));
      const retryAfter = oldestAttempt + REFRESH_LIMITS.TIME_WINDOW - now;
      
      return {
        allowed: false,
        reason: `Provider ${providerId} has exceeded refresh limit (${REFRESH_LIMITS.MAX_ATTEMPTS_PER_PROVIDER} attempts per ${REFRESH_LIMITS.TIME_WINDOW / 60000} minutes)`,
        retryAfter: Math.max(retryAfter, 0)
      };
    }

    return { allowed: true };
  }

  /**
   * Record a refresh attempt
   */
  static recordRefreshAttempt(
    connectionId: string, 
    providerId: string, 
    platform: string, 
    success: boolean
  ): void {
    const attempt: RefreshAttempt = {
      connectionId,
      providerId,
      platform,
      timestamp: Date.now(),
      success
    };

    // Add to connection-specific tracking
    if (!refreshAttempts.has(connectionId)) {
      refreshAttempts.set(connectionId, []);
    }
    
    const attempts = refreshAttempts.get(connectionId)!;
    attempts.push(attempt);
    
    // Clean up old attempts
    this.cleanupOldAttempts(connectionId);

    // Remove from active refreshes
    activeRefreshes.delete(connectionId);

    console.log(`📊 Recorded refresh attempt for ${connectionId}: ${success ? 'SUCCESS' : 'FAILED'}`);
  }

  /**
   * Mark a refresh as starting (for concurrent tracking)
   */
  static markRefreshStarting(connectionId: string): void {
    activeRefreshes.add(connectionId);
  }

  /**
   * Get recent attempts for a specific connection
   */
  private static getRecentAttempts(connectionId: string, now: number): RefreshAttempt[] {
    const attempts = refreshAttempts.get(connectionId) || [];
    return attempts.filter(a => (now - a.timestamp) < REFRESH_LIMITS.TIME_WINDOW);
  }

  /**
   * Get recent attempts for all connections of a provider
   */
  private static getProviderAttempts(providerId: string, now: number): RefreshAttempt[] {
    const allAttempts: RefreshAttempt[] = [];
    
    for (const attempts of refreshAttempts.values()) {
      const recentAttempts = attempts.filter(a => 
        a.providerId === providerId && 
        (now - a.timestamp) < REFRESH_LIMITS.TIME_WINDOW
      );
      allAttempts.push(...recentAttempts);
    }
    
    return allAttempts;
  }

  /**
   * Clean up old attempts from memory
   */
  private static cleanupOldAttempts(connectionId: string): void {
    const attempts = refreshAttempts.get(connectionId);
    if (!attempts) return;

    const now = Date.now();
    const recentAttempts = attempts.filter(a => 
      (now - a.timestamp) < REFRESH_LIMITS.TIME_WINDOW
    );
    
    if (recentAttempts.length === 0) {
      refreshAttempts.delete(connectionId);
    } else {
      refreshAttempts.set(connectionId, recentAttempts);
    }
  }

  /**
   * Get throttling statistics
   */
  static getThrottleStats(): {
    activeRefreshes: number;
    connectionsWithAttempts: number;
    totalAttempts: number;
    limits: typeof REFRESH_LIMITS;
  } {
    let totalAttempts = 0;
    for (const attempts of refreshAttempts.values()) {
      totalAttempts += attempts.length;
    }

    return {
      activeRefreshes: activeRefreshes.size,
      connectionsWithAttempts: refreshAttempts.size,
      totalAttempts,
      limits: REFRESH_LIMITS
    };
  }

  /**
   * Clear all throttling data (useful for testing)
   */
  static clearAll(): void {
    refreshAttempts.clear();
    activeRefreshes.clear();
  }

  /**
   * Smart opportunistic refresh with built-in throttling
   * Use this instead of direct TokenMaintenanceService.refreshExpiringTokens()
   */
  static async refreshExpiringTokensThrottled(): Promise<{
    checked: number;
    refreshed: number;
    throttled: number;
    errors: number;
    details: Array<{
      connectionId: string;
      action: 'refreshed' | 'throttled' | 'error' | 'skipped';
      reason?: string;
    }>;
  }> {
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    // Find connections that might need refresh
    const expiringConnections = await prisma.calendarConnection.findMany({
      where: {
        isActive: true,
        tokenExpiry: {
          lt: tomorrow
        },
        refreshToken: {
          not: null
        }
      },
      select: {
        id: true,
        providerId: true,
        platform: true,
        tokenExpiry: true,
        lastSyncAt: true
      }
    });

    const results = {
      checked: expiringConnections.length,
      refreshed: 0,
      throttled: 0,
      errors: 0,
      details: [] as Array<{
        connectionId: string;
        action: 'refreshed' | 'throttled' | 'error' | 'skipped';
        reason?: string;
      }>
    };

    // Process each connection with throttling
    for (const connection of expiringConnections) {
      const canRefresh = this.canRefreshConnection(
        connection.id,
        connection.providerId
      );

      if (!canRefresh.allowed) {
        results.throttled++;
        results.details.push({
          connectionId: connection.id,
          action: 'throttled',
          reason: canRefresh.reason
        });
        continue;
      }

      try {
        // Mark as starting
        this.markRefreshStarting(connection.id);

        // Import and use the refresh function
        const { refreshConnectionToken } = await import('@/lib/token-refresh');
        const refreshResult = await refreshConnectionToken(connection.id);

        // Record the attempt
        this.recordRefreshAttempt(
          connection.id,
          connection.providerId,
          connection.platform,
          refreshResult.success
        );

        if (refreshResult.success) {
          results.refreshed++;
          results.details.push({
            connectionId: connection.id,
            action: 'refreshed'
          });
        } else {
          results.errors++;
          results.details.push({
            connectionId: connection.id,
            action: 'error',
            reason: refreshResult.error
          });
        }

      } catch (error) {
        // Record the failed attempt
        this.recordRefreshAttempt(
          connection.id,
          connection.providerId,
          connection.platform,
          false
        );

        results.errors++;
        results.details.push({
          connectionId: connection.id,
          action: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`🔄 Throttled token refresh completed:`, {
      checked: results.checked,
      refreshed: results.refreshed,
      throttled: results.throttled,
      errors: results.errors
    });

    return results;
  }
}