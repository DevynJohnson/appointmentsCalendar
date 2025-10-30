'use client';

// React hook for easy Sentry integration in components
import { useEffect } from 'react';
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
      Sentry.setUser(user);
    } else {
      Sentry.setUser(null);
    }
  };

  const logEvent = (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    extra?: Record<string, unknown>
  ) => {
    Sentry.addBreadcrumb({
      message,
      level: level as Sentry.SeverityLevel,
      data: extra,
    });
  };

  const logMessage = (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: Record<string, unknown>
  ) => {
    Sentry.captureMessage(message, level as Sentry.SeverityLevel);
    if (context) {
      Sentry.setContext('additionalInfo', context);
    }
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
              
              console.debug(`User action completed: ${actionName}`, {
                duration,
                ...attributes,
              });
              
              return res;
            }).catch((error) => {
              const duration = Date.now() - startTime;
              span.setAttribute("action.duration_ms", duration);
              span.setAttribute("action.status", "failed");
              span.setAttribute("error.name", error.name);
              
              console.error(`User action failed: ${actionName}`, {
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
  };
}

// Hook to automatically set user context when user data changes
export function useSentryUser(user: SentryUser | null) {
  const { setUser } = useSentry();
  
  useEffect(() => {
    setUser(user);
    
    // Clear user on unmount
    return () => {
      if (!user) Sentry.setUser(null);
    };
  }, [user, setUser]);
}

// Example usage in your components:
//
// const { setUser, logEvent, trackUserAction } = useSentry();
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
//       console.info('Appointment created successfully', { 
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