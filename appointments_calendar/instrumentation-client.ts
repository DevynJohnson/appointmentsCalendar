// This file configures the initialization of Sentry for edge runtime (client-side)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0, // 100% in development, adjust for production
  
  // Release tracking
  release: process.env.SENTRY_RELEASE || "1.0.0",
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
  
  // Session Replay (captures user interactions for debugging)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Enable logging experiments
  _experiments: {
    enableLogs: true,
  },
  
  // Enhanced error information with console logging integration
  integrations: [
    // Automatically send console.log, console.warn, and console.error to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  
  // Filter out noise
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Filter out common non-critical errors
    if (event.exception) {
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = error.message as string;
        // Skip cancelled requests and network errors
        if (message.includes('AbortError') || message.includes('NetworkError')) {
          return null;
        }
      }
    }
    
    return event;
  },
  
  // Add user context automatically
  initialScope: {
    tags: {
      component: "client",
    },
  },
});

// Export router transition hook for enhanced navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;