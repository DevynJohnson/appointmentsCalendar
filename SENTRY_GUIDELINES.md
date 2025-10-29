# Sentry Implementation Guidelines for Zone Meet

This document outlines best practices for using Sentry in the Zone Meet application, based on official Sentry recommendations for LLMs and modern applications.

## 🚨 Exception Catching

### Use `Sentry.captureException(error)` for Exception Handling

Always use this in try-catch blocks or areas where exceptions are expected:

```javascript
try {
  await createAppointment(appointmentData);
} catch (error) {
  // Capture the exception with context
  Sentry.captureException(error);
  throw error; // Re-throw for normal error handling
}
```

## 📊 Tracing & Performance Monitoring

### Core Principles
- **Spans should be created for meaningful actions**: button clicks, API calls, function calls
- **Use `Sentry.startSpan`** for all performance tracking
- **Child spans can exist within parent spans** for detailed tracking
- **Use meaningful `name` and `op` properties**
- **Attach relevant attributes** based on request information and metrics

### Custom Span Instrumentation in Component Actions

```javascript
function BookAppointmentButton() {
  const handleBookingClick = () => {
    // Create a span to measure UI performance
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Book Appointment Button Click",
      },
      (span) => {
        const appointmentType = "consultation";
        const duration = 60;

        // Add relevant metrics to the span
        span.setAttribute("appointment.type", appointmentType);
        span.setAttribute("appointment.duration", duration);
        span.setAttribute("user.role", "premium");

        // Perform the actual booking action
        handleAppointmentBooking(appointmentType, duration);
      },
    );
  };

  return (
    <button type="button" onClick={handleBookingClick}>
      Book Appointment
    </button>
  );
}
```

### Custom Span Instrumentation in API Calls

```javascript
async function fetchUserAppointments(userId) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}/appointments`,
    },
    async (span) => {
      // Add request context
      span.setAttribute("user.id", userId);
      span.setAttribute("endpoint", "/api/users/appointments");
      
      const response = await fetch(`/api/users/${userId}/appointments`);
      
      // Add response metrics
      span.setAttribute("http.status_code", response.status);
      span.setAttribute("response.size", response.headers.get('content-length'));
      
      const data = await response.json();
      span.setAttribute("appointments.count", data.length);
      
      return data;
    },
  );
}

// Calendar Integration Example
async function syncGoogleCalendar(userId, calendarId) {
  return Sentry.startSpan(
    {
      op: "integration.sync",
      name: "Google Calendar Sync",
    },
    async (span) => {
      span.setAttribute("user.id", userId);
      span.setAttribute("calendar.provider", "google");
      span.setAttribute("calendar.id", calendarId);
      
      try {
        const events = await googleCalendarAPI.getEvents(calendarId);
        span.setAttribute("events.synced", events.length);
        span.setAttribute("sync.status", "success");
        return events;
      } catch (error) {
        span.setAttribute("sync.status", "failed");
        span.setAttribute("error.type", error.name);
        throw error;
      }
    },
  );
}
```

## 📝 Logging Best Practices

### Configuration Requirements
- Import Sentry: `import * as Sentry from "@sentry/nextjs"`
- Enable logging in Sentry: `Sentry.init({ _experiments: { enableLogs: true } })`
- Reference logger: `const { logger } = Sentry`

### Logger Integration for Automatic Console Logging
Use `consoleLoggingIntegration` to automatically capture console errors:

```javascript
Sentry.init({
  dsn: "your-dsn-here",
  integrations: [
    // Automatically send console.log, console.warn, and console.error to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  _experiments: {
    enableLogs: true,
  },
});
```

### Structured Logging Examples

Use `logger.fmt` template literal function for variables in structured logs:

```javascript
import * as Sentry from "@sentry/nextjs";
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

## 🗂️ File Configuration Structure

### NextJS Configuration Files:
- **Client-side initialization**: `instrumentation-client.ts`
- **Server-side initialization**: `instrumentation-server.ts` 
- **Edge runtime initialization**: `instrumentation-edge.ts`
- **Instrumentation**: `instrumentation.ts`

### Key Rules:
- **Initialization only happens in config files** - don't repeat in other files
- **Import Sentry elsewhere**: `import * as Sentry from "@sentry/nextjs"`
- **Use consistent DSN environment variables**

