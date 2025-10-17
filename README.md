# Zone Meet - Appointment Booking Platform

**Proprietary Software - All Rights Reserved**

A comprehensive web application designed for service companies operating across multiple states to efficiently manage client appointments based on provider location and availability. Developed for [Client Name] by [Your Company].

## Project Overview

Zone Meet bridges the gap between service providers and customers by offering a unified platform that synchronizes with existing calendar systems while enabling location-based appointment booking. The application automatically imports provider schedules from popular calendar platforms and makes time slots available for customer booking based on the provider's location during specific events.

## Business Value

The platform is designed to streamline the booking process for service-based businesses where provider location and timing are critical factors. Whether managing field service technicians, consultants, or mobile service businesses, Zone Meet provides the tools needed to:

- **Reduce scheduling overhead** by 70% through automated calendar synchronization
- **Improve customer satisfaction** with location-based appointment availability
- **Increase booking conversion** through streamlined mobile-friendly interface
- **Eliminate double-bookings** with real-time calendar integration

With on-demand calendar synchronization, customers can easily find available appointment slots when providers are in their area, while providers maintain full control over their schedules through existing calendar applications.

## Core Features

- **Multi-Platform Calendar Integration**: Seamlessly connects with Outlook, Google Calendar, Teams, and Apple Calendar
- **On-Demand Calendar Synchronization**: Efficient sync when viewing appointments and during provider login
- **Location-Based Booking**: Customers can book appointments based on provider location during calendar events
- **Smart Availability Management**: Providers can enable/disable booking availability for specific calendar events
- **Magic Link Authentication**: Secure, passwordless authentication system for customers
- **Provider Dashboard**: Comprehensive booking management and calendar connection tools
- **Geographic Service Areas**: Support for multi-state operations with location-specific booking
- **Flexible Service Types**: Configurable service offerings per provider and location
- **Booking Status Management**: Complete lifecycle tracking from pending to completed appointments
- **Customer Information Collection**: Streamlined data collection during the booking process
- **Address Geocoding**: Automatic location parsing and coordinate mapping
- **Responsive Design**: Optimized for desktop and mobile devices
- **RESTful API**: Comprehensive API for calendar synchronization and booking management
- **Efficient Sync**: On-demand calendar synchronization for optimal performance
- **Advanced Security**: JWT authentication, secure token management, and data encryption

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Technology Stack](#technology-stack)
- [Security Features](#security-features)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Database Schema](#database-schema)
- [Calendar Integration](#calendar-integration)
- [Credits](#credits)
- [Copyright](#copyright)

## Installation

### Development Setup

To run Zone Meet locally for development:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd appointmentsCalendar/appointments_calendar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env` in the project root:
     ```bash
     cp .env.example .env
     ```
   - Configure the required environment variables:
     ```env
     DATABASE_URL="your_postgresql_connection_string"
     DIRECT_URL="your_direct_postgresql_connection_string"
     JWT_SECRET="your_secure_jwt_secret"
     
     # Calendar Integration
     MICROSOFT_CLIENT_ID="your_microsoft_app_id"
     MICROSOFT_CLIENT_SECRET="your_microsoft_app_secret"
     GOOGLE_CLIENT_ID="your_google_client_id"
     GOOGLE_CLIENT_SECRET="your_google_client_secret"
     
     # Email Service (Resend)
     RESEND_API_KEY="your_resend_api_key"
     RESEND_FROM_EMAIL="noreply@yourdomain.com"
     
     # Application URLs
     NEXT_PUBLIC_BASE_URL="http://localhost:3000"
     ```

4. **Set up the database**
   ```bash
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open your browser to `http://localhost:3000`
   - Provider dashboard: `http://localhost:3000/provider/dashboard`

### Production Deployment

The application is optimized for deployment on platforms like Vercel, Netlify, or any Node.js hosting environment that supports Next.js applications.

## Usage

### For Service Providers
1. **Register/Login**: Access the provider dashboard to set up your account
2. **Connect Calendars**: Link your existing Outlook, Google, Teams, or Apple accounts
3. **Configure Availability**: Enable booking for specific calendar events and locations
4. **Monitor Bookings**: Track and manage customer appointments through the dashboard

### For Customers
1. **Browse Availability**: Search for available appointment slots by location and service type
2. **Book Appointments**: Select preferred time slots when providers are in your area
3. **Provide Details**: Enter contact information and service requirements
4. **Magic Link Authentication**: Receive secure magic link via email for booking confirmation
5. **Confirm Booking**: Click magic link to authenticate and complete the appointment booking
6. **Calendar Integration**: Confirmed bookings are automatically added to provider's calendar

## Technology Stack

### Frontend
- **Next.js 15.4.6** - React framework with server-side rendering and routing
- **React 19.1.0** - Modern JavaScript library for building user interfaces
- **React DOM 19.1.0** - DOM bindings for React
- **TypeScript 5** - Static type checking for enhanced development experience
- **Tailwind CSS 4** - Utility-first CSS framework for responsive design

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **NextAuth.js 4.24.11** - Authentication library with multiple provider support
- **Prisma 6.14.0** - Modern database toolkit and ORM
- **PostgreSQL** - Robust relational database via pg 8.16.3
- **bcryptjs 3.0.2** - Password hashing for secure authentication

### Calendar Integration
- **@azure/msal-node 3.7.1** - Microsoft Authentication Library for Outlook and Teams integration
- **dav 1.8.0** - CalDAV and CardDAV client for calendar synchronization
- **date-fns 4.1.0** - Modern JavaScript date utility library

### Security & Authentication
- **JSON Web Tokens 9.0.2** - Secure token-based authentication
- **NextAuth.js** - Comprehensive authentication solution
- **Zod 4.0.17** - TypeScript-first schema validation
- **bcryptjs** - Secure password hashing

### Development Tools
- **TypeScript** - Static type checking and enhanced IDE support
- **ESLint 9** - Code linting and style enforcement
- **Prisma Studio** - Visual database browser and editor
- **tsx 4.20.4** - TypeScript execution environment

### Utilities
- **Axios 1.11.0** - HTTP client for API requests
- **date-fns** - Comprehensive date manipulation and formatting

## Security Features

Zone Meet implements comprehensive security measures to protect user data and ensure platform integrity:

### Application Security
- **JWT Authentication**: Secure token-based authentication with magic links
- **Input Validation**: All inputs validated using Zod schemas and Express Validator
- **SQL Injection Prevention**: Prisma ORM provides automatic protection
- **CSRF Protection**: Built-in CSRF protection with NextAuth.js
- **Security Headers**: Helmet middleware for comprehensive security headers
- **Rate Limiting**: Express Rate Limit prevents API abuse and DDoS attacks
- **CORS Configuration**: Controlled cross-origin resource sharing

### Data Protection
- **Password Security**: bcryptjs hashing with secure salt rounds
- **Database Security**: PostgreSQL with connection encryption
- **Environment Variables**: Secure configuration management
- **API Rate Limiting**: Protection against abuse and DDoS attacks

### Calendar Integration Security
- **OAuth 2.0**: Secure calendar platform authentication
- **Token Management**: Automatic token refresh and secure storage
- **Secure Integration**: OAuth-based calendar platform connections for data integrity
- **Scope Limitation**: Minimal required permissions for calendar access

## API Documentation

### Provider Authentication (`/api/provider/auth`)
- `POST /login` — Provider authentication
- `POST /register` — Register new provider account

### Calendar Management (`/api/provider/calendar`)
- `GET /auth-urls` — Get OAuth URLs for calendar platform connection
- `GET /connections` — List provider's calendar connections
- `POST /sync` — Manually trigger calendar synchronization
- `GET /events` — Retrieve synchronized calendar events

- `GET /default` — Get/set default calendar for bookings
- `POST /settings` — Update calendar connection settings
- `POST /fix-connections` — Repair broken calendar connections

### Booking Management (`/api/provider`)
- `GET /dashboard/stats` — Provider dashboard statistics
- `PUT /calendar/events/:id` — Update event booking settings
- `GET /location` — Manage provider locations
- `POST /location` — Add new provider location

### Client Booking API (`/api/client`)
- `GET /search-providers` — Search available providers by location
- `GET /open-slots` — Get available time slots for booking
- `POST /book-appointment` — Create new appointment with magic link
- `GET /booking/confirm` — Confirm booking via magic link token

### Administrative Endpoints (`/api/admin`)
- `GET /test-calendars` — Test calendar integrations
- `PUT /event-booking-settings` — Update event booking configurations

### Testing & Utilities (`/api/test`)
- `GET /test/email` — Test email functionality

## Testing

### Development Testing
```bash
# Run linting
npm run lint

# Build for production testing
npm run build

# Start production server
npm start
```

### Database Testing
```bash
# Open Prisma Studio for database inspection
npm run db:studio

# Apply database schema changes
npm run db:push
```

### Script Testing
```bash
# Create test provider data
npm run create-test-provider
```

## Database Schema

The application uses a PostgreSQL database with the following key models:

### Core Models
- **User**: Customer information and authentication
- **Provider**: Service provider profiles and settings
- **CalendarConnection**: Calendar platform integrations
- **CalendarEvent**: Synchronized calendar events with location data
- **Booking**: Customer appointments and service details
- **MagicLink**: Secure authentication and booking confirmation tokens
- **Location**: Provider service areas and geographic data

### Key Relationships
- Providers can have multiple calendar connections
- Calendar events belong to specific providers and connections
- Bookings link customers to provider calendar events
- Magic links enable secure, passwordless operations

### Enumerations
- **CalendarPlatform**: OUTLOOK, GOOGLE, TEAMS, APPLE, OTHER
- **BookingStatus**: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
- **MagicLinkPurpose**: LOGIN, BOOK_APPOINTMENT, MODIFY_BOOKING

## Calendar Integration

### Supported Platforms
- **Microsoft Outlook**: Full OAuth 2.0 integration with Microsoft Graph API
- **Google Calendar**: Google Calendar API with OAuth 2.0
- **Microsoft Teams**: Teams calendar integration
- **Apple Calendar**: CalDAV protocol support
- **Other Platforms**: Generic CalDAV/CardDAV support

### Synchronization Features
- **Smart Sync**: Automatic sync during provider login and client browsing
- **Bi-Directional Sync**: Changes reflect in both systems
- **Conflict Resolution**: Intelligent handling of scheduling conflicts
- **Batch Processing**: Efficient bulk event synchronization
- **Error Recovery**: Automatic retry mechanisms for failed syncs

### Location Processing
- **Address Parsing**: Automatic extraction of location data from calendar events
- **Geocoding**: Conversion of addresses to geographic coordinates
- **Service Area Mapping**: Location-based service availability

## Credits

### Development Team

**Lead Developer**  
Devyn Johnson - Full-Stack Engineer & Project Architect
- [GitHub Profile](https://www.github.com/DevynJohnson)  
- [Portfolio](https://devynjohnson.me)  
- [LinkedIn](https://www.linkedin.com/in/devyn-johnson-a5259213b/)

### Third-Party Resources

#### Core Technologies
- [Next.js](https://nextjs.org) - React framework with full-stack capabilities
- [React](https://react.dev) - Component-based UI library
- [TypeScript](https://www.typescriptlang.org) - Static type checking for JavaScript
- [Prisma](https://www.prisma.io) - Modern database toolkit and ORM
- [PostgreSQL](https://www.postgresql.org) - Advanced open-source relational database

#### Authentication & Security
- [NextAuth.js](https://next-auth.js.org) - Complete authentication solution for Next.js
- [Microsoft Authentication Library](https://github.com/AzureAD/microsoft-authentication-library-for-js) - Azure AD and Microsoft account authentication
- [bcryptjs](https://www.npmjs.com/package/bcryptjs) - Password hashing library
- [JSON Web Tokens](https://jwt.io) - Secure token standard for magic links
- [Zod](https://zod.dev) - TypeScript-first schema validation
- [Helmet](https://helmetjs.github.io) - Security middleware for Express applications
- [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit) - Rate limiting middleware
- [CORS](https://www.npmjs.com/package/cors) - Cross-Origin Resource Sharing middleware
- [Validator.js](https://github.com/validatorjs/validator.js) - String validation and sanitization

#### Calendar & Date Management
- [dav](https://www.npmjs.com/package/dav) - CalDAV and CardDAV client library
- [date-fns](https://date-fns.org) - Modern JavaScript date utility library

#### UI/UX & Styling
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [PostCSS](https://postcss.org) - CSS transformation tool

#### Development Tools
- [ESLint](https://eslint.org) - JavaScript and TypeScript linting
- [tsx](https://www.npmjs.com/package/tsx) - TypeScript execution environment
- [Prisma Studio](https://www.prisma.io/studio) - Visual database editor

#### Email Services

#### Utilities
- [Axios](https://axios-http.com) - Promise-based HTTP client
- [pg](https://www.npmjs.com/package/pg) - PostgreSQL client for Node.js

---

## Copyright

**All rights reserved.** This code is proprietary and confidential. Unauthorized copying, distribution, modification, or use of this software, via any medium, is strictly prohibited without express written permission from the author.

**Author**: Devyn Johnson  
**Contact**: [GitHub Profile](https://www.github.com/DevynJohnson) | [Portfolio](https://devynjohnson.me)

This software is provided for evaluation purposes only. Any commercial use, redistribution, or derivative works require explicit written authorization from the copyright holder.
