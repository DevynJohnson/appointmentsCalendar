-- Migration: Add Availability Management System
-- This migration adds the availability template system for service providers

-- Add allowedDurations column to providers table
ALTER TABLE "providers" ADD COLUMN "allowedDurations" INTEGER[] DEFAULT ARRAY[15, 30, 45, 60, 90];

-- Create availability_templates table
CREATE TABLE "availability_templates" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_templates_pkey" PRIMARY KEY ("id")
);

-- Create availability_time_slots table
CREATE TABLE "availability_time_slots" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_time_slots_pkey" PRIMARY KEY ("id")
);

-- Create template_assignments table
CREATE TABLE "template_assignments" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_assignments_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "availability_templates" ADD CONSTRAINT "availability_templates_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "availability_time_slots" ADD CONSTRAINT "availability_time_slots_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "availability_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_assignments" ADD CONSTRAINT "template_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "availability_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "availability_templates_providerId_isDefault_idx" ON "availability_templates"("providerId", "isDefault");
CREATE INDEX "availability_templates_providerId_isActive_idx" ON "availability_templates"("providerId", "isActive");
CREATE INDEX "availability_time_slots_templateId_dayOfWeek_idx" ON "availability_time_slots"("templateId", "dayOfWeek");
CREATE INDEX "availability_time_slots_dayOfWeek_startTime_endTime_idx" ON "availability_time_slots"("dayOfWeek", "startTime", "endTime");
CREATE INDEX "template_assignments_templateId_startDate_endDate_idx" ON "template_assignments"("templateId", "startDate", "endDate");
CREATE INDEX "template_assignments_startDate_endDate_idx" ON "template_assignments"("startDate", "endDate");

-- Create default availability template for all existing providers
INSERT INTO "availability_templates" ("id", "providerId", "name", "isDefault", "isActive", "createdAt", "updatedAt")
SELECT 
    'default_' || p.id,
    p.id,
    'Default Schedule',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "providers" p;

-- Create default Monday-Friday 8am-6pm time slots for all providers
INSERT INTO "availability_time_slots" ("id", "templateId", "dayOfWeek", "startTime", "endTime", "isEnabled", "createdAt", "updatedAt")
SELECT 
    'slot_' || t.id || '_' || d.day_num,
    t.id,
    d.day_num,
    '08:00',
    '18:00',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "availability_templates" t
CROSS JOIN (
    SELECT 1 as day_num UNION ALL -- Monday
    SELECT 2 as day_num UNION ALL -- Tuesday
    SELECT 3 as day_num UNION ALL -- Wednesday
    SELECT 4 as day_num UNION ALL -- Thursday
    SELECT 5 as day_num           -- Friday
) d
WHERE t."name" = 'Default Schedule';

-- Create indefinite template assignments for all default templates
INSERT INTO "template_assignments" ("id", "templateId", "startDate", "endDate", "createdAt", "updatedAt")
SELECT 
    'assignment_' || t.id,
    t.id,
    CURRENT_TIMESTAMP,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "availability_templates" t
WHERE t."name" = 'Default Schedule';