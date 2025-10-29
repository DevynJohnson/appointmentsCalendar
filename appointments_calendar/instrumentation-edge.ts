// This file configures the initialization of Sentry for edge runtime
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance Monitoring (lower sampling for edge)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  
  // Release tracking
  release: process.env.SENTRY_RELEASE || "1.0.0",
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  
  // Enable logging experiments
  _experiments: {
    enableLogs: true,
  },
  
  // Edge runtime integrations
  integrations: [
    // Console logging for edge runtime
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }), // Limited for edge
  ],
  
  // Filter events for edge runtime
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Add edge context
    event.tags = {
      ...event.tags,
      component: "edge",
    };
    
    return event;
  },
  
  // Initial scope for edge events
  initialScope: {
    tags: {
      component: "edge",
    },
  },
});