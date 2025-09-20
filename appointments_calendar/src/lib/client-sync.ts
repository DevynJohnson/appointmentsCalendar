// Client-side calendar sync utilities
// Triggers syncs when calendar data is needed

export class ClientSyncManager {
  private static readonly SYNC_CACHE_MS = 2 * 60 * 1000; // 2 minutes cache
  private static readonly STORAGE_PREFIX = 'providerSync_';
  private static activeSyncs = new Set<string>();

  /**
   * Sync a specific provider's calendar before fetching their appointments
   * Returns true if sync was performed, false if cached data is fresh
   */
  static async syncProviderBeforeQuery(providerId: string): Promise<boolean> {
    const syncKey = `${providerId}`;
    
    // Check if sync is already in progress
    if (this.activeSyncs.has(syncKey)) {
      console.log(`🔄 Sync already in progress for provider ${providerId}`);
      return false;
    }

    // Check if we synced recently
    const lastSync = this.getLastProviderSync(providerId);
    const now = Date.now();
    
    if (lastSync && (now - lastSync) < this.SYNC_CACHE_MS) {
      console.log(`⏰ Recent sync for provider ${providerId}, using cached data`);
      return false;
    }

    console.log(`🚀 Syncing calendar for provider ${providerId}...`);
    this.activeSyncs.add(syncKey);
    
    try {
      await this.triggerProviderSync(providerId);
      this.setLastProviderSync(providerId, now);
      console.log(`✅ Provider ${providerId} sync completed`);
      return true;
    } catch (error) {
      console.error(`❌ Provider ${providerId} sync failed:`, error);
      throw error;
    } finally {
      this.activeSyncs.delete(syncKey);
    }
  }

  /**
   * Force sync for a provider (ignore cache)
   */
  static async forceSyncProvider(providerId: string): Promise<void> {
    const syncKey = `${providerId}`;
    
    if (this.activeSyncs.has(syncKey)) {
      throw new Error('Sync already in progress for this provider');
    }

    this.activeSyncs.add(syncKey);
    try {
      await this.triggerProviderSync(providerId);
      this.setLastProviderSync(providerId, Date.now());
    } finally {
      this.activeSyncs.delete(syncKey);
    }
  }

  /**
   * Check if a provider sync is currently in progress
   */
  static isSyncInProgress(providerId: string): boolean {
    return this.activeSyncs.has(providerId);
  }

  private static async triggerProviderSync(providerId: string): Promise<void> {
    const response = await fetch('/api/provider/calendar/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        providerId,
        forceSync: false // Only sync connections that are due for sync
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sync failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Unknown sync error');
    }
  }

  private static getLastProviderSync(providerId: string): number | null {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${providerId}`);
    return stored ? parseInt(stored, 10) : null;
  }

  private static setLastProviderSync(providerId: string, timestamp: number): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(`${this.STORAGE_PREFIX}${providerId}`, timestamp.toString());
  }

}