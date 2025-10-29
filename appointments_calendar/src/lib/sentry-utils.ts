// Utility functions for Sentry error tracking and monitoring
import * as Sentry from '@sentry/nextjs';

// Get the Sentry logger for structured logging
const { logger } = Sentry;

export interface UserContext {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface AppointmentContext {
  id?: string;
  type?: string;
  duration?: number;
  attendeeCount?: number;
  calendarProvider?: string;
}

/**
 * Set user context for better error tracking
 */
export function setSentryUser(user: UserContext) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    ...user,
  });
  
  // Log user context set
  logger.debug(logger.fmt`User context set for Sentry: ${user.email}`);
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
  logger.debug("User context cleared from Sentry");
}

/**
 * Add custom context to errors
 */
export function setSentryContext(key: string, context: Record<string, unknown>) {
  Sentry.setContext(key, context);
}

/**
 * Track appointment-related errors with proper span tracing
 */
export function trackAppointmentError(
  error: Error,
  appointment: AppointmentContext,
  action: string
) {
  return Sentry.startSpan(
    {
      op: "appointment.error",
      name: `Appointment ${action} Error`,
    },
    (span) => {
      // Add appointment context as span attributes
      span.setAttribute("appointment.type", appointment.type || "unknown");
      span.setAttribute("appointment.duration", appointment.duration || 0);
      span.setAttribute("appointment.attendeeCount", appointment.attendeeCount || 0);
      span.setAttribute("appointment.calendarProvider", appointment.calendarProvider || "none");
      span.setAttribute("error.action", action);
      span.setAttribute("error.name", error.name);
      
      // Log structured error
      logger.error("Appointment operation failed", {
        appointmentId: appointment.id,
        appointmentType: appointment.type,
        action,
        error: error.message,
      });
      
      // Capture the exception
      Sentry.captureException(error);
    }
  );
}

/**
 * Track calendar integration errors with proper tracing
 */
export function trackCalendarError(
  error: Error,
  provider: 'google' | 'microsoft' | 'apple',
  action: string
) {
  return Sentry.startSpan(
    {
      op: "calendar.error",
      name: `Calendar ${provider} ${action} Error`,
    },
    (span) => {
      span.setAttribute("calendar.provider", provider);
      span.setAttribute("calendar.action", action);
      span.setAttribute("error.name", error.name);
      
      logger.error(logger.fmt`Calendar integration failed for ${provider}`, {
        provider,
        action,
        error: error.message,
      });
      
      Sentry.captureException(error);
    }
  );
}

/**
 * Track authentication errors with proper tracing
 */
export function trackAuthError(
  error: Error,
  action: 'login' | 'logout' | 'register' | 'token-refresh'
) {
  return Sentry.startSpan(
    {
      op: "auth.error",
      name: `Authentication ${action} Error`,
    },
    (span) => {
      span.setAttribute("auth.action", action);
      span.setAttribute("error.name", error.name);
      
      logger.warn(logger.fmt`Authentication failed for action: ${action}`, {
        action,
        error: error.message,
      });
      
      Sentry.captureException(error);
    }
  );
}

/**
 * Track payment/subscription errors with proper tracing
 */
export function trackPaymentError(
  error: Error,
  action: string,
  amount?: number,
  currency?: string
) {
  return Sentry.startSpan(
    {
      op: "payment.error",
      name: `Payment ${action} Error`,
    },
    (span) => {
      span.setAttribute("payment.action", action);
      span.setAttribute("payment.amount", amount || 0);
      span.setAttribute("payment.currency", currency || "USD");
      span.setAttribute("error.name", error.name);
      
      logger.error("Payment operation failed", {
        action,
        amount,
        currency,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      
      Sentry.captureException(error);
    }
  );
}

/**
 * Create performance spans for monitoring operations
 */
export function createPerformanceSpan<T>(
  name: string,
  operation: string,
  attributes: Record<string, string | number | boolean>,
  callback: (span: unknown) => Promise<T> | T
): Promise<T> | T {
  return Sentry.startSpan(
    {
      op: operation,
      name: name,
    },
    (span) => {
      // Add all provided attributes to the span
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
      
      const startTime = Date.now();
      
      try {
        const result = callback(span);
        
        // Handle both sync and async operations
        if (result instanceof Promise) {
          return result
            .then((res) => {
              const duration = Date.now() - startTime;
              span.setAttribute("operation.duration_ms", duration);
              span.setAttribute("operation.status", "success");
              
              // Log performance warning if slow
              if (duration > 2000) {
                logger.warn(logger.fmt`Slow operation detected: ${name} took ${duration}ms`, {
                  operation: name,
                  duration,
                  ...attributes,
                });
              }
              
              return res;
            })
            .catch((err) => {
              const duration = Date.now() - startTime;
              span.setAttribute("operation.duration_ms", duration);
              span.setAttribute("operation.status", "failed");
              span.setAttribute("error.name", err.name);
              throw err;
            });
        } else {
          const duration = Date.now() - startTime;
          span.setAttribute("operation.duration_ms", duration);
          span.setAttribute("operation.status", "success");
          return result;
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        span.setAttribute("operation.duration_ms", duration);
        span.setAttribute("operation.status", "failed");
        span.setAttribute("error.name", (error as Error).name);
        throw error;
      }
    }
  );
}

/**
 * Track custom events (non-errors) with structured logging
 */
export function trackEvent(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  extra?: Record<string, unknown>
) {
  // Use structured logging instead of breadcrumbs
  switch (level) {
    case 'info':
      logger.info(message, extra || {});
      break;
    case 'warning':
      logger.warn(message, extra || {});
      break;
    case 'error':
      logger.error(message, extra || {});
      break;
  }
  
  // Still add breadcrumb for context
  Sentry.addBreadcrumb({
    message,
    level,
    data: extra,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture a message with context using structured logging
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
) {
  // Use structured logging
  switch (level) {
    case 'info':
      logger.info(message, context || {});
      break;
    case 'warning':
      logger.warn(message, context || {});
      break;
    case 'error':
      logger.error(message, context || {});
      break;
  }
  
  // Also send to Sentry as a message
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    if (context) {
      scope.setContext('custom', context);
    }
    Sentry.captureMessage(message);
  });
}

/**
 * Example usage in your components:
 * 
 * // Set user context after login
 * setSentryUser({ id: '123', email: 'user@example.com', name: 'John Doe' });
 * 
 * // Track appointment creation error
 * try {
 *   await createAppointment(data);
 * } catch (error) {
 *   trackAppointmentError(error, { type: 'consultation', duration: 60 }, 'create');
 * }
 * 
/**
 * Example usage in your components:
 * 
 * // Set user context after login
 * setSentryUser({ id: '123', email: 'user@example.com', name: 'John Doe' });
 * 
 * // Track appointment creation with performance monitoring
 * const appointment = await createPerformanceSpan(
 *   'Create Appointment',
 *   'appointment.create',
 *   { type: 'consultation', duration: 60 },
 *   async (span) => {
 *     try {
 *       return await createAppointment(data);
 *     } catch (error) {
 *       trackAppointmentError(error, { type: 'consultation', duration: 60 }, 'create');
 *       throw error;
 *     }
 *   }
 * );
 * 
 * // Use structured logging
 * const { logger } = Sentry;
 * logger.info('User upgraded to premium', { 
 *   userId: user.id, 
 *   plan: 'premium' 
 * });
 * 
 * // Track events
 * trackEvent('Calendar sync completed', 'info', {
 *   provider: 'google',
 *   eventsCount: 25
 * });
 */

// Export the logger for direct use in components
export { logger };