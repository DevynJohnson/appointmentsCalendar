# 🚀 Zone Meet Deployment Checklist

## Pre-Deployment Setup

### ✅ Files Created
- [ ] `render.yaml` in repository root
- [ ] `/api/health` endpoint created
- [ ] Environment variables documented
- [ ] WAF configuration ready
- [ ] Sentry configuration complete

### ✅ Repository Preparation
- [ ] All code committed to main branch
- [ ] Package.json scripts verified (`build`, `start`)
- [ ] No sensitive data in render.yaml
- [ ] Health check endpoint tested locally

## Render Deployment Steps

### 1. Create Render Account
- [ ] Sign up at [render.com](https://render.com)
- [ ] Connect GitHub account
- [ ] Verify email address

### 2. Deploy via Blueprint
- [ ] Click "New +" → "Blueprint"
- [ ] Select `DevynJohnson/appointmentsCalendar` repository
- [ ] Render detects `render.yaml` automatically
- [ ] Review configuration preview
- [ ] Click "Apply" to deploy

### 3. Add Sensitive Environment Variables
Add these via Render Dashboard (not in render.yaml):

```bash
# Database (auto-generated, just verify)
DATABASE_URL=postgresql://...

# Authentication
JWT_SECRET=your-64-character-secret

# Email Service (Maileroo)
MAILEROO_API_KEY=your-maileroo-api-key
MAILEROO_SMTP_USERNAME=your-smtp-username
MAILEROO_SMTP_PASSWORD=your-smtp-password
MAILEROO_SMTP_HOST=smtp.maileroo.com
MAILEROO_SMTP_PORT=587

# Monitoring (Sentry)
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Calendar Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

### 4. Verify Deployment
- [ ] Build completes successfully
- [ ] Health check passes (`/api/health` returns 200)
- [ ] Application loads without errors
- [ ] Database connection working
- [ ] WAF protection active

## Post-Deployment Testing

### Basic Functionality
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login/logout works
- [ ] Appointment booking functional
- [ ] Email notifications sent

### Security Testing
- [ ] WAF rate limiting works (try 105+ requests/minute)
- [ ] SQL injection blocked
- [ ] XSS attempts blocked
- [ ] Security headers present (check with securityheaders.com)

### Performance Testing
- [ ] Page load times acceptable (<3s)
- [ ] API response times good (<1s)
- [ ] Health check responds quickly
- [ ] No memory leaks in logs

### Monitoring Setup
- [ ] Sentry error tracking active
- [ ] Render logs accessible
- [ ] Health check monitoring configured
- [ ] Alert notifications setup

## Production Configuration

### Custom Domain (Optional)
- [ ] Purchase domain (e.g., zone-meet.com)
- [ ] Add domains to render.yaml
- [ ] Configure DNS records
- [ ] Wait for SSL certificate provisioning

### Scaling Preparation
- [ ] Monitor resource usage
- [ ] Plan for traffic growth
- [ ] Consider upgrading plan (starter → standard)
- [ ] Setup multiple instances for high availability

### Backup Strategy
- [ ] Database backups enabled (automatic with Render)
- [ ] Environment variables documented
- [ ] Code repository properly maintained
- [ ] Recovery procedures documented

## Troubleshooting Common Issues

### Build Failures
- **Issue**: npm ci fails
- **Fix**: Check package.json syntax, dependencies

### Health Check Failures  
- **Issue**: /api/health returns 500
- **Fix**: Check logs, verify database connection

### Environment Variable Issues
- **Issue**: Application can't connect to services
- **Fix**: Verify all required env vars set in dashboard

### Performance Issues
- **Issue**: Slow response times
- **Fix**: Check database queries, enable caching

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Monitor application performance
- [ ] Verify health check status

### Weekly  
- [ ] Review security events
- [ ] Check resource usage
- [ ] Update dependencies if needed

### Monthly
- [ ] Review and update documentation
- [ ] Test backup/recovery procedures
- [ ] Security audit and updates

## Emergency Procedures

### Service Down
1. Check Render service status
2. Review recent deployments
3. Check error logs
4. Rollback if necessary

### Security Incident
1. Check WAF logs for attacks
2. Review Sentry security events
3. Update security rules if needed
4. Document and learn from incident

### Database Issues
1. Check database service status
2. Verify connection string
3. Check for connection limit hits
4. Contact Render support if needed

---

## 🎉 Deployment Complete!

Once all items are checked:
- Your Zone Meet application is live
- Security protection is active
- Monitoring is configured
- You're ready for production users

**Next**: Share your app URL and start taking appointments! 🗓️