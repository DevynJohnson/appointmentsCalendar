# Zone Meet - Development Documentation

**Internal Development Guide - Confidential**

This directory contains the main Zone Meet application. For business overview and client documentation, see the [main README](../README.md).

## Project Structure

```
appointments_calendar/
├── src/
│   ├── app/                 # Next.js 13+ app router
│   │   ├── api/            # API endpoints
│   │   ├── provider/       # Provider dashboard pages
│   │   └── globals.css     # Global styles
│   ├── components/         # Reusable React components
│   ├── lib/               # Utility libraries and services
│   │   ├── db.ts          # Prisma database client
│   │   ├── jwt-utils.ts   # JWT authentication utilities
│   │   ├── maileroo-email-service.ts # Email service
│   │   └── calendar-connections.ts   # Calendar integration
│   └── types/             # TypeScript type definitions
├── prisma/
│   └── schema.prisma      # Database schema
├── public/                # Static assets
└── package.json          # Dependencies and scripts
```

## Development Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Maileroo account for email delivery

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create `.env.local` in the project root with the following variables:

#### Required - Database
```bash
# PostgreSQL connection strings
DATABASE_URL="postgresql://username:password@localhost:5432/zone_meet"
DIRECT_URL="postgresql://username:password@localhost:5432/zone_meet"
```

#### Required - Authentication  
```bash
# JWT Secret for provider authentication (generate secure random string)
JWT_SECRET="your_secure_jwt_secret_min_32_chars"
```

#### Required - Email Service (Maileroo)
```bash
# Get from https://maileroo.com/dashboard/api-keys
MAILEROO_API_KEY="your_maileroo_api_key"
MAILEROO_FROM_EMAIL="noreply@zone-meet.com"
```

#### Required - Application URLs
```bash
# Base URL for the application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### Optional - Calendar Integrations
```bash
# Google Calendar API (OAuth 2.0)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Microsoft Graph API (for Outlook/Teams)
MICROSOFT_CLIENT_ID="your_microsoft_app_id"  
MICROSOFT_CLIENT_SECRET="your_microsoft_app_secret"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Open Prisma Studio (optional - database GUI)
npx prisma studio
```

### 4. Email Service Setup

1. Create account at [Maileroo.com](https://maileroo.com)
2. Verify your domain (zone-meet.com) in Maileroo dashboard
3. Set up DNS records (SPF, DKIM, MX) for email authentication
4. Get API key from dashboard and add to environment variables

### 5. Run Development Server

```bash
npm run dev
```

Application will be available at [http://localhost:3000](http://localhost:3000)

## Current Architecture

### Authentication Flow
- **Provider Authentication**: JWT-based with email/password
- **No Magic Links**: Removed in favor of simpler provider-centric flow
- **Email Action Buttons**: Direct confirm/deny links in provider emails

### Booking Flow (Current Implementation)
1. **Customer Booking**: Customer submits booking request
2. **Provider Notification**: Provider receives email with action buttons
3. **Provider Action**: Provider clicks Confirm/Deny/Reschedule in email
4. **Status Update**: Booking status updated, calendar event created
5. **Customer Notification**: Customer receives confirmation/denial email

### Calendar Integration
- **Supported Platforms**: Google Calendar, Outlook, Microsoft Teams, Apple Calendar
- **Sync Model**: One-way sync (read calendar events, create new bookings)
- **OAuth 2.0**: Secure calendar authentication
- **Multi-Calendar**: Providers can select multiple calendars per connection

### Email System
- **Service**: Maileroo with DNS authentication (SPF/DKIM/MX)
- **Templates**: Professional branded emails with Zone Meet logo
- **Action Buttons**: HTML email buttons that work as GET requests
- **Dual Responses**: HTML pages for email clicks, JSON for API calls

## API Endpoints

### Provider Authentication
- `POST /api/provider/auth/login` - Provider login
- `POST /api/provider/auth/register` - Provider registration

### Calendar Management  
- `GET /api/provider/calendar/connections` - List calendar connections
- `GET /api/provider/calendar/auth-urls` - Get OAuth URLs for calendar setup
- `POST /api/provider/calendar/sync` - Trigger manual calendar sync
- `GET /api/provider/calendar/default` - Get default booking calendar
- `POST /api/provider/calendar/default` - Set default booking calendar

### Booking Management
- `GET /api/provider/bookings` - List provider bookings
- `GET /api/provider/bookings/[id]/confirm` - Confirm booking (email action)
- `GET /api/provider/bookings/[id]/cancel` - Cancel booking (email action)
- `POST /api/provider/bookings/[id]/confirm` - Confirm booking (API)
- `POST /api/provider/bookings/[id]/cancel` - Cancel booking (API)

### Client Booking
- `GET /api/client/search-providers` - Search available providers
- `GET /api/client/open-slots` - Get available time slots
- `POST /api/client/book-appointment` - Submit booking request

## Database Schema

### Key Models
```typescript
// Provider account
Provider {
  id: String @id
  email: String @unique
  name: String
  password: String // bcrypt hashed
  // ... other fields
}

