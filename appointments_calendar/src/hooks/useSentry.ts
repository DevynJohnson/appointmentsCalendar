'use client';

// React hook for easy Sentry integration in components
import { useEffect } from 'react';
import { setSentryUser, clearSentryUser, trackEvent, captureMessage, logger } from '@/lib/sentry-utils';
import * as Sentry from '@sentry/nextjs';

export interface SentryUser {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
}

export function useSentry() {
  const setUser = (user: SentryUser | null) => {
    if (user) {
      setSentryUser(user);
    } else {
      clearSentryUser();
    }
  };

  const logEvent = (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    extra?: Record<string, unknown>
  ) => {
    trackEvent(message, level, extra);
  };

  const logMessage = (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: Record<string, unknown>
  ) => {
    captureMessage(message, level, context);
  };

  // Create performance spans for UI interactions
  const trackUserAction = <T>(
    actionName: string,
    attributes: Record<string, string | number | boolean>,
    callback: () => Promise<T> | T
  ): Promise<T> | T => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: actionName,
      },
      (span) => {
        // Add attributes to span
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });

        const startTime = Date.now();
        
        try {
          const result = callback();
          
          if (result instanceof Promise) {
            return result.then((res) => {
              const duration = Date.now() - startTime;
              span.setAttribute("action.duration_ms", duration);
              span.setAttribute("action.status", "success");
              
              logger.debug(logger.fmt`User action completed: ${actionName}`, {
                duration,
                ...attributes,
              });
              
              return res;
            }).catch((error) => {
              const duration = Date.now() - startTime;
              span.setAttribute("action.duration_ms", duration);
              span.setAttribute("action.status", "failed");
              span.setAttribute("error.name", error.name);
              
              logger.error(logger.fmt`User action failed: ${actionName}`, {
                duration,
                error: error.message,
                ...attributes,
              });
              
              throw error;
            });
          } else {
            const duration = Date.now() - startTime;
            span.setAttribute("action.duration_ms", duration);
            span.setAttribute("action.status", "success");
            return result;
          }
        } catch (error) {
          const duration = Date.now() - startTime;
          span.setAttribute("action.duration_ms", duration);
          span.setAttribute("action.status", "failed");
          span.setAttribute("error.name", (error as Error).name);
          throw error;
        }
      }
    );
  };

  return {
    setUser,
    logEvent,
    logMessage,
    trackUserAction,
    logger, // Export logger for direct use
  };
}

// Hook to automatically set user context when user data changes
export function useSentryUser(user: SentryUser | null) {
  const { setUser } = useSentry();
  
  useEffect(() => {
    setUser(user);
    
    // Clear user on unmount
    return () => {
      if (!user) clearSentryUser();
    };
  }, [user, setUser]);
}

// Example usage in your components:
//
// const { setUser, logEvent, trackUserAction, logger } = useSentry();
//
// // Set user context automatically
// useSentryUser(currentUser);
//
// // Track a button click with performance monitoring
// const handleBookAppointment = () => {
//   trackUserAction(
//     'Book Appointment Button Click',
//     { appointmentType: 'consultation', userRole: 'premium' },
//     async () => {
//       const appointment = await createAppointment(appointmentData);
//       logger.info('Appointment created successfully', { 
//         appointmentId: appointment.id,
//         type: appointmentData.type 
//       });
//       return appointment;
//     }
//   );
// };
//
// // Log custom events
// logEvent('User viewed pricing page', 'info', { 
//   source: 'navigation',
//   userType: 'free' 
// });
//
// // Use structured logging directly
// logger.warn('Calendar sync taking longer than expected', {
//   provider: 'google',
//   duration: 5000
// });