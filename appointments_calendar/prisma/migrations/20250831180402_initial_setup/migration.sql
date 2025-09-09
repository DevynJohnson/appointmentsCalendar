-- CreateEnum
CREATE TYPE "public"."CalendarPlatform" AS ENUM ('OUTLOOK', 'GOOGLE', 'TEAMS', 'APPLE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."MagicLinkPurpose" AS ENUM ('LOGIN', 'BOOK_APPOINTMENT', 'MODIFY_BOOKING');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "emailVerified" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "company" TEXT,
    "title" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "defaultBookingDuration" INTEGER NOT NULL DEFAULT 60,
    "bufferTime" INTEGER NOT NULL DEFAULT 15,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_connections" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "platform" "public"."CalendarPlatform" NOT NULL,
    "email" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "calendarName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "isDefaultForBookings" BOOLEAN NOT NULL DEFAULT false,
    "syncEvents" BOOLEAN NOT NULL DEFAULT true,
    "allowBookings" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncFrequency" INTEGER NOT NULL DEFAULT 15,
    "subscriptionId" TEXT,
    "webhookUrl" TEXT,
    "subscriptionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_events" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "platform" "public"."CalendarPlatform" NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "allowBookings" BOOLEAN NOT NULL DEFAULT false,
    "maxBookings" INTEGER NOT NULL DEFAULT 1,
    "availableServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bookings" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "calendarEventId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "customerAddress" TEXT NOT NULL,
    "customerCity" TEXT NOT NULL,
    "customerState" TEXT NOT NULL,
    "customerZipCode" TEXT,
    "customerLat" DOUBLE PRECISION,
    "customerLng" DOUBLE PRECISION,
    "serviceType" TEXT NOT NULL,
    "notes" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "finalCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."magic_links" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "purpose" "public"."MagicLinkPurpose" NOT NULL,
    "data" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "providers_email_key" ON "public"."providers"("email");

-- CreateIndex
CREATE INDEX "calendar_connections_subscriptionId_idx" ON "public"."calendar_connections"("subscriptionId");

-- CreateIndex
CREATE INDEX "calendar_connections_providerId_isDefaultForBookings_idx" ON "public"."calendar_connections"("providerId", "isDefaultForBookings");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_providerId_platform_calendarId_key" ON "public"."calendar_connections"("providerId", "platform", "calendarId");

-- CreateIndex
CREATE INDEX "calendar_events_providerId_startTime_idx" ON "public"."calendar_events"("providerId", "startTime");

-- CreateIndex
CREATE INDEX "calendar_events_startTime_endTime_idx" ON "public"."calendar_events"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "calendar_events_city_state_idx" ON "public"."calendar_events"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_externalEventId_platform_calendarId_key" ON "public"."calendar_events"("externalEventId", "platform", "calendarId");

-- CreateIndex
CREATE INDEX "bookings_scheduledAt_idx" ON "public"."bookings"("scheduledAt");

-- CreateIndex
CREATE INDEX "bookings_providerId_scheduledAt_idx" ON "public"."bookings"("providerId", "scheduledAt");

-- CreateIndex
CREATE INDEX "bookings_calendarEventId_idx" ON "public"."bookings"("calendarEventId");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_key" ON "public"."magic_links"("token");

-- CreateIndex
CREATE INDEX "magic_links_token_idx" ON "public"."magic_links"("token");

-- CreateIndex
CREATE INDEX "magic_links_email_expiresAt_idx" ON "public"."magic_links"("email", "expiresAt");

-- AddForeignKey
ALTER TABLE "public"."calendar_connections" ADD CONSTRAINT "calendar_connections_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "public"."calendar_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
