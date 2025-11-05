// Client-side token health monitor
// This runs in the browser and triggers maintenance when needed

import { secureFetch } from '@/lib/csrf';

export class ClientTokenMonitor {
  private static lastCheck = 0;
  private static CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

  /**
   * Check if maintenance is needed and trigger it
   * Call this from high-traffic pages like search or booking
   */
  static async checkAndMaintain() {
    const now = Date.now();
    
    // Only check every 30 minutes to avoid spam
    if (now - this.lastCheck < this.CHECK_INTERVAL) {
      return;
    }

    this.lastCheck = now;

    try {
      // Check token health
      const response = await secureFetch('/api/admin/token-maintenance', {
        method: 'GET'
      });

      if (!response.ok) {
        return; // Fail silently
      }

      const data = await response.json();
      
      // If health score is low or tokens are expiring, trigger maintenance
      if (data.health.healthScore < 80 || data.health.expiringIn24Hours > 0) {
        console.log('🔄 Triggering background token maintenance from client');
        
        // Trigger maintenance (don't await - run in background)
        secureFetch('/api/admin/token-maintenance', {
          method: 'POST'
        }).catch(() => {
          // Fail silently
        });
      }
    } catch (error) {
      // Fail silently - don't break user experience
      console.debug('Token health check failed:', error);
    }
  }
}

// Auto-trigger on page load for high-traffic pages
if (typeof window !== 'undefined') {
  // Run on load
  ClientTokenMonitor.checkAndMaintain();
  
  // Run periodically if user stays on page
  setInterval(() => {
    ClientTokenMonitor.checkAndMaintain();
  }, ClientTokenMonitor['CHECK_INTERVAL']);
}