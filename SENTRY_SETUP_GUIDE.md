# 📊 Sentry Setup Guide for Zone Meet

## What is Sentry?

Sentry is your **digital watchdog** for Zone Meet. It automatically:

- **Catches errors before users report them** 🐛
- **Monitors performance** ⚡ (slow API calls, page loads)
- **Tracks security events** 🛡️ (integrated with your WAF)
- **Provides user context** 👤 (which users are affected)
- **Monitors releases** 🚀 (correlate issues with deployments)

## 🚀 Quick Setup (5 minutes)

### 1. Create Sentry Account
1. Go to **[sentry.io](https://sentry.io)** and sign up
2. Create a new project:
   - Platform: **Next.js**
   - Project name: **"zone-meet"**
3. **Copy your DSN** (looks like `https://abc123@o123456.ingest.sentry.io/456789`)

### 2. Add Environment Variables to Render

In your Render dashboard, add these environment variables:

```bash
# Server-side Sentry (Required)
SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/456789

# Client-side Sentry (Required)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o123456.ingest.sentry.io/456789

# Environment & Release tracking (Optional but recommended)
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0

# Organization & Project (Optional - for source maps)
SENTRY_ORG=your-org-name
SENTRY_PROJECT=zone-meet
```

### 3. Deploy & Test

1. **Deploy to Render** with the new environment variables
2. **Trigger a test error** by visiting a non-existent page: `https://your-app.com/test-404`
3. **Check Sentry dashboard** - you should see the error within 1-2 minutes

## 🔧 What's Already Configured

Your Zone Meet app is already set up with:

### ✅ Automatic Error Tracking
- **Frontend errors** (React crashes, network failures)
- **API errors** (database issues, authentication failures)
- **Security events** (WAF blocks, suspicious activity)

### ✅ Performance Monitoring
- **Page load times**
- **API response times**
- **Database query performance**

### ✅ Smart Filtering
- **No development errors** (only production issues)
- **Filtered noise** (cancelled requests, etc.)
- **Enhanced context** (user info, appointment details)

## 📈 How to Use Sentry

### Monitoring Dashboard
```
https://sentry.io/organizations/your-org/projects/zone-meet/
```

**Key Sections:**
- **Issues** - All errors and exceptions
- **Performance** - Slow transactions and bottlenecks  
- **Releases** - Track deployments and their impact
- **Alerts** - Get notified of critical issues

### Manual Error Tracking (Optional)

You can track custom events in your code:

```typescript
import { trackAppointmentError, setSentryUser } from '@/lib/sentry-utils';

// Set user context after login
setSentryUser({ 
  id: user.id, 
  email: user.email, 
  name: user.name 
});

// Track appointment errors with context
try {
  await createAppointment(appointmentData);
} catch (error) {
  trackAppointmentError(error, {
    type: 'consultation',
    duration: 60,
    attendeeCount: 2
  }, 'create');
  throw error; // Re-throw for normal error handling
}
```

## 🚨 Alert Setup (Recommended)

### Email Alerts
1. Go to **Settings > Alerts** in Sentry
2. Create alert rule:
   - **Trigger:** "When an issue is first seen"
   - **Actions:** "Send email to team"

### Slack Integration
1. Install Sentry app in your Slack workspace
2. Configure alerts to go to `#alerts` or `#dev-team` channel

## 📊 What You'll See in Sentry

### Error Example:
```
🔴 Error: Failed to create appointment
User: john.doe@company.com
URL: /api/appointments
Environment: production
Release: 1.0.0
Context:
  - Appointment type: consultation
  - Duration: 60 minutes
  - Calendar provider: google
Stack trace: [Full error details]
```

### Performance Example:
```
⚡ Slow Transaction: /api/appointments POST
Duration: 2.3s (vs 0.5s average)
User: jane.smith@company.com
Database queries: 12 (vs 3 average)
Bottleneck: Calendar API call took 1.8s
```

### Security Event Example:
```
🛡️ Security Event: WAF_RATE_LIMIT_EXCEEDED
IP: 192.168.1.100
Endpoint: /api/appointments
Requests: 150 in 60s (limit: 100)
Action: Temporarily blocked
User-Agent: [Suspicious bot pattern]
```

## 💰 Pricing & Limits

### Free Tier (Perfect for starting)
- **5,000 errors/month**
- **10,000 performance transactions/month**
- **30-day data retention**
- **Unlimited team members**

### When to Upgrade
- **Growing traffic** (>5k errors/month)
- **Longer retention** (need >30 days history)
- **Advanced features** (custom dashboards, more integrations)

## 🔍 Troubleshooting

### No Events in Sentry?
1. **Check environment variables** are set in Render
2. **Verify DSN format** (should start with `https://`)
3. **Force an error** by visiting `/non-existent-page`
4. **Check browser console** for Sentry initialization errors

### Too Many Events?
1. **Adjust sample rates** in `sentry.client.config.ts`
2. **Add more filters** in `beforeSend` function
3. **Increase error grouping** in Sentry settings

### False Positives?
1. **Review alert rules** (maybe too sensitive)
2. **Add error filters** for known non-critical issues
3. **Improve error grouping** to reduce noise

## 🎯 Best Practices

### ✅ Do
- **Set user context** after login for better debugging
- **Use environment variables** for configuration
- **Monitor alert fatigue** (too many alerts = ignored alerts)
- **Review weekly reports** for trends

### ❌ Don't
- **Send sensitive data** (passwords, tokens) to Sentry
- **Ignore performance alerts** (they indicate real problems)
- **Over-alert** (focus on critical issues first)

## 🚀 Quick Start Checklist

- [ ] Create Sentry account and project
- [ ] Copy DSN from Sentry dashboard
- [ ] Add `SENTRY_DSN` to Render environment variables
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to Render environment variables
- [ ] Deploy application to Render
- [ ] Test by visiting `/non-existent-page`
- [ ] Verify error appears in Sentry dashboard
- [ ] Set up email alerts
- [ ] Add team members to Sentry project

**Once complete, your Zone Meet app will have enterprise-grade error monitoring! 🎉**

---

**Need Help?** Check the [Sentry documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/) or reach out to the team.