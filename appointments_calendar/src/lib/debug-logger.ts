// Debug log model to track OAuth flow

export class DebugLogger {
  static async log(message: string, data?: unknown) {
    try {
      // Log to console
      console.log(`[DEBUG] ${message}`, data);
      
      // Also try to write to a simple log endpoint
      if (typeof fetch !== 'undefined') {
        fetch('/api/debug/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, data, timestamp: new Date().toISOString() })
        }).catch(() => {}); // Ignore errors
      }
    } catch (error) {
      // Fallback logging
      console.error('Debug logging failed:', error);
    }
  }
}
