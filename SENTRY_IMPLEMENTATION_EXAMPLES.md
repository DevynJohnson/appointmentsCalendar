# Sentry Implementation Examples for Zone Meet

This document contains examples of how to properly implement Sentry tracing, logging, and error handling in Zone Meet components following the official Sentry LLM guidelines.

## 🎯 Core Implementation Rules

### Exception Catching
- **Always use `Sentry.captureException(error)`** to capture exceptions
- Use in try-catch blocks or areas where exceptions are expected

### Tracing Best Practices
- **Create spans for meaningful actions**: button clicks, API calls, function calls
- **Use `Sentry.startSpan`** for all performance tracking
- **Child spans can exist within parent spans** for detailed tracking
- **Use meaningful `name` and `op` properties**
- **Attach relevant attributes** based on request information and metrics

### Logging Guidelines
- **Import Sentry**: `import * as Sentry from "@sentry/nextjs"`
- **Enable logging**: `Sentry.init({ _experiments: { enableLogs: true } })`
- **Reference logger**: `const { logger } = Sentry`
- **Use `logger.fmt`** template literal for variables in structured logs

## 📊 Example 1: UI Component with Performance Tracking

```typescript
import { useSentry } from '@/hooks/useSentry';
import { trackAppointmentError, createPerformanceSpan, logger } from '@/lib/sentry-utils';
import * as Sentry from '@sentry/nextjs';

export function BookAppointmentComponent() {
  const { trackUserAction, setUser } = useSentry();

  // Set user context after login
  useEffect(() => {
    if (currentUser) {
      setUser({
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.subscription || 'free',
      });
    }
  }, [currentUser, setUser]);

  const handleBookAppointment = () => {
    // Track UI interaction with performance monitoring
    trackUserAction(
      'Book Appointment Button Click',
      { 
        appointmentType: formData.type,
        duration: formData.duration,
        calendarProvider: formData.calendarProvider,
        userRole: currentUser.role,
      },
      async () => {
        try {
          // Create appointment with detailed performance tracking
          const appointment = await createPerformanceSpan(
            'Create Appointment',
            'appointment.create',
            {
              'appointment.type': formData.type,
              'appointment.duration': formData.duration,
              'appointment.attendees': formData.attendees.length,
              'calendar.provider': formData.calendarProvider,
            },
            async (span) => {
              // Step 1: Validate appointment data
              const validation = await createPerformanceSpan(
                'Validate Appointment Data',
                'appointment.validate',
                { 'validation.fields': Object.keys(formData).length },
                () => validateAppointmentData(formData)
              );

              if (!validation.isValid) {
                span.setAttribute('validation.failed', true);
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
              }

              // Step 2: Create in database
              const dbAppointment = await createPerformanceSpan(
                'Save Appointment to Database',
                'db.appointment.create',
                { 'user.id': currentUser.id },
                () => database.appointments.create({
                  ...formData,
                  userId: currentUser.id,
                })
              );

              // Step 3: Sync with calendar
              await createPerformanceSpan(
                'Sync to Calendar',
                'calendar.sync',
                { 
                  'calendar.provider': formData.calendarProvider,
                  'appointment.id': dbAppointment.id,
                },
                async () => {
                  try {
                    return await syncToCalendar(dbAppointment, formData.calendarProvider);
                  } catch (error) {
                    trackCalendarError(
                      error as Error,
                      formData.calendarProvider as 'google' | 'microsoft' | 'apple',
                      'sync'
                    );
                    throw error;
                  }
                }
              );

              return dbAppointment;
            }
          );

          // Log successful appointment creation
          logger.info('Appointment created successfully', {
            appointmentId: appointment.id,
            appointmentType: appointment.type,
            duration: appointment.duration,
            calendarProvider: formData.calendarProvider,
            userId: currentUser.id,
          });

          return appointment;

        } catch (error) {
          // Track appointment-specific errors with full context
          trackAppointmentError(
            error as Error,
            {
              type: formData.type,
              duration: formData.duration,
              attendeeCount: formData.attendees.length,
              calendarProvider: formData.calendarProvider,
            },
            'create'
          );

          throw error; // Re-throw for UI error handling
        }
      }
    );
  };

  return (
    <button onClick={handleBookAppointment}>
      Book Appointment
    </button>
  );
}
```

## 🔗 Example 2: Calendar Integration with Performance Monitoring

