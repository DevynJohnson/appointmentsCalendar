-- Enable Row Level Security on all provider-scoped tables
-- This migration adds proper RLS policies to prevent cross-provider data access

-- Enable RLS on calendar_connections table
ALTER TABLE "calendar_connections" ENABLE ROW LEVEL SECURITY;

-- Create policy for calendar_connections - providers can only see their own connections
CREATE POLICY "calendar_connections_provider_isolation" ON "calendar_connections"
  FOR ALL 
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', true)
  );

-- Enable RLS on calendar_events table  
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;

-- Create policy for calendar_events - providers can only see their own events
CREATE POLICY "calendar_events_provider_isolation" ON "calendar_events"
  FOR ALL
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', true)
  );

-- Enable RLS on bookings table
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;

-- Create policy for bookings - providers can only see their own bookings
CREATE POLICY "bookings_provider_isolation" ON "bookings"
  FOR ALL
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', true)
  );

-- Enable RLS on provider_locations table
ALTER TABLE "provider_locations" ENABLE ROW LEVEL SECURITY;

-- Create policy for provider_locations - providers can only see their own locations
CREATE POLICY "provider_locations_provider_isolation" ON "provider_locations"
  FOR ALL
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', true)
  );

-- Enable RLS on availability_templates table
ALTER TABLE "availability_templates" ENABLE ROW LEVEL SECURITY;

-- Create policy for availability_templates - providers can only see their own templates
CREATE POLICY "availability_templates_provider_isolation" ON "availability_templates"
  FOR ALL
  TO public
  USING (
    "providerId" = current_setting('app.current_provider_id', true)
  );

-- Enable RLS on availability_time_slots table (linked via template)
ALTER TABLE "availability_time_slots" ENABLE ROW LEVEL SECURITY;

-- Create policy for availability_time_slots - only accessible via provider's templates
CREATE POLICY "availability_time_slots_provider_isolation" ON "availability_time_slots"
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM "availability_templates" 
      WHERE "availability_templates"."id" = "availability_time_slots"."templateId"
      AND "availability_templates"."providerId" = current_setting('app.current_provider_id', true)
    )
  );

-- Enable RLS on template_assignments table (linked via template)
ALTER TABLE "template_assignments" ENABLE ROW LEVEL SECURITY;

-- Create policy for template_assignments - only accessible via provider's templates
CREATE POLICY "template_assignments_provider_isolation" ON "template_assignments"
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM "availability_templates"
      WHERE "availability_templates"."id" = "template_assignments"."templateId"
      AND "availability_templates"."providerId" = current_setting('app.current_provider_id', true)
    )
  );

-- Create admin bypass policy for when no provider context is set (admin operations)
-- This allows admin/system operations to work without provider context

CREATE POLICY "calendar_connections_admin_bypass" ON "calendar_connections"
  FOR ALL
  TO public
  USING (
    current_setting('app.current_provider_id', true) = '' OR
    current_setting('app.current_provider_id', true) IS NULL
  );

CREATE POLICY "calendar_events_admin_bypass" ON "calendar_events"
  FOR ALL
  TO public
  USING (
    current_setting('app.current_provider_id', true) = '' OR
    current_setting('app.current_provider_id', true) IS NULL
  );

CREATE POLICY "bookings_admin_bypass" ON "bookings"
  FOR ALL
  TO public
  USING (
    current_setting('app.current_provider_id', true) = '' OR
    current_setting('app.current_provider_id', true) IS NULL
  );

CREATE POLICY "provider_locations_admin_bypass" ON "provider_locations"
  FOR ALL
  TO public
  USING (
    current_setting('app.current_provider_id', true) = '' OR
    current_setting('app.current_provider_id', true) IS NULL
  );

CREATE POLICY "availability_templates_admin_bypass" ON "availability_templates"
  FOR ALL
  TO public
  USING (
    current_setting('app.current_provider_id', true) = '' OR
    current_setting('app.current_provider_id', true) IS NULL
  );

CREATE POLICY "availability_time_slots_admin_bypass" ON "availability_time_slots"
  FOR ALL
  TO public
  USING (
    current_setting('app.current_provider_id', true) = '' OR
    current_setting('app.current_provider_id', true) IS NULL
  );

CREATE POLICY "template_assignments_admin_bypass" ON "template_assignments"
  FOR ALL
  TO public
  USING (
    current_setting('app.current_provider_id', true) = '' OR
    current_setting('app.current_provider_id', true) IS NULL
  );