## 🎯 Zone Meet Specific Examples

### Appointment Management Tracing

```javascript
// Create appointment with full tracing
async function createAppointmentWithTracing(appointmentData) {
  return Sentry.startSpan(
    {
      op: "appointment.create",
      name: "Create New Appointment",
    },
    async (span) => {
      span.setAttribute("appointment.type", appointmentData.type);
      span.setAttribute("appointment.duration", appointmentData.duration);
      span.setAttribute("calendar.provider", appointmentData.calendarProvider);
      
      try {
        // Database operation
        const appointment = await Sentry.startSpan(
          { op: "db.create", name: "Insert Appointment" },
          () => db.appointments.create(appointmentData)
        );
        
        // Calendar sync
        await Sentry.startSpan(
          { op: "integration.calendar", name: "Sync to Calendar" },
          () => syncToCalendar(appointment)
        );
        
        // Email notification
        await Sentry.startSpan(
          { op: "email.send", name: "Send Confirmation Email" },
          () => sendConfirmationEmail(appointment)
        );
        
        span.setAttribute("appointment.id", appointment.id);
        span.setAttribute("operation.status", "success");
        
        return appointment;
        
      } catch (error) {
        span.setAttribute("operation.status", "failed");
        span.setAttribute("error.type", error.name);
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}
```

### Authentication Flow Tracing

```javascript
async function authenticateUser(credentials) {
  return Sentry.startSpan(
    {
      op: "auth.login",
      name: "User Authentication",
    },
    async (span) => {
      span.setAttribute("auth.method", "jwt");
      span.setAttribute("user.email", credentials.email);
      
      try {
        const user = await validateCredentials(credentials);
        const token = await generateJWTToken(user);
        
        span.setAttribute("auth.status", "success");
        span.setAttribute("user.id", user.id);
        span.setAttribute("user.role", user.role);
        
        // Set user context for future errors
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.name,
        });
        
        return { user, token };
        
      } catch (error) {
        span.setAttribute("auth.status", "failed");
        span.setAttribute("error.reason", error.message);
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}
```

### Performance Monitoring for Calendar Integration

```javascript
async function fetchCalendarEvents(userId, calendarProvider) {
  return Sentry.startSpan(
    {
      op: "calendar.fetch",
      name: `Fetch ${calendarProvider} Calendar Events`,
    },
    async (span) => {
      span.setAttribute("user.id", userId);
      span.setAttribute("calendar.provider", calendarProvider);
      
      const startTime = Date.now();
      
      try {
        const events = await calendarAPI[calendarProvider].getEvents(userId);
        const duration = Date.now() - startTime;
        
        span.setAttribute("events.count", events.length);
        span.setAttribute("fetch.duration_ms", duration);
        span.setAttribute("fetch.status", "success");
        
        // Log performance warning if slow
        if (duration > 2000) {
          logger.warn(logger.fmt`Slow calendar fetch detected: ${duration}ms`, {
            provider: calendarProvider,
            userId,
            duration
          });
        }
        
        return events;
        
      } catch (error) {
        span.setAttribute("fetch.status", "failed");
        span.setAttribute("error.type", error.name);
        
        logger.error("Calendar fetch failed", {
          provider: calendarProvider,
          userId,
          error: error.message
        });
        
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}
```

## ✅ Implementation Checklist

### Configuration:
- [ ] Enable logging experiments in all config files
- [ ] Add console logging integration
- [ ] Use proper file naming conventions
- [ ] Set up instrumentation.ts correctly

### Code Usage:
- [ ] Use `Sentry.startSpan` for all performance tracking
- [ ] Add meaningful attributes to spans
- [ ] Use `Sentry.captureException` in try-catch blocks
- [ ] Implement structured logging with `logger.fmt`
- [ ] Set user context after authentication

### Best Practices:
- [ ] Create child spans for detailed operation tracking
- [ ] Add performance warnings for slow operations
- [ ] Include relevant business context in span attributes
- [ ] Use consistent naming conventions for operations

---

**This document ensures Zone Meet follows Sentry best practices for comprehensive monitoring and debugging capabilities.**