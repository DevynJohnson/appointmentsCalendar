/*
  Warnings:

  - You are about to drop the column `customerAddress` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `customerCity` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `customerLat` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `customerLng` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `customerState` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `customerZipCode` on the `bookings` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."bookings" DROP CONSTRAINT "bookings_calendarEventId_fkey";

-- AlterTable
ALTER TABLE "public"."bookings" DROP COLUMN "customerAddress",
DROP COLUMN "customerCity",
DROP COLUMN "customerLat",
DROP COLUMN "customerLng",
DROP COLUMN "customerState",
DROP COLUMN "customerZipCode",
ALTER COLUMN "calendarEventId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."calendar_connections" ADD COLUMN     "calendarSettings" JSONB,
ADD COLUMN     "selectedCalendars" JSONB;

-- AlterTable
ALTER TABLE "public"."providers" ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."provider_locations" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "stateProvince" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_locations_providerId_idx" ON "public"."provider_locations"("providerId");

-- CreateIndex
CREATE INDEX "provider_locations_startDate_endDate_idx" ON "public"."provider_locations"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "provider_locations_city_stateProvince_country_idx" ON "public"."provider_locations"("city", "stateProvince", "country");

-- CreateIndex
CREATE INDEX "provider_locations_providerId_isDefault_idx" ON "public"."provider_locations"("providerId", "isDefault");

-- AddForeignKey
ALTER TABLE "public"."provider_locations" ADD CONSTRAINT "provider_locations_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookings" ADD CONSTRAINT "bookings_calendarEventId_fkey" FOREIGN KEY ("calendarEventId") REFERENCES "public"."calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
