// This file configures the initialization of Sentry for server-side Node.js runtime
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
  
  // Release tracking
  release: process.env.SENTRY_RELEASE || "1.0.0",
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  
  // Enhanced debugging information
  debug: process.env.NODE_ENV === 'development',
  
  // Enable logging experiments
  _experiments: {
    enableLogs: true,
  },
  
  // Server-side integrations with console logging
  integrations: [
    // Automatically send console.log, console.warn, and console.error to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  
  // Filter and enhance events
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event (dev mode):', event);
      return null;
    }
    
    // Add server context
    if (event.request) {
      event.tags = {
        ...event.tags,
        component: "server",
      };
    }
    
    return event;
  },
  
  // Initial scope for server events
  initialScope: {
    tags: {
      component: "server",
    },
  },
});