// Calendar platform connections
CalendarConnection {
  id: String @id
  providerId: String
  platform: CalendarPlatform
  email: String
  accessToken: String?
  refreshToken: String?
  selectedCalendars: String[] // JSON array
  calendarSettings: Json      // Per-calendar settings
  syncEvents: Boolean
  isDefaultForBookings: Boolean
  // ... other fields
}

// Customer appointment bookings
Booking {
  id: String @id
  providerId: String
  customerName: String
  customerEmail: String
  serviceType: String
  scheduledAt: DateTime
  duration: Int
  status: BookingStatus
  notes: String?
  // ... other fields
}
```

### Enums
```typescript
enum CalendarPlatform {
  GOOGLE
  OUTLOOK  
  TEAMS
  APPLE
  OTHER
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  IN_PROGRESS
  COMPLETED
  NO_SHOW
}
```

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server  
npm start

# Lint code
npm run lint

# Database commands
npm run db:push     # Push schema changes
npm run db:studio   # Open Prisma Studio

# Development utilities
npm run create-test-provider  # Create test provider account
```

## Testing & Debugging

### Manual Testing
1. **Provider Registration**: Create test provider account
2. **Calendar Connection**: Connect test Google/Outlook account
3. **Booking Flow**: Test complete customer booking process
4. **Email Delivery**: Verify emails reach inbox (not spam)

### Common Issues
- **Email in Spam**: Check DNS records (SPF, DKIM, MX)
- **Calendar Sync Fails**: Verify OAuth tokens haven't expired
- **Database Errors**: Check Prisma schema vs actual database
- **Environment Variables**: Ensure all required vars are set

### Debugging Tools
- **Prisma Studio**: Visual database browser
- **Browser DevTools**: Network tab for API debugging
- **Server Logs**: Check terminal output for errors
- **Email Testing**: Use Maileroo dashboard to check delivery

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
- Update `NEXT_PUBLIC_APP_URL` to production domain
- Use production database URL
- Ensure Maileroo domain is verified for production emails

## Technology Stack

### Core Framework
- **Next.js 15.5.2**: React framework with App Router
- **React 19.1.0**: UI library  
- **TypeScript 5**: Static typing
- **Tailwind CSS 4**: Styling framework

### Database & ORM
- **PostgreSQL**: Primary database
- **Prisma 6.14.0**: Database ORM and migrations

### Authentication & Security
- **JWT (jsonwebtoken 9.0.2)**: Provider authentication
- **bcryptjs 3.0.2**: Password hashing
- **Zod 4.1.5**: Input validation

### External Integrations
- **@azure/msal-node 3.7.1**: Microsoft Graph API authentication
- **Google Calendar API**: Calendar integration
- **Maileroo**: Email delivery service
- **dav 1.8.0**: CalDAV support for Apple Calendar

### Development Tools
- **ESLint 9**: Code linting
- **tsx 4.20.4**: TypeScript execution
- **Prisma Studio**: Database GUI

## Maintenance Notes

### Regular Tasks
- Monitor email delivery rates in Maileroo dashboard
- Check calendar API rate limits
- Review database performance
- Update dependencies monthly

### Security Considerations
- Rotate JWT secrets periodically
- Monitor for OAuth token expiration
- Keep dependencies updated for security patches
- Review API access logs

---

**For business documentation and client information, see the [main README](../README.md).**
