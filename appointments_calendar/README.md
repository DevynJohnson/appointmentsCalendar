# Appointments Calendar

A comprehensive appointment booking system built with Next.js, featuring multi-calendar support for Google Calendar and Outlook, magic link authentication, and automated email notifications.

## Features

- **Multi-Calendar Support**: Sync events from and allow bookings to multiple Google Calendar and Outlook calendars
- **Magic Link Authentication**: Secure booking confirmation via email magic links
- **Email Notifications**: Automated booking confirmations and provider notifications using Resend
- **Calendar Integration**: Automatic event creation in provider's default calendar
- **Provider Dashboard**: Manage calendar connections, availability, and bookings
- **Client Booking Flow**: Simple booking interface with real-time availability

## Tech Stack

- **Framework**: Next.js 15.5.3 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based magic links
- **Email Service**: Resend API
- **Calendar APIs**: Google Calendar API, Microsoft Graph API (Outlook)
- **Styling**: Tailwind CSS

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the `.env.local` file and configure the following variables:

#### Required - Resend Email Service
```bash
# Get your API key from https://resend.com/api-keys
RESEND_API_KEY=your_resend_api_key_here

# Email address to send from (must be verified domain in Resend)
RESEND_FROM_EMAIL=appointments@yourdomain.com
```

#### Required - Security
```bash
# JWT Secret for magic link tokens (generate a secure random string)
JWT_SECRET=your_secure_jwt_secret_here

# Base URL for your application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

#### Required - Database
```bash
# PostgreSQL connection string
DATABASE_URL=your_database_connection_string
```

### 3. Resend Setup

1. Go to [Resend.com](https://resend.com) and create an account
2. Navigate to API Keys and create a new API key
3. Add your domain and verify it (for production)
4. For development, you can use `onboarding@resend.dev` as the from email

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push
```

### 5. Calendar API Setup (Optional)

For Google Calendar integration:
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

For Outlook integration:
```bash
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=your_microsoft_tenant_id
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

### For Providers
1. Connect your Google Calendar and/or Outlook calendars
2. Configure which calendars to sync events from and allow bookings to
3. Set your default calendar for new bookings
4. Manage your availability and bookings from the dashboard

### For Clients  
1. Find available time slots with a provider
2. Fill out the booking form
3. Check email for magic link confirmation
4. Click the link to confirm the appointment
5. Receive booking confirmation email

## Booking Flow

1. **Client Request**: Client selects time and fills booking form
2. **Magic Link**: System sends magic link to client's email
3. **Provider Notification**: Provider receives booking request notification
4. **Confirmation**: Client clicks magic link to confirm booking
5. **Calendar Event**: System creates event in provider's default calendar
6. **Final Emails**: Both parties receive booking confirmation emails

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