```typescript
export async function fetchGoogleCalendarEvents(userId: string, calendarId: string) {
  return Sentry.startSpan(
    {
      op: "calendar.fetch",
      name: "Fetch Google Calendar Events",
    },
    async (span) => {
      span.setAttribute("user.id", userId);
      span.setAttribute("calendar.provider", "google");
      span.setAttribute("calendar.id", calendarId);
      
      const startTime = Date.now();
      
      try {
        // Make the API call
        const response = await fetch(`/api/calendar/google/events?calendarId=${calendarId}`, {
          headers: {
            'Authorization': `Bearer ${await getGoogleAccessToken(userId)}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
        }

        const events = await response.json();
        const duration = Date.now() - startTime;
        
        // Add success metrics
        span.setAttribute("events.count", events.length);
        span.setAttribute("fetch.duration_ms", duration);
        span.setAttribute("fetch.status", "success");
        span.setAttribute("http.status_code", response.status);
        
        // Log performance metrics
        logger.info('Google Calendar events fetched successfully', {
          userId,
          calendarId,
          eventsCount: events.length,
          duration,
        });
        
        // Warn about slow performance
        if (duration > 2000) {
          logger.warn(logger.fmt`Slow calendar fetch detected: ${duration}ms`, {
            provider: 'google',
            userId,
            calendarId,
            duration,
          });
        }
        
        return events;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        span.setAttribute("fetch.status", "failed");
        span.setAttribute("fetch.duration_ms", duration);
        span.setAttribute("error.type", (error as Error).name);
        span.setAttribute("error.message", (error as Error).message);
        
        // Log detailed error information
        logger.error('Google Calendar fetch failed', {
          userId,
          calendarId,
          duration,
          error: (error as Error).message,
          errorType: (error as Error).name,
        });
        
        // Track calendar-specific error
        trackCalendarError(error as Error, 'google', 'fetch');
        
        throw error;
      }
    }
  );
}
```

## 🔐 Example 3: Authentication with Sentry User Context

```typescript
export async function authenticateUser(credentials: { email: string; password: string }) {
  return Sentry.startSpan(
    {
      op: "auth.login",
      name: "User Authentication",
    },
    async (span) => {
      span.setAttribute("auth.method", "jwt");
      span.setAttribute("user.email", credentials.email);
      
      try {
        // Validate credentials
        const user = await createPerformanceSpan(
          'Validate User Credentials',
          'auth.validate',
          { 'user.email': credentials.email },
          () => validateUserCredentials(credentials)
        );

        // Generate JWT token
        const token = await createPerformanceSpan(
          'Generate JWT Token',
          'auth.token.generate',
          { 'user.id': user.id },
          () => generateJWTToken(user)
        );
        
        // Set user context for all future Sentry events
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.name,
        });
        
        span.setAttribute("auth.status", "success");
        span.setAttribute("user.id", user.id);
        span.setAttribute("user.role", user.role);
        
        // Log successful authentication
        logger.info('User authenticated successfully', {
          userId: user.id,
          userEmail: user.email,
          loginMethod: 'password',
        });
        
        return { user, token };
        
      } catch (error) {
        span.setAttribute("auth.status", "failed");
        span.setAttribute("error.reason", (error as Error).message);
        
        // Log authentication failure
        logger.warn('Authentication failed', {
          userEmail: credentials.email,
          error: (error as Error).message,
          attemptTime: new Date().toISOString(),
        });
        
        // Don't include sensitive information in error tracking
        Sentry.captureException(error);
        
        throw error;
      }
    }
  );
}
```

## 🌐 Example 4: API Route with Comprehensive Sentry Integration

```typescript
export async function handleAppointmentAPI(req: Request) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/appointments",
    },
    async (span) => {
      const userId = await getUserIdFromRequest(req);
      const appointmentData = await req.json();
      
      span.setAttribute("user.id", userId);
      span.setAttribute("appointment.type", appointmentData.type);
      span.setAttribute("http.method", "POST");
      span.setAttribute("http.route", "/api/appointments");
      
      try {
        // Validate request
        const validation = await createPerformanceSpan(
          'Validate API Request',
          'api.validate',
          { 'fields.count': Object.keys(appointmentData).length },
          () => validateAppointmentRequest(appointmentData)
        );

        if (!validation.isValid) {
          span.setAttribute("validation.failed", true);
          span.setAttribute("http.status_code", 400);
          
          logger.warn('Invalid appointment request', {
            userId,
            errors: validation.errors,
            requestData: sanitizeData(appointmentData),
          });
          
          return new Response(
            JSON.stringify({ error: 'Invalid request', details: validation.errors }),
            { status: 400 }
          );
        }

        // Create appointment
        const appointment = await createPerformanceSpan(
          'Create Appointment via API',
          'api.appointment.create',
          { 'user.id': userId },
          () => createAppointment(appointmentData, userId)
        );
        
        span.setAttribute("appointment.id", appointment.id);
        span.setAttribute("http.status_code", 201);
        
        // Log successful API call
        logger.info('Appointment created via API', {
          appointmentId: appointment.id,
          userId,
          appointmentType: appointment.type,
          apiEndpoint: '/api/appointments',
        });
        
        return new Response(
          JSON.stringify(appointment),
          { 
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
      } catch (error) {
        span.setAttribute("http.status_code", 500);
        span.setAttribute("error.type", (error as Error).name);
        
        logger.error('API appointment creation failed', {
          userId,
          error: (error as Error).message,
          requestData: sanitizeData(appointmentData),
          apiEndpoint: '/api/appointments',
        });
        
        Sentry.captureException(error);
        
        return new Response(
          JSON.stringify({ error: 'Internal server error' }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }
  );
}
```

## 🛠️ Utility Function: Data Sanitization

```typescript
function sanitizeFormData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.apiKey;
  delete sanitized.clientSecret;
  delete sanitized.refreshToken;
  return sanitized;
}
```

## 📋 Structured Logging Examples

```typescript
import * as Sentry from '@sentry/nextjs';
const { logger } = Sentry;

// Appointment-related logging
logger.trace("Starting appointment creation", { 
  userId: "user_123",
  appointmentType: "consultation" 
});

logger.debug(logger.fmt`Cache miss for user appointments: ${userId}`);

logger.info("Appointment created successfully", { 
  appointmentId: "apt_456",
  duration: 60,
  calendarProvider: "google"
});

logger.warn("Calendar sync rate limit reached", {
  provider: "google",
  userId: "user_123",
  endpoint: "/api/calendar/sync",
  isEnterprise: false,
});

logger.error("Failed to process payment for premium upgrade", {
  userId: "user_123",
  orderId: "order_789",
  amount: 29.99,
  paymentProvider: "stripe"
});

logger.fatal("Database connection pool exhausted", {
  database: "appointments",
  activeConnections: 100,
  maxConnections: 100
});
```

## ⚡ Performance Span Patterns

### Key Operation Types (`op` field):
- **UI interactions**: `"ui.action"` or `"ui.click"`
- **API calls**: `"http.client"` or `"http.server"`
- **Database operations**: `"db.query"` or `"db.create"`
- **Calendar operations**: `"calendar.sync"` or `"calendar.fetch"`
- **Authentication**: `"auth.login"` or `"auth.validate"`
- **Email operations**: `"email.send"`

### Essential Span Attributes:
- **User context**: `user.id`, `user.email`, `user.role`
- **Business context**: `appointment.type`, `calendar.provider`
- **Performance metrics**: `duration_ms`, `status`, `count`
- **Error information**: `error.type`, `error.message`
- **HTTP context**: `http.status_code`, `http.method`, `http.route`

## ✅ Implementation Checklist

### Configuration:
- [ ] Enable logging experiments in all config files
- [ ] Add console logging integration
- [ ] Use proper file naming conventions (`sentry.client.config.ts`, etc.)
- [ ] Set up `instrumentation.ts` correctly

### Code Usage:
- [ ] Use `Sentry.startSpan` for all performance tracking
- [ ] Add meaningful attributes to spans
- [ ] Use `Sentry.captureException` in try-catch blocks
- [ ] Implement structured logging with `logger.fmt`
- [ ] Set user context after authentication

### Best Practices:
- [ ] Create child spans for detailed operation tracking
- [ ] Add performance warnings for slow operations (>2s)
- [ ] Include relevant business context in span attributes
- [ ] Use consistent naming conventions for operations
- [ ] Sanitize sensitive data before logging
- [ ] Track business metrics alongside technical metrics

---

**This guide ensures Zone Meet follows Sentry LLM best practices for comprehensive monitoring and debugging capabilities.**